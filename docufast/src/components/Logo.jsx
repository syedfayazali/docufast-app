import React from "react";
import { cn } from "@/lib/utils";

// Your logo icon: a transparent PNG saved at public/logo-icon.png
const ICON_MARK = "/logo-icon.png";

export default function Logo({ className, variant = "dark", showText = true, height = 40, showName = true, nameSize = 18 }) {
  const isLight = variant === "light";

  // Dark backgrounds (header etc.): [icon] + [brand name beside it]
  if (isLight) {
    return (
      <div className={cn("flex items-center", className)}>
        {/* 1) the icon inside a white round frame.
            The white is an inline style on purpose: dark mode recolours the "bg-white" class,
            which made the logo disappear. */}
        <span
          className="flex shrink-0 items-center justify-center rounded-full shadow-sm"
          style={{
            backgroundColor: "#ffffff",
            height: Math.max(32, height - 4),
            width: Math.max(32, height - 4),
            padding: 4,
          }}
        >
          <img src={ICON_MARK} alt="DocuFast India" className="h-full w-full rounded-full object-contain" />
        </span>

        {/* 2) the brand name, a sibling of the frame (NOT inside it) */}
        {showName && (
          <span
            className="ml-2.5 whitespace-nowrap font-heading font-bold leading-none tracking-tight"
            style={{ color: "#ffffff", fontSize: `${nameSize}px` }}
          >
            DocuFast India
            <sup style={{ color: "#F5A623", fontSize: `${Math.round(nameSize * 0.6)}px`, marginLeft: "2px" }}>™</sup>
          </span>
        )}
      </div>
    );
  }

  // Light backgrounds: [icon in white round frame] + [brand name]
  return (
    <div className={cn("flex items-center", className)}>
      <span
        className="flex shrink-0 items-center justify-center rounded-full border border-border shadow-sm"
        style={{ backgroundColor: "#ffffff", height, width: height, padding: 4 }}
      >
        <img src={ICON_MARK} alt="DocuFast India" className="h-full w-full rounded-full object-contain" />
      </span>
      {showName && (
        <span className="ml-2.5 whitespace-nowrap font-heading font-bold leading-none tracking-tight text-navy" style={{ fontSize: `${nameSize}px` }}>
          DocuFast India
          <sup style={{ color: "#F5A623", fontSize: `${Math.round(nameSize * 0.6)}px`, marginLeft: "2px" }}>™</sup>
        </span>
      )}
    </div>
  );
}
