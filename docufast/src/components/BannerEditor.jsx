import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Save, Megaphone, Upload } from "lucide-react";

export default function BannerEditor() {
  const [banner, setBanner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMsg("");
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setBanner({ ...form, image_url: file_url });
    } catch (err) {
      setMsg("Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    base44.entities.Banner.filter({ active: true }, "-display_order", 1)
      .then((rows) => setBanner(rows[0] || blank()))
      .catch(() => setBanner(blank()))
      .finally(() => setLoading(false));
  }, []);

  const blank = () => ({ title: "", subtitle: "", image_url: "", cta_label: "", cta_link: "", bg_color: "#0A1D4D", active: true, display_order: 0 });
  const form = banner || blank();
  const update = (k, v) => setBanner({ ...form, [k]: v });

  const save = async () => {
    setSaving(true); setMsg("");
    try {
      if (!form.title?.trim()) { setMsg("Title is required."); return; }
      if (form.id) {
        await base44.entities.Banner.update(form.id, form);
      } else {
        const created = await base44.entities.Banner.create(form);
        setBanner(created);
      }
      setMsg("Banner updated successfully.");
    } catch (e) {
      setMsg(e.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="rounded-2xl border border-border bg-white p-4 shadow-card text-sm text-muted-foreground">Loading banner…</div>;

  return (
    <section className="mb-6 rounded-2xl border border-border bg-white p-4 shadow-card">
      <div className="mb-3 flex items-center gap-2 text-navy">
        <Megaphone className="h-5 w-5" />
        <h2 className="font-heading text-base font-bold">Promotional Banner</h2>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">This banner appears at the top of the customer home screen. Update it for occasions, offers, or announcements.</p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Title">
          <input value={form.title || ""} onChange={(e) => update("title", e.target.value)} placeholder="e.g. Independence Day Offer" className={inputCls} />
        </Field>
        <Field label="Subtitle">
          <input value={form.subtitle || ""} onChange={(e) => update("subtitle", e.target.value)} placeholder="e.g. Flat 20% off on all services" className={inputCls} />
        </Field>
        <Field label="Banner image · recommended 1200 × 400 px (3:1)">
          <div className="flex gap-2">
            <input value={form.image_url || ""} onChange={(e) => update("image_url", e.target.value)} placeholder="Paste URL or upload" className={inputCls} />
            <label className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-input bg-secondary px-3 py-2 text-xs font-semibold text-foreground hover:bg-secondary/70">
              <Upload className="h-4 w-4" />
              {uploading ? "Uploading…" : "Upload"}
              <input type="file" accept="image/*" onChange={onFile} className="hidden" disabled={uploading} />
            </label>
          </div>
          {form.image_url && (
            <img src={form.image_url} alt="Banner preview" className="mt-2 h-24 w-full rounded-lg border border-border object-cover" />
          )}
        </Field>
        <Field label="Background color">
          <input type="color" value={form.bg_color || "#0A1D4D"} onChange={(e) => update("bg_color", e.target.value)} className="h-10 w-full rounded-lg border border-input bg-white" />
        </Field>
        <Field label="Button label (optional)">
          <input value={form.cta_label || ""} onChange={(e) => update("cta_label", e.target.value)} placeholder="e.g. Apply Now" className={inputCls} />
        </Field>
        <Field label="Button link (optional)">
          <input value={form.cta_link || ""} onChange={(e) => update("cta_link", e.target.value)} placeholder="/services" className={inputCls} />
        </Field>
      </div>

      <label className="mt-3 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.active !== false} onChange={(e) => update("active", e.target.checked)} className="h-4 w-4 accent-[hsl(var(--gold))]" />
        <span className="text-foreground">Active (show on home screen)</span>
      </label>

      <div className="mt-3 flex items-center gap-3">
        <button onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
          <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save Banner"}
        </button>
        {msg && <span className="text-xs font-medium text-muted-foreground">{msg}</span>}
      </div>
    </section>
  );
}

const inputCls = "w-full rounded-lg border border-input bg-white px-3 py-2 text-sm outline-none focus:border-gold";

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}