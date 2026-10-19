import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, Search as SearchIcon, User } from "lucide-react";
import Logo from "@/components/Logo";
import { cn } from "@/lib/utils";

export default function Header({ title, showSearch = false, onSearch }) {
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-30 bg-navy text-white pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <button onClick={() => navigate("/home")} className="flex items-center">
          <Logo variant="light" />
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate("/notifications")}
            className="relative flex h-11 w-11 items-center justify-center rounded-full text-white/80 hover:bg-white/10 hover:text-white"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-gold" />
          </button>
          <button
            onClick={() => navigate("/profile")}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="Profile"
          >
            <User className="h-5 w-5" />
          </button>
        </div>
      </div>
      {title && (
        <div className="mx-auto max-w-5xl px-4 pb-4">
          <h1 className="font-heading text-xl font-bold text-white">{title}</h1>
        </div>
      )}
      {showSearch && (
        <div className="mx-auto max-w-5xl px-4 pb-4">
          <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 shadow-card">
            <SearchIcon className="h-5 w-5 text-muted-foreground" />
            <input
              onChange={(e) => onSearch?.(e.target.value)}
              placeholder="What service do you need?"
              className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>
      )}
    </header>
  );
}