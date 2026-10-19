import React, { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import StatusBadge from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";
import { Search, Users, ChevronDown, Mail, Calendar } from "lucide-react";
import { base44 } from "@/api/base44Client";

const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export default function AdminUsers() {
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState(null);
  const [users, setUsers] = useState([]);
  const [appsByUser, setAppsByUser] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.User.list().catch(() => []),
      base44.entities.Application.list("-created_date", 200).catch(() => []),
    ]).then(([u, a]) => {
      setUsers(u);
      const map = {};
      a.forEach((app) => {
        const key = app.created_by_id;
        if (!map[key]) map[key] = [];
        map[key].push(app);
      });
      setAppsByUser(map);
    }).finally(() => setLoading(false));
  }, []);

  const filtered = users.filter((c) => {
    const q = query.toLowerCase();
    return !q || (c.full_name || "").toLowerCase().includes(q) || (c.email || "").toLowerCase().includes(q);
  });

  return (
    <AdminLayout title="User Management">
      <div className="flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-2.5 shadow-card">
        <Search className="h-5 w-5 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      <div className="mt-4 space-y-2.5">
        {loading ? (
          <div className="rounded-2xl border border-border bg-white p-4 shadow-card text-sm text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Users} title="No customers found" description="Try a different search." />
        ) : (
          filtered.map((c) => {
            const userApps = appsByUser[c.id] || [];
            const name = c.full_name || c.email || "User";
            const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
            return (
              <div key={c.id} className="rounded-2xl border border-border bg-white shadow-card">
                <button onClick={() => setOpenId(openId === c.id ? null : c.id)} className="flex w-full items-center gap-3 p-4 text-left">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-navy text-sm font-bold text-white">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-foreground">{name}</p>
                      {c.role === "admin" && <span className="rounded-full bg-gold/20 px-1.5 py-0.5 text-[9px] font-bold text-gold">ADMIN</span>}
                    </div>
                    <p className="truncate text-[11px] text-muted-foreground">{c.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-semibold text-navy">{userApps.length} apps</p>
                    <ChevronDown className={`ml-auto h-4 w-4 text-muted-foreground transition-transform ${openId === c.id ? "rotate-180" : ""}`} />
                  </div>
                </button>

                {openId === c.id && (
                  <div className="border-t border-border px-4 py-4">
                    <div className="grid gap-2 text-sm sm:grid-cols-2">
                      <Detail icon={Mail} label="Email" value={c.email || "—"} />
                      <Detail icon={Calendar} label="Joined" value={fmtDate(c.created_date)} />
                    </div>

                    <h4 className="mt-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Application History</h4>
                    <div className="mt-2 space-y-2">
                      {userApps.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No applications yet.</p>
                      ) : (
                        userApps.map((a) => (
                          <div key={a.id} className="flex items-center justify-between rounded-xl border border-border p-3">
                            <div>
                              <p className="font-mono text-[11px] font-semibold text-navy">{a.reference}</p>
                              <p className="text-sm font-semibold text-foreground">{a.service_name}</p>
                              <p className="text-[11px] text-muted-foreground">{fmtDate(a.created_date)}</p>
                            </div>
                            <StatusBadge status={a.status} />
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </AdminLayout>
  );
}

function Detail({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}