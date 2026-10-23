import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Package, Loader2 } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import StatusBadge from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";
import { backend } from "@/api/backend";
import { addressLines, inr, when } from "@/lib/orders";

const PAID = (a) => a.status !== "Draft";
const TABS = [
  ["New", (a) => PAID(a) && !a.admin_seen_at],
  ["In progress", (a) => ["Submitted", "Under Review", "Approved"].includes(a.status)],
  ["Action Required", (a) => a.status === "Action Required"],
  ["Completed", (a) => a.status === "Completed"],
  ["Rejected / Cancelled", (a) => ["Rejected", "Cancelled"].includes(a.status)],
  ["Unpaid", (a) => a.status === "Draft"],
  ["All", PAID],
];

export default function AdminOrders() {
  const [apps, setApps] = useState([]);
  const [pays, setPays] = useState({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("New");
  const [q, setQ] = useState("");

  const load = async () => {
    const [a, p] = await Promise.all([backend.entities.Application.list("-created_date", 300), backend.entities.Payment.list("-created_date", 300)]);
    setApps(a);
    setPays(Object.fromEntries(p.map((x) => [x.application_id, x])));
  };
  useEffect(() => {
    load().catch(() => {}).finally(() => setLoading(false));
    const o1 = backend.entities.Application.subscribe(() => load().catch(() => {}));
    const o2 = backend.entities.Payment.subscribe(() => load().catch(() => {}));
    return () => { o1 && o1(); o2 && o2(); };
  }, []);

  const counts = useMemo(() => Object.fromEntries(TABS.map(([n, fn]) => [n, apps.filter(fn).length])), [apps]);
  const fn = TABS.find(([n]) => n === tab)[1];
  const list = apps.filter(fn).filter((a) => {
    const s = q.toLowerCase();
    return !s || [a.reference, a.customer_name, a.customer_mobile, a.service_name].some((v) => (v || "").toLowerCase().includes(s));
  });

  return (
    <AdminLayout title="Orders">
      <div className="flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-2.5 shadow-card">
        <Search className="h-5 w-5 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search reference, name, mobile or service" className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
      </div>
      <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
        {TABS.map(([n]) => (
          <button key={n} onClick={() => setTab(n)} className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold ${tab === n ? "bg-navy text-white" : "border border-border bg-white text-muted-foreground"}`}>
            {n} ({counts[n]})
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-2.5">
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : list.length === 0 ? (
          <EmptyState icon={Package} title="No orders here" description="Paid applications appear here as orders. Applications not yet paid are under Unpaid." />
        ) : (
          list.map((a) => {
            const p = pays[a.id];
            const addr = addressLines(a);
            return (
              <Link key={a.id} to={`/admin-orders/${a.id}`} className="block rounded-2xl border border-border bg-white p-4 shadow-card">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-semibold text-navy">{a.reference}{!a.admin_seen_at && <span className="ml-2 rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold text-navy">NEW</span>}</span>
                  <StatusBadge status={a.status} />
                </div>
                <h3 className="mt-1.5 font-heading text-sm font-semibold text-foreground">{a.service_name}</h3>
                <p className="text-xs text-foreground">{a.customer_name} · {a.customer_mobile}</p>
                {addr.length > 0 && <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{addr.join(", ")}</p>}
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  {p?.status === "Paid" ? <span className="font-semibold text-emerald-700">Paid {inr(p.total)}</span> : <span className="font-semibold text-amber-700">Payment: {p?.status || "—"}</span>} · {when(p?.paid_at || a.created_date)}
                </p>
              </Link>
            );
          })
        )}
      </div>
    </AdminLayout>
  );
}
