/**
 * Backend adapter.
 *
 * The pages were generated against the Base44 SDK (base44.entities.X.list(),
 * base44.auth.me(), ...). This file keeps that exact interface but talks to
 * Supabase (Postgres + Auth + Storage), so no page needed rewriting.
 *
 *   Base44 entity  ->  Supabase table
 *   Service        ->  services
 *   Category       ->  categories
 *   Banner         ->  banners
 *   Application    ->  applications
 *   Payment        ->  payments
 *   User           ->  profiles
 */
import { supabase } from '@/lib/supabase';

const TABLES = {
  Service: 'services',
  Category: 'categories',
  Banner: 'banners',
  Application: 'applications',
  Payment: 'payments',
  User: 'profiles',
  Address: 'addresses',
  Appointment: 'appointments',
  AppointmentSettings: 'appointment_settings',
  ApplicationUpdate: 'application_updates',
};

// Columns the database owns; never sent back on update/create.
const SYSTEM_FIELDS = ['id', 'created_date', 'updated_date', 'created_by', 'created_by_id'];

const clean = (data = {}) =>
  Object.fromEntries(Object.entries(data).filter(([k]) => !SYSTEM_FIELDS.includes(k)));

function fail(error) {
  const err = new Error(error?.message || 'Request failed');
  err.status = error?.status || (error?.code === 'PGRST301' ? 401 : 400);
  err.code = error?.code;
  throw err;
}

function applySort(query, sort) {
  if (!sort) return query.order('created_date', { ascending: false });
  const desc = sort.startsWith('-');
  const col = desc ? sort.slice(1) : sort;
  return query.order(col, { ascending: !desc });
}

function applyFilters(query, filters = {}) {
  for (const [key, value] of Object.entries(filters)) {
    if (value === null) query = query.is(key, null);
    else if (Array.isArray(value)) query = query.in(key, value);
    else if (value && typeof value === 'object' && Array.isArray(value.$in)) query = query.in(key, value.$in);
    else query = query.eq(key, value);
  }
  return query;
}

function entity(table) {
  return {
    async list(sort, limit) {
      let q = applySort(supabase.from(table).select('*'), sort);
      if (limit) q = q.limit(limit);
      const { data, error } = await q;
      if (error) fail(error);
      return data || [];
    },

    async filter(filters, sort, limit) {
      let q = applyFilters(supabase.from(table).select('*'), filters);
      q = applySort(q, sort);
      if (limit) q = q.limit(limit);
      const { data, error } = await q;
      if (error) fail(error);
      return data || [];
    },

    async get(id) {
      const { data, error } = await supabase.from(table).select('*').eq('id', id).maybeSingle();
      if (error) fail(error);
      if (!data) fail({ message: 'Not found', status: 404 });
      return data;
    },

    async create(payload) {
      const { data, error } = await supabase.from(table).insert(clean(payload)).select().single();
      if (error) fail(error);
      return data;
    },

    async update(id, payload) {
      const { data, error } = await supabase
        .from(table)
        .update(clean(payload))
        .eq('id', id)
        .select()
        .maybeSingle();
      if (error) fail(error);
      // RLS silently filters rows you may not touch -> data is null.
      if (!data) fail({ message: 'Update not permitted or record not found', status: 403 });
      return data;
    },

    async delete(id) {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) fail(error);
      return { success: true };
    },

    /** Live updates. Returns an unsubscribe function. */
    subscribe(callback) {
      const channel = supabase
        .channel(`rt-${table}-${Math.random().toString(36).slice(2)}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, (p) => {
          const type = p.eventType === 'INSERT' ? 'create' : p.eventType === 'UPDATE' ? 'update' : 'delete';
          const row = p.eventType === 'DELETE' ? null : p.new;
          callback({ type, id: (p.new?.id ?? p.old?.id), data: row });
        })
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    },
  };
}

const entities = Object.fromEntries(Object.entries(TABLES).map(([name, table]) => [name, entity(table)]));

/* ------------------------------ AUTH ------------------------------ */

async function me() {
  const { data } = await supabase.auth.getSession();
  const authUser = data?.session?.user;
  if (!authUser) fail({ message: 'Not authenticated', status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authUser.id)
    .maybeSingle();

  const meta = authUser.user_metadata || {};

  // Own uploaded photo: saved link first; if the link is missing, look for the file itself.
  let ownPhoto = profile?.avatar_url || '';
  if (!ownPhoto) {
    try {
      const { data: files } = await supabase.storage.from('avatars').list(authUser.id, { limit: 5 });
      const f = (files || []).find((x) => x.name === 'avatar.jpg');
      if (f) {
        const base = supabase.storage.from('avatars').getPublicUrl(`${authUser.id}/avatar.jpg`).data.publicUrl;
        ownPhoto = `${base}?v=${encodeURIComponent(f.updated_at || f.created_at || '1')}`;
      }
    } catch {
      /* no photo */
    }
  }
  return {
    id: authUser.id,
    email: authUser.email,
    full_name: profile?.full_name || meta.full_name || meta.name || '',
    role: profile?.role || 'user',
    // own upload first, then the Google profile picture if they signed in with Google
    avatar_url: ownPhoto || meta.avatar_url || meta.picture || '',
    created_date: authUser.created_at,
  };
}

const origin = () => window.location.origin;

const auth = {
  me,

  async isAuthenticated() {
    const { data } = await supabase.auth.getSession();
    return !!data?.session;
  },

  async loginViaEmailPassword(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) fail(error);
    return { access_token: data.session?.access_token };
  },

  async register({ email, password }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: origin() },
    });
    if (error) fail(error);
    return data;
  },

  async verifyOtp({ email, otpCode }) {
    const { data, error } = await supabase.auth.verifyOtp({ email, token: otpCode, type: 'signup' });
    if (error) fail(error);
    return { access_token: data.session?.access_token };
  },

  async resendOtp(email) {
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    if (error) fail(error);
  },

  // Supabase already persists the session itself.
  setToken() {},

  loginWithProvider(provider, returnTo = '/') {
    return supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: origin() + returnTo },
    });
  },

  async resetPasswordRequest(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin()}/reset-password?token=recovery`,
    });
    if (error) fail(error);
  },

  async resetPassword({ newPassword }) {
    const { data } = await supabase.auth.getSession();
    if (!data?.session) fail({ message: 'This reset link has expired. Please request a new one.' });
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) fail(error);
    await supabase.auth.signOut();
  },

  async logout(redirectUrl) {
    await supabase.auth.signOut();
    if (redirectUrl) window.location.href = redirectUrl;
  },

  redirectToLogin(returnTo) {
    const target = returnTo ? `?returnTo=${encodeURIComponent(new URL(returnTo, origin()).pathname)}` : '';
    window.location.href = `/login${target}`;
  },
};

/* ----------------------------- STORAGE ---------------------------- */

const PUBLIC_BUCKET = 'public-assets';
const PRIVATE_BUCKET = 'private-files';

const safeName = (name = 'file') => name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

const Core = {
  /** Public file (banner images). Admin only by storage policy. */
  async UploadFile({ file }) {
    const path = `${uid()}-${safeName(file.name)}`;
    const { error } = await supabase.storage.from(PUBLIC_BUCKET).upload(path, file, { contentType: file.type });
    if (error) fail(error);
    const { data } = supabase.storage.from(PUBLIC_BUCKET).getPublicUrl(path);
    return { file_url: data.publicUrl };
  },

  /** Private file stored under the signed-in user's own folder. */
  async UploadPrivateFile({ file, folder = 'uploads' }) {
    const { data: s } = await supabase.auth.getSession();
    const userId = s?.session?.user?.id;
    if (!userId) fail({ message: 'Please log in again', status: 401 });
    const path = `${userId}/${folder}/${uid()}-${safeName(file.name)}`;
    const { error } = await supabase.storage.from(PRIVATE_BUCKET).upload(path, file, { contentType: file.type });
    if (error) fail(error);
    return { file_uri: path };
  },

  async CreateFileSignedUrl({ file_uri, expires_in = 600 }) {
    const { data, error } = await supabase.storage.from(PRIVATE_BUCKET).createSignedUrl(file_uri, expires_in);
    if (error) fail(error);
    return { signed_url: data.signedUrl };
  },
};

/** Appointment helpers: which slots are already taken (counts only, no personal data). */
const appointments = {
  async slotCounts(from, to) {
    const { data, error } = await supabase.rpc('appointment_slot_counts', {
      p_from: from.toISOString(),
      p_to: to.toISOString(),
    });
    if (error) fail(error);
    return data || [];
  },
};

export const base44 = { entities, auth, integrations: { Core }, appointments };
export default base44;
