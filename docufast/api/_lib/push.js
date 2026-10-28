// Web Push helper (server only). Needs env: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:you@example.com)
// Never throws: a failed notification must never break a payment, booking or status change.
import webpush from 'web-push';

let ready = null;
export function pushReady() {
  if (ready !== null) return ready;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return (ready = false);
  try {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:help@docufastindia.com', pub, priv);
    ready = true;
  } catch (e) {
    console.error('[push] bad VAPID settings', e?.message);
    ready = false;
  }
  return ready;
}

async function sendTo(admin, rows, payload) {
  const body = JSON.stringify(payload);
  let sent = 0;
  const errors = [];
  await Promise.all(
    rows.map(async (r) => {
      try {
        await webpush.sendNotification({ endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } }, body, { TTL: 86400, urgency: 'high' });
        sent += 1;
      } catch (e) {
        // 404/410 = the phone removed the subscription: clean it up.
        if (e?.statusCode === 404 || e?.statusCode === 410) {
          await admin.from('push_subscriptions').delete().eq('id', r.id);
        } else {
          console.error('[push] send failed', e?.statusCode, e?.body || e?.message);
          errors.push(`${e?.statusCode || ''} ${String(e?.body || e?.message || '').slice(0, 120)}`.trim());
        }
      }
    })
  );
  return { sent, errors };
}

/** payload: { title, body, url, tag } */
export async function pushToUser(admin, userId, payload) {
  if (!userId || !pushReady()) return { sent: 0, reason: pushReady() ? 'no-user' : 'push-not-configured' };
  try {
    const { data } = await admin.from('push_subscriptions').select('*').eq('user_id', String(userId));
    if (!data?.length) return { sent: 0, reason: 'no-subscription' };
    const r = await sendTo(admin, data, payload);
    return { sent: r.sent, subscriptions: data.length, errors: r.errors };
  } catch (e) {
    console.error('[push]', e);
    return { sent: 0, reason: 'error' };
  }
}

export async function pushToAdmins(admin, payload) {
  if (!pushReady()) return { sent: 0, reason: 'push-not-configured' };
  try {
    const { data: admins } = await admin.from('profiles').select('id').eq('role', 'admin');
    const ids = (admins || []).map((a) => String(a.id));
    if (!ids.length) return { sent: 0, reason: 'no-admin' };
    const { data } = await admin.from('push_subscriptions').select('*').in('user_id', ids);
    if (!data?.length) return { sent: 0, reason: 'no-subscription' };
    const r = await sendTo(admin, data, payload);
    return { sent: r.sent, subscriptions: data.length, errors: r.errors };
  } catch (e) {
    console.error('[push]', e);
    return { sent: 0, reason: 'error' };
  }
}

const fmtWhen = (d) =>
  new Date(d).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });

export function appointmentPush(a, event) {
  const when = fmtWhen(a.slot_start);
  const title = {
    booked: 'Appointment confirmed',
    rescheduled: 'Appointment rescheduled',
    cancelled: 'Appointment cancelled',
    completed: 'Appointment completed',
    no_show: 'Appointment missed',
  }[event];
  if (!title) return null;
  return { title, body: `${a.reference} · ${when}`, url: `/appointment/${a.id}`, tag: `appt-${a.id}` };
}

export const statusPush = (app) => ({
  title: `Application ${app.reference}`,
  body: ({
    'Under Review': 'is now under review.',
    'Action Required': 'needs action from you. Please open the app.',
    Approved: 'has been approved.',
    Completed: 'is completed. Documents delivered.',
    Rejected: 'has been rejected. Open the app for details.',
    Cancelled: 'was cancelled.',
    Submitted: 'has been submitted.',
  }[app.status] || `is now ${app.status}.`),
  url: `/applications/${app.id}`,
  tag: `app-${app.id}`,
});

export const updatePush = (app, u) => ({
  title: `${app.reference}: ${u.title || 'New update'}`,
  body: u.ref_number ? `${u.ref_label || 'Reference'}: ${u.ref_number}` : (u.message || 'Open the app to read it.').slice(0, 120),
  url: `/applications/${app.id}`,
  tag: `upd-${u.id}`,
});
