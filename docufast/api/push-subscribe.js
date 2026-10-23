// GET  /api/push-subscribe                       -> { publicKey }   (no login needed)
// POST /api/push-subscribe  { subscription }     -> saves this phone for the logged-in user
// POST /api/push-subscribe  { endpoint, remove } -> removes it
import { adminClient, requireUser, handler, readJson, send, HttpError } from './_lib/core.js';

export default handler(['GET', 'POST'], async (req, res) => {
  if (req.method === 'GET') {
    const publicKey = process.env.VAPID_PUBLIC_KEY || '';
    return send(res, 200, { publicKey, enabled: !!(publicKey && process.env.VAPID_PRIVATE_KEY) });
  }

  const admin = adminClient();
  const user = await requireUser(req, admin);
  const body = await readJson(req);

  if (body.remove) {
    if (!body.endpoint) throw new HttpError(400, 'Invalid request');
    await admin.from('push_subscriptions').delete().eq('endpoint', body.endpoint).eq('user_id', user.id);
    return send(res, 200, { removed: true });
  }

  const s = body.subscription;
  if (!s?.endpoint || !s?.keys?.p256dh || !s?.keys?.auth || !/^https:\/\//.test(s.endpoint)) {
    throw new HttpError(400, 'Invalid subscription');
  }
  const { error } = await admin.from('push_subscriptions').upsert(
    {
      user_id: user.id,
      endpoint: s.endpoint,
      p256dh: s.keys.p256dh,
      auth: s.keys.auth,
      user_agent: String(req.headers['user-agent'] || '').slice(0, 200),
      updated_date: new Date().toISOString(),
    },
    { onConflict: 'endpoint' }
  );
  if (error) throw new HttpError(500, 'Could not save');
  send(res, 200, { saved: true });
});
