import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import SupportForm from "@/components/SupportForm";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";

const faqs = [
  { q: "Is DocuFast a government department?", a: "No. DocuFast is an independent private document-help service. We are not a government body and are not connected with one." },
  { q: "Do I pay the official fee to DocuFast?", a: "No. Any official fee is set by the department and paid by you directly to it. You pay DocuFast only our service charge, shown before you pay. Each service page links to the official website, and you can always apply there yourself." },
  { q: "Does DocuFast India guarantee approval?", a: "No. Approval depends on the concerned government authority. We do not guarantee approval or specific processing times." },
  { q: "Can I get a refund or cancel my application?", a: "Yes, in the cases described in our Refund & Cancellation Policy (link in the footer). Contact us with your application number and we will guide you." },
  { q: "How do I track my application?", a: "Go to My Applications or use the Track Your Application section on the home page with your reference number." },
  { q: "What documents do I need?", a: "Required documents vary by service and are listed on each service detail page." },
];

export default function Help() {
  const [open, setOpen] = useState(null);
  return (
    <div className="min-h-screen bg-secondary/40">
      <div className="bg-navy px-4 py-8 text-white">
        <div className="mx-auto max-w-5xl">
          <Logo variant="light" />
          <h1 className="mt-6 font-heading text-2xl font-bold">Help &amp; Support</h1>
          <p className="mt-2 text-sm text-white/75">We're here to help. Find answers or reach out to our support team.</p>
        </div>
      </div>
      <main className="mx-auto max-w-5xl px-4 pb-24 pt-6">
        <h2 className="px-1 font-heading text-base font-bold text-navy">Frequently Asked Questions</h2>
        <div className="mt-3 space-y-2">
          {faqs.map((f, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-border bg-white shadow-card">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between px-4 py-3.5 text-left"
              >
                <span className="text-sm font-semibold text-foreground">{f.q}</span>
                <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open === i ? "rotate-180" : ""}`} />
              </button>
              {open === i && (
                <p className="px-4 pb-4 text-sm text-muted-foreground">{f.a}</p>
              )}
            </div>
          ))}
        </div>

        <h2 className="mt-8 px-1 font-heading text-base font-bold text-navy">Contact Support</h2>
        <p className="mt-1 px-1 text-sm text-muted-foreground">
          Or see our <Link to="/contact" className="font-semibold text-navy underline">Contact page</Link> for phone, email and address.
        </p>
        <div className="mt-3"><SupportForm /></div>
      </main>
      <Footer />
    </div>
  );
}
