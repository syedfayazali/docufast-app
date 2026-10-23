import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, ShieldCheck, Activity, Headphones, ChevronRight, FileText, Plane, ScrollText, Award, Users, Calendar } from "lucide-react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import Footer from "@/components/Footer";
import ServiceCard from "@/components/ServiceCard";
import EmptyState from "@/components/EmptyState";
import { backend } from "@/api/backend";
import { Image } from "@/components/ui/image";
import { useAuth } from "@/lib/AuthContext";

const categories = [
  { name: "Certificates", icon: Award, color: "bg-blue-50 text-blue-700" },
  { name: "Passport", icon: Plane, color: "bg-amber-50 text-amber-700" },
  { name: "Deeds", icon: ScrollText, color: "bg-emerald-50 text-emerald-700" },
  { name: "Government Documents", icon: FileText, color: "bg-violet-50 text-violet-700" },
];

export default function Home() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [services, setServices] = useState(null);
  const [banner, setBanner] = useState(null);
  const { isAuthenticated } = useAuth();
  React.useEffect(() => {
    backend.entities.Service.list("display_order", 50)
      .then(setServices)
      .catch(() => setServices([]));
    backend.entities.Banner.filter({ active: true }, "-display_order", 1)
      .then((rows) => setBanner(rows[0] || null))
      .catch(() => {});
  }, []);

  const results = query
    ? (services || []).filter((s) =>
        [s.name, s.category, s.short_description].filter(Boolean).join(" ").toLowerCase().includes(query.toLowerCase())
      )
    : (services || []).slice(0, 4);

  return (
    <div className="min-h-screen bg-secondary/40">
      <Header showSearch onSearch={setQuery} />
      <main className="mx-auto max-w-5xl px-4 pb-24 pt-4">
        {/* Promotional banner */}
        {banner && (
          <div
            className="relative mb-4 overflow-hidden rounded-2xl p-5 text-white shadow-card"
            style={{ backgroundColor: banner.bg_color || "#0A1D4D" }}
          >
            {banner.image_url && (
              <>
                <Image src={banner.image_url} fittingType="fill" alt="" className="absolute inset-0 h-full w-full" />
                <div className="absolute inset-0 bg-black/45" />
              </>
            )}
            <div className="relative">
              <h2 className="font-heading text-lg font-bold">{banner.title}</h2>
              {banner.subtitle && <p className="mt-1 text-sm text-white/85">{banner.subtitle}</p>}
              {banner.cta_label && (
                <Link
                  to={banner.cta_link || "/services"}
                  className="mt-3 inline-flex items-center rounded-lg bg-gold px-3 py-1.5 text-xs font-bold text-navy"
                >
                  {banner.cta_label}
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Trust banner */}
        <div className="overflow-hidden rounded-2xl bg-navy p-5 text-white">
          <div className="flex items-center gap-2 text-gold">
            <ShieldCheck className="h-5 w-5" />
            <span className="text-sm font-semibold">No Hidden Charges</span>
          </div>
          <p className="mt-1.5 text-sm text-white/75">
            Government fees and DocuFast India service charges are clearly shown.
          </p>
          <p className="mt-2 text-[11px] text-white/60">
            Independent private assistance service. Not a government website.
          </p>
        </div>

        {/* Categories */}
        <h2 className="mt-6 px-1 font-heading text-base font-bold text-foreground">Service Categories</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {categories.map(({ name, icon: Icon, color }) => (
            <button
              key={name}
              onClick={() => navigate(`/services/${encodeURIComponent(name)}`)}
              className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-white p-4 shadow-card transition-all hover:border-gold/60"
            >
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold text-foreground">{name}</span>
            </button>
          ))}
        </div>

        {/* Search results / featured */}
        <div className="mt-6 flex items-center justify-between px-1">
          <h2 className="font-heading text-base font-bold text-foreground">
            {query ? `Results for "${query}"` : "Featured Services"}
          </h2>
          <Link to="/services" className="text-xs font-semibold text-gold">View all</Link>
        </div>
        <div className="mt-3 space-y-3">
          {services === null ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-[72px] animate-pulse rounded-2xl bg-white" />
              ))}
            </div>
          ) : results.length === 0 ? (
            <EmptyState icon={Search} title="No services found" description="Try a different search term." />
          ) : (
            results.map((s) => <ServiceCard key={s.id} service={s} />)
          )}
        </div>

        {/* Book appointment */}
        <Link
          to="/book-appointment"
          className="mt-4 flex items-center gap-3 rounded-2xl border border-border bg-white p-4 shadow-card"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold/10 text-gold">
            <Calendar className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-heading text-sm font-semibold text-foreground">Book an Appointment</h3>
            <p className="text-xs text-muted-foreground">Pick a time to visit us or get a call.</p>
          </div>
          <span className="text-xs font-semibold text-gold">Book Now</span>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </Link>

        {/* Need help */}
        <Link
          to="/help"
          className="mt-4 flex items-center gap-3 rounded-2xl border border-border bg-white p-4 shadow-card"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold/10 text-gold">
            <Headphones className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-heading text-sm font-semibold text-foreground">Need Help?</h3>
            <p className="text-xs text-muted-foreground">Talk to DocuFast India support.</p>
          </div>
          <span className="text-xs font-semibold text-gold">Contact Support</span>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </Link>
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}