import React, { useEffect, useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";
import { backend } from "@/api/backend";

const stamp = (d) => new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" });

function CopyBtn({ text }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      onClick={async () => { try { await navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1500); } catch { /* ignore */ } }}
      className="inline-flex items-center gap-1 text-[11px] font-semibold text-gold"
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
        const rows = await backend.entities.ApplicationUpdate.filter({ application_id: applicationId }, "created_date", 50);
        if (!alive) return;
        setItems(rows);
        const unseen = rows.filter((r) => !r.seen_at);
        if (unseen.length) {
          setFresh((f) => new Set([...f, ...unseen.map((r) => r.id)]));
          unseen.forEach((r) => backend.entities.ApplicationUpdate.update(r.id, { seen_at: new Date().toISOString() }).catch(() => {}));
        }
      } catch { if (alive) setItems([]); }
    };
    load();
    const off = backend.entities.ApplicationUpdate.subscribe((e) => { if (!e.data || e.data.application_id === applicationId) load(); });
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
    <article className="mt-2">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-bold text-foreground">{u.title || "Update"}</h3>
        {isNew && <span className="rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold text-navy">NEW</span>}
      </div>
      <p className="text-[11px] text-muted-foreground">{stamp(u.created_date)}</p>

      {u.ref_number && (
        <div className="mt-1.5">
          <p className="text-[11px] font-semibold text-muted-foreground">{u.ref_label || "Reference number"}</p>
          <p className="break-all font-mono text-lg font-extrabold tracking-wide text-navy">{u.ref_number}</p>
          <div className="mt-1"><CopyBtn text={u.ref_number} /></div>
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
