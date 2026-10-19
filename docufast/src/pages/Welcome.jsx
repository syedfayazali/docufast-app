import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldCheck, Eye, Activity, Headphones, ArrowRight, FileText, Plane, ScrollText } from "lucide-react";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";

const trust = [
  { icon: ShieldCheck, label: "No Hidden Charges" },
  { icon: Eye, label: "Transparent Process" },
  { icon: Activity, label: "Application Tracking" },
  { icon: Headphones, label: "Customer Support" },
];

const preview = [
  { icon: FileText, label: "Certificates" },
  { icon: Plane, label: "Passport" },
  { icon: ScrollText, label: "Deeds" },
];

export default function Welcome() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="relative overflow-hidden bg-navy text-white">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-gold/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-white/5 blur-2xl" />
        <div className="relative mx-auto flex max-w-5xl flex-col px-4 pb-12 pt-8">
          <Logo variant="light" />
          <div className="mt-12 max-w-xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-gold">
              <span className="h-1.5 w-1.5 rounded-full bg-gold" /> 100% Transparent Pricing
            </span>
            <h1 className="mt-4 font-heading text-3xl font-bold leading-tight sm:text-4xl">
              Government Services<br />Made Simple &amp; Fast
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-white/75 sm:text-base">
              Apply for document and government services with transparent pricing, guided assistance and application tracking.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => navigate("/login")}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gold px-6 py-3.5 text-sm font-semibold text-navy shadow-navy transition-transform active:scale-95"
              >
                Get Started <ArrowRight className="h-4 w-4" />
              </button>
              <Link
                to="/services"
                className="inline-flex items-center justify-center rounded-xl border border-white/25 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                Explore Services
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-5xl px-4">
        <div className="-mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {trust.map(({ icon: Icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-white p-4 text-center shadow-card">
              <Icon className="h-6 w-6 text-gold" />
              <span className="text-xs font-semibold text-foreground">{label}</span>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-3xl border border-border bg-secondary/40 p-6">
          <h2 className="font-heading text-lg font-bold text-navy">What we help you with</h2>
          <p className="mt-1 text-sm text-muted-foreground">A guided, transparent way to apply for everyday government and document services.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {preview.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-card">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy/5 text-navy">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-sm font-semibold text-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-auto">
        <Footer />
      </div>
    </div>
  );
}