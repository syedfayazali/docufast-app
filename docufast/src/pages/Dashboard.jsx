import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FileText, Activity, Upload, Calendar, Headphones, ArrowRight, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import StatusBadge from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

const quickActions = [
  { label: "Apply for Service", icon: FileText, to: "/services" },
  { label: "Track Application", icon: Activity, to: "/applications" },
  { label: "Upload Documents", icon: Upload, to: "/applications" },
  { label: "Book Appointment", icon: Calendar, to: "/services" },
  { label: "Contact Support", icon: Headphones, to: "/help" },
];

const nextStep = (status) => {
  switch (status) {
    case "Draft": return "Complete payment to submit";
    case "Submitted": return "Awaiting review";
    case "Under Review": return "In progress with our team";
    case "Action Required": return "Action needed from you";
    case "Approved": return "Awaiting delivery";
    case "Completed": return "Documents delivered";
    case "Rejected": return "Application rejected";
    default: return "In progress";
  }
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export default function Dashboard() {
  const { user } = useAuth();
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    base44.entities.Application.filter({ created_by_id: user.id }, "-created_date")
      .then(setApps)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const activeApps = apps.filter((a) => !["Completed", "Rejected", "Cancelled"].includes(a.status));
  const completed = apps.filter((a) => a.status === "Completed").length;
  const actionReq = apps.filter((a) => a.status === "Action Required").length;
  const notifications = apps.slice(0, 3).map((a) => ({ id: a.id, text: `Your application ${a.reference} is ${a.status}.`, time: fmtDate(a.created_date) }));

  return (
    <div className="min-h-screen bg-secondary/40">
      <Header />
      <main className="mx-auto max-w-5xl px-4 pb-24 pt-4">
        <div className="rounded-2xl bg-navy p-5 text-white">
          <p className="text-sm text-white/70">Welcome back,</p>
          <h1 className="font-heading text-xl font-bold">{user?.full_name || "Customer"}</h1>
          <p className="mt-1 text-xs text-white/60">Manage your applications and appointments in one place.</p>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <StatCard label="Active" value={activeApps.length} icon={Clock} tone="text-amber-600 bg-amber-50" />
          <StatCard label="Completed" value={completed} icon={CheckCircle2} tone="text-emerald-600 bg-emerald-50" />
          <StatCard label="Action Required" value={actionReq} icon={AlertCircle} tone="text-orange-600 bg-orange-50" />
        </div>

        <h2 className="mt-6 px-1 font-heading text-base font-bold text-foreground">Quick Actions</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {quickActions.map(({ label, icon: Icon, to }) => (
            <Link key={label} to={to} className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-white p-4 text-center shadow-card transition-all hover:border-gold/60">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy/5 text-navy">
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-[11px] font-semibold text-foreground">{label}</span>
            </Link>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between px-1">
          <h2 className="font-heading text-base font-bold text-foreground">Active Applications</h2>
          <Link to="/applications" className="text-xs font-semibold text-gold">View all</Link>
        </div>
        <div className="mt-3 space-y-3">
          {loading ? (
            <div className="rounded-2xl border border-border bg-white p-4 shadow-card text-sm text-muted-foreground">Loading…</div>
          ) : activeApps.length === 0 ? (
            <EmptyState icon={FileText} title="No active applications" description="Apply for a service to get started." action={<Link to="/services" className="rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white">Browse Services</Link>} />
          ) : (
            activeApps.slice(0, 3).map((a) => (
              <Link key={a.id} to={`/applications/${a.id}`} className="block rounded-2xl border border-border bg-white p-4 shadow-card">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-navy">{a.reference}</span>
                  <StatusBadge status={a.status} />
                </div>
                <h3 className="mt-2 font-heading text-sm font-semibold text-foreground">{a.service_name}</h3>
                <p className="mt-1 text-xs text-muted-foreground">Submitted {fmtDate(a.created_date)}</p>
                <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-secondary px-2.5 py-1.5">
                  <ArrowRight className="h-3.5 w-3.5 text-gold" />
                  <span className="text-[11px] font-medium text-muted-foreground">Next: {nextStep(a.status)}</span>
                </div>
              </Link>
            ))
          )}
        </div>

        <h2 className="mt-6 px-1 font-heading text-base font-bold text-foreground">Upcoming Appointments</h2>
        <div className="mt-3">
          <EmptyState icon={Calendar} title="No appointments" description="Book one from a service page." />
        </div>

        <h2 className="mt-6 px-1 font-heading text-base font-bold text-foreground">Recent Notifications</h2>
        <div className="mt-3 space-y-2">
          {notifications.length === 0 ? (
            <EmptyState icon={Headphones} title="No notifications" description="Updates about your applications will appear here." />
          ) : (
            notifications.map((n) => (
              <div key={n.id} className="flex items-start gap-3 rounded-2xl border border-border bg-white p-3.5 shadow-card">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold" />
                <div className="flex-1">
                  <p className="text-sm text-foreground">{n.text}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{n.time}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tone }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-4 text-center shadow-card">
      <div className={`mx-auto flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-2 font-heading text-xl font-bold text-foreground">{value}</p>
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
    </div>
  );
}