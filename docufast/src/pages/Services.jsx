import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { Search, LayoutGrid } from "lucide-react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import Footer from "@/components/Footer";
import ServiceCard from "@/components/ServiceCard";
import EmptyState from "@/components/EmptyState";
import { base44 } from "@/api/base44Client";

const defaultFilters = ["All", "Certificates", "Passport", "Deeds", "Government Documents", "Other"];

export default function Services() {
  const { category: paramCategory } = useParams();
  const [active, setActive] = useState(paramCategory ? decodeURIComponent(paramCategory) : "All");
  const [query, setQuery] = useState("");
  const [services, setServices] = useState(null);
  const [filters, setFilters] = useState(defaultFilters);

  React.useEffect(() => {
    base44.entities.Service.list("display_order", 100)
      .then(setServices)
      .catch(() => setServices([]));
    base44.entities.Category.list("display_order", 100)
      .then((rows) => {
        const cats = rows.filter((c) => c.active).map((c) => c.name);
        setFilters(cats.length ? ["All", ...cats] : defaultFilters);
      })
      .catch(() => {});
  }, []);

  const filtered = (services || []).filter((s) => {
    const matchCat = active === "All" || s.category === active;
    const matchQuery = !query ||
      [s.name, s.short_description, s.category].filter(Boolean).join(" ").toLowerCase().includes(query.toLowerCase());
    return matchCat && matchQuery;
  });

  return (
    <div className="min-h-screen bg-secondary/40">
      <Header title="All Services" />
      <main className="mx-auto max-w-5xl px-4 pb-24 pt-4">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-2.5 shadow-card">
          <Search className="h-5 w-5 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search services"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setActive(f)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                active === f ? "bg-navy text-white" : "border border-border bg-white text-muted-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="mt-5 space-y-3">
          {services === null ? (
            <div className="space-y-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-[72px] animate-pulse rounded-2xl bg-white" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={LayoutGrid} title="No services found" description="Try a different filter or search." />
          ) : (
            filtered.map((s) => <ServiceCard key={s.id} service={s} />)
          )}
        </div>

        <p className="mt-5 text-center text-[11px] text-muted-foreground">
          * Government fees are as prescribed by the concerned authority and may change. Our service charge is shown separately.
        </p>
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}