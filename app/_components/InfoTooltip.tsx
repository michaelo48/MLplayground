import type { ReactNode } from "react";

type Side = "center" | "left" | "right";
type Placement = "top" | "bottom";

type Props = {
  term: string;
  definition: ReactNode;
  // Horizontal anchor of the tooltip relative to the icon. Use "left" inside
  // the left sidebar (so it opens rightward, away from the viewport edge),
  // "right" inside the right sidebar, "center" elsewhere.
  side?: Side;
  // Vertical placement. Use "top" near the bottom of the viewport so the
  // tooltip doesn't get clipped.
  placement?: Placement;
};

// On mobile (< sm/lg) the playground stacks single-column, so a right- or
// center-anchored tooltip can run off the left viewport edge. Force left
// anchoring on small screens; restore the requested side at the breakpoint
// where the layout has room.
const sideClass: Record<Side, string> = {
  center: "left-0 translate-x-0 sm:left-1/2 sm:-translate-x-1/2",
  left: "left-0",
  right: "left-0 lg:left-auto lg:right-0",
};

export function InfoTooltip({ term, definition, side = "center", placement = "bottom" }: Props) {
  const isTop = placement === "top";
  return (
    <span className="group relative inline-flex align-middle">
      <button
        type="button"
        aria-label={`What is ${term}?`}
        className="inline-flex h-3.5 w-3.5 cursor-help items-center justify-center text-zinc-400 outline-none transition group-hover:text-zinc-800 group-focus-within:text-zinc-800"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2">
          <circle cx="6" cy="6" r="5" />
          <line x1="6" y1="5.5" x2="6" y2="8.5" strokeLinecap="round" />
          <circle cx="6" cy="3.7" r="0.55" fill="currentColor" stroke="none" />
        </svg>
      </button>
      <span
        role="tooltip"
        className={`pointer-events-none absolute z-50 w-[260px] max-w-[calc(100vw-2rem)] translate-y-1 rounded-lg border border-zinc-200 bg-white p-3 font-sans text-[12px] leading-[1.55] normal-case tracking-normal text-zinc-700 opacity-0 shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition duration-150 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100 ${
          sideClass[side]
        } ${isTop ? "bottom-full mb-2 -translate-y-1 group-hover:translate-y-0 group-focus-within:translate-y-0" : "top-full mt-2"}`}
      >
        <span className="mb-1.5 block font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-zinc-400">
          {term}
        </span>
        {definition}
      </span>
    </span>
  );
}
