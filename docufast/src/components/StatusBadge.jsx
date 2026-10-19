import React from "react";
import { cn } from "@/lib/utils";

const statusStyles = {
  Draft: "bg-amber-50 text-amber-700",
  Submitted: "bg-blue-50 text-blue-700",
  "Under Review": "bg-amber-50 text-amber-700",
  "Action Required": "bg-orange-50 text-orange-700",
  Approved: "bg-emerald-50 text-emerald-700",
  Completed: "bg-emerald-100 text-emerald-800",
  Rejected: "bg-red-50 text-red-700",
  Cancelled: "bg-secondary text-muted-foreground",
};

// "Draft" is how the database stores an application that has not been paid for yet.
export const statusLabel = (status) => (status === "Draft" ? "Awaiting Payment" : status);

export default function StatusBadge({ status, className }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        statusStyles[status] || statusStyles.Draft,
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {statusLabel(status)}
    </span>
  );
}