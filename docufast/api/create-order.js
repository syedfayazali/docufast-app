// POST /api/create-order   body: { application_id }   header: Authorization: Bearer <supabase access token>
// Creates a Cashfree order for the logged-in customer's pending payment.
import {
  adminClient, requireUser, cashfree, cashfreeMode, makeOrderId, handler, readJson, send, HttpError,
} from './_lib/core.js';

export default handler(['POST'], async (req, res) => {
  const admin = adminClient();
  const user = await requireUser(req, admin);
  const { application_id } = await readJson(req);
  if (!application_id) throw new HttpError(400, 'application_id is required');

  const { data: pay, error } = await admin
    .from('payments')
    .select('*')
    .eq('application_id', application_id)
    .maybeSingle();
  if (error) throw new HttpError(500, error.message);
  if (!pay || pay.created_by_id !== user.id) throw new HttpError(404, 'Payment not found');
  if (pay.status === 'Paid') throw new HttpError(409, 'This payment is already complete');
  if (pay.status === 'Refunded') throw new HttpError(409, 'This payment was refunded');

  const amount = Math.round(Number(pay.total) * 100) / 100; // rupees
  if (!Number.isFinite(amount) || amount < 1) throw new HttpError(400, 'Nothing to pay for this application');

  // Cashfree needs a 10-digit mobile number.
  const { data: app } = await admin.from('applications').select('customer_mobile').eq('id', application_id).maybeSingle();
  const phone = String(app?.customer_mobile || '').replace(/\D/g, '').slice(-10);
  if (phone.length !== 10) throw new HttpError(400, 'Please add a valid 10-digit mobile number to your application');

  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const site = process.env.SITE_URL || (host ? `https://${host}` : '');

  const order = await cashfree('/orders', {
    method: 'POST',
    body: JSON.stringify({
      order_id: makeOrderId(pay.id), // unique per attempt; embeds the payments-row id
      order_amount: amount,
      order_currency: 'INR',
      customer_details: {
        customer_id: String(user.id).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 50),
        customer_name: pay.customer_name,
        customer_email: pay.customer_email || user.email,
        customer_phone: phone,
      },
      order_note: String(pay.service_name || '').slice(0, 100),
      ...(site ? { order_meta: { return_url: `${site}/pay?cf_order={order_id}` } } : {}),
    }),
  });

  await admin.from('payments').update({ razorpay_order_id: order.order_id }).eq('id', pay.id);

  send(res, 200, {
    mode: cashfreeMode(),
    order_id: order.order_id,
    payment_session_id: order.payment_session_id,
  });
});
