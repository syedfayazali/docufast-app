import React, { useEffect, useState } from "react";
import { Phone, MapPin, Loader2, Save } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { base44 } from "@/api/base44Client";
import { fmtTime, fmtFull, todayIST, addDays, DAY_NAMES, statusTone } from "@/lib/appointments";
import { cn } from "@/lib/utils";

const field = "w-full rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none focus:border-gold";
const istDay = (d) => new Date(new Date(d).getTime() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
const hhmm = (t) => (t ? String(t).slice(0, 5) : "");

export default function AdminAppointments() {
  const [rows, setRows] = useState([]);
  const [tab, setTab] = useState("today");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [s, setS] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [holiday, setHoliday] = useState("");

  const load = async () => {
    setRows(await base44.entities.Appointment.list("slot_start", 500));
  };

  useEffect(() => {
    Promise.all([load(), base44.entities.AppointmentSettings.get("main").then(setS)])
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    return base44.entities.Appointment.subscribe(() => load().catch(() => {}));
  }, []);

  const setStatus = async (a, status) => {
    setBusy(a.id); setError("");
    try {
      await base44.entities.Appointment.update(a.id, { status });
      await load();
    } catch (e) { setError(e.message); }
    finally { setBusy(""); }
  };

  const saveNote = async (a, admin_note) => {
    if ((a.admin_note || "") === admin_note) return;
    try { await base44.entities.Appointment.update(a.id, { admin_note }); await load(); } catch (e) { setError(e.message); }
  };

  const today = todayIST();
  const todays = rows.filter((a) => istDay(a.slot_start) === today && a.status !== "Cancelled");
  const upcoming = rows.filter((a) => a.status === "Booked" && istDay(a.slot_start) > today);
  const history = rows.filter((a) => a.status !== "Booked" || istDay(a.slot_start) < today).reverse();
  const list = tab === "today" ? todays : tab === "upcoming" ? upcoming : history;

  const upd = (k, v) => { setS((x) => ({ ...x, [k]: v })); setSaved(false); };
  const toggleDay = (d) => upd("open_days", s.open_days.includes(d) ? s.open_days.filter((x) => x !== d) : [...s.open_days, d].sort());

  const saveSettings = async () => {
    setSaving(true); setError("");
    try {
      const { id, updated_date, ...payload } = s;
      payload.lunch_start = payload.lunch_start || null;
      payload.lunch_end = payload.lunch_end || null;
      payload.location = payload.location || null;
      payload.note = payload.note || null;
      for (const k of ["slot_minutes", "capacity", "advance_days", "min_notice_hours", "cancel_before_hours", "max_active_per_customer"]) payload[k] = Number(payload[k]);
      setS(await base44.entities.AppointmentSettings.update("main", payload));
      setSaved(true);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const addHoliday = () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(holiday) || s.holidays.includes(holiday)) return;
    upd("holidays", [...s.holidays, holiday].sort());
    setHoliday("");
  };

  return (
    <AdminLayout title="Appointments">
      {error && <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            {[["today", `Today (${todays.length})`], ["upcoming", `Upcoming (${upcoming.length})`], ["history", "History"]].map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)} className={cn("rounded-xl border px-2 py-2 text-xs font-semibold", tab === k ? "border-gold bg-gold/10 text-foreground" : "border-border bg-white text-muted-foreground")}>{l}</button>
            ))}
          </div>

          <div className="mt-3 space-y-3">
            {list.length === 0 && <p className="rounded-2xl border border-dashed border-border bg-white p-6 text-center text-sm text-muted-foreground">Nothing here.</p>}
            {list.map((a) => (
              <div key={a.id} className="rounded-2xl border border-border bg-white p-4 shadow-card">
                <div className="flex items-center justify-between">
                  <span className="font-heading text-sm font-bold text-foreground">{tab === "today" ? fmtTime(a.slot_start) : fmtFull(a.slot_start)}</span>
                  <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", statusTone[a.status])}>{a.status}</span>
                </div>
                <p className="mt-1 text-sm font-semibold text-foreground">{a.customer_name}</p>
                <a href={`tel:${a.customer_mobile}`} className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-gold"><Phone className="h-3.5 w-3.5" />{a.customer_mobile}</a>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  {a.kind === "Phone callback" ? <Phone className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />} {a.kind}
                  {a.service_name ? ` · ${a.service_name}` : ""}
                </p>
                {a.purpose && <p className="mt-1 text-xs text-foreground">“{a.purpose}”</p>}
                <p className="mt-1 font-mono text-[10px] text-muted-foreground">{a.reference}{a.status === "Cancelled" && a.cancelled_by ? ` · cancelled by ${a.cancelled_by}` : ""}</p>
                <input defaultValue={a.admin_note || ""} onBlur={(e) => saveNote(a, e.target.value.trim())} placeholder="Note for customer (optional)" maxLength={300} className={cn(field, "mt-2")} />
                {a.status === "Booked" && (
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <button disabled={busy === a.id} onClick={() => setStatus(a, "Completed")} className="rounded-xl bg-emerald-600 px-2 py-2 text-xs font-semibold text-white disabled:opacity-50">Done</button>
                    <button disabled={busy === a.id} onClick={() => setStatus(a, "No Show")} className="rounded-xl border border-border px-2 py-2 text-xs font-semibold text-foreground disabled:opacity-50">No-show</button>
                    <button disabled={busy === a.id} onClick={() => window.confirm("Cancel this appointment? The customer will see it as cancelled.") && setStatus(a, "Cancelled")} className="rounded-xl border border-red-200 px-2 py-2 text-xs font-semibold text-red-700 disabled:opacity-50">Cancel</button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {s && (
            <section className="mt-8 rounded-2xl border border-border bg-white p-4 shadow-card">
              <h2 className="font-heading text-base font-bold text-navy">Booking settings</h2>
              <label className="mt-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                <input type="checkbox" checked={s.active} onChange={(e) => upd("active", e.target.checked)} className="h-4 w-4 accent-[hsl(var(--gold))]" />
                Accept online bookings
              </label>

              <p className="mt-4 text-xs font-semibold text-muted-foreground">Working days</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {DAY_NAMES.map((n, i) => (
                  <button key={n} onClick={() => toggleDay(i)} className={cn("rounded-lg border px-3 py-1.5 text-xs font-semibold", s.open_days.includes(i) ? "border-gold bg-gold/10 text-foreground" : "border-border text-muted-foreground")}>{n}</button>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <Num label="Opens" type="time" value={hhmm(s.open_time)} onChange={(v) => upd("open_time", v)} />
                <Num label="Closes" type="time" value={hhmm(s.close_time)} onChange={(v) => upd("close_time", v)} />
                <Num label="Lunch from" type="time" value={hhmm(s.lunch_start)} onChange={(v) => upd("lunch_start", v)} />
                <Num label="Lunch to" type="time" value={hhmm(s.lunch_end)} onChange={(v) => upd("lunch_end", v)} />
                <Num label="Slot length (minutes)" value={s.slot_minutes} onChange={(v) => upd("slot_minutes", v)} />
                <Num label="People per slot" value={s.capacity} onChange={(v) => upd("capacity", v)} />
                <Num label="Book up to (days ahead)" value={s.advance_days} onChange={(v) => upd("advance_days", v)} />
                <Num label="Minimum notice (hours)" value={s.min_notice_hours} onChange={(v) => upd("min_notice_hours", v)} />
                <Num label="Customer can cancel until (hours before)" value={s.cancel_before_hours} onChange={(v) => upd("cancel_before_hours", v)} />
                <Num label="Max upcoming per customer" value={s.max_active_per_customer} onChange={(v) => upd("max_active_per_customer", v)} />
              </div>

              <label className="mt-3 block text-xs font-semibold text-muted-foreground">Office address shown to customers</label>
              <textarea rows={2} className={field} value={s.location || ""} onChange={(e) => upd("location", e.target.value)} />
              <label className="mt-3 block text-xs font-semibold text-muted-foreground">Message shown on booking page (optional)</label>
              <input className={field} value={s.note || ""} onChange={(e) => upd("note", e.target.value)} maxLength={200} placeholder="e.g. Please bring original documents" />

              <p className="mt-4 text-xs font-semibold text-muted-foreground">Holidays (closed dates)</p>
              <div className="mt-1 flex gap-2">
                <input type="date" min={todayIST()} max={addDays(todayIST(), 365)} className={field} value={holiday} onChange={(e) => setHoliday(e.target.value)} />
                <button onClick={addHoliday} className="rounded-xl bg-navy px-4 text-xs font-semibold text-white">Add</button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {s.holidays.map((h) => (
                  <button key={h} onClick={() => upd("holidays", s.holidays.filter((x) => x !== h))} className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-foreground">{h} ✕</button>
                ))}
              </div>

              <button onClick={saveSettings} disabled={saving} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-navy px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {saved ? "Saved ✓" : "Save settings"}
              </button>
              <p className="mt-2 text-[11px] text-muted-foreground">Changes apply to new bookings. Existing bookings are not moved.</p>
            </section>
          )}
        </>
      )}
    </AdminLayout>
  );
}

function Num({ label, value, onChange, type = "number" }) {
  return (
    <div>
      <label className="text-[11px] font-semibold text-muted-foreground">{label}</label>
      <input type={type} className={field} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
