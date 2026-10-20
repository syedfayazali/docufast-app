import React, { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import EmptyState from "@/components/EmptyState";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { fmtFull } from "@/lib/appointments";

const messageFor = (a) => {
  switch (a.status) {
    case "Submitted": return `Your application ${a.reference} (${a.service_name}) has been submitted and is awaiting review.`;
    case "Under Review": return `Your application ${a.reference} (${a.service_name}) is now under review.`;
    case "Action Required": return `Action required: please respond to our team for ${a.reference} (${a.service_name}).`;
    case "Approved": return `Good news! Your application ${a.reference} (${a.service_name}) has been approved.`;
    case "Completed": return `Your application ${a.reference} (${a.service_name}) is completed. Documents delivered.`;
    case "Rejected": return `Your application ${a.reference} (${a.service_name}) has been rejected.`;
    case "Cancelled": return `Your application ${a.reference} (${a.service_name}) was cancelled.`;
    default: return `Your application ${a.reference} (${a.service_name}) was created.`;
  }
};

const fmtAgo = (d) => {
  if (!d) return "—";
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export default function Notifications() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      base44.entities.Application.filter({ created_by_id: user.id }, "-updated_date"),
      base44.entities.Appointment.filter({ created_by_id: user.id }, "-updated_date", 20).catch(() => []),
    ])
      .then(([apps, appts]) => {
        const a1 = apps.map((a) => ({
          id: a.id,
          text: messageFor(a),
          at: a.updated_date || a.created_date,
          unread: a.status === "Action Required",
        }));
        const a2 = appts.map((a) => ({
          id: a.id,
          text: a.status === "Booked"
            ? `Appointment ${a.reference} confirmed for ${fmtFull(a.slot_start)}.`
            : a.status === "Cancelled"
              ? `Appointment ${a.reference} (${fmtFull(a.slot_start)}) was cancelled${a.cancelled_by === "admin" ? " by our office" : ""}.`
              : `Appointment ${a.reference} marked ${a.status}.`,
          at: a.updated_date || a.created_date,
          unread: a.status === "Cancelled" && a.cancelled_by === "admin",
        }));
        setItems([...a1, ...a2]
          .sort((x, y) => new Date(y.at) - new Date(x.at))
          .map((n) => ({ ...n, time: fmtAgo(n.at) })));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <div className="min-h-screen bg-secondary/40">
      <Header title="Notifications" />
      <main className="mx-auto max-w-5xl px-4 pb-24 pt-4">
        <div className="space-y-2">
          {loading ? (
            <div className="rounded-2xl border border-border bg-white p-4 shadow-card text-sm text-muted-foreground">Loading…</div>
          ) : items.length === 0 ? (
            <EmptyState icon={Bell} title="No notifications" description="Updates about your applications will appear here." />
          ) : (
            items.map((n) => (
              <div key={n.id} className={`flex items-start gap-3 rounded-2xl border bg-white p-4 shadow-card ${n.unread ? "border-gold/40" : "border-border"}`}>
                <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${n.unread ? "bg-gold" : "bg-secondary"}`} />
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