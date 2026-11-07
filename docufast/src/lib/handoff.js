import { supabase } from "@/lib/supabase";

/*
 * The website opens on app.docufastindia.com, but the online payment window (Razorpay) must run on
 * the original address docufast-app.vercel.app. A browser keeps the login separately for each
 * address, so when the customer is sent across, their login is carried with them in the "#" part
 * of the link. That part never goes to any server, and it is removed from the address bar at once.
 */
export const MAIN_HOST = "app.docufastindia.com";
export const PAY_HOST = "docufast-app.vercel.app";
const KEY = "df_handoff";
const FLAG = "df_from_main";

const enc = (obj) => btoa(unescape(encodeURIComponent(JSON.stringify(obj)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const dec = (s) => JSON.parse(decodeURIComponent(escape(atob(s.replace(/-/g, "+").replace(/_/g, "/")))));

/** Link to `path` on `host` that signs the customer in there with the session they have here. */
export async function handoffUrl(host, path, { fromMain = false } = {}) {
  const { data } = await supabase.auth.getSession();
  const s = data?.session;
  const base = `https://${host}${path}`;
  if (!s?.access_token || !s?.refresh_token) return base;
  return `${base}#${KEY}=${enc({ a: s.access_token, r: s.refresh_token, f: fromMain ? 1 : 0 })}`;
}

/** Run before the app starts: signs the customer in from a link made by handoffUrl(), then cleans the address bar. */
export async function consumeHandoff() {
  try {
    const m = window.location.hash.match(new RegExp(`[#&]${KEY}=([^&]+)`));
    if (!m) return;
    const clean = window.location.pathname + window.location.search;
    window.history.replaceState(null, "", clean);
    const p = dec(m[1]);
    if (p?.a && p?.r) {
      await supabase.auth.setSession({ access_token: p.a, refresh_token: p.r });
      if (p.f) sessionStorage.setItem(FLAG, "1");
    }
  } catch {
    /* if anything goes wrong the customer simply logs in again */
  }
}

export const cameFromMain = () => {
  try { return sessionStorage.getItem(FLAG) === "1"; } catch { return false; }
};
export const clearCameFromMain = () => {
  try { sessionStorage.removeItem(FLAG); } catch { /* ignore */ }
};
