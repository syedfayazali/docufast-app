// POST /api/cashfree-webhook
// Safety net: marks the payment Paid even if the customer closed the browser right after paying.
// Cashfree Dashboard -> Developers -> Webhooks -> add URL, event: Payment Success.
import { adminClient, env, handler, readRawBody, send, HttpError, verifyWebhookSignature, settleOrder } from './_lib/core.js';

// We need the untouched raw body to check the signature.
export const config = { api: { bodyParser: false } };

export default handler(['POST'], async (req, res) => {
  const rawBody = await readRawBody(req);
  const ok = verifyWebhookSignature({
    rawBody,
    signature: req.headers['x-webhook-signature'],
    timestamp: req.headers['x-webhook-timestamp'],
    secret: env('CASHFREE_SECRET_KEY'),
  });
  if (!ok) throw new HttpError(400, 'Invalid signature');

  const event = JSON.parse(rawBody || '{}');
  if (event?.type !== 'PAYMENT_SUCCESS_WEBHOOK') return send(res, 200, { ignored: event?.type || 'unknown' });

  const orderId = event?.data?.order?.order_id;
  if (!orderId) return send(res, 200, { ignored: 'no order' });

  await settleOrder({ admin: adminClient(), orderId });
  send(res, 200, { ok: true });
});
