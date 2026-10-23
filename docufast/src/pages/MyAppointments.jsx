import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, MapPin, Phone, Loader2 } from "lucide-react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import EmptyState from "@/components/EmptyState";
import { backend } from "@/api/backend";
import { useAuth } from "@/lib/AuthContext";
import { fmtFull, canChange, statusTone, notifyAppointment } from "@/lib/appointments";
import { cn } from "@/lib/utils";

export default function MyAppointments() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    const [a, s] = await Promise.all([
      backend.entities.Appointment.filter({ created_by_id: user.id }, "-slot_start", 100),
      backend.entities.AppointmentSettings.get("main").catch(() => null),
    ]);
    setRows(a);
    setSettings(s);
  };

  useEffect(() => {
    if (!user) return;
    load().catch((e) => setError(e.message)).finally(() => setLoading(false));
    const off = backend.entities.Appointment.subscribe(() => load().catch(() => {}));
    return off;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const cancel = async (a) => {
    if (!window.confirm("Cancel this appointment?")) return;
    setBusy(a.id); setError("");
    try { await backend.entities.Appointment.update(a.id, { status: "Cancelled" }); await notifyAppointment(a.id, "cancelled"); await load(); }
    catch (e) { setError(e.message); }
    finally { setBusy(""); }
  };

  const now = Date.now();
  const upcoming = rows.filter((a) => a.status === "Booked" && new Date(a.slot_end).getTime() > now).reverse();
  const past = rows.filter((a) => !upcoming.includes(a));

  const Card = ({ a }) => (
    <div className="rounded-2xl border border-border bg-white p-4 shadow-card">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs font-semibold text-navy">{a.reference}</span>
        <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", statusTone[a.status])}>{a.status}</span>
      </div>
      <Link to={`/appointment/${a.id}`} className="mt-2 block font-heading text-sm font-semibold text-foreground">{fmtFull(a.slot_start)}</Link>
      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        {a.kind === "Phone callback" ? <Phone className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
        {a.kind === "Phone callback" ? `We will call ${a.customer_mobile}` : settings?.location || "Our office"}
      </p>
      {a.service_name && <p className="mt-1 text-xs text-muted-foreground">For: {a.service_name}</p>}
      <Link to={`/appointment/${a.id}`} className="mt-1 inline-block text-[11px] font-semibold text-gold">View receipt &amp; details →</Link>
      {a.admin_note && <p className="mt-2 rounded-lg bg-secondary px-2.5 py-1.5 text-xs text-foreground">Note from us: {a.admin_note}</p>}
      {a.status === "Booked" && (
        canChange(a, settings) ? (
          <div className="mt-3 flex gap-2">
            <Link to={`/book-appointment?reschedule=${a.id}`} className="flex-1 rounded-xl border border-border px-3 py-2 text-center text-xs font-semibold text-foreground">Reschedule</Link>
            <button disabled={busy === a.id} onClick={() => cancel(a)} className="flex-1 rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-50">
              {busy === a.id ? "Cancelling…" : "Cancel"}
            </button>
          </div>
        ) : (
          <p className="mt-3 text-[11px] text-muted-foreground">Too close to the time to change online. Please call us.</p>
        )
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-secondary/40">
      <Header />
      <main className="mx-auto max-w-lg px-4 pb-28 pt-4">
        <div className="flex items-center justify-between">
          <h1 className="font-heading text-xl font-bold text-foreground">My Appointments</h1>
          <Link to="/book-appointment" className="rounded-xl bg-navy px-3 py-2 text-xs font-semibold text-white">+ Book</Link>
        </div>
        {error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {loading ? (
          <div className="mt-6 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : rows.length === 0 ? (
          <div className="mt-4"><EmptyState icon={Calendar} title="No appointments yet" description="Pick a time that suits you." action={<Link to="/book-appointment" className="rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white">Book now</Link>} /></div>
        ) : (
          <>
            {upcoming.length > 0 && <h2 className="mt-5 text-sm font-bold text-foreground">Upcoming</h2>}
            <div className="mt-2 space-y-3">{upcoming.map((a) => <Card key={a.id} a={a} />)}</div>
            {past.length > 0 && <h2 className="mt-6 text-sm font-bold text-foreground">History</h2>}
            <div className="mt-2 space-y-3">{past.map((a) => <Card key={a.id} a={a} />)}</div>
          </>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
