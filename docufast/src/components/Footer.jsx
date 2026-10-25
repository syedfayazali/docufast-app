import React from "react";
import { Link } from "react-router-dom";
import { businessInfo as b } from "@/lib/businessInfo";

// Shown on public pages. Keeps the legal links and the "not a government site" notice visible everywhere.
export default function Footer() {
  return (
    <footer className="border-t border-border bg-white px-4 pb-24 pt-6 text-center">
      <div className="mx-auto max-w-5xl">
        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs font-semibold text-navy">
          <Link to="/about" className="hover:underline">About</Link>
          <Link to="/terms" className="hover:underline">Terms &amp; Conditions</Link>
          <Link to="/privacy" className="hover:underline">Privacy Policy</Link>
          <Link to="/refund-policy" className="hover:underline">Refund &amp; Cancellation</Link>
          <Link to="/contact" className="hover:underline">Contact Us</Link>
          <Link to="/delete-account" className="hover:underline">Delete Account</Link>
        </nav>
        <p className="mx-auto mt-4 max-w-2xl text-[11px] leading-relaxed text-muted-foreground">
          {b.brandName} is an independent, privately operated assistance service. We are not a government
          department and are not affiliated with, or endorsed by, any government authority. Any official fee is set by
          the department and paid by you directly to it; we charge only our own service fee, shown before you pay.
        </p>
        <p className="mt-2 text-[11px] text-muted-foreground">
          {b.legalName} · {b.phone}
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">© {new Date().getFullYear()} {b.brandName}</p>
      </div>
    </footer>
  );
}
