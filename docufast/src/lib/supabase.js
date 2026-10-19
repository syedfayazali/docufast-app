import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Fail loudly in the console instead of a blank white screen.
  console.error(
    '[DocuFast] Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. ' +
      'Copy .env.example to .env (local) or add them in Vercel → Settings → Environment Variables.'
  );
}

export const supabase = createClient(url || 'http://missing-env.invalid', anonKey || 'missing', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true, // handles Google login + password-reset links
  },
});
