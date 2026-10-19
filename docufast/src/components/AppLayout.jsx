import React from "react";
import { Outlet } from "react-router-dom";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";

export default function AppLayout({ title, showSearch, onSearch }) {
  return (
    <div className="min-h-screen bg-secondary/40">
      <Header title={title} showSearch={showSearch} onSearch={onSearch} />
      <main className="mx-auto max-w-5xl px-4 pb-24 pt-4">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}