// POST /api/verify-payment   body: { order_id, payment_id?, signature? }
// Called by the browser after the Razorpay checkout closes. We never trust the browser:
// if a signature is supplied it must be valid, and settleOrder() then asks Razorpay directly
// whether this exact order is paid for the right amount.
import {
  adminClient, requireUser, env, handler, readJson, send, HttpError,
  settleOrder, getOrderRow, verifyCheckoutSignature,
} from './_lib/core.js';

export default handler(['POST'], async (req, res) => {
  const admin = adminClient();
  const user = await requireUser(req, admin);
  const { order_id: orderId, payment_id: paymentId, signature } = await readJson(req);
  if (!orderId) throw new HttpError(400, 'Missing order id');

  if (signature || paymentId) {
    const ok = verifyCheckoutSignature({ orderId, paymentId, signature, secret: env('RAZORPAY_KEY_SECRET') });
    if (!ok) throw new HttpError(400, 'Invalid payment signature');
  }

  // Only the owner may trigger a check for their own order.
  const { pay } = await getOrderRow({ admin, orderId });
  if (pay.created_by_id !== user.id) throw new HttpError(403, 'Not your payment');

  const result = await settleOrder({ admin, orderId });
  send(res, 200, { status: result.payment.status });
});
