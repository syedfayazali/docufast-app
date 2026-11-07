import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

/** Small dialog to add or change the customer's name (shown on the membership card and profile). */
export default function NameDialog({ open, initial, onCancel, onSave }) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (open) { setValue(initial || ""); setError(""); }
  }, [open, initial]);

  const submit = async (e) => {
    e.preventDefault();
    const name = value.replace(/\s+/g, " ").trim();
    if (name.length < 2) { setError("Please enter your name (at least 2 letters)."); return; }
    setBusy(true);
    setError("");
    try {
      await onSave(name);
    } catch (err) {
      setError(err.message || "Could not save the name. Please try again.");
    }
    setBusy(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !busy) onCancel(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Name on your card</DialogTitle>
          <DialogDescription>This name is printed on your membership card and shown on your profile.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <label htmlFor="card-name" className="text-xs font-semibold text-navy">Full name</label>
          <input
            id="card-name"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            maxLength={40}
            autoFocus
            autoComplete="name"
            placeholder="e.g. Syed Fayaz Ali"
            className="h-11 w-full rounded-xl border border-border bg-white px-3 text-sm text-foreground outline-none focus:border-navy"
          />
          {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{error}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={onCancel} disabled={busy} className="flex-1 rounded-xl border border-border py-3 text-sm font-semibold text-navy disabled:opacity-60">Cancel</button>
            <button type="submit" disabled={busy} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-navy py-3 text-sm font-semibold text-white disabled:opacity-60">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save name
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
