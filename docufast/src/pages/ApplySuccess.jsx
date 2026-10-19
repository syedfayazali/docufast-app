import React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, ArrowRight, Home } from "lucide-react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";

export default function ApplySuccess() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const ref = state?.ref || "DFI-2026-000001";
  const service = state?.service || "your service";

  return (
    <div className="min-h-screen bg-secondary/40">
      <Header />
      <main className="mx-auto max-w-5xl px-4 pb-24 pt-4">
        <div className="rounded-2xl border border-border bg-white p-8 text-center shadow-card">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h1 className="mt-4 font-heading text-xl font-bold text-navy">Application Submitted Successfully</h1>
          <p className="mt-2 text-sm text-muted-foreground">Your application for {service} has been received.</p>
          <div className="mt-5 rounded-xl bg-navy p-4 text-white">
            <p className="text-xs text-white/70">Your Application Number</p>
            <p className="mt-1 font-mono text-lg font-bold text-gold">{ref}</p>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">Save this reference number to track your application.</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button onClick={() => navigate(state?.id ? `/pay?app=${state.id}` : "/pay")} className="flex items-center justify-center gap-2 rounded-xl bg-gold px-6 py-3 text-sm font-bold text-navy">
              Pay Now <ArrowRight className="h-4 w-4" />
            </button>
            <button onClick={() => navigate(state?.id ? `/applications/${state.id}` : "/applications")} className="flex items-center justify-center gap-2 rounded-xl border border-border px-6 py-3 text-sm font-semibold text-foreground">
              Track Application <ArrowRight className="h-4 w-4" />
            </button>
            <button onClick={() => navigate("/dashboard")} className="flex items-center justify-center gap-2 rounded-xl border border-border px-6 py-3 text-sm font-semibold text-foreground">
              <Home className="h-4 w-4" /> Go to Dashboard
            </button>
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}