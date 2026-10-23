// Shared server-side helpers for the Cashfree payment endpoints.
// Files starting with "_" are NOT exposed as routes by Vercel.
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { sendBrevo, shell, esc } from './mail.js';
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
// Cashfree Payment Gateway (API version 2023-08-01)
// Test keys -> CASHFREE_ENV=sandbox   |   Live keys -> CASHFREE_ENV=production
// ---------------------------------------------------------------------------
export function cashfreeMode() {
  return String(process.env.CASHFREE_ENV || 'sandbox').toLowerCase() === 'production' ? 'production' : 'sandbox';
}

export async function cashfree(path, init = {}, fetchImpl = fetch) {
  const base = cashfreeMode() === 'production' ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg';
  const res = await fetchImpl(`${base}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'x-api-version': '2023-08-01',
      'x-client-id': env('CASHFREE_APP_ID'),
      'x-client-secret': env('CASHFREE_SECRET_KEY'),
      ...(init.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error('[cashfree]', res.status, JSON.stringify(body));
    if (res.status === 401 || res.status === 403) {
      throw new HttpError(
        502,
        `Payment gateway rejected our keys (mode: ${cashfreeMode()}). Check CASHFREE_APP_ID, CASHFREE_SECRET_KEY and CASHFREE_ENV match (test keys need sandbox, live keys need production).`
      );
    }
    throw new HttpError(502, body?.message || 'Payment gateway error');
  }
  return body;
}

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a || ''), 'utf8');
  const y = Buffer.from(String(b || ''), 'utf8');
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

/** Cashfree webhook signature: base64( HMAC_SHA256(timestamp + rawBody, secret_key) ) */
export function verifyWebhookSignature({ rawBody, signature, timestamp, secret }) {
  if (!signature || !timestamp) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${timestamp}${rawBody}`).digest('base64');
  return safeEqual(expected, signature);
}

/** Our Cashfree order ids embed the payments-row id:  df_<32 hex>_<time>  */
export function makeOrderId(paymentRowId) {
  return `df_${String(paymentRowId).replace(/-/g, '')}_${Date.now().toString(36)}`.slice(0, 50);
}
export function paymentRowIdFromOrderId(orderId) {
  const m = /^df_([0-9a-f]{32})_/.exec(String(orderId || ''));
  if (!m) return null;
  const h = m[1];
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
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
 * Mark a payment as Paid after Cashfree confirms it.
 *
 * The source of truth is Cashfree itself: we fetch the order with our secret key and
 * check (a) it is PAID, (b) it belongs to THIS payments row, (c) the amount equals
 * what we charge. Nothing the browser sends is trusted. Idempotent: the browser
 * callback and the webhook may both call it.
 * (The DB columns are still named razorpay_*; they simply hold the Cashfree ids.)
 */
export async function settleOrder({ admin, orderId, fetchImpl = fetch }) {
  const rowId = paymentRowIdFromOrderId(orderId);
  if (!rowId) throw new HttpError(400, 'Order is not linked to a payment');

  const order = await cashfree(`/orders/${encodeURIComponent(orderId)}`, {}, fetchImpl);

  const { data: pay, error } = await admin.from('payments').select('*').eq('id', rowId).maybeSingle();
  if (error) throw new HttpError(500, error.message);
  if (!pay) throw new HttpError(404, 'Payment record not found');

  if (pay.status === 'Paid') return { alreadyPaid: true, payment: pay };
  if (pay.status === 'Refunded') throw new HttpError(409, 'Payment was refunded');

  const expected = Math.round(Number(pay.total) * 100);
  const got = Math.round(Number(order.order_amount) * 100);
  if (order.order_status !== 'PAID' || got !== expected || order.order_currency !== 'INR') {
    throw new HttpError(400, 'Payment not completed or amount mismatch');
  }

  // Find the successful attempt (for the record only).
  let cfPaymentId = null;
  try {
    const list = await cashfree(`/orders/${encodeURIComponent(orderId)}/payments`, {}, fetchImpl);
    const ok = (Array.isArray(list) ? list : []).find((p) => p.payment_status === 'SUCCESS');
    cfPaymentId = ok?.cf_payment_id != null ? String(ok.cf_payment_id) : null;
  } catch {
    /* not critical */
  }

  const { data: updated, error: upErr } = await admin
    .from('payments')
    .update({
      status: 'Paid',
      payment_method: 'cashfree',
      razorpay_order_id: orderId,
      razorpay_payment_id: cfPaymentId,
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
          buttonUrl: `${(process.env.SITE_URL || '').replace(/\/$/, '')}/admin-orders`,
          buttonLabel: 'Open Orders',
        }),
      });
    } catch (e) {
      console.error('[new-order-mail]', e);
    }
  }
  return { alreadyPaid: false, payment: updated || pay };
}
