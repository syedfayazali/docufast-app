import React, { useState, useEffect } from "react";
import { CreditCard } from "lucide-react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import StatusBadge from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";
import { backend } from "@/api/backend";
import { useAuth } from "@/lib/AuthContext";

const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export default function Payments() {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    backend.entities.Payment.filter({ created_by_id: user.id }, "-created_date")
      .then(setPayments)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <div className="min-h-screen bg-secondary/40">
      <Header title="Payment History" />
      <main className="mx-auto max-w-5xl px-4 pb-24 pt-4">
        <div className="space-y-3">
          {loading ? (
            <div className="rounded-2xl border border-border bg-white p-4 shadow-card text-sm text-muted-foreground">Loading…</div>
          ) : payments.length === 0 ? (
            <EmptyState icon={CreditCard} title="No payments yet" description="Your payment history will appear here." />
          ) : (
            payments.map((p) => (
              <div key={p.id} className="rounded-2xl border border-border bg-white p-4 shadow-card">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-navy">{p.reference}</span>
                  <StatusBadge status={p.status} />
                </div>
                <h3 className="mt-2 font-heading text-sm font-semibold text-foreground">{p.service_name}</h3>
                <p className="text-[11px] text-muted-foreground">App {p.application_ref} · {fmtDate(p.created_date)}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Amount</span>
                  <span className="font-heading text-base font-bold text-navy">₹{p.total || 0}</span>
                </div>
              </div>
            ))
          )}
        </div>
        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          Payments are verified by DocuFast India before they show as Paid. See our Refund & Cancellation Policy for refunds.
        </p>
      </main>
      <BottomNav />
    </div>
  );
}