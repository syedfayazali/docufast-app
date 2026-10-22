import React, { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import StatusBadge, { statusLabel } from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";
import { Search, FileText, ChevronDown } from "lucide-react";
import { base44 } from "@/api/base44Client";
import DocumentLink from "@/components/DocumentLink";
import UpdateComposer from "@/components/UpdateComposer";
import { addressLines } from "@/lib/orders";

const statusOptions = ["Draft", "Submitted", "Under Review", "Action Required", "Approved", "Completed", "Rejected", "Cancelled"];
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export default function AdminApplications() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [apps, setApps] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [noteId, setNoteId] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    base44.entities.Application.list("-created_date", 200)
      .then(setApps)
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const filtered = apps.filter((a) => {
    // Unpaid drafts are not real applications yet: hidden unless you pick "Awaiting Payment".
    const matchCat = filter === "All" ? a.status !== "Draft" : a.status === filter;
    const q = query.toLowerCase();
    const matchQuery = !q || (a.reference || "").toLowerCase().includes(q) || (a.customer_name || "").toLowerCase().includes(q) || (a.service_name || "").toLowerCase().includes(q);
    return matchCat && matchQuery;
  });

  const updateStatus = async (id, status) => {
    setApps((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    setOpenId(null);
    try {
      await base44.entities.Application.update(id, { status });
    } catch {
      load();
    }
  };

  return (
    <AdminLayout title="Manage Applications">
      <div className="flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-2.5 shadow-card">
        <Search className="h-5 w-5 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by ID, customer or service"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
        {["All", ...statusOptions].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              filter === f ? "bg-navy text-white" : "border border-border bg-white text-muted-foreground"
            }`}
          >
            {statusLabel(f)}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-2.5">
        {loading ? (
          <div className="rounded-2xl border border-border bg-white p-4 shadow-card text-sm text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={FileText} title="No applications found" description="Try a different search or filter." />
        ) : (
          filtered.map((a) => (
            <div key={a.id} className="rounded-2xl border border-border bg-white p-4 shadow-card">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold text-navy">{a.reference}</span>
                <StatusBadge status={a.status} />
              </div>
              <h3 className="mt-1.5 font-heading text-sm font-semibold text-foreground">{a.service_name}</h3>
              <p className="text-[11px] text-muted-foreground">{a.customer_name} · {a.customer_mobile} · {fmtDate(a.created_date)}</p>

              {addressLines(a).length > 0 && (
                <div className="mt-2 rounded-lg bg-secondary/60 p-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Customer address</p>
                  <p className="mt-0.5 text-xs text-foreground">{addressLines(a).join(", ")}</p>
                </div>
              )}

              {Object.keys(a.form_data?._doc_paths || {}).length > 0 && (
                <div className="mt-2 space-y-1.5 rounded-lg bg-secondary/60 p-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Documents</p>
                  {Object.entries(a.form_data._doc_paths).map(([label, path]) => (
                    <div key={label} className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs text-foreground">{label}</span>
                      <DocumentLink path={path} />
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => setOpenId(openId === a.id ? null : a.id)}
                className="mt-2 flex w-full items-center justify-between rounded-lg bg-secondary px-3 py-2 text-xs font-semibold text-navy"
              >
                Update status
                <ChevronDown className={`h-4 w-4 transition-transform ${openId === a.id ? "rotate-180" : ""}`} />
              </button>

              <button
                onClick={() => setNoteId(noteId === a.id ? null : a.id)}
                className="mt-2 flex w-full items-center justify-between rounded-lg bg-secondary px-3 py-2 text-xs font-semibold text-navy"
              >
                Notes &amp; reference numbers
                <ChevronDown className={`h-4 w-4 transition-transform ${noteId === a.id ? "rotate-180" : ""}`} />
              </button>
              {noteId === a.id && <UpdateComposer application={a} />}

              {openId === a.id && (
                <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                  {statusOptions.map((s) => (
                    <button
                      key={s}
                      onClick={() => updateStatus(a.id, s)}
                      className={`rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition-colors ${
                        a.status === s ? "border-gold bg-gold/10 text-gold" : "border-border text-muted-foreground hover:bg-secondary"
                      }`}
                    >
                      {statusLabel(s)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </AdminLayout>
  );
}