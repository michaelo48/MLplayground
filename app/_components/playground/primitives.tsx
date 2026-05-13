"use client";

import { useRef, type ReactNode } from "react";

// Shared UI atoms used by every technique playground (kNN, k-Means, Linear
// Regression, Decision Trees). Kept presentational and prop-driven so each
// playground can wire them up to its own state without subclassing.

export function SidebarSection({
  title,
  children,
}: {
  title: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-zinc-500">
        {title}
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

export function PickerRow({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  const base =
    "flex w-full items-center justify-between rounded-lg border px-2.5 py-2 text-left text-[13px] transition";
  const cls = active
    ? "border-zinc-950 bg-zinc-50 text-zinc-800"
    : "border-transparent text-zinc-800 hover:bg-zinc-50";
  return (
    <button type="button" onClick={onClick} className={`${base} ${cls}`}>
      <span>{label}</span>
      {active && <span className="font-mono text-[10px] text-zinc-500">✓</span>}
    </button>
  );
}

export function RangeSlider({
  value,
  min,
  max,
  step,
  onChange,
  accent,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  accent?: boolean;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const update = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    const raw = min + ratio * (max - min);
    const stepped = step ? Math.round(raw / step) * step : raw;
    onChange(Math.max(min, Math.min(max, stepped)));
  };
  const range = max - min || 1;
  const pct = Math.max(0, Math.min(100, ((value - min) / range) * 100));
  return (
    <div
      ref={trackRef}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        update(e.clientX);
      }}
      onPointerMove={(e) => {
        if (e.buttons & 1) update(e.clientX);
      }}
      className="relative h-2 cursor-pointer touch-none rounded bg-zinc-100"
    >
      <div
        className={`absolute inset-y-0 left-0 rounded ${accent ? "bg-violet-600" : "bg-zinc-950"}`}
        style={{ width: `${pct}%` }}
      />
      <div
        className={`pointer-events-none absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow ring-1 ${
          accent ? "ring-violet-600" : "ring-zinc-950"
        }`}
        style={{ left: `${pct}%` }}
      />
    </div>
  );
}

export function ScaleLabel({ min, max }: { min: string; max: string }) {
  return (
    <div className="mt-1.5 flex justify-between font-mono text-[11px] text-zinc-400">
      <span>{min}</span>
      <span aria-hidden>────────</span>
      <span>{max}</span>
    </div>
  );
}

export function Toggle({
  label,
  on,
  onChange,
}: {
  label: ReactNode;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between text-[13px] text-zinc-800">
      <span className="flex items-center gap-1.5">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => onChange(!on)}
        className={`relative inline-block h-[18px] w-[30px] flex-shrink-0 rounded-full transition-colors ${
          on ? "bg-zinc-950" : "bg-zinc-200"
        }`}
      >
        <span
          className={`absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white transition-all ${
            on ? "left-[14px]" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}

export function Stat({ label, value }: { label: ReactNode; value: string }) {
  return (
    <div className="bg-white px-4 py-3 text-center">
      <div className="flex items-center justify-center gap-1 font-mono text-[10.5px] uppercase tracking-[0.06em] text-zinc-400">
        {label}
      </div>
      <div className="mt-1 font-mono text-base font-medium text-zinc-950">{value}</div>
    </div>
  );
}

export function ClassChip({
  label,
  color,
  active,
  onClick,
}: {
  label: string;
  color: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 rounded border px-2 py-1.5 text-[12px] transition ${
        active
          ? "border-zinc-950 bg-zinc-950 text-zinc-50"
          : "border-zinc-200 hover:bg-zinc-50"
      }`}
    >
      <span
        style={{ background: color }}
        className="inline-block h-2.5 w-2.5 rounded-full"
      />
      {label}
    </button>
  );
}
