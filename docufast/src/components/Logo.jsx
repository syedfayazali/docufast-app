import React from "react";
import { cn } from "@/lib/utils";

const FULL_LOGO =
  "https://media.base44.com/images/public/6a99a28a5cee4eafc7da7547/3ffd6ce0e_WhatsAppImage2026-08-06at40551PM.jpeg";
const ICON_MARK = "/logo-icon.png";
const WIDE_LOGO =
  "https://media.base44.com/images/public/6a99a28a5cee4eafc7da7547/e11de1327_WhatsApp_Image_2026-10-13_at_104818_AM.jpeg";

export default function Logo({ className, variant = "dark", showText = true, height = 40, showName = true }) {
  const isLight = variant === "light";

  // Dark backgrounds (header etc.): [icon] + [brand name beside it]
  if (isLight) {
    return (
      <div className={cn("flex items-center", className)}>
        {/* 1) the icon, no box or padding around it */}
        {/* icon inside a white round frame */}
<span
  className="flex shrink-0 items-center justify-center rounded-full bg-white shadow-sm"
  style={{ height: Math.max(32, height), width: Math.max(32, height), padding: 4 }}
>
  <img
    src={ICON_MARK}
    alt="DocuFast India"
    className="h-full w-full rounded-full object-contain"
  />
</span>

        {/* 2) the brand name, a sibling of the chip (NOT inside it) */}
        {showName && (
          <span
            className="ml-2.5 whitespace-nowrap font-heading font-bold leading-none tracking-tight"
            style={{ color: "#ffffff", fontSize: "18px" }}
          >
            DocuFast India
            <sup style={{ color: "#F5A623", fontSize: "11px", marginLeft: "2px" }}>™</sup>
          </span>
        )}
      </div>
    );
  }

  // Light backgrounds: full lockup or icon mark
  const src = showText ? FULL_LOGO : ICON_MARK;
  return (
    <div className={cn("flex items-center", className)}>
      <img src={WIDE_LOGO} alt="DocuFast India" style={{ height }} className="w-auto" />
    </div>
  );
}
