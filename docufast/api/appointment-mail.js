// POST /api/appointment-mail   body: { id, event }
// event: booked | rescheduled | cancelled | completed | no_show
// Sends the customer an e-mail (via Brevo) that matches the appointment's CURRENT state.
// The browser can only ask; this function checks who is asking and what really happened.
// Needs env: BREVO_API_KEY, MAIL_FROM  (optional: MAIL_REPLY_TO, MAIL_ADMIN_COPY, SUPPORT_PHONE)
import { adminClient, requireUser, handler, readJson, send, HttpError } from './_lib/core.js';
import { pushToUser, appointmentPush } from './_lib/push.js';

const STATUS_FOR = { booked: 'Booked', rescheduled: 'Booked', cancelled: 'Cancelled', completed: 'Completed', no_show: 'No Show' };

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const when = (d) =>
  new Date(d).toLocaleString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }) + ' (IST)';
const icsStamp = (d) => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

function ics(a, title, where) {
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//DocuFast India//Appointments//EN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
    `UID:${a.reference}@docufast`, `DTSTAMP:${icsStamp(new Date())}`, `DTSTART:${icsStamp(a.slot_start)}`, `DTEND:${icsStamp(a.slot_end)}`,
    `SUMMARY:${title}`, `LOCATION:${String(where || '').replace(/[\r\n,;]/g, ' ')}`, 'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
}

const COPY = {
  booked:      { subject: (a) => `Appointment confirmed – ${a.reference}`, head: 'Your appointment is confirmed', tone: '#047857', intro: 'Thank you for booking with DocuFast India. Here are your appointment details.' },
  rescheduled: { subject: (a) => `Appointment rescheduled – ${a.reference}`, head: 'Your appointment has been rescheduled', tone: '#b45309', intro: 'Your appointment has been moved. Your new time is shown below.' },
  cancelled:   { subject: (a) => `Appointment cancelled – ${a.reference}`, head: 'Your appointment was cancelled', tone: '#b91c1c', intro: 'This appointment has been cancelled. You can book a new time whenever you like.' },
  completed:   { subject: (a) => `Appointment completed – ${a.reference}`, head: 'Your appointment is completed', tone: '#047857', intro: 'Thank you for visiting DocuFast India. This is your record of the appointment.' },
  no_show:     { subject: (a) => `We missed you – ${a.reference}`, head: 'We could not meet you at your appointment', tone: '#b91c1c', intro: 'Your appointment was marked as missed. Please book a new time if you still need help.' },
};

function render({ a, event, location, phone, siteUrl, note }) {
  const c = COPY[event];
  const rows = [
    ['Reference', a.reference],
    ['Date & time', when(a.slot_start)],
    ['Type', a.kind === 'Phone callback' ? `Phone callback – we will call ${a.customer_mobile}` : 'Office visit'],
    ...(a.kind === 'Office visit' && location ? [['Where', location]] : []),
    ['Service', a.service_name || 'General enquiry'],
    ['Name', a.customer_name],
    ['Mobile', a.customer_mobile],
    ...(a.purpose ? [['Your note', a.purpose]] : []),
    ...(a.admin_note ? [['Message from us', a.admin_note]] : []),
    ['Status', a.status],
  ];
  const table = rows.map(([k, v]) => `<tr><td style="padding:8px 0;color:#64748b;width:120px;vertical-align:top;font-size:13px">${esc(k)}</td><td style="padding:8px 0;font-size:14px;font-weight:600;color:#0f172a">${esc(v)}</td></tr>`).join('');
  const tip = event === 'booked' || event === 'rescheduled'
    ? `<p style="font-size:13px;color:#334155">${note ? esc(note) + '<br><br>' : ''}Please arrive 5–10 minutes early and bring your original documents. You can reschedule or cancel from <b>My Appointments</b> in the app. A calendar file is attached.</p>`
    : '';
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;background:#f1f5f9;padding:20px">
  <div style="max-width:520px;margin:auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0">
    <div style="background:#0A1D4D;color:#fff;padding:16px 20px;font-weight:700;font-size:16px">DocuFast India™</div>
    <div style="padding:22px 20px">
      <h2 style="margin:0 0 6px;color:${c.tone};font-size:20px">${esc(c.head)}</h2>
      <p style="margin:0 0 14px;font-size:14px;color:#334155">Hello ${esc(a.customer_name)}, ${esc(c.intro)}</p>
      <table style="width:100%;border-collapse:collapse;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0">${table}</table>
      ${tip}
      <p style="margin:16px 0 0"><a href="${esc(siteUrl)}/my-appointments" style="background:#0A1D4D;color:#fff;text-decoration:none;padding:10px 16px;border-radius:10px;font-size:13px;font-weight:700">View my appointments</a></p>
      <p style="margin-top:18px;font-size:12px;color:#64748b">Questions? Call ${esc(phone)}. DocuFast India is a private service provider and is not a government website.</p>
    </div></div></div>`;
  return { subject: c.subject(a), html };
}

export default handler(['POST'], async (req, res) => {
  const admin = adminClient();
  const user = await requireUser(req, admin);
  const { id, event } = await readJson(req);
  if (!id || !STATUS_FOR[event]) throw new HttpError(400, 'Invalid request');

  const { data: a } = await admin.from('appointments').select('*').eq('id', id).maybeSingle();
  if (!a) throw new HttpError(404, 'Appointment not found');

  const { data: prof } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle();
  const isAdmin = prof?.role === 'admin';
  if (a.created_by_id !== user.id && !isAdmin) throw new HttpError(403, 'Not your appointment');
  if (['completed', 'no_show'].includes(event) && !isAdmin) throw new HttpError(403, 'Not allowed');
  if (a.status !== STATUS_FOR[event]) throw new HttpError(409, 'Appointment is not in that state');

  // one e-mail per event per time slot
  const key = `${event}|${new Date(a.slot_start).toISOString()}`;
  if (a.last_mailed === key) return send(res, 200, { sent: false, reason: 'already-sent' });

  // Phone notification first (independent of e-mail; same one-per-event rule via last_mailed).
  const pushMsg = appointmentPush(a, event);
  if (pushMsg) await pushToUser(admin, a.created_by_id, pushMsg);

  const apiKey = process.env.BREVO_API_KEY;
  const from = process.env.MAIL_FROM; // "DocuFast India <bookings@yourdomain.com>" or just the address
  const fm = /^\s*(?:"?([^"<]*?)"?\s*)?<([^>]+)>\s*$/.exec(from || '');
  const sender = fm ? { name: (fm[1] || 'DocuFast India').trim(), email: fm[2].trim() } : { name: 'DocuFast India', email: (from || '').trim() };
  if (!apiKey || !from) return send(res, 200, { sent: false, reason: 'mail-not-configured' });

  let to = a.customer_email;
  if (!to) {
    const { data } = await admin.auth.admin.getUserById(a.created_by_id);
    to = data?.user?.email;
  }
  if (!to) return send(res, 200, { sent: false, reason: 'no-email' });

  const { data: st } = await admin.from('appointment_settings').select('location,note').eq('id', 'main').maybeSingle();
  const siteUrl = (process.env.SITE_URL || `https://${req.headers.host}`).replace(/\/$/, '');
  const phone = process.env.SUPPORT_PHONE || '8374968022';
  const { subject, html } = render({ a, event, location: st?.location, phone, siteUrl, note: st?.note });

  const body = {
    sender, to: [{ email: to }], subject, htmlContent: html,
    ...(process.env.MAIL_REPLY_TO ? { replyTo: { email: process.env.MAIL_REPLY_TO } } : {}),
    ...(process.env.MAIL_ADMIN_COPY && ['booked', 'rescheduled', 'cancelled'].includes(event) ? { bcc: [{ email: process.env.MAIL_ADMIN_COPY }] } : {}),
  };
  if (event === 'booked' || event === 'rescheduled') {
    body.attachment = [{
      name: `appointment-${a.reference}.ics`,
      content: Buffer.from(ics(a, `DocuFast India appointment${a.service_name ? ' – ' + a.service_name : ''}`, st?.location)).toString('base64'),
    }];
  }

  const r = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': apiKey, accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const txt = await r.text().catch(() => '');
    console.error('[appointment-mail] Brevo', r.status, txt);
    let msg = '';
    try { msg = JSON.parse(txt).message || ''; } catch { msg = txt.slice(0, 200); }
    return send(res, 200, { sent: false, reason: 'mail-provider-error', detail: `Brevo ${r.status}: ${msg}` });
  }
  const { error: markErr } = await admin.from('appointments').update({ last_mailed: key }).eq('id', id);
  if (markErr) console.error('[appointment-mail] could not save last_mailed (run migration 007?)', markErr.message);
  send(res, 200, { sent: true });
});
