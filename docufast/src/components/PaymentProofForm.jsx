import React, { useState } from "react";
import { Upload, Check, Loader2 } from "lucide-react";
import { backend } from "@/api/backend";

export default function PaymentProofForm({ onSubmit, submitting }) {
  const [file, setFile] = useState(null);
  const [utr, setUtr] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async () => {
    setError("");
    if (!file) {
      setError("Please upload your payment screenshot.");
      return;
    }
    if (!utr.trim()) {
      setError("Enter the UPI transaction reference (UTR) from your UPI app.");
      return;
    }
    setUploading(true);
    try {
      const res = await backend.integrations.Core.UploadPrivateFile({ file });
      const fileUri = res?.file_uri;
      if (!fileUri) throw new Error("Upload failed");
      setUploading(false);
      await onSubmit(fileUri, utr.trim());
    } catch {
      setUploading(false);
      setError("Could not upload the screenshot. Please try again.");
    }
  };

  const busy = uploading || submitting;

  return (
    <div className="rounded-2xl border border-border bg-white p-4 shadow-card">
      <p className="text-sm font-semibold text-navy">Confirm your payment</p>
      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
        After paying, upload a screenshot of the successful UPI payment and enter the transaction reference (UTR) shown in your UPI app. Your application moves forward once we verify it.
      </p>

      <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-secondary/40 px-3 py-4 text-sm font-medium text-muted-foreground hover:bg-secondary/60">
        {file ? (
          <span className="flex items-center gap-2 text-emerald-700">
            <Check className="h-4 w-4" /> {file.name}
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Upload className="h-4 w-4" /> Upload payment screenshot
          </span>
        )}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
      </label>

      <div className="mt-3">
        <label className="mb-1 block text-xs font-semibold text-foreground">
          UPI Transaction Reference (UTR) <span className="text-gold">*</span>
        </label>
        <input
          value={utr}
          onChange={(e) => setUtr(e.target.value)}
          placeholder="e.g. 456123789012"
          className="w-full rounded-xl border border-input bg-white px-3 py-2.5 text-sm outline-none focus:border-gold"
        />
      </div>

      {error && <p className="mt-2 text-[11px] font-medium text-red-600">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={busy}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gold px-4 py-3 text-sm font-bold text-navy disabled:opacity-60"
      >
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> {uploading ? "Uploading…" : "Submitting…"}
          </>
        ) : (
          "Submit Payment Proof"
        )}
      </button>
    </div>
  );
}