import React from "react";
import { cn } from "@/lib/utils";

export default function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-white px-6 py-12 text-center", className)}>
      {Icon && <Icon className="mb-3 h-10 w-10 text-muted-foreground/50" />}
      <h3 className="font-heading text-base font-semibold text-foreground">{title}</h3>
      {description && <p className="mt-1 max-w-xs text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}