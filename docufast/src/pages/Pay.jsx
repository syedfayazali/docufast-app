import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, Check, ArrowLeft, Phone, Globe, ShieldCheck, Lock, Loader2 } from "lucide-react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { Image } from "@/components/ui/image";
import PaymentProofForm from "@/components/PaymentProofForm";
import { base44 } from "@/api/base44Client";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";

const UPI_ID = "paytm.s2sk0dc@pty";
const PAYEE_NAME = "Mr SYED FAYAZ ALI";
const QR_IMAGE = "https://media.base44.com/images/public/6a99a28a5cee4eafc7da7547/4127f4aef_image.png";

// Loads Cashfree Checkout once, on demand.
function loadCashfreeScript() {
  return new Promise((resolve, reject) => {
    if (window.Cashfree) return resolve();
    const s = document.createElement("script");
    s.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Could not load the payment window. Check your internet connection."));
    document.body.appendChild(s);
  });
}

async function authedPost(url, body) {
  const { data } = await supabase.auth.getSession();
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${data?.session?.access_token || ""}` },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Request failed");
  return json;
}

export default function Pay() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [application, setApplication] = useState(null);
  const [payment, setPayment] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [proofSubmitted, setProofSubmitted] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");
  const [payNote, setPayNote] = useState("");
  const [showManual, setShowManual] = useState(false);

  const loadData = React.useCallback(() => {
    if (!user) return Promise.resolve();
    // Pay for the application in the link (?app=...), otherwise the most recent one.
    const wanted = new URLSearchParams(window.location.search).get("app");
    const query = wanted ? { created_by_id: user.id, id: wanted } : { created_by_id: user.id };
    return base44.entities.Application.filter(query, "-created_date", 1)
      .then((rows) => {
        const app = (Array.isArray(rows) ? rows[0] : rows?.items?.[0]) || null;
        setApplication(app);
        if (!app) return;
        return base44.entities.Payment.filter({ application_id: app.id }, "-created_date", 1).then((p) => {
          const pay = (Array.isArray(p) ? p[0] : p?.items?.[0]) || null;
          setPayment(pay);
        });
      })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Online payment (Cashfree): UPI, cards, net banking, wallets.
  const payOnline = async () => {
    if (!application) return;
    setPayError("");
    setPayNote("");
    setPaying(true);
    let orderId = null;
    try {
      const order = await authedPost("/api/create-order", { application_id: application.id });
      orderId = order.order_id;
      await loadCashfreeScript();
      const cashfree = window.Cashfree({ mode: order.mode });
      const result = await cashfree.checkout({ paymentSessionId: order.payment_session_id, redirectTarget: "_modal" });
      if (result?.error && !result?.paymentDetails) {
        // Closed or failed before paying – still ask the server, it is the only source of truth.
        setPayError(result.error.message || "Payment was not completed. You can try again.");
      }
      await confirmPayment(orderId);
    } catch (e) {
      setPayError(e.message || "Could not start payment");
      // If the gateway itself is down/misconfigured, surface the manual option.
      if (!orderId) setShowManual(true);
    } finally {
      setPaying(false);
    }
  };

  // Ask the server to confirm with Cashfree, then refresh. Retries briefly in case the bank is slow.
  const confirmPayment = async (orderId) => {
    for (let i = 0; i < 4; i += 1) {
      try {
        await authedPost("/api/verify-payment", { order_id: orderId });
        setPayError("");
        await loadData();
        return;
      } catch (e) {
        if (i === 3) {
          setPayNote("If money was deducted, we'll confirm it automatically within a few minutes. You can also check Payment History.");
        } else {
          await new Promise((r) => setTimeout(r, 2000));
        }
      }
    }
    await loadData();
  };

  // Returning from a bank/UPI app redirect: ?cf_order=<id>
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("cf_order");
    if (id && user) confirmPayment(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const copyUpi = async () => {
    try {
      await navigator.clipboard.writeText(UPI_ID);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const amount = Number(application?.total) || 0;
  const paid = payment?.status === "Paid";
  const proofAlreadySubmitted = !!payment?.utr;

  const submitProof = async (fileUri, utr) => {
    if (!payment) return;
    setSubmitting(true);
    try {
      await base44.entities.Payment.update(payment.id, {
        payment_proof_uri: fileUri,
        utr,
      });
      setProofSubmitted(true);
    } catch {
      setSubmitting(false);
    }
  };

  // Paid: this is the confirmation screen of the whole application.
  if (paid) {
    return (
      <div className="min-h-screen bg-secondary/40">
        <Header title="Payment Successful" />
        <main className="mx-auto max-w-md px-4 pb-24 pt-4">
          <div className="rounded-2xl border border-border bg-white p-6 text-center shadow-card">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <h1 className="mt-3 font-heading text-lg font-bold text-navy">Payment received — application submitted</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {application?.service_name || "Your service"} · ₹{amount}
            </p>
            {application?.reference && (
              <p className="mt-3 inline-block rounded-lg bg-secondary px-3 py-1.5 font-mono text-xs font-semibold text-navy">
                {application.reference}
              </p>
            )}

            <div className="mt-5 rounded-xl bg-secondary/60 p-4 text-left">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">What happens next</p>
              <ol className="mt-2 space-y-2 text-sm text-foreground">
                <li className="flex gap-2"><span className="font-bold text-gold">1.</span> Our team checks your details and documents.</li>
                <li className="flex gap-2"><span className="font-bold text-gold">2.</span> If anything is missing we mark it “Action Required” and tell you what to fix.</li>
                <li className="flex gap-2"><span className="font-bold text-gold">3.</span> We process your application and update the status here until it is completed.</li>
              </ol>
            </div>

            <button
              onClick={() => navigate(application ? `/applications/${application.id}` : "/applications")}
              className="mt-5 w-full rounded-xl bg-navy px-4 py-3 text-sm font-bold text-white"
            >
              Track my application
            </button>
            {application && (
              <button
                onClick={() => navigate(`/receipt/${application.id}`)}
                className="mt-2 w-full rounded-xl border border-border px-4 py-3 text-sm font-semibold text-foreground"
              >
                View / print receipt
              </button>
            )}
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/40">
      <Header title="Pay" />
      <main className="mx-auto max-w-md px-4 pb-24 pt-4">
        <button
          onClick={() => navigate(-1)}
          className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        {proofSubmitted || proofAlreadySubmitted ? (
          <div className="rounded-2xl border border-border bg-white p-6 text-center shadow-card">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <h1 className="mt-3 font-heading text-lg font-bold text-navy">Proof Submitted</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Your payment proof is under verification. We'll update your application status once it's confirmed — usually within a few hours.
            </p>
            <button
              onClick={() => navigate("/applications")}
              className="mt-4 w-full rounded-xl bg-navy px-4 py-3 text-sm font-bold text-white"
            >
              View My Applications
            </button>
          </div>
        ) : (
          <>
            <div className="mb-4 rounded-2xl border border-border bg-white p-5 shadow-card">
              {!application ? (
                <p className="text-center text-sm text-muted-foreground">
                  No application found. Please apply for a service first.
                </p>
              ) : amount <= 0 ? (
                <p className="text-center text-sm text-muted-foreground">
                  There is nothing to pay for this application.
                </p>
              ) : (
              <>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Pay online</p>
                <p className="mt-1 font-heading text-3xl font-bold text-navy">₹{amount}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {application.service_name} · {application.reference}
                </p>
                <button
                  onClick={payOnline}
                  disabled={paying}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gold px-4 py-3 text-sm font-bold text-navy disabled:opacity-60"
                >
                  {paying ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Processing…
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" /> Pay ₹{amount} securely
                    </>
                  )}
                </button>
                {payError && <p className="mt-2 text-[11px] font-medium text-red-600">{payError}</p>}
                {payNote && <p className="mt-2 text-[11px] font-medium text-emerald-700">{payNote}</p>}
                <p className="mt-2 text-center text-[11px] text-muted-foreground">
                  UPI, cards, net banking &amp; wallets · Secured by Cashfree
                </p>
                <p className="mt-1 text-center text-[11px] text-muted-foreground">
                  Your application is submitted to our team as soon as payment is confirmed.
                </p>
              </>
              )}
            </div>

            {!showManual && (
              <button
                onClick={() => setShowManual(true)}
                className="mx-auto mb-2 block text-[12px] font-semibold text-muted-foreground underline"
              >
                Having trouble? Pay manually with UPI QR
              </button>
            )}

            {showManual && (
            <>
            <p className="mb-2 px-1 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Pay manually with UPI
            </p>
            <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-card">
              <div className="bg-navy px-4 py-3 text-center">
                <p className="text-sm font-semibold text-white">SCAN &amp; PAY WITH ANY UPI APP</p>
              </div>

              <div className="p-5">
                <div className="text-center">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Amount to pay</p>
                  <p className="mt-1 font-heading text-3xl font-bold text-navy">
                    {application ? `₹${amount}` : "—"}
                  </p>
                  {application && (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {application.service_name} · {application.reference}
                    </p>
                  )}
                </div>

                <div className="mt-4 flex justify-center">
                  <div className="rounded-xl border border-border bg-white p-2">
                    <Image
                      src={QR_IMAGE}
                      alt="DocuFast India UPI payment QR code"
                      fittingType="fit"
                      className="h-64 w-64"
                    />
                  </div>
                </div>

                <p className="mt-3 text-center text-[11px] text-muted-foreground">
                  Scan the QR with any UPI app and pay the amount shown above.
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-border bg-white p-4 shadow-card">
              <p className="text-xs font-semibold text-muted-foreground">UPI ID</p>
              <button
                onClick={copyUpi}
                className="mt-1.5 flex w-full items-center justify-between rounded-xl border border-input bg-secondary/60 px-3 py-2.5 text-left"
              >
                <span className="font-mono text-sm font-semibold text-navy">{UPI_ID}</span>
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Copy className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              {copied && (
                <p className="mt-1.5 text-[11px] font-medium text-emerald-600">UPI ID copied to clipboard.</p>
              )}
              <p className="mt-2 text-[11px] text-muted-foreground">
                Or copy the UPI ID, open any UPI app (PhonePe, Google Pay, Paytm, BHIM), and pay the amount shown above.
              </p>
            </div>

            <div className="mt-4">
              <PaymentProofForm onSubmit={submitProof} submitting={submitting} />
            </div>
            </>
            )}

            <div className="mt-4 flex items-center justify-between rounded-2xl border border-border bg-white p-4 shadow-card">
              <div className="flex items-center gap-2 text-sm text-foreground">
                <Phone className="h-4 w-4 text-navy" /> <span className="font-semibold">8374968022</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Globe className="h-4 w-4 text-navy" /> www.docufast.india
              </div>
            </div>
          </>
        )}
      </main>
      <BottomNav />
    </div>
  );
}