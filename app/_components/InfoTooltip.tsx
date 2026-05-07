"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type Side = "center" | "left" | "right";
type Placement = "top" | "bottom";

type Props = {
  term: string;
  definition: ReactNode;
  // Horizontal anchor of the tooltip relative to the icon. Use "left" inside
  // a left-edge sidebar (so it opens rightward, away from the viewport edge),
  // "right" inside a right-edge sidebar, "center" elsewhere.
  side?: Side;
  // Vertical placement. Use "top" near the bottom of the viewport so the
  // tooltip doesn't get clipped.
  placement?: Placement;
};

const TOOLTIP_W = 260;
const GAP = 8;

export function InfoTooltip({
  term,
  definition,
  side = "center",
  placement = "bottom",
}: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, ready: false });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const place = () => {
      const r = triggerRef.current!.getBoundingClientRect();
      const th = tooltipRef.current?.offsetHeight ?? 0;
      let left = r.left + r.width / 2 - TOOLTIP_W / 2;
      if (side === "left") left = r.left;
      if (side === "right") left = r.right - TOOLTIP_W;
      left = Math.max(8, Math.min(left, window.innerWidth - TOOLTIP_W - 8));
      const top = placement === "top" ? r.top - th - GAP : r.bottom + GAP;
      setCoords({ top, left, ready: true });
    };
    place();
    // Re-place on next frame once tooltip is in the DOM and we can measure it.
    const id = requestAnimationFrame(place);
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, side, placement]);

  const showTooltip = () => setOpen(true);
  const hideTooltip = () => {
    setOpen(false);
    setCoords((c) => ({ ...c, ready: false }));
  };

  return (
    <span className="inline-flex align-middle">
      <button
        ref={triggerRef}
        type="button"
        aria-label={`What is ${term}?`}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        className="inline-flex h-3.5 w-3.5 cursor-help items-center justify-center text-zinc-400 outline-none transition hover:text-zinc-800 focus:text-zinc-800"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
        >
          <circle cx="6" cy="6" r="5" />
          <line x1="6" y1="5.5" x2="6" y2="8.5" strokeLinecap="round" />
          <circle cx="6" cy="3.7" r="0.55" fill="currentColor" stroke="none" />
        </svg>
      </button>
      {mounted &&
        open &&
        createPortal(
          <div
            ref={tooltipRef}
            role="tooltip"
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              width: TOOLTIP_W,
              maxWidth: "calc(100vw - 2rem)",
              visibility: coords.ready ? "visible" : "hidden",
            }}
            className="pointer-events-none z-[100] rounded-lg border border-zinc-200 bg-white p-3 font-sans text-[12px] leading-[1.55] text-zinc-700 shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
          >
            <span className="mb-1.5 block font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-zinc-400">
              {term}
            </span>
            {definition}
          </div>,
          document.body,
        )}
    </span>
  );
}
