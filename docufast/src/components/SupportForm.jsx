import React, { useState } from "react";
import { MessageSquare, Send, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

function Field({ label, value, onChange, type = "text", required }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-foreground">{label}{required && <span className="text-gold">*</span>}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        maxLength={200}
        className="w-full rounded-xl border border-input bg-white px-3 py-2.5 text-sm outline-none focus:border-gold"
      />
    </div>
  );
}

/** Real support form: the message is saved in the database (table support_requests). */
export default function SupportForm() {
  const [form, setForm] = useState({ name: "", email: "", mobile: "", applicationId: "", message: "", website: "" });
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.website) { setSent(true); return; } // hidden honeypot field: bots fill it, people don't
    setBusy(true);
    const { error: err } = await supabase.from("support_requests").insert({
      name: form.name.trim(),
      email: form.email.trim(),
      mobile: form.mobile.trim(),
      application_ref: form.applicationId.trim() || null,
      message: form.message.trim(),
    });
    setBusy(false);
    if (err) {
      setError("Sorry, we could not send your request. Please call or email us using the details above.");
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <Send className="h-6 w-6" />
        </div>
        <h3 className="mt-3 font-heading text-base font-bold text-emerald-800">Request received</h3>
        <p className="mt-1 text-sm text-emerald-700">We have saved your request and will contact you on the email or mobile you gave.</p>
        <button onClick={() => { setSent(false); setForm({ name: "", email: "", mobile: "", applicationId: "", message: "", website: "" }); }} className="mt-4 text-sm font-semibold text-emerald-700">Send another request</button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-border bg-white p-5 shadow-card">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
        <Field label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} required />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Mobile" value={form.mobile} onChange={(v) => setForm({ ...form, mobile: v })} required />
        <Field label="Application ID (optional)" value={form.applicationId} onChange={(v) => setForm({ ...form, applicationId: v })} />
      </div>
      <div style={{ position: "absolute", left: "-9999px" }} aria-hidden="true">
        <label>Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /></label>
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-foreground">Message<span className="text-gold">*</span></label>
        <textarea
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          required
          maxLength={2000}
          rows={4}
          className="w-full rounded-xl border border-input bg-white px-3 py-2.5 text-sm outline-none focus:border-gold"
        />
      </div>
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
      <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-navy py-3 text-sm font-semibold text-white disabled:opacity-60">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />} {busy ? "Sending…" : "Submit Request"}
      </button>
    </form>
  );
}
