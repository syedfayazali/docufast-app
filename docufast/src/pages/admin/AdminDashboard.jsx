import React, { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import StatusBadge from "@/components/StatusBadge";
import { FileText, Clock, AlertCircle, CheckCircle2, Calendar, CreditCard, Headphones } from "lucide-react";
import { base44 } from "@/api/base44Client";
import BannerEditor from "@/components/BannerEditor";

const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export default function AdminDashboard() {
  const [apps, setApps] = useState([]);
  const [payments, setPayments] = useState([]);
  const [todayAppts, setTodayAppts] = useState(0);

  useEffect(() => {
    base44.entities.Application.list("-created_date", 200).then((rows) => setApps(rows.filter((a) => a.status !== "Draft"))).catch(() => {});
    base44.entities.Payment.list("-created_date", 200).then(setPayments).catch(() => {});
    base44.entities.Appointment.filter({ status: "Booked" }, "slot_start", 300)
      .then((r) => {
        const t = new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
        setTodayAppts(r.filter((a) => new Date(new Date(a.slot_start).getTime() + 5.5 * 3600 * 1000).toISOString().slice(0, 10) === t).length);
      })
      .catch(() => {});
  }, []);

  const pending = apps.filter((a) => ["Submitted", "Under Review"].includes(a.status)).length;
  const actionReq = apps.filter((a) => a.status === "Action Required").length;
  const completed = apps.filter((a) => a.status === "Completed").length;
  const pendingPay = payments.filter((p) => p.status === "Pending" && (p.utr || p.payment_proof_uri)).reduce((s, p) => s + (p.total || 0), 0);

  const stats = [
    { label: "Total Applications", value: apps.length, icon: FileText, tone: "bg-blue-50 text-blue-700" },
    { label: "Pending", value: pending, icon: Clock, tone: "bg-amber-50 text-amber-700" },
    { label: "Action Required", value: actionReq, icon: AlertCircle, tone: "bg-orange-50 text-orange-700" },
    { label: "Completed", value: completed, icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-700" },
    { label: "Today's Appointments", value: todayAppts, icon: Calendar, tone: "bg-violet-50 text-violet-700" },
    { label: "Payments to Verify", value: `₹${pendingPay.toLocaleString()}`, icon: CreditCard, tone: "bg-red-50 text-red-700" },
    { label: "Open Support Tickets", value: 0, icon: Headphones, tone: "bg-cyan-50 text-cyan-700" },
  ];

  const recentApplications = apps.slice(0, 4);
  const recentPayments = payments.slice(0, 2);

  return (
    <AdminLayout title="Admin Dashboard">
      <BannerEditor />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="rounded-2xl border border-border bg-white p-4 shadow-card">
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}>
              <Icon className="h-4 w-4" />
            </div>
            <p className="mt-2 font-heading text-xl font-bold text-foreground">{value}</p>
            <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 space-y-6">
        <section>
          <h2 className="mb-3 font-heading text-base font-bold text-navy">Recent Applications</h2>
          <div className="space-y-2">
            {recentApplications.length === 0 ? (
              <p className="text-sm text-muted-foreground">No applications yet.</p>
            ) : (
              recentApplications.map((a) => (
                <div key={a.id} className="rounded-2xl border border-border bg-white p-3.5 shadow-card">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-navy">{a.reference}</span>
                    <StatusBadge status={a.status} />
                  </div>
                  <p className="mt-1.5 text-sm font-semibold text-foreground">{a.service_name}</p>
                  <p className="text-[11px] text-muted-foreground">{a.customer_name} · {fmtDate(a.created_date)}</p>
                </div>
              ))
            )}
          </div>
        </section>

        <section>
          <h2 className="mb-3 font-heading text-base font-bold text-navy">Recent Payments</h2>
          <div className="space-y-2">
            {recentPayments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payments yet.</p>
            ) : (
              recentPayments.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-2xl border border-border bg-white p-3.5 shadow-card">
                  <div>
                    <p className="font-mono text-xs font-semibold text-navy">{p.reference}</p>
                    <p className="text-[11px] text-muted-foreground">{p.customer_name} · {fmtDate(p.created_date)}</p>
                  </div>
                  <span className="font-heading text-base font-bold text-emerald-600">₹{p.total || 0}</span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}