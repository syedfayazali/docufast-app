import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const iconMap = {
  "FileText": "FileText",
  "Plane": "Plane",
  "Home": "Home",
  "Award": "Award",
  "Users": "Users",
  "FileCheck": "FileCheck",
  "ScrollText": "ScrollText",
  "Landmark": "Landmark",
  "Building2": "Building2",
  "ShieldCheck": "ShieldCheck",
};

export default function ServiceCard({ service }) {
  const total = (service.government_fee || 0) + (service.service_charge || 0) + (service.other_charges || 0);
  return (
    <Link
      to={`/service/${service.id}`}
      className="group flex items-center gap-3 rounded-2xl border border-border bg-white p-4 shadow-card transition-all hover:border-gold/60 hover:shadow-navy"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-navy/5 text-navy">
        <span className="font-heading text-lg font-bold">{service.name.charAt(0)}</span>
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-heading text-sm font-semibold text-foreground">{service.name}</h3>
        <p className="truncate text-xs text-muted-foreground">{service.short_description}</p>
        {total > 0 && (
          <p className="mt-1 text-[11px] font-medium text-gold">Starting from ₹{total}</p>
        )}
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}