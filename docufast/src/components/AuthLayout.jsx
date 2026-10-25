import React from "react";
import { Link } from "react-router-dom";
import Logo from "@/components/Logo";

export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <div className="flex min-h-screen flex-col bg-secondary/40">
      <div className="bg-navy px-4 py-5 text-white">
        <div className="mx-auto max-w-md">
          <Link to="/"><Logo variant="light" /></Link>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gold text-navy">
              {Icon && <Icon className="h-7 w-7" aria-hidden="true" />}
            </div>
            <h1 className="font-heading text-2xl font-bold tracking-tight text-navy">{title}</h1>
            {subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="rounded-2xl border border-border bg-white p-6 shadow-card sm:p-8">
            {children}
          </div>
          {footer && (
            <p className="mt-5 text-center text-sm text-muted-foreground">{footer}</p>
          )}
          <p className="mt-6 text-center text-[11px] leading-relaxed text-muted-foreground/80">
            DocuFast is an independent private service and is not a government department.
          </p>
        </div>
      </div>
    </div>
  );
}