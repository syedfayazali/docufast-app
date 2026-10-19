import React, { useState } from "react";
import { Eye, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

/** Opens a private uploaded file via a short-lived signed link. */
export default function DocumentLink({ path, label = "View" }) {
  const [busy, setBusy] = useState(false);
  if (!path) return null;

  const open = async () => {
    setBusy(true);
    // Open the tab first (inside the click) so popup blockers allow it.
    const tab = window.open("", "_blank");
    try {
      const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: path });
      if (tab) tab.location.href = signed_url;
      else window.location.href = signed_url;
    } catch {
      if (tab) tab.close();
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={open}
      disabled={busy}
      className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] font-semibold text-navy hover:bg-secondary/60 disabled:opacity-60"
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />} {label}
    </button>
  );
}
