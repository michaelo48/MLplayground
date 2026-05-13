"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Header } from "../../../_components/Header";
import { InfoTooltip } from "../../../_components/InfoTooltip";
import { IntroModal, IntroSlide } from "../../../_components/IntroModal";
import {
  PickerRow,
  RangeSlider,
  ScaleLabel,
  SidebarSection,
  Stat,
  Toggle,
} from "../../../_components/playground/primitives";
import { glossary } from "../../../_lib/glossary";
import type { Point } from "../../../_lib/sample-data";
import {
  type DatasetId,
  pca,
  pcaDatasets,
  project,
  rotateAroundMean,
  score,
} from "../../../_lib/pca";

const PC1_COLOR = "#7c3aed"; // violet
const PC2_COLOR = "#ea580c"; // orange
const POINT_COLOR = "#0a0a0a";
const HIT_RADIUS = 0.04;

const DATASET_PICKER: { id: DatasetId; label: string }[] = [
  { id: "correlated", label: pcaDatasets.correlated.label },
  { id: "antiCorrelated", label: pcaDatasets.antiCorrelated.label },
  { id: "isotropic", label: pcaDatasets.isotropic.label },
  { id: "twoBlobs", label: pcaDatasets.twoBlobs.label },
  { id: "sketch", label: "Draw your own  +" },
];

type ViewMode = "original" | "rotated";

export function PCAPlayground() {
  const [dataset, setDataset] = useState<DatasetId>("correlated");
  const [seed, setSeed] = useState(7);
  const [n, setN] = useState(40);
  const [noise, setNoise] = useState(0.06);
  const [showAxes, setShowAxes] = useState(true);
  const [showResiduals, setShowResiduals] = useState(true);
  const [showEllipse, setShowEllipse] = useState(false);
  const [view, setView] = useState<ViewMode>("original");
  const [sketchPoints, setSketchPoints] = useState<Point[]>([]);
  const [introOpen, setIntroOpen] = useState(true);

  const isSketch = dataset === "sketch";

  const points = useMemo<Point[]>(() => {
    if (isSketch) return sketchPoints;
    return pcaDatasets[dataset].generate(seed, n, noise);
  }, [dataset, isSketch, sketchPoints, seed, n, noise]);

  const result = useMemo(() => pca(points), [points]);
  const hasFit = points.length >= 2;
  const totalVar = result.lambda1 + result.lambda2;
  const pctPC1 = totalVar > 0 ? (result.lambda1 / totalVar) * 100 : 0;
  const angleDeg = (result.angle * 180) / Math.PI;

  // Projection animation: `collapse` ∈ [0, 1]. 0 = original 2D positions, 1 =
  // fully collapsed onto PC1. The Run button triggers an eased tween from 0 → 1.
  const [collapse, setCollapse] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const rafRef = useRef<number | null>(null);

  // Cancel any in-flight animation and reset to the unprojected state. Used
  // whenever the inputs change so the user never sees a stale projection.
  const resetPlayback = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setIsPlaying(false);
    setCollapse(0);
  };

  // Reset the projection whenever the underlying problem changes.
  useEffect(() => {
    resetPlayback();
  }, [dataset, seed, n, noise, sketchPoints]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const runAnimation = () => {
    if (!hasFit) return;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    setIsPlaying(true);
    setCollapse(0);
    const start = performance.now();
    const duration = 1100;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // Ease-out cubic — points accelerate off the cloud and settle gently.
      const eased = 1 - Math.pow(1 - t, 3);
      setCollapse(eased);
      if (t >= 1) {
        setIsPlaying(false);
        rafRef.current = null;
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const handleDatasetChange = (id: DatasetId) => {
    if (id === dataset) return;
    setDataset(id);
  };

  const reshuffle = () => {
    if (isSketch) {
      setSketchPoints([]);
    } else {
      setSeed((s) => s + 1);
    }
  };

  // ----- Canvas drawing -----
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const draw = () => {
      const rect = wrap.getBoundingClientRect();
      if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const w = rect.width;
      const h = rect.height;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, w, h);

      // Resolve the orthonormal basis we're showing the world in. In "rotated"
      // mode we relabel PC1 as the canvas's horizontal so the variance picture
      // is read left-to-right.
      const pc1 = result.pc1;
      const pc2 = result.pc2;
      const mean = result.mean;
      const rotated = view === "rotated";
      const transform = (p: Point): Point =>
        rotated ? rotateAroundMean(p, mean, pc1) : p;

      // Variance ellipse — axes = 2σ along each principal direction. Drawn as
      // a thin guide that the cloud should roughly sit inside.
      if (showEllipse && hasFit) {
        const r1 = 2 * Math.sqrt(result.lambda1);
        const r2 = 2 * Math.sqrt(result.lambda2);
        ctx.save();
        ctx.translate(mean.x * w, mean.y * h);
        if (!rotated) ctx.rotate(result.angle);
        ctx.beginPath();
        ctx.ellipse(0, 0, r1 * w, r2 * h, 0, 0, Math.PI * 2);
        ctx.strokeStyle = "#a1a1aa";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }

      // Principal-component arrows from the mean. Length is 2σ so the arrow
      // tip sits at one std-dev along that direction — matches the ellipse.
      if (showAxes && hasFit) {
        const draw1 = rotated ? { x: 1, y: 0 } : pc1;
        const draw2 = rotated ? { x: 0, y: 1 } : pc2;
        drawArrow(
          ctx,
          mean.x * w,
          mean.y * h,
          (mean.x + draw1.x * 2 * Math.sqrt(result.lambda1)) * w,
          (mean.y + draw1.y * 2 * Math.sqrt(result.lambda1)) * h,
          PC1_COLOR,
          2,
        );
        drawArrow(
          ctx,
          mean.x * w,
          mean.y * h,
          (mean.x + draw2.x * 2 * Math.sqrt(result.lambda2)) * w,
          (mean.y + draw2.y * 2 * Math.sqrt(result.lambda2)) * h,
          PC2_COLOR,
          1.5,
        );
      }

      // Residuals: dashed line from each point to its projection on PC1. Only
      // useful in original view, and we fade them out as `collapse` proceeds
      // (the dashed line gets shorter on its own as points fall onto PC1).
      if (showResiduals && hasFit && !rotated) {
        ctx.strokeStyle = "#a1a1aa";
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        for (const p of points) {
          const proj = project(p, mean, pc1);
          const cx = lerp(p.x, proj.x, collapse);
          const cy = lerp(p.y, proj.y, collapse);
          ctx.beginPath();
          ctx.moveTo(cx * w, cy * h);
          ctx.lineTo(proj.x * w, proj.y * h);
          ctx.stroke();
        }
        ctx.setLineDash([]);
      }

      // Data points — interpolated from their raw position to their PC1
      // projection. After the rotated transform (if any) is applied, points
      // land along the canvas's horizontal axis through `mean`.
      for (const p of points) {
        const proj = project(p, mean, pc1);
        const x = lerp(p.x, proj.x, collapse);
        const y = lerp(p.y, proj.y, collapse);
        const t = transform({ x, y });
        ctx.beginPath();
        ctx.arc(t.x * w, t.y * h, 4.2, 0, Math.PI * 2);
        ctx.fillStyle = POINT_COLOR;
        ctx.globalAlpha = 0.78;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      // Mean marker — small crosshair so it reads as the origin of the basis.
      if (hasFit) {
        const cx = mean.x * w;
        const cy = mean.y * h;
        ctx.strokeStyle = "#18181b";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx - 6, cy);
        ctx.lineTo(cx + 6, cy);
        ctx.moveTo(cx, cy - 6);
        ctx.lineTo(cx, cy + 6);
        ctx.stroke();
      }
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [points, result, view, showAxes, showResiduals, showEllipse, collapse, hasFit]);

  // ----- Pointer interaction (sketch mode) -----
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isSketch) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    if (e.shiftKey) {
      let bestIdx = -1;
      let bestD = HIT_RADIUS;
      for (let i = 0; i < sketchPoints.length; i++) {
        const d = Math.hypot(x - sketchPoints[i].x, y - sketchPoints[i].y);
        if (d < bestD) {
          bestD = d;
          bestIdx = i;
        }
      }
      if (bestIdx >= 0) {
        setSketchPoints((pts) => pts.slice(0, bestIdx).concat(pts.slice(bestIdx + 1)));
      }
    } else {
      setSketchPoints((pts) => [...pts, { x, y }]);
    }
  };

  // Spread of the projected 1D coordinates — a sanity-check signal for the
  // "rotated" view (after rotation, all variance is along the canvas's x).
  const pc1Scores = useMemo(
    () => points.map((p) => score(p, result.mean, result.pc1)),
    [points, result],
  );
  const pc1Std = useMemo(() => {
    if (pc1Scores.length === 0) return 0;
    let s = 0;
    for (const v of pc1Scores) s += v * v;
    return Math.sqrt(s / pc1Scores.length);
  }, [pc1Scores]);

  return (
    <div className="flex flex-col bg-white text-zinc-950">
      <div className="flex flex-col lg:min-h-screen">
        <Header active="Techniques" />
        <div className="border-b border-zinc-100 px-4 pt-6 pb-4 sm:px-8 md:px-14 md:pt-7 md:pb-[18px]">
          <div className="font-mono text-xs uppercase tracking-[0.06em] text-zinc-500">
            <Link href="/techniques" className="hover:text-zinc-900">
              Techniques
            </Link>{" "}
            · Unsupervised · <span className="text-zinc-950">Principal Components</span>
          </div>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <h1 className="text-[28px] font-semibold tracking-[-0.025em] sm:text-[32px] lg:text-[38px]">
              Principal Components
            </h1>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setIntroOpen(true)}
                className="pill pill-outline hover:bg-zinc-50"
                type="button"
              >
                ⓘ Intro
              </button>
              <button
                onClick={reshuffle}
                disabled={isPlaying}
                className="pill pill-solid hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
                type="button"
              >
                {isSketch ? "Clear sketch" : "Reshuffle ⤴"}
              </button>
            </div>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[400px_1fr]">
          <main className="order-1 flex min-w-0 flex-col gap-[18px] p-4 sm:p-6 lg:order-2 lg:p-7">
            <div className="flex max-h-[1080px] flex-1 flex-col overflow-hidden rounded-[14px] border border-zinc-200">
              <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
                <span className="font-mono text-[11px] tracking-[0.04em] text-zinc-500">
                  {!hasFit
                    ? "awaiting points (need ≥ 2)"
                    : view === "rotated"
                    ? `ROTATED  ·  PC1 aligned with x  ·  σ₁ = ${pc1Std.toFixed(3)}`
                    : collapse > 0.99
                    ? `PROJECTED  ·  ${points.length} pts on PC1`
                    : `CLOUD  ·  ${points.length} pts  ·  angle ${angleDeg.toFixed(1)}°`}
                </span>
                <span
                  className={
                    isPlaying
                      ? "font-mono text-[11px] text-violet-600"
                      : collapse > 0.99
                      ? "font-mono text-[11px] text-emerald-500"
                      : "font-mono text-[11px] text-zinc-400"
                  }
                >
                  {!hasFit
                    ? "—"
                    : isPlaying
                    ? "▶ projecting"
                    : collapse > 0.99
                    ? "✓ on PC1"
                    : "○ ready"}
                </span>
              </div>
              <div ref={wrapRef} className="relative min-h-[320px] flex-1">
                <canvas
                  ref={canvasRef}
                  className={`block h-full w-full touch-none ${
                    isSketch ? "cursor-crosshair" : "cursor-default"
                  }`}
                  onPointerDown={onPointerDown}
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 px-3 py-2 text-center font-mono text-[10px] uppercase tracking-[0.06em] text-zinc-400">
                  {isSketch
                    ? "click to drop a point · shift+click to remove"
                    : "violet arrow = PC1 (max variance) · orange = PC2 (the leftovers)"}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[14px] border border-zinc-200 bg-zinc-100 sm:grid-cols-4">
              <Stat
                label={
                  <>
                    λ₁
                    <InfoTooltip {...glossary.eigenvalue} placement="top" />
                  </>
                }
                value={hasFit ? result.lambda1.toFixed(4) : "—"}
              />
              <Stat
                label={
                  <>
                    var explained
                    <InfoTooltip {...glossary.varianceExplained} placement="top" />
                  </>
                }
                value={hasFit ? `${pctPC1.toFixed(1)}%` : "—"}
              />
              <Stat
                label="λ₂"
                value={hasFit ? result.lambda2.toFixed(4) : "—"}
              />
              <Stat
                label="PC1 angle"
                value={hasFit ? `${angleDeg.toFixed(1)}°` : "—"}
              />
            </div>
          </main>

          <aside className="order-2 flex flex-col gap-[22px] border-zinc-100 p-4 sm:p-6 lg:order-1 lg:border-r lg:p-[22px]">
            <SidebarSection
              title={
                <>
                  Dataset
                  <InfoTooltip {...glossary.dataset} side="left" />
                </>
              }
            >
              {DATASET_PICKER.map(({ id, label }) => (
                <PickerRow
                  key={id}
                  label={label}
                  active={dataset === id}
                  onClick={() => handleDatasetChange(id)}
                />
              ))}
            </SidebarSection>

            {isSketch ? (
              <SidebarSection title={`Points · ${sketchPoints.length}`}>
                <p className="text-[12px] leading-[1.5] text-zinc-500">
                  Click anywhere on the plot to drop a point. Shift+click removes the closest one.
                  PC1 will swing live to track the direction of max variance.
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
                <SidebarSection title={`Sample size · n = ${n}`}>
                  <RangeSlider value={n} min={10} max={120} step={1} onChange={setN} />
                  <ScaleLabel min="10" max="120" />
                </SidebarSection>
                <SidebarSection
                  title={
                    <>
                      Noise
                      <InfoTooltip {...glossary.noise} side="left" />
                      {` · σ = ${noise.toFixed(3)}`}
                    </>
                  }
                >
                  <RangeSlider
                    value={noise}
                    min={0}
                    max={0.18}
                    step={0.005}
                    onChange={setNoise}
                  />
                  <ScaleLabel min="0" max="0.18" />
                </SidebarSection>
              </>
            )}

            <SidebarSection
              title={
                <>
                  View
                  <InfoTooltip {...glossary.pcaView} side="left" />
                </>
              }
            >
              <div className="grid grid-cols-2 gap-1.5">
                {(["original", "rotated"] as ViewMode[]).map((m) => {
                  const active = view === m;
                  return (
                    <button
                      key={m}
                      onClick={() => setView(m)}
                      className={`pill justify-center px-2 py-1.5 text-[11.5px] ${
                        active ? "pill-solid" : "pill-outline hover:bg-zinc-50"
                      }`}
                      type="button"
                    >
                      {m === "original" ? "Original" : "Rotated"}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] leading-[1.5] text-zinc-500">
                Rotated re-draws the cloud so PC1 lines up with the horizontal — the same data, just
                viewed from a more useful angle.
              </p>
            </SidebarSection>

            <SidebarSection title="Run">
              <button
                onClick={runAnimation}
                disabled={!hasFit || isPlaying}
                className="pill pill-solid w-full justify-center hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
                type="button"
              >
                {isPlaying
                  ? `Projecting… ${Math.round(collapse * 100)}%`
                  : collapse > 0.99
                  ? "Restore ↺"
                  : "Project onto PC1 ▶"}
              </button>
              <p className="text-[11px] leading-[1.5] text-zinc-500">
                Collapses every point onto its closest spot on PC1 — the canonical 2D → 1D PCA move.
              </p>
            </SidebarSection>

            <SidebarSection title="Display">
              <Toggle
                label={
                  <>
                    PC axes
                    <InfoTooltip {...glossary.principalComponent} side="left" />
                  </>
                }
                on={showAxes}
                onChange={setShowAxes}
              />
              <Toggle
                label={
                  <>
                    Residuals
                    <InfoTooltip {...glossary.projection} side="left" />
                  </>
                }
                on={showResiduals}
                onChange={setShowResiduals}
              />
              <Toggle
                label={
                  <>
                    Variance ellipse
                    <InfoTooltip {...glossary.covariance} side="left" />
                  </>
                }
                on={showEllipse}
                onChange={setShowEllipse}
              />
            </SidebarSection>

            <SidebarSection title="The math">
              <div className="rounded-lg border border-zinc-100 bg-stone-50 p-3 font-mono text-xs leading-[1.7] text-zinc-800">
                Σ = (1/n) Σ (xᵢ − μ)(xᵢ − μ)ᵀ
                <br />
                Σ · vₖ = λₖ · vₖ
                <br />
                PC1 = argmax<sub>‖v‖=1</sub> vᵀΣv
              </div>
            </SidebarSection>
          </aside>
        </div>
      </div>

      <IntroModal
        open={introOpen}
        onClose={() => setIntroOpen(false)}
        kicker="§ Principal Components"
        title="The direction that matters most."
        slides={PCA_SLIDES}
      />
    </div>
  );
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  width: number,
) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 1) return;
  const ux = dx / len;
  const uy = dy / len;
  const head = Math.min(10, len * 0.35);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  // Filled triangular head, perpendicular offset half the head length.
  const px = -uy;
  const py = ux;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - ux * head + px * head * 0.5, y2 - uy * head + py * head * 0.5);
  ctx.lineTo(x2 - ux * head - px * head * 0.5, y2 - uy * head - py * head * 0.5);
  ctx.closePath();
  ctx.fill();
}

// ---------- Intro modal slides ----------

const PCA_DEMO: [number, number][] = [
  [70, 110], [90, 100], [110, 90], [130, 80], [150, 70], [170, 60],
  [190, 50], [80, 115], [100, 95], [120, 85], [140, 78], [160, 65],
  [180, 55], [85, 120], [105, 92], [125, 88], [145, 72], [165, 62],
];
const PCA_MEAN: [number, number] = [125, 85];
const PCA_PC1: [number, number] = [0.85, -0.53]; // ≈ unit vector along the cloud
const PCA_PC2: [number, number] = [0.53, 0.85];

function pcaArrow(
  start: [number, number],
  dir: [number, number],
  length: number,
  color: string,
  width = 2,
) {
  const tipX = start[0] + dir[0] * length;
  const tipY = start[1] + dir[1] * length;
  const head = 7;
  const px = -dir[1];
  const py = dir[0];
  return (
    <g key={`${color}-${length}`}>
      <line x1={start[0]} y1={start[1]} x2={tipX} y2={tipY} stroke={color} strokeWidth={width} />
      <polygon
        points={`${tipX},${tipY} ${tipX - dir[0] * head + px * head * 0.5},${tipY - dir[1] * head + py * head * 0.5} ${tipX - dir[0] * head - px * head * 0.5},${tipY - dir[1] * head - py * head * 0.5}`}
        fill={color}
      />
    </g>
  );
}

function IllustCloud() {
  return (
    <svg viewBox="0 0 320 150" className="block h-auto w-full" aria-hidden>
      {PCA_DEMO.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={3.5} fill="#0a0a0a" fillOpacity={0.7} />
      ))}
    </svg>
  );
}

function IllustAxes() {
  return (
    <svg viewBox="0 0 320 150" className="block h-auto w-full" aria-hidden>
      {PCA_DEMO.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={3.5} fill="#0a0a0a" fillOpacity={0.55} />
      ))}
      {pcaArrow(PCA_MEAN, PCA_PC1, 70, PC1_COLOR, 2.2)}
      {pcaArrow(PCA_MEAN, PCA_PC2, 28, PC2_COLOR, 1.6)}
      <text
        x={PCA_MEAN[0] + PCA_PC1[0] * 78}
        y={PCA_MEAN[1] + PCA_PC1[1] * 78 - 4}
        fontSize={11}
        fontFamily="ui-monospace, monospace"
        fill={PC1_COLOR}
      >
        PC1
      </text>
      <text
        x={PCA_MEAN[0] + PCA_PC2[0] * 36}
        y={PCA_MEAN[1] + PCA_PC2[1] * 36 + 12}
        fontSize={11}
        fontFamily="ui-monospace, monospace"
        fill={PC2_COLOR}
      >
        PC2
      </text>
    </svg>
  );
}

function IllustProject() {
  // Show each point's projection onto PC1 as a faded dashed line + ghost dot.
  const projected = PCA_DEMO.map(([x, y]) => {
    const dx = x - PCA_MEAN[0];
    const dy = y - PCA_MEAN[1];
    const s = dx * PCA_PC1[0] + dy * PCA_PC1[1];
    return [PCA_MEAN[0] + s * PCA_PC1[0], PCA_MEAN[1] + s * PCA_PC1[1]] as const;
  });
  return (
    <svg viewBox="0 0 320 150" className="block h-auto w-full" aria-hidden>
      {PCA_DEMO.map(([x, y], i) => (
        <line
          key={`r${i}`}
          x1={x}
          y1={y}
          x2={projected[i][0]}
          y2={projected[i][1]}
          stroke="#a1a1aa"
          strokeWidth={0.9}
          strokeDasharray="3 3"
        />
      ))}
      {pcaArrow(PCA_MEAN, PCA_PC1, 90, PC1_COLOR, 1.8)}
      {PCA_DEMO.map(([x, y], i) => (
        <circle key={`o${i}`} cx={x} cy={y} r={3} fill="#0a0a0a" fillOpacity={0.25} />
      ))}
      {projected.map(([px, py], i) => (
        <circle key={`p${i}`} cx={px} cy={py} r={3.2} fill={PC1_COLOR} />
      ))}
    </svg>
  );
}

function IllustVariance() {
  // Bar chart: λ₁ vs λ₂ to drive home the "PC1 has most of the variance" idea.
  return (
    <svg viewBox="0 0 320 150" className="block h-auto w-full" aria-hidden>
      <rect x={40} y={36} width={110} height={28} fill={PC1_COLOR} />
      <rect x={40} y={84} width={26} height={28} fill={PC2_COLOR} />
      <text x={155} y={56} fontSize={12} fontFamily="ui-monospace, monospace" fill="#18181b">
        λ₁ — 81% of the variance
      </text>
      <text x={71} y={104} fontSize={12} fontFamily="ui-monospace, monospace" fill="#18181b">
        λ₂ — 19%
      </text>
      <text x={40} y={132} fontSize={10} fontFamily="ui-monospace, monospace" fill="#71717a">
        keep PC1, drop PC2 → 2D collapses to 1D
      </text>
    </svg>
  );
}

const PCA_SLIDES: React.ReactNode[] = [
  <p key="intro" className="text-[15px] leading-[1.7] text-zinc-700">
    Principal Component Analysis asks one question: <em>which direction does this cloud spread
    along the most?</em> The answer is a new coordinate system, ordered by how much variance each
    axis explains.
  </p>,
  <IntroSlide
    key="step1"
    n="01"
    title="Start with a cloud of points"
    illustration={<IllustCloud />}
    body={
      <>
        A scatter of 2D observations. The axes you got the data in (X, Y) are arbitrary — they
        rarely line up with how the data actually varies.
      </>
    }
  />,
  <IntroSlide
    key="step2"
    n="02"
    title="Find the axes of maximum variance"
    illustration={<IllustAxes />}
    body={
      <>
        <span style={{ color: PC1_COLOR }} className="font-mono">PC1</span> is the line through the
        mean along which the projected points have the largest spread.{" "}
        <span style={{ color: PC2_COLOR }} className="font-mono">PC2</span> is perpendicular — the
        leftover variance. Mathematically, they&apos;re the eigenvectors of the covariance matrix.
      </>
    }
  />,
  <IntroSlide
    key="step3"
    n="03"
    title="Project onto PC1"
    illustration={<IllustProject />}
    body={
      <>
        Drop a perpendicular from each point onto PC1. What you keep is the 1D score along PC1;
        what you discard is the residual along PC2. The sum of squared residuals is what PCA
        minimises — exactly the same loss as least-squares, just along the orthogonal direction.
      </>
    }
  />,
  <IntroSlide
    key="step4"
    n="04"
    title="The eigenvalues tell you what's worth keeping"
    illustration={<IllustVariance />}
    body={
      <>
        <span className="font-mono">λₖ</span> is the variance of the data along PCₖ. The fraction{" "}
        <span className="font-mono">λ₁ / (λ₁ + λ₂)</span> is the share of the cloud&apos;s spread
        captured by PC1 alone. In 100D you keep going until the cumulative share crosses some
        threshold (usually 90–95%).
      </>
    }
  />,
  <div key="try" className="text-[15px] leading-[1.7] text-zinc-700">
    <p>
      Try it: pick the isotropic dataset and watch the arrows swing aimlessly — there&apos;s no
      dominant direction. Switch to two-blobs and PC1 snaps to the line connecting them. Press{" "}
      <span className="font-mono">Project</span> to flatten the cloud onto that line — the price
      you pay for the dimensionality cut is everything orthogonal to PC1.
    </p>
  </div>,
];
