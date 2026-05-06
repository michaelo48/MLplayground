"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { Header } from "../../../_components/Header";
import { InfoTooltip } from "../../../_components/InfoTooltip";
import { RegressionPlot } from "../../../_components/plots/RegressionPlot";
import { LossCurve } from "../../../_components/plots/LossCurve";
import { glossary } from "../../../_lib/glossary";
import type { Point } from "../../../_lib/sample-data";
import {
  convergedAt,
  datasets,
  gdTrajectory,
  generateSyntheticData,
  mse,
  olsFit,
  r2,
  type DatasetId,
} from "../../../_lib/ml";

type Optimizer = "OLS (closed form)" | "Gradient descent" | "SGD" | "Adam";
type Mode = DatasetId | "sketch";

const PLOT_W = 780;
const PLOT_H = 420;
const PLOT_PAD = 24;

const DEFAULTS = {
  mode: "synthetic" as Mode,
  n: 26,
  sigma: 0.08,
  seed: 7,
  optimizer: "Gradient descent" as Optimizer,
  lr: 0.05,
  epochs: 300,
  showResiduals: true,
  showConfBand: false,
  showGrid: true,
};

const PICKER: Array<{ id: Mode; label: string }> = [
  { id: "synthetic", label: datasets.synthetic.label },
  { id: "boston", label: datasets.boston.label },
  { id: "mpg", label: datasets.mpg.label },
  { id: "sketch", label: "Sketch your own  +" },
];

export function LinearRegressionPlayground() {
  const [mode, setMode] = useState<Mode>(DEFAULTS.mode);
  const [n, setN] = useState(DEFAULTS.n);
  const [sigma, setSigma] = useState(DEFAULTS.sigma);
  const [seed, setSeed] = useState(DEFAULTS.seed);
  const [optimizer, setOptimizer] = useState<Optimizer>(DEFAULTS.optimizer);
  const [lr, setLr] = useState(DEFAULTS.lr);
  const [epochs, setEpochs] = useState(DEFAULTS.epochs);
  const [showResiduals, setShowResiduals] = useState(DEFAULTS.showResiduals);
  const [showConfBand, setShowConfBand] = useState(DEFAULTS.showConfBand);
  const [showGrid, setShowGrid] = useState(DEFAULTS.showGrid);
  const [sketchPoints, setSketchPoints] = useState<Point[]>([]);

  const points = useMemo(() => {
    if (mode === "sketch") return sketchPoints;
    const d = datasets[mode];
    return generateSyntheticData(n, sigma, seed + d.seedOffset, d.trueSlope, d.trueIntercept);
  }, [mode, sketchPoints, n, sigma, seed]);

  const isSketch = mode === "sketch";
  const hasFit = points.length >= 2;

  const fit = useMemo(() => olsFit(points), [points]);
  const finalMse = useMemo(() => mse(points, fit), [points, fit]);
  const finalR2 = useMemo(() => r2(points, fit), [points, fit]);
  const trajectory = useMemo(() => gdTrajectory(points, lr, epochs), [points, lr, epochs]);
  const convergeIter = useMemo(() => convergedAt(trajectory, 1e-5), [trajectory]);
  const converged = hasFit && convergeIter < epochs;
  const initialMse = trajectory[0] ?? 0;
  const finalLoss = trajectory[trajectory.length - 1] ?? 0;
  const lossDeltaPct =
    initialMse > 0 ? ((finalLoss - initialMse) / initialMse) * 100 : 0;

  const reset = () => {
    setMode(DEFAULTS.mode);
    setN(DEFAULTS.n);
    setSigma(DEFAULTS.sigma);
    setSeed(DEFAULTS.seed);
    setOptimizer(DEFAULTS.optimizer);
    setLr(DEFAULTS.lr);
    setEpochs(DEFAULTS.epochs);
    setShowResiduals(DEFAULTS.showResiduals);
    setShowConfBand(DEFAULTS.showConfBand);
    setShowGrid(DEFAULTS.showGrid);
    setSketchPoints([]);
  };

  const reshuffle = () => {
    if (isSketch) setSketchPoints([]);
    else setSeed((s) => s + 1);
  };

  const addSketchPoint = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    // The overlay's box already corresponds to the data area (pad-cropped),
    // so a click at (relX, relY) maps directly into [0,1].
    const x = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    const y = Math.max(0, Math.min(1, 1 - (e.clientY - r.top) / r.height));
    setSketchPoints((p) => [...p, { x, y }]);
  };

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-white text-zinc-950">
      <Header active="Techniques" />
      {/* Breadcrumb + title */}
      <div className="border-b border-zinc-100 px-14 pt-7 pb-[18px]">
        <div className="font-mono text-xs uppercase tracking-[0.06em] text-zinc-500">
          <Link href="/techniques" className="hover:text-zinc-900">
            Techniques
          </Link>{" "}
          · Supervised · <span className="text-zinc-950">Linear Regression</span>
        </div>
        <div className="mt-2 flex items-end justify-between">
          <h1 className="text-[38px] font-semibold tracking-[-0.025em]">Linear Regression</h1>
          <div className="flex gap-2">
            <button onClick={reset} className="pill pill-outline hover:bg-zinc-50">
              ↺ Reset
            </button>
            <button className="pill pill-outline hover:bg-zinc-50" type="button">
              ⇧ Export model
            </button>
            <button onClick={reshuffle} className="pill pill-solid hover:bg-zinc-800">
              Run ▶
            </button>
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[260px_1fr_320px]">
        {/* Left: dataset */}
        <aside className="flex flex-col gap-[22px] border-r border-zinc-100 p-[22px]">
          <SidebarSection
            title={
              <>
                Dataset
                <InfoTooltip {...glossary.dataset} side="left" />
              </>
            }
          >
            {PICKER.map(({ id, label }) => (
              <PickerRow
                key={id}
                label={label}
                active={mode === id}
                onClick={() => setMode(id)}
              />
            ))}
          </SidebarSection>

          {isSketch ? (
            <SidebarSection title={`Points · n = ${sketchPoints.length}`}>
              <p className="text-[12px] leading-[1.5] text-zinc-500">
                Click anywhere on the plot to place a data point. Two or more lets the line fit.
              </p>
              <button
                type="button"
                onClick={() => setSketchPoints([])}
                disabled={sketchPoints.length === 0}
                className="self-start rounded border border-zinc-200 px-2.5 py-1 text-[12px] text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Clear sketch
              </button>
            </SidebarSection>
          ) : (
            <>
              <SidebarSection title={`Points · n = ${n}`}>
                <RangeSlider value={n} min={10} max={100} step={1} onChange={setN} />
                <ScaleLabel min="10" max="100" />
              </SidebarSection>

              <SidebarSection
                title={
                  <>
                    Noise
                    <InfoTooltip {...glossary.noise} side="left" />
                    {` · σ = ${sigma.toFixed(3)}`}
                  </>
                }
              >
                <RangeSlider value={sigma} min={0} max={0.5} step={0.005} onChange={setSigma} />
                <ScaleLabel min="0" max="0.5" />
              </SidebarSection>
            </>
          )}

          <SidebarSection title="Display">
            <Toggle
              label={
                <>
                  Show residuals
                  <InfoTooltip {...glossary.residuals} side="left" />
                </>
              }
              on={showResiduals}
              onChange={setShowResiduals}
            />
            <Toggle
              label={
                <>
                  Show confidence band
                  <InfoTooltip {...glossary.confidenceBand} side="left" />
                </>
              }
              on={showConfBand}
              onChange={setShowConfBand}
            />
            <Toggle label="Show grid" on={showGrid} onChange={setShowGrid} />
          </SidebarSection>
        </aside>

        {/* Center: canvas */}
        <main className="flex min-w-0 flex-col gap-[18px] p-7">
          <div className="flex flex-1 flex-col overflow-hidden rounded-[14px] border border-zinc-200">
            <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
              <span className="font-mono text-[11px] tracking-[0.04em] text-zinc-500">
                {hasFit
                  ? `FIT  ·  y = ${fit.slope.toFixed(3)}·x + ${fit.intercept.toFixed(3)}`
                  : "FIT  ·  awaiting data"}
              </span>
              <div className="flex gap-3.5 font-mono text-[11px]">
                <span className="text-zinc-500">
                  iter {hasFit ? Math.min(convergeIter, epochs) : 0}/{epochs}
                </span>
                <span className={converged ? "text-emerald-500" : "text-zinc-400"}>
                  {converged ? "✓ converged" : hasFit ? "… running" : "—"}
                </span>
              </div>
            </div>
            <div className="relative flex-1">
              <RegressionPlot
                width={PLOT_W}
                height={PLOT_H}
                points={points}
                slope={fit.slope}
                intercept={fit.intercept}
                showResiduals={showResiduals && hasFit}
                showGrid={showGrid}
                bandSigma={showConfBand && hasFit ? Math.sqrt(finalMse) : undefined}
              />
              {isSketch && (
                <div
                  onClick={addSketchPoint}
                  role="button"
                  aria-label="Add a data point"
                  className="absolute cursor-crosshair"
                  style={{
                    left: PLOT_PAD,
                    top: PLOT_PAD,
                    width: PLOT_W - PLOT_PAD * 2,
                    height: PLOT_H - PLOT_PAD * 2,
                  }}
                />
              )}
              {isSketch && sketchPoints.length === 0 && (
                <div
                  className="pointer-events-none absolute flex flex-col items-center justify-center text-center font-mono text-[12px] uppercase tracking-[0.06em] text-zinc-400"
                  style={{
                    left: PLOT_PAD,
                    top: PLOT_PAD,
                    width: PLOT_W - PLOT_PAD * 2,
                    height: PLOT_H - PLOT_PAD * 2,
                  }}
                >
                  <span>Click anywhere on the plot</span>
                  <span className="mt-1 text-zinc-300">to start placing points</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex h-[152px] flex-col overflow-hidden rounded-[14px] border border-zinc-200">
            <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-2.5">
              <span className="font-mono text-[11px] tracking-[0.04em] text-zinc-500">
                LOSS  ·  mean squared error
              </span>
              <span className="font-mono text-[11px] text-zinc-950">
                final {hasFit ? finalLoss.toFixed(4) : "—"}
              </span>
            </div>
            <div className="flex-1">
              <LossCurve
                width={780}
                height={108}
                trajectory={hasFit ? trajectory : undefined}
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-px overflow-hidden rounded-[14px] border border-zinc-200 bg-zinc-100">
            <Stat
              label={
                <>
                  MSE
                  <InfoTooltip {...glossary.mse} placement="top" />
                </>
              }
              value={hasFit ? finalMse.toFixed(4) : "—"}
            />
            <Stat
              label={
                <>
                  R²
                  <InfoTooltip {...glossary.r2} placement="top" />
                </>
              }
              value={hasFit ? finalR2.toFixed(3) : "—"}
            />
            <Stat
              label="iter"
              value={hasFit ? String(Math.min(convergeIter, epochs)) : "—"}
            />
            <Stat
              label="Δ loss"
              value={
                hasFit
                  ? `${lossDeltaPct >= 0 ? "+" : "−"}${Math.abs(lossDeltaPct).toFixed(1)}%`
                  : "—"
              }
            />
          </div>
        </main>

        {/* Right: hyperparameters + math */}
        <aside className="flex flex-col gap-[22px] border-l border-zinc-100 p-[22px]">
          <SidebarSection
            title={
              <>
                Optimizer
                <InfoTooltip {...glossary.optimizer} side="right" />
              </>
            }
          >
            <div className="grid grid-cols-2 gap-1.5">
              {(["OLS (closed form)", "Gradient descent", "SGD", "Adam"] as Optimizer[]).map(
                (label) => {
                  const active = optimizer === label;
                  return (
                    <button
                      key={label}
                      onClick={() => setOptimizer(label)}
                      className={`pill justify-center px-2 py-1.5 text-[11.5px] ${
                        active ? "pill-solid" : "pill-outline hover:bg-zinc-50"
                      }`}
                    >
                      {label}
                    </button>
                  );
                },
              )}
            </div>
          </SidebarSection>

          <SidebarSection
            title={
              <>
                Learning rate
                <InfoTooltip {...glossary.learningRate} side="right" />
                {` · ${lr.toFixed(3)}`}
              </>
            }
          >
            <RangeSlider value={lr} min={0.001} max={0.5} step={0.001} onChange={setLr} accent />
            <ScaleLabel min="0.001" max="0.5" />
          </SidebarSection>

          <SidebarSection
            title={
              <>
                Epochs
                <InfoTooltip {...glossary.epochs} side="right" />
                {` · ${epochs}`}
              </>
            }
          >
            <RangeSlider value={epochs} min={50} max={1000} step={10} onChange={setEpochs} accent />
            <ScaleLabel min="50" max="1000" />
          </SidebarSection>

          <SidebarSection title="The math">
            <div className="rounded-lg border border-zinc-100 bg-stone-50 p-3 font-mono text-xs leading-[1.7] text-zinc-800">
              ŷ = β₀ + β₁·x
              <br />
              L(β) = (1/n) Σ (yᵢ − ŷᵢ)²
              <br />
              ∂L/∂β₁ = −(2/n) Σ xᵢ(yᵢ − ŷᵢ)
            </div>
          </SidebarSection>
        </aside>
      </div>
    </div>
  );
}

function SidebarSection({
  title,
  children,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
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

function PickerRow({
  label,
  active,
  muted,
  disabled,
  onClick,
}: {
  label: string;
  active?: boolean;
  muted?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const base =
    "flex w-full items-center justify-between rounded-lg border px-2.5 py-2 text-left text-[13px] transition";
  const cls = active
    ? "border-zinc-950 bg-zinc-50 text-zinc-800"
    : "border-transparent text-zinc-800 hover:bg-zinc-50";
  const mute = muted ? " text-zinc-400" : "";
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`${base} ${cls}${mute} ${disabled ? "cursor-not-allowed" : ""}`}
    >
      <span>{label}</span>
      {active && <span className="font-mono text-[10px] text-zinc-500">✓</span>}
    </button>
  );
}

function RangeSlider({
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
  const pct = ((value - min) / (max - min)) * 100;
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

function ScaleLabel({ min, max }: { min: string; max: string }) {
  return (
    <div className="mt-1.5 flex justify-between font-mono text-[11px] text-zinc-400">
      <span>{min}</span>
      <span aria-hidden>────────</span>
      <span>{max}</span>
    </div>
  );
}

function Toggle({
  label,
  on,
  onChange,
}: {
  label: React.ReactNode;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  // Row instead of <button>: the label may itself contain a button (the
  // tooltip trigger), and nesting interactive elements is invalid HTML.
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

function Stat({ label, value }: { label: React.ReactNode; value: string }) {
  return (
    <div className="bg-white px-4 py-3 text-center">
      <div className="flex items-center justify-center gap-1 font-mono text-[10.5px] uppercase tracking-[0.06em] text-zinc-400">
        {label}
      </div>
      <div className="mt-1 font-mono text-base font-medium text-zinc-950">{value}</div>
    </div>
  );
}
