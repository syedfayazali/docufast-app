// POST /api/push-send  { type: 'status' | 'update', id }   (admin only)
//   status: id = application id  -> tells the customer the application's CURRENT status
//   update: id = update id       -> tells the customer about a new (non-private) update
// The browser only asks; the message is built here from what is really in the database.
import { adminClient, requireUser, handler, readJson, send, HttpError } from './_lib/core.js';
import { pushToUser, statusPush, updatePush } from './_lib/push.js';

export default handler(['POST'], async (req, res) => {
  const admin = adminClient();
  const user = await requireUser(req, admin);
  const { type, id } = await readJson(req);

  const { data: prof } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (prof?.role !== 'admin') throw new HttpError(403, 'Not allowed');
  if (!id || !['status', 'update'].includes(type)) throw new HttpError(400, 'Invalid request');

  if (type === 'status') {
    const { data: app } = await admin.from('applications').select('*').eq('id', id).maybeSingle();
    if (!app) throw new HttpError(404, 'Application not found');
    if (app.status === 'Draft') return send(res, 200, { sent: 0, reason: 'not-paid-yet' });
    return send(res, 200, await pushToUser(admin, app.created_by_id, statusPush(app)));
  }

  const { data: u } = await admin.from('application_updates').select('*').eq('id', id).maybeSingle();
  if (!u) throw new HttpError(404, 'Update not found');
  if (u.is_private) return send(res, 200, { sent: 0, reason: 'private-note' });
  const { data: app } = await admin.from('applications').select('*').eq('id', u.application_id).maybeSingle();
  if (!app) throw new HttpError(404, 'Application not found');
  send(res, 200, await pushToUser(admin, app.created_by_id, updatePush(app, u)));
});
