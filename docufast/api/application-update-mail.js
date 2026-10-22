// POST /api/application-update-mail   body: { id }   (admin only)
// E-mails the customer one update (note / reference number) the team just posted.
import { adminClient, requireUser, handler, readJson, send, HttpError } from './_lib/core.js';
import { sendBrevo, shell, esc, siteUrlFrom } from './_lib/mail.js';

export default handler(['POST'], async (req, res) => {
  const admin = adminClient();
  const user = await requireUser(req, admin);
  const { data: prof } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (prof?.role !== 'admin') throw new HttpError(403, 'Not allowed');

  const { id } = await readJson(req);
  if (!id) throw new HttpError(400, 'Invalid request');
  const { data: u } = await admin.from('application_updates').select('*').eq('id', id).maybeSingle();
  if (!u) throw new HttpError(404, 'Update not found');
  if (u.is_private) return send(res, 200, { sent: false, reason: 'private-note' });
  if (u.mailed_at) return send(res, 200, { sent: false, reason: 'already-sent' });

  const { data: a } = await admin.from('applications').select('*').eq('id', u.application_id).maybeSingle();
  if (!a) throw new HttpError(404, 'Application not found');
  let to = a.customer_email;
  if (!to && a.created_by_id) to = (await admin.auth.admin.getUserById(a.created_by_id)).data?.user?.email;

  const ref = u.ref_number
    ? `<div style="margin:12px 0;padding:14px;border:2px solid #0A1D4D;border-radius:12px;background:#f8fafc;text-align:center">
         <div style="font-size:12px;color:#64748b;margin-bottom:4px">${esc(u.ref_label || 'Reference number')}</div>
         <div style="font-size:24px;font-weight:800;letter-spacing:1px;color:#0A1D4D;word-break:break-all">${esc(u.ref_number)}</div></div>` : '';
  const msg = u.message ? `<p style="font-size:14px;color:#0f172a;white-space:pre-line">${esc(u.message)}</p>` : '';
  const link = u.link ? `<p style="font-size:13px"><a href="${esc(u.link)}">${esc(u.link)}</a></p>` : '';
  const html = shell({
    heading: u.title || 'New update on your application',
    intro: `Hello ${a.customer_name}, here is an update on ${a.service_name} (${a.reference}).`,
    bodyHtml: ref + msg + link,
    buttonUrl: `${siteUrlFrom(req)}/applications/${a.id}`,
    buttonLabel: 'View my application',
  });
  const r = await sendBrevo({ to, subject: `${u.title || 'Update'} – ${a.reference}`, html, bcc: process.env.MAIL_ADMIN_COPY });
  if (r.sent) await admin.from('application_updates').update({ mailed_at: new Date().toISOString() }).eq('id', id);
  send(res, 200, r);
});
