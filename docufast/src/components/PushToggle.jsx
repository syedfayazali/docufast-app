import React, { useEffect, useState } from "react";
import { BellRing, Loader2 } from "lucide-react";
import { pushState, enablePush, disablePush } from "@/lib/push";

/** "Get alerts on this phone" switch. The permission prompt appears only after the person taps it. */
export default function PushToggle({ className = "" }) {
  const [state, setState] = useState("loading");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => { pushState().then(setState); }, []);

  if (state === "loading" || state === "unsupported") return null;

  const toggle = async () => {
    setBusy(true); setErr("");
    try {
      if (state === "on") await disablePush(); else await enablePush();
      setState(await pushState());
    } catch (e) {
      setErr(e.message || "Something went wrong.");
      setState(await pushState());
    } finally { setBusy(false); }
  };

  return (
    <div className={`rounded-2xl border border-border bg-white p-4 shadow-card ${className}`}>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/10 text-gold"><BellRing className="h-5 w-5" /></div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">Get alerts on this phone</p>
          <p className="text-xs text-muted-foreground">
            {state === "on" ? "On. You will get a pop-up when your application, payment or appointment changes." : state === "blocked" ? "Blocked in your phone settings. Allow notifications for this app or site to turn it on." : "Know instantly when your application moves, even when the app is closed."}
          </p>
        </div>
        {state !== "blocked" && (
          <button onClick={toggle} disabled={busy} className={`rounded-xl px-3 py-2 text-xs font-semibold disabled:opacity-50 ${state === "on" ? "border border-border text-foreground" : "bg-navy text-white"}`}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : state === "on" ? "Turn off" : "Turn on"}
          </button>
        )}
      </div>
      {err && <p className="mt-2 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs text-red-700">{err}</p>}
    </div>
  );
}
