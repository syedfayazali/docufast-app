// Shared appointment helpers. All times are India time (UTC+5:30, no daylight saving).
const IST = "+05:30";
const pad = (n) => String(n).padStart(2, "0");

export const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "YYYY-MM-DD" for today in India. */
export function todayIST() {
  const d = new Date(Date.now() + 5.5 * 3600 * 1000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function addDays(ymd, n) {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Day of week (0 = Sunday) of a YYYY-MM-DD date. */
export const dow = (ymd) => new Date(`${ymd}T00:00:00Z`).getUTCDay();

const toMin = (t) => {
  const [h, m] = String(t || "0:0").split(":").map(Number);
  return h * 60 + (m || 0);
};

export const slotInstant = (ymd, minutes) => new Date(`${ymd}T${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}:00${IST}`);

/**
 * Every slot of one day with its state.
 * counts: Map of ISO-time(ms) -> booked count
 */
export function slotsForDay(ymd, s, counts) {
  if (!s || !s.active) return [];
  if (!s.open_days.includes(dow(ymd)) || (s.holidays || []).includes(ymd)) return [];
  const open = toMin(s.open_time);
  const close = toMin(s.close_time);
  const ls = s.lunch_start ? toMin(s.lunch_start) : null;
  const le = s.lunch_end ? toMin(s.lunch_end) : null;
  const earliest = Date.now() + s.min_notice_hours * 3600 * 1000;
  const out = [];
  for (let t = open; t + s.slot_minutes <= close; t += s.slot_minutes) {
    if (ls !== null && le !== null && t < le && t + s.slot_minutes > ls) continue;
    const at = slotInstant(ymd, t);
    const booked = counts?.get(at.getTime()) || 0;
    out.push({
      at,
      label: fmtTime(at),
      free: Math.max(0, s.capacity - booked),
      available: at.getTime() >= earliest && booked < s.capacity,
    });
  }
  return out;
}

export const fmtTime = (d) =>
  new Date(d).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" });

export const fmtDay = (d) =>
  new Date(d).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" });

export const fmtFull = (d) => `${fmtDay(d)}, ${fmtTime(d)}`;

/** Days a customer can pick, starting today. */
export function bookableDays(s) {
  const t = todayIST();
  return Array.from({ length: (s?.advance_days || 14) + 1 }, (_, i) => addDays(t, i));
}

/** Can the customer still change this appointment online? */
export function canChange(a, s) {
  return a.status === "Booked" && new Date(a.slot_start).getTime() > Date.now() + (s?.cancel_before_hours ?? 2) * 3600 * 1000;
}

export const statusTone = {
  Booked: "bg-blue-50 text-blue-700",
  Completed: "bg-emerald-50 text-emerald-700",
  Cancelled: "bg-secondary text-muted-foreground",
  "No Show": "bg-red-50 text-red-700",
};

/** Slot counts -> Map(ms -> count) */
export const countMap = (rows) => new Map((rows || []).map((r) => [new Date(r.slot_start).getTime(), Number(r.booked)]));

import { supabase } from "@/lib/supabase";

/** Ask the server to e-mail the customer about this appointment. Never blocks or breaks the app. */
export async function notifyAppointment(id, event) {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) return { sent: false, detail: "not logged in" };
    const res = await fetch("/api/appointment-mail", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id, event }),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok || out.error) return { sent: false, detail: `server said ${res.status}: ${out.error || "no JSON (is /api/appointment-mail deployed?)"}` };
    return out;
  } catch (e) {
    return { sent: false, detail: `request failed: ${e?.message || e}` };
  }
}

const icsStamp = (d) => new Date(d).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** Download a calendar (.ics) file so the customer can add the appointment to their phone calendar. */
export function downloadIcs(a, where) {
  const text = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//DocuFast India//Appointments//EN", "BEGIN:VEVENT",
    `UID:${a.reference}@docufast`, `DTSTAMP:${icsStamp(new Date())}`, `DTSTART:${icsStamp(a.slot_start)}`, `DTEND:${icsStamp(a.slot_end)}`,
    `SUMMARY:DocuFast India appointment${a.service_name ? " - " + a.service_name : ""}`,
    `LOCATION:${String(where || "").replace(/[\r\n,;]/g, " ")}`, "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([text], { type: "text/calendar" }));
  const el = document.createElement("a");
  el.href = url; el.download = `appointment-${a.reference}.ics`; el.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
