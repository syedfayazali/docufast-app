import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Upload, X, FileText } from "lucide-react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import AddressPicker, { addressToFormFields } from "@/components/AddressPicker";

const steps = ["Details", "Documents", "Review & Pay"];

// Applicant details remembered from the customer's previous application, so the
// form only has to be filled in once.
const SAVED_FIELDS = ["fullName", "parentName", "dob", "gender", "mobile", "email", "address", "city", "district", "state", "pin"];

const ADDRESS_FIELDS = ["address", "city", "district", "state", "pin"];

function pickSavedDetails(app) {
  const saved = app?.form_data || {};
  const fallback = { fullName: app?.customer_name, mobile: app?.customer_mobile, email: app?.customer_email };
  return SAVED_FIELDS.reduce((acc, key) => {
    const value = saved[key] || fallback[key];
    return value ? { ...acc, [key]: value } : acc;
  }, {});
}

export default function Apply() {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [service, setService] = useState(null);
  const [form, setForm] = useState({
    fullName: "", parentName: "", dob: "", gender: "", mobile: "", email: "",
    address: "", city: "", district: "", state: "", pin: "",
  });
  const [docs, setDocs] = useState({});
  const [files, setFiles] = useState({});
  const [docError, setDocError] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [prefilled, setPrefilled] = useState(false);
  const [editPersonal, setEditPersonal] = useState(false);
  const [addressId, setAddressId] = useState(null);
  const addressChosen = React.useRef(false);

  React.useEffect(() => {
    base44.entities.Service.get(serviceId).then(setService).catch(() => {});
  }, [serviceId]);

  React.useEffect(() => {
    if (!user) return;
    base44.entities.Application.filter({ created_by_id: user.id }, "-created_date", 1)
      .then((rows) => {
        const prev = (Array.isArray(rows) ? rows[0] : rows?.items?.[0]) || null;
        const saved = pickSavedDetails(prev);
        // A saved address (chosen in the picker) always wins over the old free-text address.
        if (addressChosen.current) ADDRESS_FIELDS.forEach((k) => delete saved[k]);
        if (!Object.keys(saved).length) return;
        setForm((f) => ({ ...f, ...saved }));
        setPrefilled(true);
      })
      .catch(() => {});
  }, [user]);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const chooseAddress = (a) => {
    addressChosen.current = !!a;
    setAddressId(a?.id || (a ? "once" : null));
    setForm((f) => ({
      ...f,
      ...(a ? addressToFormFields(a) : { address: "", city: "", district: "", state: "", pin: "" }),
    }));
    setErrors((e) => ({ ...e, address: undefined }));
  };

  const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
  const pickFile = (label, file) => {
    setDocError("");
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      setDocError("Only PDF, JPG or PNG files are accepted.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setDocError("File is larger than 5 MB. Please upload a smaller file.");
      return;
    }
    setDocs((d) => ({ ...d, [label]: file.name }));
    setFiles((f) => ({ ...f, [label]: file }));
  };
  const removeFile = (label) => {
    setDocs((d) => ({ ...d, [label]: null }));
    setFiles((f) => ({ ...f, [label]: null }));
  };

  const validatePersonal = () => {
    const e = {};
    if (!form.fullName) e.fullName = "Required";
    if (!form.mobile) e.mobile = "Required";
    if (!form.address) e.address = "Please choose or add an address";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    if (step === 1 && !validatePersonal()) return;
    if (step === 2 && !Object.values(docs).some(Boolean)) {
      setDocError("Please upload at least one document to continue.");
      return;
    }
    setDocError("");
    setStep((s) => Math.min(s + 1, steps.length));
  };

  // Creates the application as an unpaid draft, then sends the customer straight to payment.
  // It only becomes "Under Review" once the payment is confirmed on the server.
  const submit = async () => {
    setSubmitting(true);
    setSubmitError("");
    const govt = service?.government_fee || 0;
    const charge = service?.service_charge || 0;
    const other = service?.other_charges || 0;
    const total = govt + charge + other;
    const ref = `DFI-2026-${String(Math.floor(100000 + Math.random() * 899999))}`;
    const docNames = Object.entries(docs).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`);
    try {
      // Tidy up: remove this customer's earlier unpaid drafts for the same service
      // (only ones where no payment was ever attempted).
      try {
        const old = await base44.entities.Application.filter({ created_by_id: user.id, service_id: serviceId, status: "Draft" });
        for (const o of old) {
          const pays = await base44.entities.Payment.filter({ application_id: o.id });
          if (pays.some((p) => p.razorpay_order_id || p.utr || p.payment_proof_uri || p.status !== "Pending")) continue;
          for (const p of pays) await base44.entities.Payment.delete(p.id);
          await base44.entities.Application.delete(o.id);
        }
      } catch {
        /* not critical */
      }

      // Upload the real files to private storage; keep only their paths in the record.
      const docPaths = {};
      for (const [label, file] of Object.entries(files)) {
        if (!file || !docs[label]) continue;
        const up = await base44.integrations.Core.UploadPrivateFile({ file, folder: "documents" });
        docPaths[label] = up.file_uri;
      }
      const app = await base44.entities.Application.create({
        reference: ref,
        service_id: serviceId,
        service_name: service?.name || "",
        category: service?.category || "",
        customer_name: form.fullName || "",
        customer_mobile: form.mobile || "",
        customer_email: form.email || "",
        status: "Draft",
        form_data: { ...form, _doc_paths: docPaths },
        documents: docNames,
        government_fee: govt,
        service_charge: charge,
        other_charges: other,
        total,
        appointment_required: !!service?.appointment_required,
      });
      await base44.entities.Payment.create({
        reference: `PAY-${Date.now().toString().slice(-6)}`,
        application_id: app.id,
        application_ref: ref,
        customer_name: form.fullName || "",
        customer_email: form.email || "",
        service_name: service?.name || "",
        government_fee: govt,
        service_charge: charge,
        other_charges: other,
        total,
        status: "Pending",
      });
      navigate(`/pay?app=${app.id}`, { replace: true });
    } catch (e) {
      setSubmitError("Could not save your application. Please try again.");
      setSubmitting(false);
    }
  };

  // Services saved without a document list (empty []) still get a sensible default list.
  const requirements =
    Array.isArray(service?.requirements) && service.requirements.length > 0
      ? service.requirements
      : ["Applicant ID proof", "Address proof", "Photograph"];
  const OTHER_DOC = "Other supporting document (optional)";
  const uploadRows = [...requirements, OTHER_DOC];
  const uploadedRequired = requirements.filter((r) => docs[r]).length;

  return (
    <div className="min-h-screen bg-secondary/40">
      <Header />
      <main className="mx-auto max-w-5xl px-4 pb-24 pt-4">
        <button onClick={() => navigate(-1)} className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        {/* Stepper */}
        <div className="flex items-center justify-between rounded-2xl border border-border bg-white p-4 shadow-card">
          {steps.map((s, i) => {
            const idx = i + 1;
            const done = idx < step;
            const current = idx === step;
            return (
              <React.Fragment key={s}>
                <div className="flex flex-col items-center gap-1">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                    done ? "bg-emerald-500 text-white" : current ? "bg-gold text-navy" : "bg-secondary text-muted-foreground"
                  }`}>
                    {done ? <Check className="h-4 w-4" /> : idx}
                  </div>
                  <span className={`text-[10px] font-medium ${current ? "text-navy" : "text-muted-foreground"}`}>{s}</span>
                </div>
                {i < steps.length - 1 && <div className={`h-0.5 flex-1 ${done ? "bg-emerald-500" : "bg-border"}`} />}
              </React.Fragment>
            );
          })}
        </div>

        <div className="mt-4 rounded-2xl border border-border bg-white p-5 shadow-card">
          {service && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-navy/5 px-3 py-2.5">
              <FileText className="h-4 w-4 text-navy" />
              <span className="text-sm font-semibold text-navy">{service.name}</span>
            </div>
          )}

          {/* Step 1: Applicant details + address */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-3">
                <h2 className="font-heading text-base font-bold text-navy">Applicant Details</h2>
                {prefilled && form.fullName && form.mobile && !editPersonal ? (
                  <div className="flex items-start justify-between gap-3 rounded-xl bg-secondary/60 p-3">
                    <div className="min-w-0 text-sm">
                      <p className="font-semibold text-navy">{form.fullName}</p>
                      <p className="text-xs text-muted-foreground">
                        {[form.mobile, form.email].filter(Boolean).join(" · ")}
                      </p>
                      <p className="mt-1 text-[11px] text-emerald-700">Saved from your last application</p>
                    </div>
                    <button onClick={() => setEditPersonal(true)} className="shrink-0 text-xs font-semibold text-navy underline">
                      Edit
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input label="Full Name" value={form.fullName} onChange={(v) => setField("fullName", v)} error={errors.fullName} required />
                    <Input label="Father/Mother/Spouse Name" value={form.parentName} onChange={(v) => setField("parentName", v)} />
                    <Input label="Date of Birth" type="date" value={form.dob} onChange={(v) => setField("dob", v)} />
                    <Select label="Gender" value={form.gender} onChange={(v) => setField("gender", v)} options={["", "Male", "Female", "Other"]} />
                    <Input label="Mobile" value={form.mobile} onChange={(v) => setField("mobile", v)} error={errors.mobile} required />
                    <Input label="Email" type="email" value={form.email} onChange={(v) => setField("email", v)} />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <h2 className="font-heading text-base font-bold text-navy">Your Address</h2>
                <AddressPicker selectedId={addressId} onSelect={chooseAddress} />
                {errors.address && <p className="text-[11px] text-red-500">{errors.address}</p>}
              </div>
            </div>
          )}

          {/* Step 2: Documents */}
          {step === 2 && (
            <div>
              <h2 className="font-heading text-base font-bold text-navy">Upload Documents</h2>
              <p className="mt-1 text-xs text-muted-foreground">Accepted: PDF, JPG, JPEG, PNG. Max 5 MB each.</p>
              {docError && <p className="mt-2 text-xs font-medium text-red-600">{docError}</p>}
              <div className="mt-3 space-y-3">
                {uploadRows.map((r) => (
                  <div key={r} className="rounded-xl border border-border p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">{r}</span>
                      {docs[r] ? (
                        <button onClick={() => removeFile(r)} className="text-xs font-semibold text-red-500">Remove</button>
                      ) : (
                        <label className="cursor-pointer text-xs font-semibold text-gold">
                          <Upload className="mr-1 inline h-3.5 w-3.5" />Upload
                          <input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" className="hidden" onChange={(e) => { pickFile(r, e.target.files[0]); e.target.value = ""; }} />
                        </label>
                      )}
                    </div>
                    {docs[r] && (
                      <div className="mt-2 flex items-center gap-2 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-700">
                        <Check className="h-3.5 w-3.5" /> {docs[r]}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Review & Pay */}
          {step === 3 && (
            <div>
              <h2 className="font-heading text-base font-bold text-navy">Review &amp; Pay</h2>
              <div className="mt-3 space-y-1.5 rounded-xl bg-secondary/60 p-3 text-sm">
                <Row label="Name" value={form.fullName || "—"} />
                <Row label="Mobile" value={form.mobile || "—"} />
                <Row label="Address" value={[form.address, form.city, form.state, form.pin].filter(Boolean).join(", ") || "—"} />
                <Row label="Documents" value={`${uploadedRequired} of ${requirements.length} required uploaded`} />
              </div>
              {uploadedRequired < requirements.length && (
                <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-800">
                  Missing: {requirements.filter((r) => !docs[r]).join(", ")}. You can go back to add them — missing documents can delay your application.
                </p>
              )}
              {service && (
                <div className="mt-3 space-y-1.5 rounded-xl bg-secondary/60 p-3 text-sm">
                  <Row label="Government Fee" value={`₹${service.government_fee || 0}`} />
                  <Row label="DocuFast India Service Charge" value={`₹${service.service_charge || 0}`} />
                  {(service.other_charges || 0) > 0 && <Row label="Other Charges" value={`₹${service.other_charges}`} />}
                  <div className="flex justify-between border-t border-border pt-1.5 font-semibold">
                    <span>Total Payable</span>
                    <span className="text-gold">₹{(service.government_fee || 0) + (service.service_charge || 0) + (service.other_charges || 0)}</span>
                  </div>
                </div>
              )}
              <label className="mt-4 flex cursor-pointer items-start gap-2 rounded-xl bg-secondary/60 p-3 text-left text-xs text-muted-foreground">
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  I confirm the information and documents are correct. I have read and agree to the{" "}
                  <a href="/terms" target="_blank" rel="noreferrer" className="font-semibold text-navy underline">Terms</a>,{" "}
                  <a href="/privacy" target="_blank" rel="noreferrer" className="font-semibold text-navy underline">Privacy Policy</a> and{" "}
                  <a href="/refund-policy" target="_blank" rel="noreferrer" className="font-semibold text-navy underline">Refund Policy</a>, and I understand
                  DocuFast India is an independent private service, not a government office, and cannot guarantee approval.
                </span>
              </label>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Your application is submitted to our team as soon as your payment is confirmed.
              </p>
            </div>
          )}

          {submitError && (
            <p className="mt-3 text-center text-xs font-medium text-red-600">{submitError}</p>
          )}

          {/* Nav buttons */}
          <div className="mt-6 flex gap-3">
            {step > 1 && (
              <button onClick={() => setStep((s) => s - 1)} className="flex-1 rounded-xl border border-border py-3 text-sm font-semibold text-foreground">
                Back
              </button>
            )}
            {step < steps.length ? (
              <button onClick={next} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-navy py-3 text-sm font-semibold text-white">
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button onClick={submit} disabled={submitting || !agreed} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gold py-3 text-sm font-bold text-navy disabled:opacity-60">
                {submitting ? "Saving…" : `Pay ₹${(service?.government_fee || 0) + (service?.service_charge || 0) + (service?.other_charges || 0)} & Submit`}
              </button>
            )}
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

function Row({ label, value }) {
  return <div className="flex justify-between"><span className="text-muted-foreground">{label}</span><span className="font-medium">{value}</span></div>;
}

function Input({ label, value, onChange, type = "text", error, required, full }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label className="mb-1 block text-xs font-semibold text-foreground">{label}{required && <span className="text-gold">*</span>}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-xl border bg-white px-3 py-2.5 text-sm outline-none focus:border-gold ${error ? "border-red-400" : "border-input"}`}
      />
      {error && <p className="mt-1 text-[11px] text-red-500">{error}</p>}
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-foreground">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-input bg-white px-3 py-2.5 text-sm outline-none focus:border-gold">
        {options.map((o) => <option key={o} value={o}>{o || "Select"}</option>)}
      </select>
    </div>
  );
}