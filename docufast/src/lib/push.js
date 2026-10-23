// Phone notifications (web push) helpers for the browser / installed app.
import { supabase } from "@/lib/supabase";

export const pushSupported = () =>
  typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

const b64ToBytes = (s) => {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const raw = atob((s + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
};

async function token() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || "";
}

async function registration() {
  return (await navigator.serviceWorker.getRegistration("/")) || (await navigator.serviceWorker.register("/sw.js"));
}

/** "on" | "off" | "blocked" | "unsupported" */
export async function pushState() {
  if (!pushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "blocked";
  try {
    const reg = await navigator.serviceWorker.getRegistration("/");
    const sub = reg && (await reg.pushManager.getSubscription());
    return sub && Notification.permission === "granted" ? "on" : "off";
  } catch {
    return "off";
  }
}

export async function enablePush() {
  if (!pushSupported()) throw new Error("This phone or browser does not support notifications.");
  const res = await fetch("/api/push-subscribe");
  const cfg = await res.json().catch(() => ({}));
  if (!cfg.enabled || !cfg.publicKey) throw new Error("Notifications are not switched on for this site yet.");

  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw new Error("Permission was not given. You can allow notifications in your phone's settings.");

  const reg = await registration();
  await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  const sub = existing || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(cfg.publicKey) }));

  const save = await fetch("/api/push-subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${await token()}` },
    body: JSON.stringify({ subscription: sub.toJSON() }),
  });
  if (!save.ok) throw new Error("Could not save. Please log in again and retry.");
}

export async function disablePush() {
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = reg && (await reg.pushManager.getSubscription());
  if (!sub) return;
  await fetch("/api/push-subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${await token()}` },
    body: JSON.stringify({ remove: true, endpoint: sub.endpoint }),
  }).catch(() => {});
  await sub.unsubscribe().catch(() => {});
}

/** Admin side: ask the server to notify the customer. Never blocks or breaks the app. */
export async function pushNotify(type, id) {
  try {
    await fetch("/api/push-send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${await token()}` },
      body: JSON.stringify({ type, id }),
    });
  } catch {
    /* ignore */
  }
}
