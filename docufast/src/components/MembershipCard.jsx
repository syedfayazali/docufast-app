import React, { useRef, useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Download, Check, Phone, MessageCircle, Globe, MapPin, Facebook, Instagram, Linkedin, Twitter, Youtube, RotateCw } from "lucide-react";
import Logo from "@/components/Logo";

/*
 * The card is drawn on a fixed 390 x 244 canvas and the whole canvas is scaled to the
 * available width. That keeps every element in exactly the same place on phones,
 * tablets and desktops (and in dark mode: all colours are fixed, not theme-based).
 */
const W = 390;
const H = 244;
const MAX_WIDTH = 520;

const NAVY = "#0A1D4D";
const GOLD = "#F5A623";
const MUTED = "#5B6275";
const cursive = { fontFamily: "'Brush Script MT', 'Lucida Handwriting', cursive" };
const bold = { fontWeight: 800 };

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

/* Real, scannable QR code: opens the public services page of this website. */
function ServicesQR({ memberId, size }) {
  const url = `${window.location.origin}/services?ref=${encodeURIComponent(memberId)}`;
  return <QRCodeSVG value={url} size={size} level="M" marginSize={0} bgColor="#ffffff" fgColor={NAVY} title="Scan to see our services" />;
}

function FrontFace({ name, initials, avatar, memberId, joinDate, validTill }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [avatar]);
  return (
    <div style={{ position: "relative", width: W, height: H, background: "#ffffff", overflow: "hidden", color: NAVY }}>
      {/* header: big logo on the left, angled navy band on the right */}
      <div style={{ position: "absolute", left: 0, top: 0, width: W, height: 62 }}>
        <div
          style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: "50%", background: NAVY, clipPath: "polygon(16% 0, 100% 0, 100% 100%, 0 100%)" }}
        />
        <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: "50%", display: "flex", alignItems: "center", justifyContent: "center", paddingLeft: 18 }}>
          <span style={{ color: "#ffffff", fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", ...bold }}>Membership Card</span>
        </div>
        <div style={{ position: "absolute", left: 12, top: 0, bottom: 0, display: "flex", alignItems: "center" }}>
          <Logo variant="dark" showText height={50} />
        </div>
      </div>

      {/* body */}
      <div style={{ position: "absolute", left: 16, right: 16, top: 62, bottom: 26, display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{ width: 80, height: 80, flexShrink: 0, borderRadius: 12, border: `2px solid ${GOLD}`, background: NAVY, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff" }}
        >
          {avatar && !failed ? (
            <img src={avatar} alt={name} crossOrigin="anonymous" onError={() => setFailed(true)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span style={{ fontSize: 26, ...bold }}>{initials}</span>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 5 }}>
          <Field label="Member Name" value={name} big />
          <Field label="Membership No." value={memberId} />
          <div style={{ display: "flex", gap: 14 }}>
            <Field label="Join Date" value={joinDate} />
            <Field label="Valid Till" value={validTill} />
          </div>
        </div>

        <div style={{ width: 76, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ border: "1px solid #E3E6EE", borderRadius: 8, padding: 3, background: "#ffffff" }}>
            <ServicesQR memberId={memberId} size={66} />
          </div>
          <span style={{ marginTop: 3, fontSize: 7, lineHeight: 1.15, textAlign: "center", color: MUTED, textTransform: "uppercase", letterSpacing: "0.04em", ...bold }}>
            Scan for our services
          </span>
        </div>
      </div>

      {/* footer band */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 26, background: NAVY, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "#ffffff", fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", ...bold }}>Our Services &nbsp;|&nbsp; Your Convenience</span>
      </div>
    </div>
  );
}

function Field({ label, value, big }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 8, lineHeight: 1.1, color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em", ...bold }}>{label}</div>
      <div style={{ fontSize: big ? 14 : 11.5, lineHeight: 1.2, color: NAVY, wordBreak: "break-word", ...bold }}>{value}</div>
    </div>
  );
}

const BENEFITS = ["Special Discounts", "Priority Support", "Exclusive Offers & Updates", "Latest Information Access", "Dedicated Assistance"];
const CONTACTS = [
  { icon: Phone, text: "08542 355200" },
  { icon: MessageCircle, text: "83749 68022" },
  { icon: Globe, text: "www.docufastindia.com" },
  { icon: MapPin, text: "Mahabubnagar Branch, Telangana" },
];

function BackFace() {
  return (
    <div style={{ position: "relative", width: W, height: H, background: NAVY, overflow: "hidden", color: "#ffffff" }}>
      <div style={{ position: "absolute", left: 14, right: 14, top: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Logo variant="light" height={52} nameSize={19} />
        <span style={{ ...cursive, fontSize: 15, color: "#ffffff", textAlign: "right", lineHeight: 1.1 }}>Your Support<br />Our Priority!</span>
      </div>

      <div style={{ position: "absolute", left: 14, right: 14, top: 72, display: "flex", gap: 12 }}>
        <div style={{ width: 158 }}>
          <div style={{ display: "inline-block", background: GOLD, color: NAVY, borderRadius: 5, padding: "3px 8px", fontSize: 8.5, letterSpacing: "0.08em", textTransform: "uppercase", ...bold }}>
            Member Benefits
          </div>
          <ul style={{ margin: "6px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 5 }}>
            {BENEFITS.map((b) => (
              <li key={b} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 9.5, lineHeight: 1.1, ...bold }}>
                <Check style={{ width: 12, height: 12, flexShrink: 0, color: GOLD }} /> {b}
              </li>
            ))}
          </ul>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
          {CONTACTS.map(({ icon: Icon, text }) => (
            <div key={text} style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div style={{ width: 22, height: 22, flexShrink: 0, borderRadius: 11, background: GOLD, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon style={{ width: 12, height: 12, color: NAVY }} />
              </div>
              <span style={{ fontSize: 10, lineHeight: 1.15, ...bold }}>{text}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ position: "absolute", left: 0, right: 0, bottom: 28, textAlign: "center" }}>
        <span style={{ ...cursive, fontSize: 22, color: "#ffffff" }}>Thank You</span>
      </div>

      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 26, background: GOLD, color: NAVY, display: "flex", alignItems: "center", gap: 8, padding: "0 12px" }}>
        <span style={{ fontSize: 9, letterSpacing: "0.04em", textTransform: "uppercase", ...bold }}>Follow us:</span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {[Facebook, Instagram, Linkedin, Twitter, Youtube].map((I, i) => (
            <I key={i} style={{ width: 13, height: 13 }} />
          ))}
        </div>
        <span style={{ marginLeft: "auto", fontSize: 9.5, ...bold }}>@docufast.india</span>
      </div>
    </div>
  );
}

export default function MembershipCard({ user }) {
  const boxRef = useRef(null);
  const frontCap = useRef(null);
  const backCap = useRef(null);
  const [width, setWidth] = useState(MAX_WIDTH);
  const [flipped, setFlipped] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const startX = useRef(null);

  // Scale the fixed canvas to the space we have.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return undefined;
    const measure = () => setWidth(Math.min(el.clientWidth || MAX_WIDTH, MAX_WIDTH));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const scale = width / W;

  const name = user?.full_name || "Customer";
  const initials = name.split(" ").filter(Boolean).map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "C";
  const memberId = user?.id ? "DF-" + user.id.slice(-6).toUpperCase() : "DF-000000";
  const joinDate = fmtDate(user?.created_date);
  const validTill = user?.created_date
    ? fmtDate(new Date(new Date(user.created_date).setFullYear(new Date(user.created_date).getFullYear() + 1)))
    : "—";
  const faceProps = { name, initials, avatar: user?.avatar_url, memberId, joinDate, validTill };

  // Tap or swipe (either direction) flips the card.
  const onDown = (e) => { startX.current = e.clientX; };
  const onUp = (e) => {
    if (startX.current == null) return;
    const dx = Math.abs(e.clientX - startX.current);
    startX.current = null;
    if (dx <= 8 || dx >= 30) setFlipped((f) => !f);
  };
  const onKey = (e) => {
    if (e.key === "Enter" || e.key === " " || e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      setFlipped((f) => !f);
    }
  };

  const handleDownload = async () => {
    setCapturing(true); // draws un-scaled, un-flipped copies off-screen for a sharp PDF
    await new Promise((r) => setTimeout(r, 500));
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");
      const opts = { scale: 3, backgroundColor: null, useCORS: true };
      const f = await html2canvas(frontCap.current, opts);
      const b = await html2canvas(backCap.current, opts);
      const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [W, H] });
      pdf.addImage(f.toDataURL("image/png"), "PNG", 0, 0, W, H);
      pdf.addPage([W, H], "landscape");
      pdf.addImage(b.toDataURL("image/png"), "PNG", 0, 0, W, H);
      pdf.save(`DocuFast-Membership-${name.replace(/\s+/g, "_")}.pdf`);
    } finally {
      setCapturing(false);
    }
  };

  const faceBase = {
    position: "absolute", inset: 0, borderRadius: 16, overflow: "hidden",
    backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
    boxShadow: "0 6px 20px rgba(10,29,77,0.25)",
  };

  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="font-heading text-sm font-bold text-navy">Membership Card</h2>
        <button onClick={handleDownload} disabled={capturing} className="flex items-center gap-1.5 rounded-lg bg-gold/15 px-2.5 py-1.5 text-xs font-semibold text-gold disabled:opacity-60">
          <Download className="h-3.5 w-3.5" /> {capturing ? "Preparing…" : "Download"}
        </button>
      </div>

      <div ref={boxRef} className="mx-auto w-full" style={{ maxWidth: MAX_WIDTH }}>
        <div style={{ height: H * scale }}>
          <div style={{ width: W, height: H, transform: `scale(${scale})`, transformOrigin: "top left", perspective: 1400 }}>
            <div
              role="button"
              tabIndex={0}
              aria-label={flipped ? "Membership card back. Tap or swipe to see the front" : "Membership card front. Tap or swipe to see the back"}
              onPointerDown={onDown}
              onPointerUp={onUp}
              onPointerCancel={() => { startX.current = null; }}
              onKeyDown={onKey}
              style={{
                width: W, height: H, position: "relative", cursor: "pointer", touchAction: "pan-y", userSelect: "none",
                transformStyle: "preserve-3d", transition: "transform 0.6s cubic-bezier(.4,.2,.2,1)",
                transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
              }}
            >
              <div style={faceBase}><FrontFace {...faceProps} /></div>
              <div style={{ ...faceBase, transform: "rotateY(180deg)" }}><BackFace /></div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-center gap-3">
        {["Front", "Back"].map((label, i) => (
          <button
            key={label}
            onClick={() => setFlipped(i === 1)}
            className={`rounded-full px-3 py-1 text-[11px] font-bold ${(i === 1) === flipped ? "bg-navy text-white" : "border border-border text-muted-foreground"}`}
          >
            {label}
          </button>
        ))}
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <RotateCw className="h-3 w-3" /> Tap or swipe the card to flip
        </span>
      </div>

      {capturing && (
        <div style={{ position: "fixed", left: -10000, top: 0, pointerEvents: "none" }} aria-hidden="true">
          <div ref={frontCap} style={{ width: W, height: H }}><FrontFace {...faceProps} /></div>
          <div ref={backCap} style={{ width: W, height: H, marginTop: 10 }}><BackFace /></div>
        </div>
      )}
    </div>
  );
}
