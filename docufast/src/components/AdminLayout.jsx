import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, FileText, Settings, Users, CreditCard, ArrowLeft, Calendar, Package } from "lucide-react";
import Logo from "@/components/Logo";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/admin-dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/admin-orders", label: "Orders", icon: Package },
  { to: "/admin-applications", label: "Apps", icon: FileText },
  { to: "/service-editor", label: "Services", icon: Settings },
  { to: "/admin-users", label: "Users", icon: Users },
  { to: "/admin-appointments", label: "Bookings", icon: Calendar },
  { to: "/admin-payments", label: "Payments", icon: CreditCard },
];

export default function AdminLayout({ title, children }) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-secondary/40 pb-16 print:bg-white print:pb-0">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-navy text-white pt-[env(safe-area-inset-top)] print:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <Logo variant="light" />
            <span className="rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-navy">Admin</span>
          </div>
          <button onClick={() => navigate("/dashboard")} className="inline-flex items-center gap-1 text-xs font-medium text-white/80 hover:text-gold">
            <ArrowLeft className="h-4 w-4" /> Exit
          </button>
        </div>
      </header>

      <main className="px-4 py-4 print:p-0">
        {title && <h1 className="mb-4 font-heading text-lg font-bold text-navy">{title}</h1>}
        {children}
      </main>

      {/* Fixed bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-white print:hidden">
        <div className="mx-auto flex max-w-xl">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold transition-colors",
                  isActive ? "text-navy" : "text-muted-foreground"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}