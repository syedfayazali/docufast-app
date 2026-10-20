// POST /api/razorpay-webhook
// Safety net: marks the payment Paid even if the customer closed the browser right after paying.
// Razorpay Dashboard -> Account & Settings -> Webhooks -> add URL, events: payment.captured, order.paid,
// and set a webhook secret (=> RAZORPAY_WEBHOOK_SECRET).
import { adminClient, env, handler, readRawBody, send, HttpError, verifyWebhookSignature, settleOrder } from './_lib/core.js';

// We need the untouched raw body to check the signature.
export const config = { api: { bodyParser: false } };

export default handler(['POST'], async (req, res) => {
  const rawBody = await readRawBody(req);
  const ok = verifyWebhookSignature({
    rawBody,
    signature: req.headers['x-razorpay-signature'],
    secret: env('RAZORPAY_WEBHOOK_SECRET'),
  });
  if (!ok) throw new HttpError(400, 'Invalid signature');

  const event = JSON.parse(rawBody || '{}');
  if (event?.event !== 'payment.captured' && event?.event !== 'order.paid') {
    return send(res, 200, { ignored: event?.event || 'unknown' });
  }

  const orderId = event?.payload?.order?.entity?.id || event?.payload?.payment?.entity?.order_id;
  if (!orderId) return send(res, 200, { ignored: 'no order' });

  await settleOrder({ admin: adminClient(), orderId });
  send(res, 200, { ok: true });
});
