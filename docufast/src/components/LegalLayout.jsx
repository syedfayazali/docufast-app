import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";
import { businessInfo as b } from "@/lib/businessInfo";

export default function LegalLayout({ title, intro, children, showUpdated = true }) {
  return (
    <div className="min-h-screen bg-secondary/40">
      <div className="bg-navy px-4 py-8 text-white">
        <div className="mx-auto max-w-3xl">
          <Link to="/"><Logo variant="light" /></Link>
          <h1 className="mt-6 font-heading text-2xl font-bold">{title}</h1>
          {intro && <p className="mt-2 text-sm text-white/75">{intro}</p>}
          {showUpdated && <p className="mt-2 text-[11px] text-white/60">Last updated: {b.lastUpdated}</p>}
        </div>
      </div>
      <main className="mx-auto max-w-3xl px-4 pb-10 pt-6">
        <Link to="/home" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>
        <article className="space-y-6 rounded-2xl border border-border bg-white p-5 text-sm leading-relaxed text-foreground shadow-card sm:p-8">
          {children}
        </article>
      </main>
      <Footer />
    </div>
  );
}

export function Section({ title, children }) {
  return (
    <section>
      <h2 className="font-heading text-base font-bold text-navy">{title}</h2>
      <div className="mt-2 space-y-2 text-muted-foreground">{children}</div>
    </section>
  );
}

export function List({ items }) {
  return (
    <ul className="list-disc space-y-1 pl-5">
      {items.map((i, n) => <li key={n}>{i}</li>)}
    </ul>
  );
}
