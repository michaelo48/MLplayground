"use client";

import { type ReactNode, useEffect, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Eyebrow line above the title (e.g. "§ Linear Regression"). */
  kicker?: string;
  title: string;
  /** Each entry becomes one slide the user clicks through. */
  slides: ReactNode[];
  /** Label for the dismiss button on the final slide. */
  finalCtaLabel?: string;
};

export function IntroModal({
  open,
  onClose,
  kicker,
  title,
  slides,
  finalCtaLabel = "Start exploring",
}: Props) {
  const [index, setIndex] = useState(0);
  // `visible` controls the entrance fade: rendered as opacity-0 first, then
  // flipped to opacity-100 on the next animation frame so the CSS transition
  // catches the change instead of mounting in its final state.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!open) {
      setVisible(false);
      return;
    }
    setIndex(0);
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight")
        setIndex((i) => Math.min(i + 1, slides.length - 1));
      else if (e.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, slides.length]);

  if (!open) return null;

  const isFirst = index === 0;
  const isLast = index === slides.length - 1;
  const next = () => setIndex((i) => Math.min(slides.length - 1, i + 1));
  const back = () => setIndex((i) => Math.max(0, i - 1));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="intro-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className={`fixed inset-0 z-50 flex items-center justify-center px-4 py-8 transition-colors duration-300 ${
        visible ? "bg-black/40 backdrop-blur-sm" : "bg-transparent"
      }`}
    >
      <div
        className={`relative flex h-[620px] max-h-[88vh] w-full max-w-[760px] flex-col overflow-hidden rounded-[18px] border border-zinc-200 bg-white shadow-[0_24px_64px_rgba(0,0,0,0.18)] transition-all duration-500 ease-out ${
          visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
        }`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-zinc-100 px-6 py-5">
          <div>
            {kicker && (
              <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-zinc-500">
                {kicker} · {index + 1} / {slides.length}
              </div>
            )}
            <h2
              id="intro-modal-title"
              className="mt-1 text-[24px] font-semibold tracking-[-0.02em] text-zinc-950 sm:text-[26px]"
            >
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 -mt-1 inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M2 2l10 10M12 2L2 12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Keying on `index` remounts the subtree on each slide change, so
            the CSS animation re-fires (it only runs on mount). */}
        <div
          key={index}
          className="flex-1 overflow-hidden px-6 py-6"
          style={{ animation: "intro-slide-in 280ms ease-out" }}
        >
          {slides[index]}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-zinc-100 px-6 py-4">
          <button
            type="button"
            onClick={back}
            disabled={isFirst}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-[13px] text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ← Back
          </button>
          <div className="flex items-center gap-1.5" role="tablist" aria-label="Slides">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === index
                    ? "w-6 bg-zinc-950"
                    : "w-1.5 bg-zinc-300 hover:bg-zinc-500"
                }`}
              />
            ))}
          </div>
          {isLast ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-zinc-950 px-4 py-2 text-[13px] font-medium text-white transition hover:bg-zinc-800"
            >
              {finalCtaLabel}
            </button>
          ) : (
            <button
              type="button"
              onClick={next}
              className="rounded-lg bg-zinc-950 px-4 py-2 text-[13px] font-medium text-white transition hover:bg-zinc-800"
            >
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// A pre-styled slide layout for "this step of the process" content. Each
// playground composes these into the slides array passed to IntroModal.
export function IntroSlide({
  n,
  title,
  body,
  illustration,
}: {
  n: string;
  title: string;
  body: ReactNode;
  /** Optional inline visual (typically a small SVG) shown above the title. */
  illustration?: ReactNode;
}) {
  return (
    <div>
      {illustration && (
        <div className="mx-auto mb-4 w-full max-w-[480px] overflow-hidden rounded-[12px] border border-zinc-100 bg-stone-50 p-3">
          {illustration}
        </div>
      )}
      <div className="font-mono text-[11px] tracking-[0.06em] text-zinc-400">
        {n}
      </div>
      <h3 className="mt-2 text-[22px] font-semibold tracking-[-0.01em] text-zinc-950">
        {title}
      </h3>
      <div className="mt-3 text-[15px] leading-[1.7] text-zinc-700">{body}</div>
    </div>
  );
}
