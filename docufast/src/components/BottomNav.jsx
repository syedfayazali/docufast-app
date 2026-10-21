import React from "react";
import { NavLink } from "react-router-dom";
import { Home, LayoutGrid, FileText, Bell, User, CalendarCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/services", label: "Services", icon: LayoutGrid },
  { to: "/book-appointment", label: "Bookings", icon: CalendarCheck, also: ["/my-appointments", "/appointment"] },
  { to: "/applications", label: "Applications", icon: FileText },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/profile", label: "Profile", icon: User },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-white pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-5xl items-stretch justify-between">
        {items.map(({ to, label, icon: Icon, also }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors",
                isActive || (also || []).some((x) => window.location.pathname.startsWith(x)) ? "text-gold" : "text-muted-foreground"
              )
            }
          >
            {({ isActive: navActive }) => { const isActive = navActive || (also || []).some((x) => window.location.pathname.startsWith(x)); return (
              <>
                <Icon className={cn("h-5 w-5", isActive && "stroke-[2.4]")} />
                <span>{label}</span>
              </>
            ); }}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}