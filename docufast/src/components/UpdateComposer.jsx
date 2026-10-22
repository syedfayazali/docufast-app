import React, { useEffect, useState } from "react";
import { Loader2, Trash2, Lock, Send } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { supabase } from "@/lib/supabase";

const field = "w-full rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none focus:border-gold";
const stamp = (d) => new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" });

async function mailUpdate(id) {
  try {
    const { data } = await supabase.auth.getSession();
    const res = await fetch("/api/application-update-mail", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${data?.session?.access_token}` },
      body: JSON.stringify({ id }),
    });
    const out = await res.json().catch(() => ({}));
    return out.error ? { sent: false, detail: out.error } : out;
  } catch (e) { return { sent: false, detail: String(e?.message || e) }; }
}

/** Admin: add a note / reference number for the customer (or a private note) and see past ones. */
export default function UpdateComposer({ application }) {
  const blank = { title: "", ref_label: "", ref_number: "", message: "", link: "", is_private: false, email: true };
  const [f, setF] = useState(blank);
  const [list, setList] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));

  const load = () => base44.entities.ApplicationUpdate.filter({ application_id: application.id }, "-created_date", 50).then(setList).catch(() => {});
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [application.id]);

  const post = async () => {
    setErr(""); setMsg("");
    if (!f.title.trim() && !f.ref_number.trim() && !f.message.trim()) return setErr("Write a title, a reference number or a message.");
    if (f.link.trim() && !/^https?:\/\//i.test(f.link.trim())) return setErr("The link must start with http:// or https://");
    setBusy(true);
    try {
      const row = await base44.entities.ApplicationUpdate.create({
        application_id: application.id,
        title: f.title.trim() || null,
        ref_label: f.ref_label.trim() || null,
        ref_number: f.ref_number.trim() || null,
        message: f.message.trim() || null,
        link: f.link.trim() || null,
        is_private: f.is_private,
      });
      let note = f.is_private ? "Private note saved (customer cannot see it)." : "Update posted – the customer can see it now.";
      if (!f.is_private && f.email) {
        const m = await mailUpdate(row.id);
        note += m.sent ? " Email sent." : ` Email not sent (${m.detail || m.reason || "unknown"}).`;
      }
      setMsg(note);
      setF(blank);
      load();
    } catch (e) { setErr(e.message || "Could not save."); }
    finally { setBusy(false); }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this update? The customer will no longer see it.")) return;
    try { await base44.entities.ApplicationUpdate.delete(id); load(); } catch (e) { setErr(e.message); }
  };

  return (
    <div className="mt-2 space-y-2 rounded-xl border border-border bg-secondary/40 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Note / reference for customer</p>
      <input className={field} placeholder="Title (e.g. Submitted to department)" maxLength={150} value={f.title} onChange={(e) => set("title", e.target.value)} />
      <div className="grid grid-cols-2 gap-2">
        <input className={field} placeholder="Label (e.g. Acknowledgement No.)" maxLength={80} value={f.ref_label} onChange={(e) => set("ref_label", e.target.value)} />
        <input className={field} placeholder="Reference / tracking number" maxLength={120} value={f.ref_number} onChange={(e) => set("ref_number", e.target.value)} />
      </div>
      <textarea className={field} rows={3} placeholder="Message to the customer" maxLength={2000} value={f.message} onChange={(e) => set("message", e.target.value)} />
      <input className={field} placeholder="Link (optional, https://…)" maxLength={500} value={f.link} onChange={(e) => set("link", e.target.value)} />
      <label className="flex items-center gap-2 text-xs font-semibold text-foreground">
        <input type="checkbox" checked={f.is_private} onChange={(e) => set("is_private", e.target.checked)} className="h-4 w-4 accent-[hsl(var(--gold))]" />
        <Lock className="h-3.5 w-3.5" /> Private note (only admins see it)
      </label>
      {!f.is_private && (
        <label className="flex items-center gap-2 text-xs font-semibold text-foreground">
          <input type="checkbox" checked={f.email} onChange={(e) => set("email", e.target.checked)} className="h-4 w-4 accent-[hsl(var(--gold))]" />
          Also email the customer
        </label>
      )}
      {err && <p className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs text-red-700">{err}</p>}
      {msg && <p className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-700">{msg}</p>}
      <button onClick={post} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-navy px-3 py-2.5 text-xs font-semibold text-white disabled:opacity-50">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} {f.is_private ? "Save private note" : "Post update"}
      </button>

      {list.length > 0 && (
        <div className="space-y-1.5 pt-1">
          {list.map((u) => (
            <div key={u.id} className="rounded-lg border border-border bg-white p-2.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-foreground">{u.title || u.ref_number || "Note"} {u.is_private && <span className="ml-1 rounded bg-slate-200 px-1.5 py-0.5 text-[10px]">PRIVATE</span>}</span>
                <button onClick={() => remove(u.id)} className="text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
              {u.ref_number && <p className="font-mono font-bold text-navy">{u.ref_label ? `${u.ref_label}: ` : ""}{u.ref_number}</p>}
              {u.message && <p className="whitespace-pre-line text-muted-foreground">{u.message}</p>}
              <p className="mt-0.5 text-[10px] text-muted-foreground">{stamp(u.created_date)} · {u.is_private ? "admin only" : u.seen_at ? "seen by customer" : "not seen yet"}{u.mailed_at ? " · emailed" : ""}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
