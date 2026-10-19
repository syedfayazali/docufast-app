import React, { useEffect, useState, useCallback } from "react";
import { MapPin, Plus, Trash2, Pencil, Check, Loader2, LocateFixed, Home, Briefcase } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

const LABELS = [
  { name: "Home", icon: Home },
  { name: "Work", icon: Briefcase },
  { name: "Other", icon: MapPin },
];
const MAX_ADDRESSES = 10;
const EMPTY = { label: "Home", line: "", landmark: "", city: "", district: "", state: "", pin: "", lat: null, lng: null };

export const formatAddressLine = (a) => [a?.line, a?.landmark].filter(Boolean).join(", ");
export const formatAddressFull = (a) =>
  [formatAddressLine(a), a?.city, a?.district !== a?.city ? a?.district : "", a?.state, a?.pin].filter(Boolean).join(", ");

/** Turn a saved address into the flat fields the application form stores. */
export const addressToFormFields = (a) => ({
  address: formatAddressLine(a),
  city: a?.city || "",
  district: a?.district || "",
  state: a?.state || "",
  pin: a?.pin || "",
});

async function reverseGeocode(lat, lng) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=18&lat=${lat}&lon=${lng}`,
    { headers: { Accept: "application/json" } }
  );
  if (!res.ok) throw new Error("lookup failed");
  const j = await res.json();
  const a = j.address || {};
  return {
    line: [a.house_number, a.road || a.neighbourhood, a.suburb].filter(Boolean).join(", "),
    city: a.city || a.town || a.village || a.municipality || "",
    district: a.state_district || a.county || a.city_district || "",
    state: a.state || "",
    pin: (a.postcode || "").replace(/\s/g, ""),
  };
}

async function lookupPin(pin) {
  const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
  const j = await res.json();
  const office = j?.[0]?.Status === "Success" ? j[0].PostOffice?.[0] : null;
  if (!office) return null;
  return { city: office.Block && office.Block !== "NA" ? office.Block : office.District, district: office.District, state: office.State };
}

/**
 * Saved-address picker (like delivery apps).
 *  - selectable: tap a card to choose it (used on the application form)
 *  - otherwise it is a manage list (Profile page)
 */
export default function AddressPicker({ selectedId, onSelect, selectable = true }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | { id?: string, ...fields }
  const [saveIt, setSaveIt] = useState(true);
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!user) return [];
    try {
      const rows = await base44.entities.Address.filter({ created_by_id: user.id }, "-created_date", 30);
      const sorted = [...rows].sort((a, b) => Number(b.is_default) - Number(a.is_default));
      setItems(sorted);
      return sorted;
    } catch {
      setItems([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [user]);

  // First load: auto-select the default address (or the only one) and open the form if there are none.
  useEffect(() => {
    load().then((rows) => {
      if (!rows.length) {
        if (selectable) setEditing({ ...EMPTY });
        return;
      }
      if (selectable && !selectedId) onSelect?.(rows.find((r) => r.is_default) || rows[0]);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  const set = (k, v) => setEditing((e) => ({ ...e, [k]: v }));

  const useMyLocation = () => {
    setError("");
    setNote("");
    if (!navigator.geolocation) return setError("Location is not available on this device. Please type your address.");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const { latitude: lat, longitude: lng } = coords;
        try {
          const found = await reverseGeocode(lat, lng);
          setEditing((e) => ({ ...e, ...found, lat, lng }));
          setNote("Location found. Please check the details and add your house/flat number.");
        } catch {
          setEditing((e) => ({ ...e, lat, lng }));
          setNote("We got your location but couldn't read the address. Please type it below.");
        }
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        setError(
          err.code === 1
            ? "Location permission was denied. Allow it in your browser settings, or type your address."
            : "Couldn't get your location. Please type your address."
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  };

  const onPin = async (v) => {
    const pin = v.replace(/\D/g, "").slice(0, 6);
    set("pin", pin);
    if (pin.length === 6) {
      try {
        const info = await lookupPin(pin);
        if (info) setEditing((e) => ({ ...e, city: e.city || info.city, district: e.district || info.district, state: e.state || info.state }));
      } catch {
        /* optional nicety */
      }
    }
  };

  const save = async () => {
    setError("");
    if (!editing.line.trim()) return setError("Please enter your house/flat, street and area.");
    if (!/^\d{6}$/.test(editing.pin || "")) return setError("Please enter a valid 6-digit PIN code.");
    if (!editing.city.trim() || !editing.state.trim()) return setError("City and state are required.");
    if (!editing.id && items.length >= MAX_ADDRESSES) return setError(`You can save up to ${MAX_ADDRESSES} addresses.`);

    const payload = {
      label: editing.label,
      line: editing.line.trim(),
      landmark: editing.landmark?.trim() || null,
      city: editing.city.trim(),
      district: editing.district?.trim() || null,
      state: editing.state.trim(),
      pin: editing.pin,
      lat: editing.lat,
      lng: editing.lng,
    };

    setBusy(true);
    try {
      // "Use once" (not saved): hand it to the form without storing it.
      if (selectable && !editing.id && !saveIt) {
        onSelect?.({ id: null, ...payload });
        setEditing(null);
        setBusy(false);
        return;
      }
      let saved;
      if (editing.id) saved = await base44.entities.Address.update(editing.id, payload);
      else saved = await base44.entities.Address.create({ ...payload, is_default: items.length === 0 });
      const rows = await load();
      setEditing(null);
      if (selectable) onSelect?.(rows.find((r) => r.id === saved.id) || saved);
    } catch {
      setError("Could not save the address. Please try again.");
    }
    setBusy(false);
  };

  const remove = async (a) => {
    setBusy(true);
    try {
      await base44.entities.Address.delete(a.id);
      const rows = await load();
      if (a.is_default && rows[0]) await base44.entities.Address.update(rows[0].id, { is_default: true }).then(load);
      if (selectable && selectedId === a.id) onSelect?.(rows[0] || null);
    } catch {
      setError("Could not delete the address.");
    }
    setBusy(false);
  };

  const makeDefault = async (a) => {
    setBusy(true);
    try {
      for (const o of items) if (o.is_default && o.id !== a.id) await base44.entities.Address.update(o.id, { is_default: false });
      await base44.entities.Address.update(a.id, { is_default: true });
      await load();
    } catch {
      setError("Could not change the default address.");
    }
    setBusy(false);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading your addresses…
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {items.map((a) => {
        const chosen = selectable && selectedId === a.id;
        const Icon = (LABELS.find((l) => l.name === a.label) || LABELS[2]).icon;
        return (
          <div
            key={a.id}
            onClick={selectable ? () => onSelect?.(a) : undefined}
            className={`rounded-xl border p-3 ${selectable ? "cursor-pointer" : ""} ${chosen ? "border-gold bg-gold/5" : "border-border bg-white"}`}
          >
            <div className="flex items-start gap-2.5">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-navy" />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-semibold text-navy">
                  {a.label}
                  {a.is_default && <span className="rounded-full bg-navy/10 px-2 py-0.5 text-[10px] font-semibold">Default</span>}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{formatAddressFull(a)}</p>
              </div>
              {chosen && <Check className="h-4 w-4 shrink-0 text-emerald-600" />}
            </div>
            <div className="mt-2 flex gap-4 pl-6 text-[11px] font-semibold" onClick={(e) => e.stopPropagation()}>
              <button disabled={busy} onClick={() => { setError(""); setNote(""); setEditing({ ...EMPTY, ...a }); }} className="inline-flex items-center gap-1 text-navy">
                <Pencil className="h-3 w-3" /> Edit
              </button>
              {!a.is_default && (
                <button disabled={busy} onClick={() => makeDefault(a)} className="text-navy">Set as default</button>
              )}
              <button disabled={busy} onClick={() => remove(a)} className="inline-flex items-center gap-1 text-red-600">
                <Trash2 className="h-3 w-3" /> Delete
              </button>
            </div>
          </div>
        );
      })}

      {!editing && items.length < MAX_ADDRESSES && (
        <button
          onClick={() => { setError(""); setNote(""); setEditing({ ...EMPTY, label: items.length ? "Other" : "Home" }); }}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-navy/40 py-3 text-xs font-semibold text-navy"
        >
          <Plus className="h-4 w-4" /> Add new address
        </button>
      )}

      {editing && (
        <div className="space-y-3 rounded-xl border border-border bg-secondary/40 p-3">
          <p className="text-sm font-bold text-navy">{editing.id ? "Edit address" : "New address"}</p>

          <button
            type="button"
            onClick={useMyLocation}
            disabled={locating}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-navy bg-white py-2.5 text-xs font-bold text-navy disabled:opacity-60"
          >
            {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
            {locating ? "Finding your location…" : "Use my current location"}
          </button>
          {note && <p className="text-[11px] font-medium text-emerald-700">{note}</p>}

          <div className="flex gap-2">
            {LABELS.map(({ name }) => (
              <button
                key={name}
                type="button"
                onClick={() => set("label", name)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${editing.label === name ? "border-navy bg-navy text-white" : "border-border bg-white text-foreground"}`}
              >
                {name}
              </button>
            ))}
          </div>

          <Field label="House / flat, street, area" value={editing.line} onChange={(v) => set("line", v)} required />
          <Field label="Landmark (optional)" value={editing.landmark || ""} onChange={(v) => set("landmark", v)} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="PIN code" value={editing.pin} onChange={onPin} inputMode="numeric" required />
            <Field label="City" value={editing.city} onChange={(v) => set("city", v)} required />
            <Field label="District" value={editing.district || ""} onChange={(v) => set("district", v)} />
            <Field label="State" value={editing.state} onChange={(v) => set("state", v)} required />
          </div>

          {selectable && !editing.id && (
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" checked={saveIt} onChange={(e) => setSaveIt(e.target.checked)} className="h-4 w-4" />
              Save this address for next time
            </label>
          )}
          {error && <p className="text-[11px] font-medium text-red-600">{error}</p>}

          <div className="flex gap-2">
            {(items.length > 0 || !selectable) && (
              <button type="button" onClick={() => { setEditing(null); setError(""); }} className="flex-1 rounded-xl border border-border bg-white py-2.5 text-xs font-semibold">
                Cancel
              </button>
            )}
            <button type="button" onClick={save} disabled={busy} className="flex-1 rounded-xl bg-navy py-2.5 text-xs font-bold text-white disabled:opacity-60">
              {busy ? "Saving…" : editing.id ? "Save changes" : selectable ? "Use this address" : "Save address"}
            </button>
          </div>
        </div>
      )}

      {!editing && error && <p className="text-[11px] font-medium text-red-600">{error}</p>}
    </div>
  );
}

function Field({ label, value, onChange, required, inputMode }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold text-foreground">
        {label}
        {required && <span className="text-gold">*</span>}
      </label>
      <input
        value={value}
        inputMode={inputMode}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-input bg-white px-3 py-2.5 text-sm outline-none focus:border-gold"
      />
    </div>
  );
}
