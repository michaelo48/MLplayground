"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Header } from "../../../_components/Header";
import { InfoTooltip } from "../../../_components/InfoTooltip";
import { RegressionPlot } from "../../../_components/plots/RegressionPlot";
import { LossCurve } from "../../../_components/plots/LossCurve";
import { glossary } from "../../../_lib/glossary";
import type { Point } from "../../../_lib/sample-data";
import { useElementSize } from "../../../_lib/useElementSize";
import {
  adamTrajectory,
  convergedAt,
  datasets,
  gdTrajectory,
  generateSyntheticData,
  mse,
  olsTrajectory,
  r2,
  sgdTrajectory,
  type DatasetId,
} from "../../../_lib/ml";

type Optimizer = "OLS (closed form)" | "Gradient descent" | "SGD" | "Adam";

const OPTIMIZER_COLORS: Record<Optimizer, string> = {
  "OLS (closed form)": "#71717a",
  "Gradient descent": "#7c3aed",
  SGD: "#ea580c",
  Adam: "#10b981",
};

const OPTIMIZER_SHORT: Record<Optimizer, string> = {
  "OLS (closed form)": "OLS",
  "Gradient descent": "GD",
  SGD: "SGD",
  Adam: "Adam",
};
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
  const seed = DEFAULTS.seed;
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

  // All four optimizers run on every input change so the loss chart can show
  // them side by side. They're cheap (a few hundred epochs over ~30 points).
  const trajectories = useMemo(
    () => ({
      "OLS (closed form)": olsTrajectory(points, epochs),
      "Gradient descent": gdTrajectory(points, lr, epochs),
      SGD: sgdTrajectory(points, lr, epochs, seed),
      Adam: adamTrajectory(points, lr, epochs),
    }),
    [points, lr, epochs, seed],
  );

  // Animation: null = settled at the end of the run; number = currently
  // playing back, showing the state at that epoch. Cancels and resets whenever
  // the inputs change so the user never sees stale frames.
  const [playStep, setPlayStep] = useState<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setPlayStep(null);
  }, [points, lr, epochs, optimizer]);

  const runAnimation = () => {
    if (!hasFit) return;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    setPlayStep(0);
    const start = performance.now();
    const duration = 2200;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // Ease-out so early epochs (where the action is) play slower than the
      // long tail of asymptotic convergence.
      const eased = 1 - Math.pow(1 - t, 2);
      const step = Math.floor(eased * epochs);
      if (t >= 1) {
        setPlayStep(null);
        rafRef.current = null;
        return;
      }
      setPlayStep(step);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const isPlaying = playStep !== null;
  const stepIdx = playStep ?? epochs;
  const active = trajectories[optimizer];
  const safeIdx = Math.min(stepIdx, active.params.length - 1);
  const fit = active.params[safeIdx] ?? active.fit;
  const finalMse = useMemo(() => mse(points, fit), [points, fit]);
  const finalR2 = useMemo(() => r2(points, fit), [points, fit]);
  const convergeIter = useMemo(() => convergedAt(active.losses, 1e-5), [active.losses]);
  const converged = !isPlaying && hasFit && convergeIter < epochs;
  const initialMse = active.losses[0] ?? 0;
  const currentLoss = active.losses[safeIdx] ?? 0;
  const lossDeltaPct =
    initialMse > 0 ? ((currentLoss - initialMse) / initialMse) * 100 : 0;
  const displayedIter = isPlaying ? safeIdx : Math.min(convergeIter, epochs);

  // Both plots fill their containers. Initial sizes seed the SSR render; the
  // ResizeObserver replaces them with measured pixels post-hydration.
  const [plotBoxRef, plotSize] = useElementSize<HTMLDivElement>({ w: PLOT_W, h: PLOT_H });
  const [lossBoxRef, lossSize] = useElementSize<HTMLDivElement>({ w: 780, h: 108 });

  const addSketchPoint = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    // The overlay's box already corresponds to the data area (pad-cropped),
    // so a click at (relX, relY) maps directly into [0,1].
    const x = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    const y = Math.max(0, Math.min(1, 1 - (e.clientY - r.top) / r.height));
    setSketchPoints((p) => [...p, { x, y }]);
  };

  return (
    <div className="flex flex-col bg-white text-zinc-950">
      <div className="flex flex-col lg:h-screen">
      <Header active="Techniques" />
      {/* Breadcrumb + title */}
      <div className="border-b border-zinc-100 px-4 pt-6 pb-4 sm:px-8 md:px-14 md:pt-7 md:pb-[18px]">
        <div className="font-mono text-xs uppercase tracking-[0.06em] text-zinc-500">
          <Link href="/techniques" className="hover:text-zinc-900">
            Techniques
          </Link>{" "}
          · Supervised · <span className="text-zinc-950">Linear Regression</span>
        </div>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <h1 className="text-[28px] font-semibold tracking-[-0.025em] sm:text-[32px] lg:text-[38px]">
            Linear Regression
          </h1>
          <button
            onClick={runAnimation}
            disabled={!hasFit || isPlaying}
            className="pill pill-solid hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isPlaying ? `Running… ${safeIdx}/${epochs}` : "Run ▶"}
          </button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[360px_1fr]">
        <main className="order-1 flex min-w-0 flex-col gap-[18px] p-4 sm:p-6 lg:order-2 lg:p-7">
          <div className="flex flex-1 flex-col overflow-hidden rounded-[14px] border border-zinc-200">
            <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
              <span className="font-mono text-[11px] tracking-[0.04em] text-zinc-500">
                {hasFit
                  ? `FIT  ·  y = ${fit.slope.toFixed(3)}·x + ${fit.intercept.toFixed(3)}`
                  : "FIT  ·  awaiting data"}
              </span>
              <div className="flex items-center gap-3.5 font-mono text-[11px]">
                <span className="flex items-center gap-1.5 text-zinc-500">
                  iter {hasFit ? displayedIter : 0}/{epochs}
                  <InfoTooltip
                    term="iter X / epochs"
                    side="right"
                    placement="bottom"
                    definition={
                      <>
                        <p>
                          <span className="font-mono">X</span> is how many update steps the
                          optimizer has done so far. The denominator is the{" "}
                          <span className="font-mono">epochs</span> budget you set in the right
                          sidebar — the maximum it&apos;s allowed to take.
                        </p>
                        <p className="mt-1.5">
                          If <span className="font-mono">X &lt; epochs</span> when it freezes, the
                          loss stopped changing — the model converged early and the rest of the
                          budget would&apos;ve been wasted compute.
                        </p>
                        <p className="mt-1.5">
                          If <span className="font-mono">X = epochs</span>, the optimizer ran out
                          of budget before settling. Bump epochs (or the learning rate) and it
                          would keep improving.
                        </p>
                      </>
                    }
                  />
                </span>
                <span className="flex items-center gap-1.5">
                  <span
                    className={
                      isPlaying
                        ? "text-violet-600"
                        : converged
                        ? "text-emerald-500"
                        : "text-zinc-400"
                    }
                  >
                    {isPlaying
                      ? "▶ running"
                      : converged
                      ? "✓ converged"
                      : hasFit
                      ? "… settled"
                      : "—"}
                  </span>
                  {hasFit && (
                    <InfoTooltip
                      term="Run state"
                      side="right"
                      placement="bottom"
                      definition={
                        <>
                          <p>
                            <span className="font-mono text-violet-600">▶ running</span> — Run is
                            replaying the optimizer epoch-by-epoch.
                          </p>
                          <p className="mt-1.5">
                            <span className="font-mono text-emerald-600">✓ converged</span> — the
                            loss reached its final value (within 10⁻⁵) before the epoch budget ran
                            out. The remaining epochs aren&apos;t doing useful work.
                          </p>
                          <p className="mt-1.5">
                            <span className="font-mono text-zinc-500">… settled</span> — the loss is
                            still drifting at the last epoch. Try more epochs, a different learning
                            rate, or another optimizer.
                          </p>
                        </>
                      }
                    />
                  )}
                </span>
              </div>
            </div>
            <div ref={plotBoxRef} className="relative min-h-[320px] flex-1">
              <RegressionPlot
                width={plotSize.w}
                height={plotSize.h}
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
                    width: plotSize.w - PLOT_PAD * 2,
                    height: plotSize.h - PLOT_PAD * 2,
                  }}
                />
              )}
              {isSketch && sketchPoints.length === 0 && (
                <div
                  className="pointer-events-none absolute flex flex-col items-center justify-center text-center font-mono text-[12px] uppercase tracking-[0.06em] text-zinc-400"
                  style={{
                    left: PLOT_PAD,
                    top: PLOT_PAD,
                    width: plotSize.w - PLOT_PAD * 2,
                    height: plotSize.h - PLOT_PAD * 2,
                  }}
                >
                  <span>Click anywhere on the plot</span>
                  <span className="mt-1 text-zinc-300">to start placing points</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex h-[180px] flex-col overflow-hidden rounded-[14px] border border-zinc-200">
            <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-2.5">
              <span className="font-mono text-[11px] tracking-[0.04em] text-zinc-500">
                LOSS  ·  MSE per epoch  ·  highlighting{" "}
                <span style={{ color: OPTIMIZER_COLORS[optimizer] }}>
                  {OPTIMIZER_SHORT[optimizer]}
                </span>
              </span>
              <span className="font-mono text-[11px] text-zinc-950">
                {isPlaying ? "loss" : "final"} {hasFit ? currentLoss.toFixed(4) : "—"}
              </span>
            </div>
            <div ref={lossBoxRef} className="flex-1">
              <LossCurve
                width={lossSize.w}
                height={lossSize.h}
                maxIndex={stepIdx}
                series={
                  hasFit
                    ? (Object.keys(trajectories) as Optimizer[]).map((name) => ({
                        losses: trajectories[name].losses,
                        color: OPTIMIZER_COLORS[name],
                        label: OPTIMIZER_SHORT[name],
                        highlighted: name === optimizer,
                        dashed: name === "OLS (closed form)",
                      }))
                    : undefined
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[14px] border border-zinc-200 bg-zinc-100 sm:grid-cols-4">
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

        {/* Sidebar — first in source order on mobile (below main); placed in
            the LEFT grid track on desktop via `lg:order-1`. */}
        <aside className="order-2 flex flex-col gap-[22px] border-zinc-100 p-4 sm:p-6 lg:order-1 lg:border-r lg:p-[22px]">
          <SidebarSection
            title={
              <>
                Dataset
                <InfoTooltip {...glossary.dataset} side="right" />
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
                    <InfoTooltip {...glossary.noise} side="right" />
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
                  <InfoTooltip {...glossary.residuals} side="right" />
                </>
              }
              on={showResiduals}
              onChange={setShowResiduals}
            />
            <Toggle
              label={
                <>
                  Show confidence band
                  <InfoTooltip {...glossary.confidenceBand} side="right" />
                </>
              }
              on={showConfBand}
              onChange={setShowConfBand}
            />
            <Toggle label="Show grid" on={showGrid} onChange={setShowGrid} />
          </SidebarSection>

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

      <HowItWorks />
    </div>
  );
}

function HowItWorks() {
  return (
    <section className="border-t border-zinc-100 px-4 py-12 sm:px-8 md:px-14 md:py-16">
      <div className="mx-auto max-w-[920px]">
        <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-zinc-500">
          § How it works
        </div>
        <h2 className="mt-2 text-[26px] font-semibold tracking-[-0.02em] sm:text-[30px]">
          Drawing the line that fits.
        </h2>
        <p className="mt-3 max-w-[640px] text-[15px] leading-[1.65] text-zinc-600">
          Linear regression is the simplest supervised model: assume the relationship between an
          input <span className="font-mono">x</span> and an output <span className="font-mono">y</span> is
          a straight line, then find the line that gets closest to every point.
        </p>

        <ol className="mt-10 grid gap-6 sm:grid-cols-2">
          <Step
            n="01"
            title="Pick a model"
            body={
              <>
                Every prediction takes the same shape:{" "}
                <span className="font-mono text-zinc-900">ŷ = β₀ + β₁·x</span>. Two numbers — an
                intercept and a slope — define the entire line. Fitting the model means choosing the
                pair <span className="font-mono">(β₀, β₁)</span> that best matches the data.
              </>
            }
          />
          <Step
            n="02"
            title="Measure how wrong it is"
            body={
              <>
                For each point, the residual is the gap between the truth{" "}
                <span className="font-mono">yᵢ</span> and the prediction{" "}
                <span className="font-mono">ŷᵢ</span>. Square the gaps, average them, and you have{" "}
                <span className="font-mono">MSE</span> — the loss the line is trying to drive down.
                Squaring penalises big misses far more than small ones.
              </>
            }
          />
          <Step
            n="03"
            title="Solve it (closed form)"
            body={
              <>
                Because the loss is a clean quadratic in <span className="font-mono">β</span>, calculus
                gives a one-shot answer: set the derivative to zero and solve. That&apos;s ordinary
                least squares. No iteration, no learning rate — the optimal line in a single
                expression.
              </>
            }
          />
          <Step
            n="04"
            title="Or learn it (gradient descent)"
            body={
              <>
                Start with random weights, compute the gradient{" "}
                <span className="font-mono">∂L/∂β</span>, take a small step downhill, and repeat. Each
                epoch shrinks the loss curve below the plot. The learning rate controls step size;
                too big and it diverges, too small and it crawls.
              </>
            }
          />
        </ol>

        <div className="mt-10 rounded-[14px] border border-zinc-200 bg-stone-50 p-5">
          <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-zinc-500">
            What the numbers mean
          </div>
          <dl className="mt-3 grid gap-x-8 gap-y-3 text-[14px] leading-[1.55] text-zinc-700 sm:grid-cols-2">
            <div>
              <dt className="font-mono text-[12px] text-zinc-900">MSE</dt>
              <dd>Average squared residual. Lower is better; zero means a perfect fit.</dd>
            </div>
            <div>
              <dt className="font-mono text-[12px] text-zinc-900">R²</dt>
              <dd>
                Fraction of variance explained. <span className="font-mono">1.0</span> is perfect,{" "}
                <span className="font-mono">0</span> is no better than predicting the mean.
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[12px] text-zinc-900">iter</dt>
              <dd>How many gradient-descent steps it took to converge within tolerance.</dd>
            </div>
            <div>
              <dt className="font-mono text-[12px] text-zinc-900">Δ loss</dt>
              <dd>How much the loss fell from the first epoch to the last — a sign of progress.</dd>
            </div>
          </dl>
        </div>

        <p className="mt-8 text-[14px] leading-[1.6] text-zinc-500">
          Try it: crank the noise up and watch <span className="font-mono">R²</span> collapse. Drop
          the learning rate to <span className="font-mono">0.001</span> and see the loss curve barely
          move in 300 epochs. The whole point of the playground is that the math becomes something
          you can feel.
        </p>
      </div>
    </section>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: React.ReactNode }) {
  return (
    <li className="rounded-[14px] border border-zinc-200 p-5">
      <div className="font-mono text-[11px] tracking-[0.06em] text-zinc-400">{n}</div>
      <h3 className="mt-1 text-[17px] font-semibold tracking-[-0.01em] text-zinc-950">{title}</h3>
      <p className="mt-2 text-[14px] leading-[1.6] text-zinc-600">{body}</p>
    </li>
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
