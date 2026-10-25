import React, { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import EmptyState from "@/components/EmptyState";
import { Search, CreditCard, TrendingUp, ShieldCheck, X, Eye } from "lucide-react";
import { backend } from "@/api/backend";
import { Image } from "@/components/ui/image";
import { pushNotify } from "@/lib/push";

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

export default function AdminPayments() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [proofUrls, setProofUrls] = useState({});
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    setLoading(true);
    backend.entities.Payment.list("-created_date", 200)
      .then(setPayments)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const reload = () => {
    backend.entities.Payment.list("-created_date", 200).then(setPayments).catch(() => {});
  };

  const filtered = payments.filter((p) => {
    const matchStatus = filter === "All" || p.status === filter;
    const q = query.toLowerCase();
    const matchQuery =
      !q ||
      (p.reference || "").toLowerCase().includes(q) ||
      (p.customer_name || "").toLowerCase().includes(q) ||
      (p.application_ref || "").toLowerCase().includes(q) ||
      (p.utr || "").toLowerCase().includes(q);
    return matchStatus && matchQuery;
  });

  const totalGovt = filtered.reduce((s, p) => s + (p.government_fee || 0), 0);
  const totalCharge = filtered.reduce((s, p) => s + (p.service_charge || 0), 0);
  const totalAll = filtered.reduce((s, p) => s + (p.total || 0), 0);

  const toggleProof = async (p) => {
    if (proofUrls[p.id]) {
      setProofUrls((m) => {
        const next = { ...m };
        delete next[p.id];
        return next;
      });
      return;
    }
    try {
      const res = await backend.integrations.Core.CreateFileSignedUrl({
        file_uri: p.payment_proof_uri,
      });
      if (res?.signed_url) {
        setProofUrls((m) => ({ ...m, [p.id]: res.signed_url }));
      }
    } catch {}
  };

  const setPaymentStatus = async (p, status, appStatus) => {
    setBusy(p.id);
    try {
      await backend.entities.Payment.update(p.id, { status });
      if (appStatus && p.application_id) {
        await backend.entities.Application
          .update(p.application_id, { status: appStatus })
          .then(() => pushNotify("status", p.application_id))
          .catch(() => {});
      }
      reload();
    } catch {
    } finally {
      setBusy(null);
    }
  };

  return (
    <AdminLayout title="Payment Records">
      <div className="grid grid-cols-3 gap-3">
        <Summary label="Official fees (info)" value={totalGovt} tone="text-blue-700 bg-blue-50" />
        <Summary label="Service Charges" value={totalCharge} tone="text-gold bg-amber-50" />
        <Summary label="Total Collected" value={totalAll} tone="text-emerald-700 bg-emerald-50" />
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-2.5 shadow-card">
        <Search className="h-5 w-5 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by payment ID, customer, application or UTR"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
        {["All", "Paid", "Pending", "Refunded", "Failed"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              filter === f ? "bg-navy text-white" : "border border-border bg-white text-muted-foreground"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-2.5">
        {loading ? (
          <div className="rounded-2xl border border-border bg-white p-4 shadow-card text-sm text-muted-foreground">
            Loading…
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={CreditCard} title="No payments found" description="Try a different search or filter." />
        ) : (
          filtered.map((p) => (
            <div key={p.id} className="rounded-2xl border border-border bg-white p-4 shadow-card">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold text-navy">{p.reference}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    p.status === "Paid"
                      ? "bg-emerald-100 text-emerald-700"
                      : p.status === "Pending"
                        ? "bg-amber-100 text-amber-700"
                        : p.status === "Refunded"
                          ? "bg-secondary text-muted-foreground"
                          : "bg-red-100 text-red-700"
                  }`}
                >
                  {p.status}
                </span>
              </div>
              <h3 className="mt-1.5 text-sm font-semibold text-foreground">{p.service_name}</h3>
              <p className="text-[11px] text-muted-foreground">
                {p.customer_name} · App {p.application_ref} · {fmtDate(p.created_date)}
              </p>

              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <Breakdown label="Official fee" value={p.government_fee || 0} tone="text-blue-700" />
                <Breakdown label="Service Charge" value={p.service_charge || 0} tone="text-gold" />
                <Breakdown label="Total" value={p.total || 0} tone="text-emerald-700" bold />
              </div>

              {p.utr && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  UTR: <span className="font-mono font-semibold text-foreground">{p.utr}</span>
                </p>
              )}

              {p.payment_proof_uri && (
                <div className="mt-2">
                  <button
                    onClick={() => toggleProof(p)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-semibold text-navy hover:bg-secondary/60"
                  >
                    <Eye className="h-3.5 w-3.5" /> {proofUrls[p.id] ? "Hide proof" : "View proof"}
                  </button>
                  {proofUrls[p.id] && (
                    <div className="mt-2 overflow-hidden rounded-xl border border-border">
                      <Image
                        src={proofUrls[p.id]}
                        alt="Payment proof"
                        fittingType="fit"
                        className="max-h-80 w-full"
                      />
                    </div>
                  )}
                </div>
              )}

              {p.status === "Pending" && p.payment_proof_uri && (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => setPaymentStatus(p, "Paid", "Under Review")}
                    disabled={busy === p.id}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-bold text-white disabled:opacity-60"
                  >
                    <ShieldCheck className="h-4 w-4" /> Verify
                  </button>
                  <button
                    onClick={() => setPaymentStatus(p, "Failed")}
                    disabled={busy === p.id}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-red-200 px-3 py-2.5 text-xs font-bold text-red-600 disabled:opacity-60"
                  >
                    <X className="h-4 w-4" /> Reject
                  </button>
                </div>
              )}
              {p.status === "Pending" && !p.payment_proof_uri && (
                <p className="mt-2 text-[11px] font-medium text-amber-600">
                  Awaiting payment proof from customer.
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </AdminLayout>
  );
}

function Summary({ label, value, tone }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-4 shadow-card">
      <div className={`mx-auto flex h-8 w-8 items-center justify-center rounded-lg ${tone}`}>
        <TrendingUp className="h-4 w-4" />
      </div>
      <p className="mt-2 font-heading text-lg font-bold text-foreground">₹{value.toLocaleString()}</p>
      <p className="text-[10px] font-medium text-muted-foreground">{label}</p>
    </div>
  );
}

function Breakdown({ label, value, tone, bold }) {
  return (
    <div className="rounded-xl bg-secondary/60 py-2">
      <p className={`text-sm ${bold ? "font-bold" : "font-semibold"} ${tone}`}>₹{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}