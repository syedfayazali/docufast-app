// Small Brevo helper shared by the e-mail endpoints. Never throws: returns { sent, reason, detail }.
// Needs env: BREVO_API_KEY, MAIL_FROM  (optional: MAIL_REPLY_TO)
export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function senderFromEnv() {
  const from = process.env.MAIL_FROM || '';
  const m = /^\s*(?:"?([^"<]*?)"?\s*)?<([^>]+)>\s*$/.exec(from);
  return m ? { name: (m[1] || 'DocuFast India').trim(), email: m[2].trim() } : { name: 'DocuFast India', email: from.trim() };
}

export async function sendBrevo({ to, subject, html, bcc }) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey || !process.env.MAIL_FROM) {
    const missing = [!apiKey && 'BREVO_API_KEY', !process.env.MAIL_FROM && 'MAIL_FROM'].filter(Boolean).join(' and ');
    return { sent: false, reason: 'mail-not-configured', detail: `Missing ${missing} on the server` };
  }
  if (!to) return { sent: false, reason: 'no-email', detail: 'Customer has no email address' };
  try {
    const body = {
      sender: senderFromEnv(), to: [{ email: to }], subject, htmlContent: html,
      ...(process.env.MAIL_REPLY_TO ? { replyTo: { email: process.env.MAIL_REPLY_TO } } : {}),
      ...(bcc ? { bcc: [{ email: bcc }] } : {}),
    };
    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': apiKey, accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const txt = await r.text().catch(() => '');
      console.error('[mail] Brevo', r.status, txt);
      let msg = ''; try { msg = JSON.parse(txt).message || ''; } catch { msg = txt.slice(0, 200); }
      return { sent: false, reason: 'mail-provider-error', detail: `Brevo ${r.status}: ${msg}` };
    }
    return { sent: true };
  } catch (e) {
    console.error('[mail]', e);
    return { sent: false, reason: 'mail-failed', detail: String(e?.message || e) };
  }
}

export const siteUrlFrom = (req) => (process.env.SITE_URL || `https://${req?.headers?.host || ''}`).replace(/\/$/, '');

export function shell({ heading, tone = '#0A1D4D', intro, bodyHtml, buttonUrl, buttonLabel, phone }) {
  return `<div style="font-family:Arial,Helvetica,sans-serif;background:#f1f5f9;padding:20px">
  <div style="max-width:520px;margin:auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0">
    <div style="background:#0A1D4D;color:#fff;padding:16px 20px;font-weight:700;font-size:16px">DocuFast India™</div>
    <div style="padding:22px 20px">
      <h2 style="margin:0 0 6px;color:${tone};font-size:20px">${esc(heading)}</h2>
      ${intro ? `<p style="margin:0 0 14px;font-size:14px;color:#334155">${esc(intro)}</p>` : ''}
      ${bodyHtml || ''}
      ${buttonUrl ? `<p style="margin:16px 0 0"><a href="${esc(buttonUrl)}" style="background:#0A1D4D;color:#fff;text-decoration:none;padding:10px 16px;border-radius:10px;font-size:13px;font-weight:700">${esc(buttonLabel || 'Open')}</a></p>` : ''}
      <p style="margin-top:18px;font-size:12px;color:#64748b">Questions? Call ${esc(phone || process.env.SUPPORT_PHONE || '8374968022')}. DocuFast India is a private service provider and is not a government website.</p>
    </div></div></div>`;
}
