import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Clock, ShieldCheck, FileText, UserCheck, ArrowRight, ExternalLink } from "lucide-react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import Footer from "@/components/Footer";
import { backend } from "@/api/backend";

const processSteps = [
  "Tell us what you need and upload your documents",
  "We check your documents and help you fill in the application correctly",
  "We guide you to submit it on the official website or at the department, and you pay the official fee there yourself",
  "We keep you updated with the details and reference numbers you share with us",
  "The department decides. We do not issue documents or approve applications",
];

const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } };

export default function ServiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    backend.entities.Service.get(id)
      .then((s) => setService(s && s.active === false ? null : s))
      .catch(() => setService(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary/40">
        <Header />
        <main className="mx-auto max-w-5xl px-4 pb-24 pt-4">
          <div className="h-64 animate-pulse rounded-2xl bg-white" />
        </main>
        <BottomNav />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen bg-secondary/40">
        <Header />
        <main className="mx-auto max-w-5xl px-4 pb-24 pt-4">
          <div className="rounded-2xl border border-dashed border-border bg-white p-10 text-center">
            <p className="font-heading text-base font-semibold">Service not found</p>
            <Link to="/services" className="mt-3 inline-block text-sm font-semibold text-gold">Back to services</Link>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  const gov = service.government_fee || 0;
  const svc = service.service_charge || 0;
  const other = service.other_charges || 0;
  const total = svc + other; // what DocuFast collects; the official fee is paid directly to the department

  return (
    <div className="min-h-screen bg-secondary/40">
      <Header />
      <main className="mx-auto max-w-5xl px-4 pb-24 pt-4">
        <button onClick={() => navigate(-1)} className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        {/* Hero */}
        <div className="overflow-hidden rounded-2xl bg-navy p-6 text-white shadow-navy">
          <span className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-gold">
            {service.category}
          </span>
          <h1 className="mt-3 font-heading text-2xl font-bold">{service.name}</h1>
          <p className="mt-2 text-sm text-white/75">{service.short_description}</p>
        </div>

        {/* Official source */}
        {service.official_url && (
          <a href={service.official_url} target="_blank" rel="noopener noreferrer" className="mt-4 flex items-start gap-3 rounded-2xl border border-border bg-white p-4 shadow-card">
            <ExternalLink className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
            <span>
              <span className="block text-sm font-semibold text-navy">Official source: {hostOf(service.official_url)}</span>
              <span className="block text-xs text-muted-foreground">This is the government website for this service. DocuFast is a private service and is not connected with it. You can always apply there directly.</span>
            </span>
          </a>
        )}

        {/* Description */}
        <section className="mt-5 rounded-2xl border border-border bg-white p-5 shadow-card">
          <h2 className="font-heading text-base font-bold text-navy">About this service</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {service.description || service.short_description}
          </p>
          {service.eligibility && (
            <div className="mt-4 flex items-start gap-2 rounded-xl bg-blue-50 p-3">
              <UserCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
              <p className="text-xs text-blue-800"><span className="font-semibold">Who can apply?</span> {service.eligibility}</p>
            </div>
          )}
        </section>

        {/* Documents required */}
        <section className="mt-4 rounded-2xl border border-border bg-white p-5 shadow-card">
          <h2 className="font-heading text-base font-bold text-navy">Documents Required</h2>
          <div className="mt-3 space-y-2">
            {(service.requirements || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Requirements will be shown here once configured.</p>
            ) : (
              (service.requirements || []).map((r) => (
                <div key={r} className="flex items-start gap-2 rounded-xl border border-border p-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span className="text-sm text-foreground">{r}</span>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Fees */}
        <section className="mt-4 rounded-2xl border border-border bg-white p-5 shadow-card">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-gold" />
            <h2 className="font-heading text-base font-bold text-navy">Fees</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">You pay DocuFast only for our help. The official fee is separate and goes straight to the department.</p>
          <div className="mt-3 divide-y divide-border">
            <FeeRow label="DocuFast Service Charge" value={svc} />
            <FeeRow label="Other Charges" value={other} />
          </div>
          <div className="mt-3 flex items-center justify-between rounded-xl bg-navy px-4 py-3 text-white">
            <span className="text-sm font-semibold">You pay DocuFast</span>
            <span className="font-heading text-lg font-bold text-gold">₹{total}</span>
          </div>
          {gov > 0 && (
            <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
              Official fee: <b>₹{gov}</b>. This is set by the department. It is <b>not</b> collected by DocuFast. You pay it directly on the official website or at the office, and it may change.
            </p>
          )}
          <div className="mt-3 rounded-xl bg-secondary/60 p-3 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">What our service charge covers</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              <li>Checking that your documents are complete and correct</li>
              <li>Help filling in the application and choosing the right options</li>
              <li>Guidance on submitting it and booking an appointment if needed</li>
              <li>Status tracking and updates in this app</li>
            </ul>
          </div>
        </section>

        {/* Process */}
        <section className="mt-4 rounded-2xl border border-border bg-white p-5 shadow-card">
          <h2 className="font-heading text-base font-bold text-navy">Process</h2>
          <ol className="mt-3 space-y-3">
            {processSteps.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold/15 text-xs font-bold text-gold">{i + 1}</span>
                <span className="text-sm text-foreground">{step}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* Estimated processing */}
        <section className="mt-4 rounded-2xl border border-border bg-white p-5 shadow-card">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-navy" />
            <h2 className="font-heading text-base font-bold text-navy">Our estimate of the time (not official)</h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {(service.processing_info ? service.processing_info + " " : "") + "This is only our estimate. The department decides the real time and we cannot promise a date."}
          </p>
        </section>

        {/* CTA */}
        <div className="mt-6 sticky bottom-20 z-10">
          <button
            onClick={() => navigate(`/apply/${service.id}`)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-3.5 text-sm font-bold text-navy shadow-navy transition-transform active:scale-[0.98]"
          >
            Apply Now <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}

function FeeRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-foreground">{value > 0 ? `₹${value}` : "—"}</span>
    </div>
  );
}