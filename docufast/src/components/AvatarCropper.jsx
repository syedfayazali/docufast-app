import React, { useEffect, useRef, useState } from "react";
import { Loader2, ZoomIn, ZoomOut } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const BOX = 280; // size of the square crop window on screen
const OUT = 480; // size of the saved picture

/**
 * Lets the customer move and zoom a photo inside a square window before it is saved.
 * Drag with a finger or mouse to move, use the slider or the +/- buttons to zoom.
 */
export default function AvatarCropper({ file, onCancel, onDone }) {
  const [src, setSrc] = useState("");
  const [img, setImg] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 }); // image centre offset from window centre, in screen px
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const drag = useRef(null);
  const pointers = useRef(new Map());
  const pinch = useRef(null);

  useEffect(() => {
    if (!file) return undefined;
    const url = URL.createObjectURL(file);
    setSrc(url);
    setImg(null);
    setZoom(1);
    setPos({ x: 0, y: 0 });
    setError("");
    const i = new Image();
    i.onload = () => setImg(i);
    i.onerror = () => setError("That file is not a valid image.");
    i.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Size of the photo on screen at zoom 1: it just covers the square window.
  const base = img ? BOX / Math.min(img.naturalWidth, img.naturalHeight) : 1;
  const w = img ? img.naturalWidth * base * zoom : 0;
  const h = img ? img.naturalHeight * base * zoom : 0;

  const clamp = (p, z = zoom) => {
    if (!img) return p;
    const ww = img.naturalWidth * base * z;
    const hh = img.naturalHeight * base * z;
    const mx = Math.max(0, (ww - BOX) / 2);
    const my = Math.max(0, (hh - BOX) / 2);
    return { x: Math.min(mx, Math.max(-mx, p.x)), y: Math.min(my, Math.max(-my, p.y)) };
  };
  const setZ = (z) => {
    const nz = Math.min(4, Math.max(1, z));
    setZoom(nz);
    setPos((p) => clamp(p, nz));
  };

  const onDown = (e) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) drag.current = { x: e.clientX, y: e.clientY, start: pos };
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y), z: zoom };
      drag.current = null;
    }
  };
  const onMove = (e) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      setZ(pinch.current.z * (Math.hypot(a.x - b.x, a.y - b.y) / pinch.current.d));
    } else if (drag.current) {
      setPos(clamp({ x: drag.current.start.x + e.clientX - drag.current.x, y: drag.current.start.y + e.clientY - drag.current.y }));
    }
  };
  const onUp = (e) => {
    pointers.current.delete(e.pointerId);
    pinch.current = null;
    drag.current = pointers.current.size === 1
      ? { x: [...pointers.current.values()][0].x, y: [...pointers.current.values()][0].y, start: pos }
      : null;
  };

  const save = async () => {
    if (!img) return;
    setBusy(true);
    setError("");
    try {
      // Which part of the original photo is inside the window?
      const scale = base * zoom; // screen px per source px
      const sx = (img.naturalWidth * scale / 2 - BOX / 2 - pos.x) / scale;
      const sy = (img.naturalHeight * scale / 2 - BOX / 2 - pos.y) / scale;
      const side = BOX / scale;
      const canvas = document.createElement("canvas");
      canvas.width = OUT;
      canvas.height = OUT;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, OUT, OUT);
      ctx.drawImage(img, sx, sy, side, side, 0, 0, OUT, OUT);
      const blob = await new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("Could not process the image."))), "image/jpeg", 0.88));
      await onDone(blob);
    } catch (err) {
      setError(err.message || "Could not save the photo.");
    }
    setBusy(false);
  };

  return (
    <Dialog open={!!file} onOpenChange={(o) => { if (!o && !busy) onCancel(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Adjust your photo</DialogTitle>
          <DialogDescription>Drag the photo to move it. Use the slider or pinch to zoom.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          <div
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            onWheel={(e) => setZ(zoom - e.deltaY * 0.002)}
            className="relative overflow-hidden rounded-2xl bg-navy"
            style={{ width: BOX, height: BOX, touchAction: "none", cursor: "grab", maxWidth: "100%" }}
          >
            {img && (
              <img
                src={src}
                alt="Your photo"
                draggable={false}
                style={{
                  position: "absolute", maxWidth: "none", userSelect: "none", pointerEvents: "none",
                  width: w, height: h,
                  left: BOX / 2 - w / 2 + pos.x, top: BOX / 2 - h / 2 + pos.y,
                }}
              />
            )}
            {/* round preview of what the circle on the profile will show */}
            <div className="pointer-events-none absolute inset-0 rounded-2xl" style={{ boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.7)" }} />
            <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(circle at center, transparent 68%, rgba(10,29,77,0.55) 69%)" }} />
            {!img && !error && (
              <div className="absolute inset-0 flex items-center justify-center text-white"><Loader2 className="h-6 w-6 animate-spin" /></div>
            )}
          </div>

          <div className="flex w-full items-center gap-3">
            <button type="button" onClick={() => setZ(zoom - 0.25)} aria-label="Zoom out" className="rounded-full border border-border p-2 text-navy"><ZoomOut className="h-4 w-4" /></button>
            <input
              type="range" min="1" max="4" step="0.01" value={zoom}
              onChange={(e) => setZ(parseFloat(e.target.value))}
              aria-label="Zoom"
              className="h-2 flex-1 cursor-pointer accent-[#F5A623]"
            />
            <button type="button" onClick={() => setZ(zoom + 0.25)} aria-label="Zoom in" className="rounded-full border border-border p-2 text-navy"><ZoomIn className="h-4 w-4" /></button>
          </div>

          {error && <p className="w-full rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{error}</p>}

          <div className="flex w-full gap-3">
            <button type="button" onClick={onCancel} disabled={busy} className="flex-1 rounded-xl border border-border py-3 text-sm font-semibold text-navy disabled:opacity-60">Cancel</button>
            <button type="button" onClick={save} disabled={busy || !img} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-navy py-3 text-sm font-semibold text-white disabled:opacity-60">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save photo
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
