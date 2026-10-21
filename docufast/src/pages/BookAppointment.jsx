import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Calendar, Clock, MapPin, Phone, Building2, Loader2, CheckCircle2, ChevronLeft } from "lucide-react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { bookableDays, slotsForDay, countMap, dow, DAY_NAMES, fmtFull, fmtDay, slotInstant, notifyAppointment, downloadIcs } from "@/lib/appointments";
import { cn } from "@/lib/utils";

const field = "w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-gold";

export default function BookAppointment() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const rescheduleId = params.get("reschedule");

  const [settings, setSettings] = useState(null);
  const [counts, setCounts] = useState(new Map());
  const [apps, setApps] = useState([]);
  const [services, setServices] = useState([]);
  const [serviceId, setServiceId] = useState(params.get("service") || "");
  const [existing, setExisting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [day, setDay] = useState(null);
  const [slot, setSlot] = useState(null);
  const [kind, setKind] = useState("Office visit");
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [applicationId, setApplicationId] = useState(params.get("application") || "");
  const [purpose, setPurpose] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(null);

  const days = useMemo(() => (settings ? bookableDays(settings) : []), [settings]);

  const loadCounts = async (s) => {
    const list = bookableDays(s);
    const from = slotInstant(list[0], 0);
    const to = slotInstant(list[list.length - 1], 24 * 60 - 1);
    setCounts(countMap(await base44.appointments.slotCounts(from, to)));
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const s = await base44.entities.AppointmentSettings.get("main");
        setSettings(s);
        base44.entities.Service.list("display_order", 300).then((r) => setServices(r.filter((x) => x.active !== false))).catch(() => {});
        const [mine, appts] = await Promise.all([
          base44.entities.Application.filter({ created_by_id: user.id }, "-created_date", 30),
          rescheduleId ? base44.entities.Appointment.filter({ id: rescheduleId }) : Promise.resolve([]),
        ]);
        setApps(mine.filter((a) => a.status !== "Draft"));
        const last = mine[0];
        setName(last?.customer_name || user.full_name || "");
        setMobile(last?.customer_mobile && last.customer_mobile !== "-" ? last.customer_mobile : "");
        if (appts[0]) {
          setExisting(appts[0]);
          setKind(appts[0].kind);
          setName(appts[0].customer_name);
          setMobile(appts[0].customer_mobile);
          setApplicationId(appts[0].application_id || "");
          setServiceId(appts[0].service_id || (appts[0].service_name ? "" : "general"));
          setPurpose(appts[0].purpose || "");
        }
        await loadCounts(s);
      } catch (e) {
        setError(e.message || "Could not load appointment times.");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, rescheduleId]);

  // pick the first day that has an open slot
  useEffect(() => {
    if (!settings || day) return;
    const first = days.find((d) => slotsForDay(d, settings, counts).some((x) => x.available));
    setDay(first || days[0] || null);
  }, [settings, counts, days, day]);

  const slots = useMemo(() => (settings && day ? slotsForDay(day, settings, counts) : []), [settings, day, counts]);

  const submit = async () => {
    setError("");
    if (!slot) return setError("Please choose a time.");
    if (!existing) {
      if (!serviceId && !applicationId) return setError("Please select the service you need help with.");
      if (!name.trim()) return setError("Please enter your name.");
      if (!/^[0-9+\- ]{8,15}$/.test(mobile.trim())) return setError("Please enter a valid mobile number.");
    }
    setSaving(true);
    try {
      let row;
      if (existing) {
        row = await base44.entities.Appointment.update(existing.id, { slot_start: slot.at.toISOString() });
      } else {
        row = await base44.entities.Appointment.create({
          kind,
          customer_name: name.trim(),
          customer_mobile: mobile.trim(),
          customer_email: user?.email || null,
          application_id: applicationId || null,
          service_id: !applicationId && serviceId && serviceId !== "general" ? serviceId : null,
          purpose: purpose.trim() || null,
          slot_start: slot.at.toISOString(),
        });
      }
      const mail = await notifyAppointment(row.id, existing ? "rescheduled" : "booked");
      setDone({ ...row, _mailed: !!mail.sent, _mailWhy: mail.sent ? '' : (mail.detail || mail.reason || 'unknown') });
    } catch (e) {
      setError(e.message || "Could not book. Please try another slot.");
      setSlot(null);
      try { await loadCounts(settings); } catch { /* ignore */ }
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-secondary/40">
        <Header />
        <main className="mx-auto max-w-md px-4 pb-24 pt-8 text-center">
          <div className="rounded-2xl border border-border bg-white p-6 shadow-card">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
            <h1 className="mt-3 font-heading text-lg font-bold text-foreground">{existing ? "Appointment rescheduled" : "Appointment booked"}</h1>
            <p className="mt-1 font-mono text-xs font-semibold text-navy">{done.reference}</p>
            <div className="mt-4 rounded-xl bg-secondary p-3 text-left text-sm">
              <Row k="Date & time" v={fmtFull(done.slot_start)} />
              <Row k="Type" v={done.kind} />
              <Row k="Service" v={done.service_name || "General enquiry"} />
              <Row k="Name" v={done.customer_name} />
              <Row k="Mobile" v={done.customer_mobile} />
              <Row k={done.kind === "Phone callback" ? "We will call" : "Where"} v={done.kind === "Phone callback" ? done.customer_mobile : settings?.location || "Our office"} />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {done._mailed ? `A confirmation was sent to ${done.customer_email || user?.email}. ` : ""}
              {!done._mailed && done._mailWhy ? `(Confirmation email not sent: ${done._mailWhy}.) ` : ""}
              {done.kind === "Office visit" ? "Please arrive 5–10 minutes early and bring your original documents. " : ""}
              You can reschedule or cancel from My Appointments.
            </p>
            <div className="mt-3 flex gap-2">
              <button onClick={() => downloadIcs(done, settings?.location)} className="flex-1 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-foreground">Add to calendar</button>
              <Link to={`/appointment/${done.id}`} className="flex-1 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-foreground">View receipt</Link>
            </div>
            <div className="mt-5 flex gap-2">
              <Link to="/my-appointments" className="flex-1 rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white">My appointments</Link>
              <Link to="/dashboard" className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground">Dashboard</Link>
            </div>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/40">
      <Header />
      <main className="mx-auto max-w-lg px-4 pb-28 pt-4">
        <button onClick={() => nav(-1)} className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        <h1 className="font-heading text-xl font-bold text-foreground">{existing ? "Reschedule appointment" : "Book an appointment"}</h1>
        {existing && <p className="mt-1 text-xs text-muted-foreground">Currently {fmtFull(existing.slot_start)}</p>}

        {loading ? (
          <div className="mt-6 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : !settings || !settings.active ? (
          <div className="mt-4 rounded-2xl border border-border bg-white p-5 text-sm text-muted-foreground shadow-card">
            Online booking is not open right now. Please <Link to="/contact" className="font-semibold text-gold">contact us</Link>.
          </div>
        ) : (
          <>
            {settings.location && (
              <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />{settings.location}</p>
            )}
            {settings.note && <p className="mt-1 text-xs text-muted-foreground">{settings.note}</p>}

            {!existing && (
              <div className="mt-4 grid grid-cols-2 gap-2">
                {[["Office visit", Building2], ["Phone callback", Phone]].map(([k, Icon]) => (
                  <button key={k} onClick={() => setKind(k)} className={cn("flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold", kind === k ? "border-gold bg-gold/10 text-foreground" : "border-border bg-white text-muted-foreground")}>
                    <Icon className="h-4 w-4" /> {k}
                  </button>
                ))}
              </div>
            )}

            <h2 className="mt-5 flex items-center gap-1.5 text-sm font-bold text-foreground"><Calendar className="h-4 w-4" /> Choose a date</h2>
            <div className="mt-2 flex gap-2 overflow-x-auto pb-2">
              {days.map((d) => {
                const open = slotsForDay(d, settings, counts).some((x) => x.available);
                return (
                  <button key={d} disabled={!open} onClick={() => { setDay(d); setSlot(null); }}
                    className={cn("flex w-16 shrink-0 flex-col items-center rounded-xl border px-2 py-2 text-center", d === day ? "border-gold bg-gold/10" : "border-border bg-white", !open && "opacity-40")}>
                    <span className="text-[10px] font-semibold uppercase text-muted-foreground">{DAY_NAMES[dow(d)]}</span>
                    <span className="font-heading text-lg font-bold text-foreground">{Number(d.slice(8))}</span>
                    <span className="text-[10px] text-muted-foreground">{open ? new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { month: "short", timeZone: "UTC" }) : "Full"}</span>
                  </button>
                );
              })}
            </div>

            <h2 className="mt-4 flex items-center gap-1.5 text-sm font-bold text-foreground"><Clock className="h-4 w-4" /> Choose a time</h2>
            {slots.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">We are closed on this day.</p>
            ) : (
              <div className="mt-2 grid grid-cols-3 gap-2">
                {slots.map((s) => (
                  <button key={s.at.getTime()} disabled={!s.available} onClick={() => setSlot(s)}
                    className={cn("rounded-xl border px-2 py-2.5 text-sm font-semibold", slot?.at.getTime() === s.at.getTime() ? "border-gold bg-gold text-navy" : "border-border bg-white text-foreground", !s.available && "cursor-not-allowed opacity-40 line-through")}>
                    {s.label}
                  </button>
                ))}
              </div>
            )}

            {!existing && (
              <div className="mt-5 space-y-3 rounded-2xl border border-border bg-white p-4 shadow-card">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Service you need help with *</label>
                  <select className={field} value={applicationId ? (apps.find((x) => x.id === applicationId)?.service_id || "") : serviceId} disabled={!!applicationId} onChange={(e) => setServiceId(e.target.value)}>
                    <option value="">— Select a service —</option>
                    {[...new Set(services.map((x) => x.category))].map((c) => (
                      <optgroup key={c} label={c}>
                        {services.filter((x) => x.category === c).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                      </optgroup>
                    ))}
                    <option value="general">General enquiry / not sure</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Your name</label>
                  <input className={field} value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Mobile number</label>
                  <input className={field} inputMode="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} maxLength={15} />
                </div>
                {apps.length > 0 && (
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">About an application (optional)</label>
                    <select className={field} value={applicationId} onChange={(e) => { setApplicationId(e.target.value); if (e.target.value) setServiceId(""); }}>
                      <option value="">— Not about a specific application —</option>
                      {apps.map((a) => <option key={a.id} value={a.id}>{a.reference} · {a.service_name}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">What do you need help with? (optional)</label>
                  <textarea className={field} rows={2} maxLength={500} value={purpose} onChange={(e) => setPurpose(e.target.value)} />
                </div>
              </div>
            )}

            {error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

            <button onClick={submit} disabled={saving || !slot} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-navy px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {slot ? `${existing ? "Move to" : "Book"} ${fmtDay(slot.at)}, ${slot.label}` : "Choose a time"}
            </button>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              You can cancel or reschedule up to {settings.cancel_before_hours} hour(s) before. Times are India time.
            </p>
          </>
        )}
      </main>
      <BottomNav />
    </div>
  );
}

function Row({ k, v }) {
  return (
    <div className="flex justify-between gap-3 py-1">
      <span className="text-muted-foreground">{k}</span>
      <span className="text-right font-semibold text-foreground">{v}</span>
    </div>
  );
}
