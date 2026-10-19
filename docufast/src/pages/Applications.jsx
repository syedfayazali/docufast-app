import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { FileText, Search } from "lucide-react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import StatusBadge, { statusLabel } from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";
import { useToast } from "@/components/ui/use-toast";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

const filters = ["All", "Draft", "Submitted", "Under Review", "Action Required", "Completed", "Rejected"];

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

export default function Applications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [active, setActive] = useState("All");
  const [query, setQuery] = useState("");
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const prevStatus = useRef({});

  useEffect(() => {
    if (!user) return;
    base44.entities.Application.filter({ created_by_id: user.id }, "-created_date")
      .then((rows) => {
        setApps(rows);
        rows.forEach((r) => { prevStatus.current[r.id] = r.status; });
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    // Live updates: refresh instantly whenever an application changes (no pull-to-refresh needed)
    const unsubscribe = base44.entities.Application.subscribe((event) => {
      const rec = event.data;
      if (!rec || rec.created_by_id !== user.id) return;
      if (event.type === "delete") {
        setApps((prev) => prev.filter((a) => a.id !== event.id));
        delete prevStatus.current[event.id];
        return;
      }
      setApps((prev) => {
        const exists = prev.some((a) => a.id === rec.id);
        return exists ? prev.map((a) => (a.id === rec.id ? rec : a)) : [rec, ...prev];
      });
      const old = prevStatus.current[rec.id];
      if (old && old !== rec.status) {
        toast({
          title: "Application status updated",
          description: `${rec.reference || rec.service_name}: ${old} → ${rec.status}`,
        });
      }
      prevStatus.current[rec.id] = rec.status;
    });

    return unsubscribe;
  }, [user, toast]);

  const filtered = apps.filter((a) => {
    const matchCat = active === "All" || a.status === active;
    const q = query.toLowerCase();
    const matchQuery = !q || (a.service_name || "").toLowerCase().includes(q) || (a.reference || "").toLowerCase().includes(q);
    return matchCat && matchQuery;
  });

  return (
    <div className="min-h-screen bg-secondary/40">
      <Header title="My Applications" />
      <main className="mx-auto max-w-5xl px-4 pb-24 pt-4">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-2.5 shadow-card">
          <Search className="h-5 w-5 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by ID or service"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setActive(f)}
              className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                active === f ? "bg-navy text-white" : "border border-border bg-white text-muted-foreground"
              }`}
            >
              {statusLabel(f)}
            </button>
          ))}
        </div>

        <div className="mt-5 space-y-3">
          {loading ? (
            <div className="rounded-2xl border border-border bg-white p-4 shadow-card text-sm text-muted-foreground">Loading…</div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No applications"
              description="You have no applications in this category."
              action={<Link to="/services" className="rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white">Browse Services</Link>}
            />
          ) : (
            filtered.map((a) => (
              <div key={a.id} className="rounded-2xl border border-border bg-white p-4 shadow-card">
              <Link to={`/applications/${a.id}`} className="block">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-navy">{a.reference || a.id}</span>
                  <StatusBadge status={a.status} />
                </div>
                <h3 className="mt-2 font-heading text-sm font-semibold text-foreground">{a.service_name}</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {a.status === "Draft" ? "Started" : "Submitted"} {fmtDate(a.created_date)} · ₹{a.total || 0}
                </p>
                <p className="mt-2 text-[11px] font-medium text-gold">Next: {nextStep(a.status)}</p>
              </Link>
              {a.status === "Draft" && (
                <Link to={`/pay?app=${a.id}`} className="mt-3 block rounded-xl bg-gold py-2.5 text-center text-xs font-bold text-navy">
                  Complete payment · ₹{a.total || 0}
                </Link>
              )}
              </div>
            ))
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}