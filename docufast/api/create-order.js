// POST /api/create-order   body: { application_id }   header: Authorization: Bearer <supabase access token>
// Creates a Razorpay order for the logged-in customer's pending payment.
import {
  adminClient, requireUser, razorpay, razorpayMode, makeReceipt, env, handler, readJson, send, HttpError,
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

  const amountPaise = Math.round(Number(pay.total) * 100); // Razorpay amounts are in paise
  if (!Number.isFinite(amountPaise) || amountPaise < 100) throw new HttpError(400, 'Nothing to pay for this application');

  // Optional prefill for the checkout window.
  const { data: app } = await admin.from('applications').select('customer_mobile').eq('id', application_id).maybeSingle();
  const phone = String(app?.customer_mobile || '').replace(/\D/g, '').slice(-10);

  const order = await razorpay('/orders', {
    method: 'POST',
    body: JSON.stringify({
      amount: amountPaise,
      currency: 'INR',
      receipt: makeReceipt(pay.id),
      // notes are how we find the payments row again (verify + webhook)
      notes: {
        payment_row_id: pay.id,
        application_id: String(application_id),
        service: String(pay.service_name || '').slice(0, 100),
      },
    }),
  });

  await admin.from('payments').update({ razorpay_order_id: order.id }).eq('id', pay.id);

  send(res, 200, {
    mode: razorpayMode(),
    key_id: env('RAZORPAY_KEY_ID'), // public key id, safe for the browser
    order_id: order.id,
    amount: order.amount,
    currency: order.currency,
    prefill: {
      name: pay.customer_name || '',
      email: pay.customer_email || user.email || '',
      contact: phone.length === 10 ? phone : '',
    },
  });
});
