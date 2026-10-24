// Shared server-side helpers for the Razorpay payment endpoints.
// Files starting with "_" are NOT exposed as routes by Vercel.
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { sendBrevo, shell, esc, siteBase } from './mail.js';
import { pushToUser, pushToAdmins } from './push.js';

export function env(name) {
  const v = process.env[name];
  if (!v) throw new HttpError(500, `Server is missing environment variable ${name}`);
  return v;
}

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** Service-role client: bypasses RLS. Server only – never ship this key to the browser. */
export function adminClient() {
  return createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Identify the logged-in customer from the Bearer token the browser sends. */
export async function requireUser(req, admin) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) throw new HttpError(401, 'Please log in again');
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) throw new HttpError(401, 'Please log in again');
  return data.user;
}

// ---------------------------------------------------------------------------
// Razorpay Payment Gateway (Orders API)
// rzp_test_* keys = test mode, rzp_live_* keys = live mode. No extra env switch needed.
// ---------------------------------------------------------------------------
export function razorpayMode() {
  return String(process.env.RAZORPAY_KEY_ID || '').startsWith('rzp_live_') ? 'live' : 'test';
}

export async function razorpay(path, init = {}, fetchImpl = fetch) {
  const auth = Buffer.from(`${env('RAZORPAY_KEY_ID')}:${env('RAZORPAY_KEY_SECRET')}`).toString('base64');
  const res = await fetchImpl(`https://api.razorpay.com/v1${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${auth}`,
      ...(init.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error('[razorpay]', res.status, JSON.stringify(body));
    if (res.status === 401) {
      throw new HttpError(
        502,
        `Payment gateway rejected our keys (mode: ${razorpayMode()}). Check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are a matching pair.`
      );
    }
    throw new HttpError(502, body?.error?.description || 'Payment gateway error');
  }
  return body;
}

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a || ''), 'utf8');
  const y = Buffer.from(String(b || ''), 'utf8');
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

/** Webhook signature: hex( HMAC_SHA256(rawBody, webhook_secret) ) from header x-razorpay-signature */
export function verifyWebhookSignature({ rawBody, signature, secret }) {
  if (!signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return safeEqual(expected, signature);
}

/** Checkout callback signature: hex( HMAC_SHA256(order_id + "|" + payment_id, key_secret) ) */
export function verifyCheckoutSignature({ orderId, paymentId, signature, secret }) {
  if (!orderId || !paymentId || !signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
  return safeEqual(expected, signature);
}

/** Razorpay receipts are max 40 chars. We store the payments-row id in order notes (see create-order). */
export function makeReceipt(paymentRowId) {
  return `df_${String(paymentRowId).replace(/-/g, '')}`.slice(0, 40);
}

export async function readRawBody(req) {
  // Read the stream first (never touch req.body before this: Vercel parses it lazily).
  const chunks = [];
  for await (const chunk of req) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (raw) return raw;
  // Fallback if the platform already consumed the stream.
  const b = req.body;
  if (Buffer.isBuffer(b)) return b.toString('utf8');
  if (typeof b === 'string') return b;
  if (b && typeof b === 'object') return JSON.stringify(b);
  return '';
}

export async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const raw = typeof req.body === 'string' ? req.body : await readRawBody(req);
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    throw new HttpError(400, 'Invalid JSON');
  }
}

export function send(res, status, body) {
  res.status(status).setHeader('Cache-Control', 'no-store').json(body);
}

/** Wrap a handler so thrown HttpErrors become clean JSON responses. */
export function handler(methods, fn) {
  return async (req, res) => {
    try {
      if (!methods.includes(req.method)) {
        res.setHeader('Allow', methods.join(', '));
        throw new HttpError(405, 'Method not allowed');
      }
      await fn(req, res);
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 500;
      if (status === 500) console.error('[api]', e);
      send(res, status, { error: status === 500 && !(e instanceof HttpError) ? 'Internal error' : e.message });
    }
  };
}

/**
 * Mark a payment as Paid after Razorpay confirms it.
 *
 * The source of truth is Razorpay itself: we fetch the order with our secret key and
 * check (a) it is paid, (b) it belongs to a payments row (via notes), (c) the amount
 * equals what we charge. Nothing the browser sends is trusted. Idempotent: the browser
 * callback and the webhook may both call it.
 */
export async function getOrderRow({ admin, orderId, fetchImpl = fetch }) {
  if (!/^order_[A-Za-z0-9]+$/.test(String(orderId || ''))) throw new HttpError(400, 'Invalid order id');
  const order = await razorpay(`/orders/${encodeURIComponent(orderId)}`, {}, fetchImpl);
  const rowId = order?.notes?.payment_row_id;
  if (!rowId) throw new HttpError(400, 'Order is not linked to a payment');
  const { data: pay, error } = await admin.from('payments').select('*').eq('id', rowId).maybeSingle();
  if (error) throw new HttpError(500, error.message);
  if (!pay) throw new HttpError(404, 'Payment record not found');
  return { order, pay };
}

export async function settleOrder({ admin, orderId, fetchImpl = fetch }) {
  const { order, pay } = await getOrderRow({ admin, orderId, fetchImpl });

  if (pay.status === 'Paid') return { alreadyPaid: true, payment: pay };
  if (pay.status === 'Refunded') throw new HttpError(409, 'Payment was refunded');

  const expected = Math.round(Number(pay.total) * 100);
  if (order.status !== 'paid' || Number(order.amount_paid) !== expected || order.currency !== 'INR') {
    throw new HttpError(400, 'Payment not completed or amount mismatch');
  }

  // Find the captured attempt (for the record only).
  let rzpPaymentId = null;
  try {
    const list = await razorpay(`/orders/${encodeURIComponent(orderId)}/payments`, {}, fetchImpl);
    const ok = (list?.items || []).find((p) => p.status === 'captured');
    rzpPaymentId = ok?.id || null;
  } catch {
    /* not critical */
  }

  const { data: updated, error: upErr } = await admin
    .from('payments')
    .update({
      status: 'Paid',
      payment_method: 'razorpay',
      razorpay_order_id: orderId,
      razorpay_payment_id: rzpPaymentId,
      paid_at: new Date().toISOString(),
    })
    .eq('id', pay.id)
    .in('status', ['Pending', 'Failed'])
    .select()
    .maybeSingle();
  if (upErr) throw new HttpError(500, upErr.message);

  // Same behaviour as the admin "Verify" button: move the application into review.
  if (pay.application_id) {
    await admin
      .from('applications')
      .update({ status: 'Under Review' })
      .eq('id', pay.application_id)
      .in('status', ['Draft', 'Submitted']);
  }
  // Phone notifications (best effort; never block the payment).
  if (updated) {
    try {
      await pushToUser(admin, pay.created_by_id, {
        title: 'Payment received',
        body: `₹${pay.total} for ${pay.application_ref}. Your application is now under review.`,
        url: `/applications/${pay.application_id}`,
        tag: `pay-${pay.id}`,
      });
      await pushToAdmins(admin, {
        title: 'New paid order',
        body: `${pay.customer_name} · ${pay.service_name} · ₹${pay.total}`,
        url: `/admin-orders/${pay.application_id}`,
        tag: `order-${pay.id}`,
      });
    } catch (e) {
      console.error('[push]', e);
    }
  }

  // Tell the owner a new paid order arrived (best effort; never blocks the payment).
  if (updated && process.env.MAIL_ADMIN_COPY) {
    try {
      await sendBrevo({
        to: process.env.MAIL_ADMIN_COPY,
        subject: `New order – ${pay.application_ref} (₹${pay.total})`,
        html: shell({
          heading: 'New paid order',
          intro: `${pay.customer_name} paid ₹${pay.total} for ${pay.service_name}.`,
          bodyHtml: `<p style="font-size:14px">Reference <b>${esc(pay.application_ref)}</b></p>`,
          buttonUrl: `${siteBase()}/admin-orders${pay.application_id ? `/${pay.application_id}` : ''}`,
          buttonLabel: 'Open order',
        }),
      });
    } catch (e) {
      console.error('[new-order-mail]', e);
    }
  }
  return { alreadyPaid: false, payment: updated || pay };
}
