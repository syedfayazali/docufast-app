import { govFeeCollected } from "@/lib/labels";
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Circle, AlertCircle, FileText, Receipt as ReceiptIcon } from "lucide-react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import StatusBadge from "@/components/StatusBadge";
import { useToast } from "@/components/ui/use-toast";
import { backend } from "@/api/backend";
import DocumentLink from "@/components/DocumentLink";
import UpdateCard, { useApplicationUpdates, stepForStatus } from "@/components/UpdatesPanel";

const fmtDate = (d) => d ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

export default function ApplicationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [app, setApp] = useState(null);
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const prevStatus = useRef(null);
  const { items: updates, fresh } = useApplicationUpdates(id);

  useEffect(() => {
    backend.entities.Application.get(id)
      .then((a) => { setApp(a); prevStatus.current = a?.status; })
      .catch(() => {})
      .finally(() => setLoading(false));
    backend.entities.Payment.filter({ application_id: id }).then((p) => setPayment(p[0] || null)).catch(() => {});

    // Live updates: status refreshes instantly when admin changes it (no manual refresh needed)
    const unsubscribe = backend.entities.Application.subscribe((event) => {
      if (event.id !== id) return;
      const rec = event.data;
      if (!rec) return;
      setApp(rec);
      if (prevStatus.current && prevStatus.current !== rec.status) {
        toast({
          title: "Status updated",
          description: `${rec.reference || rec.service_name}: ${prevStatus.current} → ${rec.status}`,
        });
      }
      prevStatus.current = rec.status;
    });

    return unsubscribe;
  }, [id, toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary/40">
        <Header />
        <main className="mx-auto max-w-5xl px-4 pt-4 text-sm text-muted-foreground">Loading…</main>
        <BottomNav />
      </div>
    );
  }
  if (!app) {
    return (
      <div className="min-h-screen bg-secondary/40">
        <Header />
        <main className="mx-auto max-w-5xl px-4 pt-4 text-sm text-muted-foreground">Application not found.</main>
        <BottomNav />
      </div>
    );
  }

  const isPaid = payment?.status === "Paid";
  const awaitingPayment = app.status === "Draft" && !isPaid;
  const proofSent = awaitingPayment && !!(payment?.utr || payment?.payment_proof_uri);
  const inReview = ["Under Review", "Action Required", "Approved", "Completed"].includes(app.status);
  const approved = ["Approved", "Completed"].includes(app.status);
  const timeline = [
    { status: "Application created", date: fmtDate(app.created_date), by: "You", done: true },
    {
      status: isPaid ? "Payment received" : proofSent ? "Payment proof sent – being verified" : "Payment",
      date: isPaid ? fmtDate(payment?.paid_at || payment?.updated_date) : proofSent ? "Verification pending" : "Waiting for payment",
      by: isPaid ? "Payment gateway" : "You",
      done: isPaid,
      current: awaitingPayment,
    },
    { status: "Under Review", date: inReview ? fmtDate(app.updated_date) : "Pending", by: "DocuFast India", done: inReview, current: app.status === "Under Review" },
    { status: "Approved", date: approved ? fmtDate(app.updated_date) : "Pending", by: "Updated by DocuFast", done: approved },
    { status: "Completed", date: app.status === "Completed" ? fmtDate(app.updated_date) : "Pending", by: "Updated by DocuFast", done: app.status === "Completed" },
  ];

  const docs = Array.isArray(app.documents) ? app.documents : [];

  return (
    <div className="min-h-screen bg-secondary/40">
      <Header />
      <main className="mx-auto max-w-5xl px-4 pb-24 pt-4">
        <button onClick={() => navigate(-1)} className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <div className="rounded-2xl border border-border bg-white p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-semibold text-navy">{app.reference}</span>
            <StatusBadge status={app.status} />
          </div>
          <h1 className="mt-2 font-heading text-lg font-bold text-foreground">{app.service_name}</h1>
          <p className="text-xs text-muted-foreground">
            {awaitingPayment ? "Started" : "Submitted"} {fmtDate(app.created_date)}
          </p>
          {awaitingPayment && (
            <div className="mt-3 rounded-xl bg-amber-50 p-3">
              <p className="text-xs text-amber-800">
                <span className="font-semibold">{proofSent ? "Payment proof received." : "Payment pending."}</span>{" "}
                {proofSent
                  ? "We are verifying it. Your application is submitted as soon as it is confirmed."
                  : "Your application is submitted to our team as soon as payment is confirmed."}
              </p>
              {!proofSent && (
                <button
                  onClick={() => navigate(`/pay?app=${app.id}`)}
                  className="mt-2 w-full rounded-xl bg-gold py-2.5 text-xs font-bold text-navy"
                >
                  Complete payment · ₹{app.total || 0}
                </button>
              )}
            </div>
          )}
          {isPaid && app.appointment_required && (
            <button
              onClick={() => navigate(`/book-appointment?application=${app.id}`)}
              className="mt-3 w-full rounded-xl bg-gold py-2.5 text-xs font-bold text-navy"
            >
              Book your appointment for this application
            </button>
          )}
          {isPaid && (
            <button
              onClick={() => navigate(`/receipt/${app.id}`)}
              className="mt-3 inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-navy"
            >
              <ReceiptIcon className="h-4 w-4" /> View / print receipt
            </button>
          )}
          {app.status === "Action Required" && (
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 p-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <p className="text-xs text-amber-800"><span className="font-semibold">Action Required:</span> Our team needs additional information or documents.</p>
            </div>
          )}
        </div>

        <h2 className="mt-6 px-1 font-heading text-base font-bold text-foreground">Application Timeline</h2>
        <div className="mt-3 rounded-2xl border border-border bg-white p-5 shadow-card">
          <ol className="relative">
            {timeline.map((t, i) => (
              <li key={i} className="flex gap-3 pb-5 last:pb-0">
                <div className="flex flex-col items-center">
                  {t.done ? <CheckCircle2 className={`h-5 w-5 ${t.current ? "text-gold" : "text-emerald-500"}`} /> : <Circle className="h-5 w-5 text-muted-foreground/40" />}
                  {i < timeline.length - 1 && <div className={`mt-1 w-px flex-1 ${t.done ? "bg-emerald-300" : "bg-border"}`} />}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${t.done ? "text-foreground" : "text-muted-foreground"}`}>{t.status}</p>
                  <p className="text-[11px] text-muted-foreground">{t.date}</p>
                  <p className="text-[11px] text-muted-foreground">Updated by {t.by}</p>
                  {updates.filter((u) => stepForStatus(u.status_at_time) === i).map((u) => (
                    <UpdateCard key={u.id} u={u} isNew={fresh.has(u.id)} />
                  ))}
                </div>
              </li>
            ))}
          </ol>
        </div>

        <h2 className="mt-6 px-1 font-heading text-base font-bold text-foreground">Uploaded Documents</h2>
        <div className="mt-3 space-y-2">
          {docs.length === 0 ? (
            <div className="rounded-2xl border border-border bg-white p-4 text-sm text-muted-foreground shadow-card">No documents recorded.</div>
          ) : (
            docs.map((d, i) => (
              <div key={i} className="flex items-center gap-3 rounded-2xl border border-border bg-white p-3.5 shadow-card">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy/5 text-navy">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">{d}</p>
                </div>
                <DocumentLink path={app.form_data?._doc_paths?.[String(d).split(":")[0]]} />
              </div>
            ))
          )}
        </div>

        <h2 className="mt-6 px-1 font-heading text-base font-bold text-foreground">Payment Information</h2>
        <div className="mt-3 rounded-2xl border border-border bg-white p-5 shadow-card">
          <div className="space-y-1.5 text-sm">
            {govFeeCollected(app) && <Row label="Government Fee (collected earlier)" value={`₹${app.government_fee || 0}`} />}
            <Row label="DocuFast Service Charge" value={`₹${app.service_charge || 0}`} />
            <Row label="Other Charges" value={`₹${app.other_charges || 0}`} />
            <div className="flex justify-between border-t border-border pt-1.5 font-semibold">
              <span>{isPaid ? "Total Paid" : "Total"}</span><span className="text-gold">₹{app.total || 0}</span>
            </div>
            {Number(app.government_fee) > 0 && !govFeeCollected(app) && (
              <p className="pt-1 text-[11px] text-amber-800">Official fee ₹{app.government_fee} is set by the department and is paid by you directly to it. It is not part of this payment.</p>
            )}
          </div>
          {payment && (
            <div className={`mt-3 flex items-center gap-2 rounded-lg px-3 py-2 ${isPaid ? "bg-emerald-50" : "bg-amber-50"}`}>
              <CheckCircle2 className={`h-4 w-4 ${isPaid ? "text-emerald-600" : "text-amber-600"}`} />
              <span className={`text-xs font-semibold ${isPaid ? "text-emerald-700" : "text-amber-700"}`}>Payment {payment.status === "Pending" ? "pending" : payment.status}</span>
            </div>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

function Row({ label, value }) {
  return <div className="flex justify-between"><span className="text-muted-foreground">{label}</span><span className="font-medium">{value}</span></div>;
}