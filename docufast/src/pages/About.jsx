import React from "react";
import { ShieldCheck, Eye, Activity, Headphones, Users } from "lucide-react";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";

const values = [
  { icon: ShieldCheck, title: "No Hidden Charges", text: "Government fees and our service charges are always shown separately." },
  { icon: Eye, title: "Transparent Process", text: "You see exactly what you're paying for and what each step involves." },
  { icon: Activity, title: "Application Tracking", text: "Track your application status from submission to completion." },
  { icon: Headphones, title: "Customer Support", text: "Our team is here to guide you through every step." },
];

export default function About() {
  return (
    <div className="min-h-screen bg-secondary/40">
      <div className="bg-navy px-4 py-8 text-white">
        <div className="mx-auto max-w-5xl">
          <Logo variant="light" />
          <h1 className="mt-6 font-heading text-2xl font-bold">About DocuFast India</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/75">
            DocuFast India is an independent facilitation platform that helps customers access and manage
            government and document-related services through a simple, transparent and professional interface.
          </p>
        </div>
      </div>
      <main className="mx-auto max-w-5xl px-4 pb-24 pt-6">
        <div className="grid gap-3 sm:grid-cols-2">
          {values.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-border bg-white p-5 shadow-card">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/10 text-gold">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-3 font-heading text-sm font-bold text-navy">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-center gap-2 text-amber-800">
            <Users className="h-5 w-5" />
            <h3 className="font-heading text-sm font-bold">Important Disclaimer</h3>
          </div>
          <p className="mt-2 text-sm text-amber-800/90">
            DocuFast India is not a government department. We do not guarantee government approval or processing times.
            Government fees are subject to applicable government rules and may change. Our role is to guide and assist
            you through the application process transparently.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}