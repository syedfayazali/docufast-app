import React, { useEffect, useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";
import { base44 } from "@/api/base44Client";

const stamp = (d) => new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" });

function CopyBtn({ text }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      onClick={async () => { try { await navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1500); } catch { /* ignore */ } }}
      className="inline-flex items-center gap-1 rounded-lg border border-border bg-white px-2.5 py-1 text-[11px] font-semibold text-navy"
    >
      {ok ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />} {ok ? "Copied" : "Copy"}
    </button>
  );
}

/** Loads the team's updates for one application (private notes never reach customers) and marks them seen. */
export function useApplicationUpdates(applicationId) {
  const [items, setItems] = useState([]);
  const [fresh, setFresh] = useState(new Set());

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const rows = await base44.entities.ApplicationUpdate.filter({ application_id: applicationId }, "-created_date", 50);
        if (!alive) return;
        setItems(rows);
        const unseen = rows.filter((r) => !r.seen_at);
        if (unseen.length) {
          setFresh((f) => new Set([...f, ...unseen.map((r) => r.id)]));
          unseen.forEach((r) => base44.entities.ApplicationUpdate.update(r.id, { seen_at: new Date().toISOString() }).catch(() => {}));
        }
      } catch { if (alive) setItems([]); }
    };
    load();
    const off = base44.entities.ApplicationUpdate.subscribe((e) => { if (!e.data || e.data.application_id === applicationId) load(); });
    return () => { alive = false; off && off(); };
  }, [applicationId]);

  return { items, fresh };
}

/** Which timeline step an update belongs to (by the status the application had when it was posted). */
export function stepForStatus(status) {
  switch (status) {
    case "Draft": return 1;                // payment
    case "Approved": return 3;
    case "Completed": return 4;
    default: return 2;                     // Submitted / Under Review / Action Required / Rejected / Cancelled / unknown
  }
}

/** One update card, shown inside the timeline. */
export default function UpdateCard({ u, isNew }) {
  return (
    <article className="mt-2 rounded-xl border border-gold/60 bg-gold/5 p-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-bold text-foreground">{u.title || "Update"}</h3>
        {isNew && <span className="rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold text-navy">NEW</span>}
      </div>
      <p className="text-[11px] text-muted-foreground">{stamp(u.created_date)}</p>

      {u.ref_number && (
        <div className="mt-2 rounded-xl border-2 border-navy/80 bg-white p-3 text-center">
          <p className="text-[11px] font-semibold text-muted-foreground">{u.ref_label || "Reference number"}</p>
          <p className="mt-0.5 break-all font-mono text-xl font-extrabold tracking-wide text-navy">{u.ref_number}</p>
          <div className="mt-2"><CopyBtn text={u.ref_number} /></div>
        </div>
      )}
      {u.message && <p className="mt-2 whitespace-pre-line text-sm text-foreground">{u.message}</p>}
      {u.link && (
        <a href={u.link} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-gold">
          Open link <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
    </article>
  );
}
