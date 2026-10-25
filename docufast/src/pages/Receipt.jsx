import { govFeeCollected } from "@/lib/labels";
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Printer } from "lucide-react";
import { backend } from "@/api/backend";
import { businessInfo, isPlaceholder } from "@/lib/businessInfo";

const fmt = (d) =>
  d ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

/** Printable payment receipt. "Print / Save as PDF" uses the browser's print dialog. */
export default function Receipt() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [app, setApp] = useState(null);
  const [pay, setPay] = useState(null);
  const [state, setState] = useState("loading");

  useEffect(() => {
    Promise.all([
      backend.entities.Application.get(id),
      backend.entities.Payment.filter({ application_id: id }, "-created_date", 1),
    ])
      .then(([a, p]) => {
        setApp(a);
        setPay(p[0] || null);
        setState("ok");
      })
      .catch(() => setState("error"));
  }, [id]);

  if (state === "loading") return <p className="p-6 text-sm text-muted-foreground">Loading…</p>;
  if (state === "error" || !app) return <p className="p-6 text-sm text-muted-foreground">Receipt not found.</p>;

  if (pay?.status !== "Paid") {
    return (
      <div className="mx-auto max-w-md p-6 text-center">
        <p className="text-sm text-muted-foreground">A receipt is available once your payment is confirmed.</p>
        <button onClick={() => navigate(`/pay?app=${id}`)} className="mt-4 rounded-xl bg-navy px-5 py-2.5 text-sm font-semibold text-white">
          Go to payment
        </button>
      </div>
    );
  }

  const show = (v) => (v && !isPlaceholder(v) ? v : null);
  const rows = [
    ...(govFeeCollected(app) ? [["Government Fee (collected earlier)", app.government_fee]] : []),
    ["DocuFast Service Charge", app.service_charge],
    ["Other Charges", app.other_charges],
  ].filter(([, v]) => Number(v) > 0);

  return (
    <div className="min-h-screen bg-secondary/40 print:bg-white">
      <div className="mx-auto flex max-w-md items-center justify-between px-4 pt-4 print:hidden">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl bg-navy px-4 py-2 text-xs font-bold text-white">
          <Printer className="h-4 w-4" /> Print / Save as PDF
        </button>
      </div>

      <main className="mx-auto my-4 max-w-md rounded-2xl border border-border bg-white p-6 shadow-card print:my-0 print:border-0 print:shadow-none">
        <div className="text-center">
          <h1 className="font-heading text-xl font-bold text-navy">{businessInfo.brandName}</h1>
          {show(businessInfo.legalName) && <p className="text-xs text-muted-foreground">{businessInfo.legalName}</p>}
          {show(businessInfo.address) && <p className="text-xs text-muted-foreground">{businessInfo.address}</p>}
          <p className="text-xs text-muted-foreground">
            {[businessInfo.phone, show(businessInfo.email)].filter(Boolean).join(" · ")}
          </p>
          {show(businessInfo.gstin) && <p className="text-xs text-muted-foreground">GSTIN: {businessInfo.gstin}</p>}
        </div>

        <h2 className="mt-5 border-y border-border py-2 text-center text-sm font-bold uppercase tracking-wide text-navy">
          Payment Receipt
        </h2>

        <dl className="mt-4 space-y-1.5 text-sm">
          <Line k="Receipt for" v={pay.reference} />
          <Line k="Application No." v={app.reference} />
          <Line k="Date paid" v={fmt(pay.paid_at || pay.updated_date)} />
          <Line k="Customer" v={app.customer_name} />
          <Line k="Service" v={app.service_name} />
          <Line k="Payment method" v={pay.payment_method === "upi_manual" ? "UPI (manual)" : "Online (Razorpay)"} />
          {pay.razorpay_payment_id && <Line k="Gateway payment ID" v={pay.razorpay_payment_id} />}
          {pay.utr && <Line k="UTR" v={pay.utr} />}
        </dl>

        <div className="mt-4 space-y-1.5 rounded-xl bg-secondary/60 p-3 text-sm print:bg-transparent print:p-0">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between">
              <span className="text-muted-foreground">{k}</span>
              <span className="font-medium">₹{v}</span>
            </div>
          ))}
          <div className="flex justify-between border-t border-border pt-1.5 font-bold">
            <span>Total paid</span>
            <span>₹{app.total}</span>
          </div>
        </div>

        <p className="mt-5 text-[11px] leading-relaxed text-muted-foreground">
          This is a payment receipt for the application above. This receipt covers our service charge only. Any official fee is paid by the customer directly to the department.
          {businessInfo.brandName} is an independent private service and not a government office. Refunds
          follow our Refund Policy. This receipt is computer generated and needs no signature.
        </p>
      </main>
    </div>
  );
}

function Line({ k, v }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="text-right font-medium text-foreground">{v || "—"}</dd>
    </div>
  );
}
