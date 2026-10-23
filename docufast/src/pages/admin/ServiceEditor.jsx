import React, { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { backend } from "@/api/backend";
import { Plus, Pencil, Check, Loader2, Trash2, LayoutGrid, X } from "lucide-react";

const empty = {
  name: "", category: "", short_description: "", description: "",
  government_fee: 0, service_charge: 0, other_charges: 0, processing_info: "",
  appointment_required: false, active: true, display_order: 0,
  requirements: "", eligibility: "",
};

const defaultCategories = ["Certificates", "Passport", "Deeds", "Government Documents", "Other"];

export default function ServiceEditor() {
  const [services, setServices] = useState(null);
  const [categories, setCategories] = useState(null);
  const [newCat, setNewCat] = useState("");
  const [catSaving, setCatSaving] = useState(false);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const load = () => {
    backend.entities.Service.list("display_order", 100)
      .then(setServices)
      .catch(() => setServices([]));
    backend.entities.Category.list("display_order", 100)
      .then((rows) => setCategories(rows.filter((c) => c.active).map((c) => c.name)))
      .catch(() => setCategories([]));
  };

  useEffect(() => { load(); }, []);

  const categoryOptions = categories && categories.length ? categories : defaultCategories;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const edit = (s) => {
    setEditingId(s.id);
    setForm({ ...empty, ...s, requirements: (s.requirements || []).join("\n") });
    setMsg("");
  };

  const reset = () => { setEditingId(null); setForm(empty); setMsg(""); };

  const addCategory = async (e) => {
    e.preventDefault();
    const name = newCat.trim();
    if (!name) return;
    if (categoryOptions.some((c) => c.toLowerCase() === name.toLowerCase())) {
      setMsg("Category already exists.");
      return;
    }
    setCatSaving(true); setMsg("");
    try {
      await backend.entities.Category.create({ name, display_order: (categories?.length || 0), active: true });
      setNewCat("");
      load();
    } catch (err) {
      setMsg(err.message || "Failed to add category.");
    } finally {
      setCatSaving(false);
    }
  };

  const removeCategory = async (name) => {
    if (!confirm(`Delete category "${name}"? Existing services will keep their current category.`)) return;
    try {
      const recs = await backend.entities.Category.filter({ name });
      await Promise.all(recs.map((r) => backend.entities.Category.delete(r.id)));
      load();
    } catch (err) {
      setMsg(err.message || "Failed to delete category.");
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true); setMsg("");
    try {
      const payload = {
        ...form,
        category: form.category || categoryOptions[0],
        government_fee: Number(form.government_fee) || 0,
        service_charge: Number(form.service_charge) || 0,
        other_charges: Number(form.other_charges) || 0,
        display_order: Number(form.display_order) || 0,
        requirements: form.requirements.split("\n").map((r) => r.trim()).filter(Boolean),
      };
      if (editingId) {
        await backend.entities.Service.update(editingId, payload);
        setMsg("Service updated successfully.");
      } else {
        await backend.entities.Service.create(payload);
        setMsg("Service created successfully.");
      }
      reset();
      load();
    } catch (err) {
      setMsg(err.message || "Failed to save service.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!confirm("Delete this service?")) return;
    await backend.entities.Service.delete(id);
    load();
  };

  return (
    <AdminLayout title="Service Editor">
      <div className="space-y-5">
        {/* Form */}
        <form onSubmit={submit} className="rounded-2xl border border-border bg-white p-5 shadow-card">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold/15 text-gold">
              <Plus className="h-4 w-4" />
            </div>
            <h2 className="font-heading text-base font-bold text-navy">{editingId ? "Edit Service" : "Add New Service"}</h2>
          </div>

          <div className="space-y-3">
            <Field label="Service Name" value={form.name} onChange={(v) => set("name", v)} required />
            <div>
              <label className="mb-1 block text-xs font-semibold text-foreground">Category</label>
              <select value={form.category || categoryOptions[0]} onChange={(e) => set("category", e.target.value)} className="w-full rounded-xl border border-input bg-white px-3 py-2.5 text-sm outline-none focus:border-gold">
                {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <Field label="Short Description" value={form.short_description} onChange={(v) => set("short_description", v)} required />
            <Area label="Full Description" value={form.description} onChange={(v) => set("description", v)} rows={3} />

            <div className="grid grid-cols-3 gap-2">
              <NumField label="Govt Fee (₹)" value={form.government_fee} onChange={(v) => set("government_fee", v)} />
              <NumField label="Service Charge (₹)" value={form.service_charge} onChange={(v) => set("service_charge", v)} />
              <NumField label="Other (₹)" value={form.other_charges} onChange={(v) => set("other_charges", v)} />
            </div>

            <Area label="Document Requirements (one per line)" value={form.requirements} onChange={(v) => set("requirements", v)} rows={4} />
            <Field label="Eligibility / Who can apply" value={form.eligibility} onChange={(v) => set("eligibility", v)} />
            <Field label="Processing Info" value={form.processing_info} onChange={(v) => set("processing_info", v)} />

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" checked={form.appointment_required} onChange={(e) => set("appointment_required", e.target.checked)} className="h-4 w-4 accent-[hsl(var(--gold))]" />
                Appointment required
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} className="h-4 w-4 accent-[hsl(var(--gold))]" />
                Active
              </label>
            </div>
            <NumField label="Display Order" value={form.display_order} onChange={(v) => set("display_order", v)} />
          </div>

          {msg && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
              <Check className="h-4 w-4" /> {msg}
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <button type="submit" disabled={saving} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-navy py-2.5 text-sm font-semibold text-white disabled:opacity-60">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {editingId ? "Update Service" : "Create Service"}
            </button>
            {editingId && (
              <button type="button" onClick={reset} className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground">Cancel</button>
            )}
          </div>
        </form>

        {/* Categories management */}
        <div className="rounded-2xl border border-border bg-white p-5 shadow-card">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold/15 text-gold">
              <LayoutGrid className="h-4 w-4" />
            </div>
            <h2 className="font-heading text-base font-bold text-navy">Service Categories</h2>
          </div>
          <form onSubmit={addCategory} className="flex gap-2">
            <input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="New category name" className="flex-1 rounded-xl border border-input bg-white px-3 py-2.5 text-sm outline-none focus:border-gold" />
            <button type="submit" disabled={catSaving} className="flex items-center gap-1 rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
              {catSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add
            </button>
          </form>
          <div className="mt-3 flex flex-wrap gap-2">
            {categories === null ? (
              <span className="text-xs text-muted-foreground">Loading…</span>
            ) : categoryOptions.map((c) => (
              <span key={c} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-3 py-1.5 text-xs font-semibold text-foreground">
                {c}
                {categories && categories.includes(c) && (
                  <button type="button" onClick={() => removeCategory(c)} className="text-muted-foreground hover:text-red-500" aria-label={`Remove ${c}`}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </span>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">Default categories (Certificates, Passport, etc.) are built-in and can't be deleted here — add your own above.</p>
        </div>

        {/* List */}
        <div>
          <h2 className="mb-3 font-heading text-base font-bold text-navy">Existing Services</h2>
          <div className="space-y-2">
            {services === null ? (
              <div className="h-40 animate-pulse rounded-2xl bg-white" />
            ) : services.length === 0 ? (
              <p className="text-sm text-muted-foreground">No services yet.</p>
            ) : (
              services.map((s) => (
                <div key={s.id} className="flex items-center gap-3 rounded-2xl border border-border bg-white p-3.5 shadow-card">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-foreground">{s.name}</p>
                      {!s.active && <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">Inactive</span>}
                    </div>
                    <p className="text-[11px] text-muted-foreground">{s.category} · Govt ₹{s.government_fee || 0} + Charge ₹{s.service_charge || 0}</p>
                  </div>
                  <button onClick={() => edit(s)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-navy hover:bg-secondary">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => remove(s.id)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-red-500 hover:bg-red-50">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function Field({ label, value, onChange, required }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-foreground">{label}{required && <span className="text-gold">*</span>}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} required={required} className="w-full rounded-xl border border-input bg-white px-3 py-2.5 text-sm outline-none focus:border-gold" />
    </div>
  );
}
function NumField({ label, value, onChange }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-foreground">{label}</label>
      <input type="number" value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-input bg-white px-3 py-2.5 text-sm outline-none focus:border-gold" />
    </div>
  );
}
function Area({ label, value, onChange, rows = 3 }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-foreground">{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} className="w-full rounded-xl border border-input bg-white px-3 py-2.5 text-sm outline-none focus:border-gold" />
    </div>
  );
}