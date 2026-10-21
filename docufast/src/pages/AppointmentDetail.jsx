import React, { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, Loader2, Printer, CalendarPlus, MapPin, Phone } from "lucide-react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { fmtFull, fmtTime, canChange, statusTone, downloadIcs, notifyAppointment } from "@/lib/appointments";
import { cn } from "@/lib/utils";

const stamp = (d) => new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" });

const Row = ({ k, v }) => v ? (
  <div className="flex justify-between gap-4 border-b border-border/60 py-2 last:border-0">
    <span className="text-xs text-muted-foreground">{k}</span>
    <span className="text-right text-sm font-semibold text-foreground">{v}</span>
  </div>
) : null;

export default function AppointmentDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [a, setA] = useState(null);
  const [s, setS] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [row, st] = await Promise.all([
      base44.entities.Appointment.get(id),
      base44.entities.AppointmentSettings.get("main").catch(() => null),
    ]);
    setA(row); setS(st);
  };
  useEffect(() => { load().catch(() => setErr("Appointment not found.")); /* eslint-disable-next-line */ }, [id]);

  const cancel = async () => {
    if (!window.confirm("Cancel this appointment?")) return;
    setBusy(true); setErr("");
    try {
      await base44.entities.Appointment.update(a.id, { status: "Cancelled" });
      await notifyAppointment(a.id, "cancelled");
      await load();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  const steps = a ? [
    ["Booked", stamp(a.created_date), true],
    ...(a.status === "Cancelled" ? [[`Cancelled${a.cancelled_by === "admin" ? " by our office" : ""}`, stamp(a.updated_date), true]]
      : a.status === "Booked" ? [["Visit / call", fmtFull(a.slot_start), false]]
      : [[a.status, stamp(a.updated_date), true]]),
  ] : [];

  return (
    <div className="min-h-screen bg-secondary/40">
      <div className="print:hidden"><Header /></div>
      <main className="mx-auto max-w-md px-4 pb-28 pt-4">
        <button onClick={() => nav(-1)} className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground print:hidden"><ChevronLeft className="h-4 w-4" /> Back</button>
        {err && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
        {!a && !err && <div className="mt-6 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}
        {a && (
          <div className="rounded-2xl border border-border bg-white p-5 shadow-card">
            <div className="flex items-center justify-between">
              <h1 className="font-heading text-base font-bold text-navy">Appointment Receipt</h1>
              <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", statusTone[a.status])}>{a.status}</span>
            </div>
            <p className="mt-1 font-mono text-xs font-semibold text-navy">{a.reference}</p>

            <div className="mt-4 rounded-xl bg-secondary p-4 text-center">
              <p className="text-xs text-muted-foreground">Date & time</p>
              <p className="font-heading text-lg font-bold text-foreground">{fmtFull(a.slot_start)}</p>
              <p className="text-xs text-muted-foreground">until {fmtTime(a.slot_end)} (India time)</p>
            </div>

            <div className="mt-3">
              <Row k="Type" v={a.kind} />
              <Row k={a.kind === "Phone callback" ? "We will call" : "Where"} v={a.kind === "Phone callback" ? a.customer_mobile : s?.location || "Our office"} />
              <Row k="Service" v={a.service_name || "General enquiry"} />
              <Row k="Name" v={a.customer_name} />
              <Row k="Mobile" v={a.customer_mobile} />
              <Row k="Email" v={a.customer_email} />
              <Row k="Your note" v={a.purpose} />
              <Row k="Message from us" v={a.admin_note} />
              <Row k="Booked on" v={stamp(a.created_date)} />
            </div>

            <h2 className="mt-4 text-xs font-bold uppercase tracking-wide text-muted-foreground">Progress</h2>
            <ol className="mt-2 space-y-2">
              {steps.map(([t, when, done]) => (
                <li key={t} className="flex items-start gap-2 text-sm">
                  <span className={cn("mt-1.5 h-2.5 w-2.5 rounded-full", done ? "bg-emerald-500" : "bg-gold")} />
                  <span><b>{t}</b> <span className="text-xs text-muted-foreground">· {when}</span></span>
                </li>
              ))}
            </ol>

            {a.status === "Booked" && (
              <div className="mt-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
                {a.kind === "Office visit" ? "Please arrive 5–10 minutes early and bring your original documents. " : "Please keep your phone reachable at this time. "}
                {s?.note || ""}
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-2 print:hidden">
              <button onClick={() => window.print()} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold"><Printer className="h-4 w-4" /> Print</button>
              <button onClick={() => downloadIcs(a, s?.location)} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold"><CalendarPlus className="h-4 w-4" /> Add to calendar</button>
              {a.status === "Booked" && canChange(a, s) && (
                <>
                  <Link to={`/book-appointment?reschedule=${a.id}`} className="rounded-xl bg-navy px-3 py-2 text-center text-xs font-semibold text-white">Reschedule</Link>
                  <button disabled={busy} onClick={cancel} className="rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-50">{busy ? "Cancelling…" : "Cancel"}</button>
                </>
              )}
            </div>
            {a.status === "Booked" && !canChange(a, s) && <p className="mt-3 text-[11px] text-muted-foreground print:hidden">Too close to the time to change online. Please call us.</p>}
            <p className="mt-4 text-[10px] text-muted-foreground">DocuFast India™ is a private service provider and is not a government website.</p>
          </div>
        )}
      </main>
      <div className="print:hidden"><BottomNav /></div>
    </div>
  );
}
