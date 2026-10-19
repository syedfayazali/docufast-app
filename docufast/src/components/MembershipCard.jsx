import React, { useRef, useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Download, Award, Check, Phone, MessageCircle, Globe, MapPin, Facebook, Instagram, Linkedin, Twitter, Youtube } from "lucide-react";
import Logo from "@/components/Logo";

/* Real, scannable QR code: opens the public services page of this website. */
function ServicesQR({ memberId, size = 78 }) {
  const url = `${window.location.origin}/services?ref=${encodeURIComponent(memberId)}`;
  return (
    <QRCodeSVG value={url} size={size} level="M" marginSize={0} bgColor="#ffffff" fgColor="#0A1D4D" title="Scan to see our services" />
  );
}

const cursive = { fontFamily: "'Brush Script MT', 'Lucida Handwriting', cursive" };

export default function MembershipCard({ user }) {
  const frontRef = useRef(null);
  const backRef = useRef(null);
  const [photoFailed, setPhotoFailed] = useState(false);

  const displayName = user?.full_name || "Customer";
  const email = user?.email || "—";
  const joinDate = user?.created_date ?
  new Date(user.created_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) :
  "—";
  const validTill = user?.created_date ?
  new Date(new Date(user.created_date).setFullYear(new Date(user.created_date).getFullYear() + 1)).
  toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) :
  "—";
  const memberId = user?.id ? "DF-" + user.id.slice(-6).toUpperCase() : "DF-000000";
  const initials = (displayName || "C").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  useEffect(() => setPhotoFailed(false), [user?.avatar_url]);

  const handleDownload = async () => {
    const html2canvas = (await import("html2canvas")).default;
    const { jsPDF } = await import("jspdf");
    const opts = { scale: 3, backgroundColor: null, useCORS: true };
    const f = await html2canvas(frontRef.current, opts);
    const b = await html2canvas(backRef.current, opts);
    const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [f.width / 3, f.height / 3] });
    pdf.addImage(f.toDataURL("image/png"), "PNG", 0, 0, f.width / 3, f.height / 3);
    pdf.addPage([b.width / 3, b.height / 3], "landscape");
    pdf.addImage(b.toDataURL("image/png"), "PNG", 0, 0, b.width / 3, b.height / 3);
    pdf.save(`DocuFast-Membership-${displayName.replace(/\s+/g, "_")}.pdf`);
  };

  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="font-heading text-sm font-bold text-navy">Membership Card</h2>
        <button onClick={handleDownload} className="flex items-center gap-1.5 rounded-lg bg-gold/15 px-2.5 py-1.5 text-xs font-semibold text-gold">
          <Download className="h-3.5 w-3.5" /> Download
        </button>
      </div>

      {/* FRONT */}
      <div ref={frontRef} className="keep-light relative overflow-hidden rounded-2xl bg-white shadow-card" style={{ aspectRatio: "1.6 / 1" }}>
        {/* angled navy header band */}
        <div className="absolute inset-x-0 top-0 h-[26%]">
          <div className="absolute inset-y-0 right-0 w-[80%] bg-navy" style={{ clipPath: "polygon(14% 0, 100% 0, 100% 100%, 0 100%)" }} />
          <div className="absolute inset-y-0 right-0 flex w-[80%] items-center justify-center" style={{ clipPath: "polygon(14% 0, 100% 0, 100% 100%, 0 100%)" }}>
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-white sm:text-sm">Membership Card</span>
          </div>
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            <Logo variant="dark" showText height={26} />
          </div>
        </div>

        {/* body */}
        <div className="absolute inset-x-0 top-[26%] bottom-[12%] flex items-center gap-3 px-4 sm:gap-5 sm:px-6">
          {/* photo */}
          <div className="flex h-[58%] w-auto aspect-square items-center justify-center overflow-hidden rounded-xl border-2 border-gold bg-navy text-white">
            {user?.avatar_url && !photoFailed ? (
              <img
                src={user.avatar_url}
                alt={displayName}
                crossOrigin="anonymous"
                onError={() => setPhotoFailed(true)}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="font-heading text-xl font-bold">{initials}</span>
            )}
          </div>
          {/* info */}
          <div className="flex-1 space-y-1.5 text-[10px] sm:text-xs">
            <InfoLine label="Member Name" value={displayName} />
            <InfoLine label="Membership No." value={memberId} />
            <InfoLine label="Join Date" value={joinDate} />
            <InfoLine label="Valid Till" value={validTill} />
          </div>
          {/* qr */}
          <div className="flex flex-col items-center">
            <div className="rounded-lg border border-border bg-white p-1">
              <ServicesQR memberId={memberId} size={78} />
            </div>
            <span className="mt-1 text-[7px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-[8px]">Scan for our services</span>
          </div>
        </div>

        {/* footer band */}
        <div className="absolute inset-x-0 bottom-0 flex h-[12%] items-center justify-center bg-navy">
          <span className="text-[9px] font-semibold uppercase tracking-[0.25em] text-white sm:text-[11px]">Our Services &nbsp;|&nbsp; Your Convenience</span>
        </div>
      </div>

      {/* BACK */}
      <div ref={backRef} className="keep-light relative mt-3 overflow-hidden rounded-2xl bg-navy p-4 text-white shadow-card" style={{ aspectRatio: "1.6 / 1" }}>
        {/* top row */}
        <div className="flex items-center justify-between">
          <Logo variant="light" height={24} showName={false} />
          <span style={cursive} className="text-lg text-white">Your Support Our Priority!</span>
        </div>

        {/* body */}
        <div className="mt-3 grid grid-cols-2 gap-4">
          {/* benefits */}
          <div>
            <div className="inline-block rounded-md bg-gold px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-navy sm:text-[10px]">Member Benefits</div>
            <ul className="mt-2 space-y-1.5">
              {["Special Discounts on Services", "Priority Support", "Exclusive Offers & Updates", "Access to Latest Information", "Dedicated Customer Assistance"].map((b) =>
              <li key={b} className="flex items-center gap-1.5 text-[9px] text-white/90 sm:text-[11px]">
                  <Check className="h-3.5 w-3.5 shrink-0 text-gold" /> {b}
                </li>
              )}
            </ul>
          </div>
          {/* contact */}
          <div className="space-y-1.5 rounded-md">
            <ContactRow icon={Phone} text="08542 355200" />
            <ContactRow icon={MessageCircle} text="83749 68022" />
            <ContactRow icon={Globe} text="www.docufastindia.com" />
            <ContactRow icon={MapPin} text="Mahabubnagar Branch, Telangana" />
          </div>
        </div>

        {/* thank you */}
        <div className="mt-2 text-center">
          <span style={cursive} className="text-2xl text-white">Thank You</span>
        </div>

        {/* footer */}
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gold px-3 py-1.5">
          <span className="text-[9px] font-bold uppercase tracking-wide text-navy sm:text-[10px]">Follow us:</span>
          <div className="flex items-center gap-1.5 text-navy">
            <Facebook className="h-3.5 w-3.5" /><Instagram className="h-3.5 w-3.5" /><Linkedin className="h-3.5 w-3.5" /><Twitter className="h-3.5 w-3.5" /><Youtube className="h-3.5 w-3.5" />
          </div>
          <span className="ml-auto text-[9px] font-semibold text-navy sm:text-[10px]">@docufast.india</span>
        </div>
      </div>
    </div>);

}

function InfoLine({ label, value }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="font-semibold text-muted-foreground">{label} :</span>
      <span className="font-semibold text-navy">{value}</span>
    </div>);

}

function ContactRow({ icon: Icon, text }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold">
        <Icon className="h-3.5 w-3.5 text-navy" />
      </div>
      <span className="text-[9px] text-white/90 sm:text-[11px]">{text}</span>
    </div>);

}