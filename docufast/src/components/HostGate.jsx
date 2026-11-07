import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { MAIN_HOST, PAY_HOST, handoffUrl, cameFromMain, clearCameFromMain } from "@/lib/handoff";

/*
 * Keeps the whole website on app.docufastindia.com, except the payment page, which runs on
 * docufast-app.vercel.app (the address registered with the payment gateway). Anyone who is
 * already on docufast-app.vercel.app directly, such as the Android app, is not moved anywhere.
 */
export default function HostGate({ children }) {
  const { pathname, search } = useLocation();
  const host = window.location.hostname;
  const isPay = pathname === "/pay";

  let target = null;
  if (host === MAIN_HOST && isPay) target = { host: PAY_HOST, fromMain: true };
  else if (host === PAY_HOST && !isPay && cameFromMain()) target = { host: MAIN_HOST, fromMain: false, back: true };

  useEffect(() => {
    if (!target) return undefined;
    let cancelled = false;
    handoffUrl(target.host, pathname + search, { fromMain: target.fromMain })
      .then((url) => {
        if (cancelled) return;
        if (target.back) clearCameFromMain();
        window.location.replace(url);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [target?.host, pathname, search]); // eslint-disable-line react-hooks/exhaustive-deps

  if (target) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-3 bg-white text-sm text-slate-600">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
        {target.back ? "Taking you back…" : "Opening secure payment…"}
      </div>
    );
  }
  return children;
}
