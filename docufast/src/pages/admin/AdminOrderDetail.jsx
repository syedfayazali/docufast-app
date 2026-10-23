import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Printer, ArrowLeft, Loader2, ChevronDown } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import StatusBadge, { statusLabel } from "@/components/StatusBadge";
import UpdateComposer from "@/components/UpdateComposer";
import DocumentLink from "@/components/DocumentLink";
import { backend } from "@/api/backend";
import { pushNotify } from "@/lib/push";
import { addressLines, formRows, inr, when, methodLabel } from "@/lib/orders";

const STATUSES = ["Submitted", "Under Review", "Action Required", "Approved", "Completed", "Rejected", "Cancelled"];

const Sec = ({ title, children }) => (
  <section className="mt-4 break-inside-avoid">
    <h2 className="border-b border-slate-300 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-600">{title}</h2>
    <div className="mt-1">{children}</div>
  </section>
);
const Row = ({ k, v }) => (v === "" || v == null ? null : (
  <div className="flex justify-between gap-4 py-1 text-sm">
    <span className="text-slate-500">{k}</span><span className="text-right font-semibold text-slate-900">{v}</span>
  </div>
));

export default function AdminOrderDetail() {
  const { id } = useParams();
  const [app, setApp] = useState(null);
  const [pay, setPay] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [appts, setAppts] = useState([]);
  const [err, setErr] = useState("");
  const [withPrivate, setWithPrivate] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  const load = async () => {
    const a = await backend.entities.Application.get(id);
    setApp(a);
    if (!a.admin_seen_at) backend.entities.Application.update(id, { admin_seen_at: new Date().toISOString() }).catch(() => {});
    const [p, u, ap] = await Promise.all([
      backend.entities.Payment.filter({ application_id: id }),
      backend.entities.ApplicationUpdate.filter({ application_id: id }, "-created_date", 100),
      backend.entities.Appointment.filter({ application_id: id }, "-slot_start", 10).catch(() => []),
    ]);
    setPay(p[0] || null); setUpdates(u); setAppts(ap);
  };
  useEffect(() => { load().catch(() => setErr("Order not found.")); /* eslint-disable-next-line */ }, [id]);

  const setStatus = async (status) => {
    try { setApp(await backend.entities.Application.update(id, { status })); pushNotify("status", id); } catch (e) { setErr(e.message); }
  };

  if (err) return <AdminLayout title="Order"><p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p></AdminLayout>;
  if (!app) return <AdminLayout title="Order"><div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div></AdminLayout>;

  const addr = addressLines(app);
  const docs = Object.keys(app.form_data?._doc_paths || {});
  const shown = updates.filter((u) => withPrivate || !u.is_private);

  return (
    <AdminLayout title="">
      <div className="mb-3 flex flex-wrap items-center gap-2 print:hidden">
        <Link to="/admin-orders" className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground"><ArrowLeft className="h-4 w-4" /> Orders</Link>
        <div className="flex-1" />
        <label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <input type="checkbox" checked={withPrivate} onChange={(e) => setWithPrivate(e.target.checked)} className="h-4 w-4 accent-[hsl(var(--gold))]" /> Include private notes
        </label>
        <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-xl bg-navy px-4 py-2 text-xs font-semibold text-white"><Printer className="h-4 w-4" /> Print order</button>
      </div>

      {/* ---- the printable sheet ---- */}
      <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-white p-5 text-slate-900 shadow-card print:max-w-none print:border-0 print:p-0 print:shadow-none keep-light">
        <div className="flex items-start justify-between border-b-2 border-slate-800 pb-3">
          <div>
            <p className="text-lg font-extrabold text-slate-900">DocuFast India™</p>
            <p className="text-[11px] text-slate-500">Order details</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-sm font-bold">{app.reference}</p>
            <p className="text-[11px] text-slate-500">Ordered {when(app.created_date)}</p>
            <p className="text-[11px] text-slate-500">Printed {when(new Date())}</p>
          </div>
        </div>

        <Sec title="Customer">
          <Row k="Name" v={app.customer_name} />
          <Row k="Mobile" v={app.customer_mobile} />
          <Row k="Email" v={app.customer_email} />
          <div className="py-1 text-sm">
            <span className="text-slate-500">Address</span>
            <p className="mt-0.5 whitespace-pre-line font-semibold">{addr.length ? addr.join("\n") : "—"}</p>
          </div>
        </Sec>

        <Sec title="Payment">
          <Row k="Status" v={pay ? pay.status : "—"} />
          <Row k="Method" v={pay ? methodLabel(pay) : ""} />
          <Row k="Paid on" v={pay?.paid_at ? when(pay.paid_at) : ""} />
          <Row k="Gateway order ID" v={pay?.razorpay_order_id} />
          <Row k="Gateway payment ID" v={pay?.razorpay_payment_id} />
          <Row k="UTR (manual UPI)" v={pay?.utr} />
          <div className="mt-1 border-t border-slate-200 pt-1">
            <Row k="Government fee" v={inr(app.government_fee)} />
            <Row k="Service charge" v={inr(app.service_charge)} />
            <Row k="Other charges" v={inr(app.other_charges)} />
            <div className="flex justify-between py-1 text-sm font-bold"><span>Total</span><span>{inr(app.total)}</span></div>
          </div>
        </Sec>

        <Sec title="Application">
          <Row k="Service" v={app.service_name} />
          <Row k="Category" v={app.category} />
          <div className="flex items-center justify-between py-1 text-sm"><span className="text-slate-500">Status</span><span className="font-semibold">{statusLabel(app.status)}</span></div>
          {formRows(app).map(([k, v]) => <Row key={k} k={k} v={v} />)}
          {appts.filter((x) => x.status === "Booked").map((x) => <Row key={x.id} k="Appointment" v={`${when(x.slot_start)} (${x.kind})`} />)}
        </Sec>

        <Sec title="Documents uploaded">
          {docs.length === 0 ? <p className="py-1 text-sm text-slate-500">None recorded.</p> : docs.map((d) => (
            <div key={d} className="flex items-center justify-between py-1 text-sm"><span>☐ {d}</span><span className="print:hidden"><DocumentLink path={app.form_data._doc_paths[d]} /></span></div>
          ))}
        </Sec>

        {shown.length > 0 && (
          <Sec title="Notes & reference numbers">
            {shown.map((u) => (
              <div key={u.id} className="border-b border-slate-100 py-1.5 text-sm last:border-0">
                <p className="font-semibold">{u.title || "Note"}{u.is_private ? " (private)" : ""} <span className="text-[11px] font-normal text-slate-500">· {when(u.created_date)}</span></p>
                {u.ref_number && <p className="font-mono font-bold">{u.ref_label ? `${u.ref_label}: ` : ""}{u.ref_number}</p>}
                {u.message && <p className="whitespace-pre-line text-slate-700">{u.message}</p>}
              </div>
            ))}
          </Sec>
        )}
      </div>

      {/* ---- controls (not printed) ---- */}
      <div className="mx-auto mt-4 max-w-2xl space-y-3 print:hidden">
        <div className="rounded-2xl border border-border bg-white p-4 shadow-card">
          <div className="flex items-center justify-between"><p className="text-xs font-bold text-navy">Order status</p><StatusBadge status={app.status} /></div>
          <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {STATUSES.map((s) => (
              <button key={s} onClick={() => setStatus(s)} className={`rounded-lg border px-2 py-1.5 text-[11px] font-semibold ${app.status === s ? "border-gold bg-gold/10 text-gold" : "border-border text-muted-foreground"}`}>{s}</button>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-white p-4 shadow-card">
          <button onClick={() => setShowNotes(!showNotes)} className="flex w-full items-center justify-between text-xs font-bold text-navy">
            Add note / reference number for customer <ChevronDown className={`h-4 w-4 transition-transform ${showNotes ? "rotate-180" : ""}`} />
          </button>
          {showNotes && <UpdateComposer application={app} />}
        </div>
      </div>
    </AdminLayout>
  );
}
