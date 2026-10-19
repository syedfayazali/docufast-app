// POST /api/verify-payment   body: { order_id }
// Called by the browser after the Cashfree checkout closes. We never trust the browser:
// settleOrder() asks Cashfree directly whether this exact order is PAID for the right amount.
import { adminClient, requireUser, handler, readJson, send, HttpError, settleOrder, paymentRowIdFromOrderId } from './_lib/core.js';

export default handler(['POST'], async (req, res) => {
  const admin = adminClient();
  const user = await requireUser(req, admin);
  const { order_id: orderId } = await readJson(req);
  if (!orderId) throw new HttpError(400, 'Missing order id');

  // Only the owner may trigger a check for their own order.
  const rowId = paymentRowIdFromOrderId(orderId);
  if (!rowId) throw new HttpError(400, 'Invalid order id');
  const { data: row } = await admin.from('payments').select('created_by_id').eq('id', rowId).maybeSingle();
  if (!row || row.created_by_id !== user.id) throw new HttpError(403, 'Not your payment');

  const result = await settleOrder({ admin, orderId });
  send(res, 200, { status: result.payment.status });
});
