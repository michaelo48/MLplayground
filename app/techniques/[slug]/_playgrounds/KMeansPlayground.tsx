"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Header } from "../../../_components/Header";
import { InfoTooltip } from "../../../_components/InfoTooltip";
import { IntroModal, IntroSlide } from "../../../_components/IntroModal";
import { glossary } from "../../../_lib/glossary";
import type { Point } from "../../../_lib/sample-data";
import {
  type Centroid,
  type DatasetId,
  type KMeansFrame,
  initCentroids,
  kmeansDatasets,
  runKMeans,
} from "../../../_lib/kmeans";

const CLUSTER_COLORS = [
  "#7c3aed", // violet
  "#ea580c", // orange
  "#0891b2", // cyan
  "#16a34a", // green
  "#db2777", // pink
  "#ca8a04", // yellow
  "#475569", // slate
  "#9333ea", // purple
];
const CELL = 14;
const MAX_ITERS = 30;
const HIT_RADIUS = 0.04;

const DATASET_PICKER: { id: DatasetId; label: string }[] = [
  { id: "blobs3", label: kmeansDatasets.blobs3.label },
  { id: "blobs5", label: kmeansDatasets.blobs5.label },
  { id: "anisotropic", label: kmeansDatasets.anisotropic.label },
  { id: "moons", label: kmeansDatasets.moons.label },
  { id: "sketch", label: "Draw your own  +" },
];

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function nearestCentroidIdx(p: Point, centroids: Centroid[]): number {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < centroids.length; i++) {
    const dx = p.x - centroids[i].x;
    const dy = p.y - centroids[i].y;
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

export function KMeansPlayground() {
  const [dataset, setDataset] = useState<DatasetId>("blobs3");
  const [seed, setSeed] = useState(7);
  const [centroidSeed, setCentroidSeed] = useState(2);
  const [k, setK] = useState(3);
  const [showCells, setShowCells] = useState(true);
  const [showSpokes, setShowSpokes] = useState(true);
  const [sketchPoints, setSketchPoints] = useState<Point[]>([]);

  const points = useMemo<Point[]>(() => {
    if (dataset === "sketch") return sketchPoints;
    return kmeansDatasets[dataset].generate(seed);
  }, [dataset, sketchPoints, seed]);

  const isSketch = dataset === "sketch";
  const hasFit = points.length >= k;

  const initial = useMemo(
    () => initCentroids(points, k, centroidSeed),
    [points, k, centroidSeed],
  );
  const frames = useMemo<KMeansFrame[]>(
    () => runKMeans(points, initial, MAX_ITERS),
    [points, initial],
  );
  const lastFrame = frames.length - 1;
  const final = frames[lastFrame];
  const converged = final?.changed === false;

  // Animation: playStep is a fractional index into `frames`. null = settled at
  // the end. We tween centroid positions between adjacent frames so the
  // movement reads as a glide rather than discrete jumps.
  const [playStep, setPlayStep] = useState<number | null>(null);
  // Centroids/cells/spokes are hidden until the first Run. Resets whenever the
  // problem changes so each new dataset / k / init starts from a clean slate.
  const [hasRun, setHasRun] = useState(false);
  // Intro modal opens on mount; user must dismiss to interact with the canvas.
  const [introOpen, setIntroOpen] = useState(true);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Cancel any running playback and clear hasRun. Invoked from each handler
  // that mutates the inputs (dataset, k, centroidSeed, sketch points), instead
  // of using an effect — keeps reset side effects out of the render loop.
  const resetPlayback = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setPlayStep(null);
    setHasRun(false);
  };

  const runAnimation = () => {
    if (!hasFit || frames.length < 2) return;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    setHasRun(true);
    setPlayStep(0);
    const start = performance.now();
    // ~700ms per Lloyd iteration so the glide is readable but not slow.
    const duration = Math.max(1200, 700 * lastFrame);
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const step = t * lastFrame;
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

  // Resolve the displayed state from the current playStep (or the settled
  // final frame). Centroids interpolate; assignments are recomputed from the
  // interpolated centroids so points "switch teams" smoothly mid-animation.
  const displayedStep = playStep ?? lastFrame;
  const lo = Math.floor(displayedStep);
  const hi = Math.min(lo + 1, lastFrame);
  const alpha = displayedStep - lo;
  const displayedCentroids: Centroid[] = useMemo(() => {
    const a = frames[lo]?.centroids ?? initial;
    const b = frames[hi]?.centroids ?? a;
    return a.map((ca, i) => ({
      x: lerp(ca.x, b[i]?.x ?? ca.x, alpha),
      y: lerp(ca.y, b[i]?.y ?? ca.y, alpha),
    }));
  }, [frames, lo, hi, alpha, initial]);
  const displayedAssignments = useMemo(
    () => points.map((p) => nearestCentroidIdx(p, displayedCentroids)),
    [points, displayedCentroids],
  );
  const displayedInertia = useMemo(() => {
    let s = 0;
    for (let i = 0; i < points.length; i++) {
      const c = displayedCentroids[displayedAssignments[i]];
      const dx = points[i].x - c.x;
      const dy = points[i].y - c.y;
      s += dx * dx + dy * dy;
    }
    return s;
  }, [points, displayedCentroids, displayedAssignments]);
  const displayedIter = isPlaying ? Math.floor(displayedStep) : lastFrame;

  // ----- Canvas drawing -----
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  // Voronoi cells depend only on centroid positions + size + showCells.
  // During animation, centroids change every frame, so the cache invalidates
  // each frame — but during settled state and idle interaction it's reused.
  const cellsCacheRef = useRef<{
    canvas: HTMLCanvasElement | null;
    centroids: Centroid[] | null;
    show: boolean;
    w: number;
    h: number;
  }>({ canvas: null, centroids: null, show: false, w: 0, h: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const ensureCells = (w: number, h: number) => {
      const cache = cellsCacheRef.current;
      const fresh =
        cache.canvas &&
        cache.centroids === displayedCentroids &&
        cache.show === showCells &&
        cache.w === w &&
        cache.h === h;
      if (fresh) return cache.canvas;

      const off = cache.canvas ?? document.createElement("canvas");
      off.width = Math.max(1, Math.round(w * dpr));
      off.height = Math.max(1, Math.round(h * dpr));
      const offCtx = off.getContext("2d");
      if (!offCtx) return null;
      offCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      offCtx.clearRect(0, 0, w, h);
      if (showCells && displayedCentroids.length > 0) {
        const cols = Math.ceil(w / CELL);
        const rows = Math.ceil(h / CELL);
        for (let cx = 0; cx < cols; cx++) {
          for (let cy = 0; cy < rows; cy++) {
            const px = (cx + 0.5) * CELL;
            const py = (cy + 0.5) * CELL;
            const idx = nearestCentroidIdx(
              { x: px / w, y: py / h },
              displayedCentroids,
            );
            const color = CLUSTER_COLORS[idx % CLUSTER_COLORS.length];
            offCtx.fillStyle = `${color}1F`; // ~12% alpha hex
            offCtx.fillRect(cx * CELL, cy * CELL, CELL, CELL);
          }
        }
      }
      cellsCacheRef.current = {
        canvas: off,
        centroids: displayedCentroids,
        show: showCells,
        w,
        h,
      };
      return off;
    };

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

      // Cells, spokes, colored points, and centroids are gated on `hasRun`.
      // Before the first Run the canvas shows raw, unlabelled data.
      if (hasRun) {
        const off = ensureCells(w, h);
        if (off && showCells) ctx.drawImage(off, 0, 0, w, h);

        // Spokes from each point to its centroid.
        if (showSpokes && displayedCentroids.length > 0) {
          for (let i = 0; i < points.length; i++) {
            const c = displayedCentroids[displayedAssignments[i]];
            if (!c) continue;
            const color = CLUSTER_COLORS[displayedAssignments[i] % CLUSTER_COLORS.length];
            ctx.strokeStyle = `${color}55`; // ~33% alpha
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(points[i].x * w, points[i].y * h);
            ctx.lineTo(c.x * w, c.y * h);
            ctx.stroke();
          }
        }
      }

      // Training points — colored by assignment after Run, neutral gray before.
      for (let i = 0; i < points.length; i++) {
        const color = hasRun
          ? CLUSTER_COLORS[displayedAssignments[i] % CLUSTER_COLORS.length]
          : "#71717a";
        ctx.beginPath();
        ctx.arc(points[i].x * w, points[i].y * h, 5, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      // Centroid markers — only after Run.
      if (hasRun) {
        for (let i = 0; i < displayedCentroids.length; i++) {
          const c = displayedCentroids[i];
          const color = CLUSTER_COLORS[i % CLUSTER_COLORS.length];
          const cx = c.x * w;
          const cy = c.y * h;
          const r = 8;
          ctx.beginPath();
          ctx.moveTo(cx, cy - r);
          ctx.lineTo(cx + r, cy);
          ctx.lineTo(cx, cy + r);
          ctx.lineTo(cx - r, cy);
          ctx.closePath();
          ctx.fillStyle = color;
          ctx.fill();
          ctx.strokeStyle = "#0a0a0a";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [
    points,
    displayedCentroids,
    displayedAssignments,
    showCells,
    showSpokes,
    hasRun,
  ]);

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
        const dx = x - sketchPoints[i].x;
        const dy = y - sketchPoints[i].y;
        const d = Math.hypot(dx, dy);
        if (d < bestD) {
          bestD = d;
          bestIdx = i;
        }
      }
      if (bestIdx >= 0) {
        resetPlayback();
        setSketchPoints((pts) => pts.slice(0, bestIdx).concat(pts.slice(bestIdx + 1)));
      }
    } else {
      resetPlayback();
      setSketchPoints((pts) => [...pts, { x, y }]);
    }
  };

  const handleDatasetChange = (id: DatasetId) => {
    if (id === dataset) return;
    resetPlayback();
    setDataset(id);
  };
  const handleKChange = (v: number) => {
    if (v === k) return;
    resetPlayback();
    setK(v);
  };
  const reshuffle = () => {
    resetPlayback();
    setSeed((s) => s + 1);
    setCentroidSeed((c) => c + 1);
  };
  const reseedCentroids = () => {
    resetPlayback();
    setCentroidSeed((c) => c + 1);
  };

  return (
    <div className="flex flex-col bg-white text-zinc-950">
      <div className="flex flex-col lg:min-h-screen">
        <Header active="Techniques" />
        <div className="border-b border-zinc-100 px-4 pt-6 pb-4 sm:px-8 md:px-14 md:pt-7 md:pb-[18px]">
          <div className="font-mono text-xs uppercase tracking-[0.06em] text-zinc-500">
            <Link href="/techniques" className="hover:text-zinc-900">
              Techniques
            </Link>{" "}
            · Unsupervised · <span className="text-zinc-950">k-Means Clustering</span>
          </div>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <h1 className="text-[28px] font-semibold tracking-[-0.025em] sm:text-[32px] lg:text-[38px]">
              k-Means Clustering
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
                onClick={reseedCentroids}
                disabled={isPlaying}
                className="pill pill-outline hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
                type="button"
              >
                ↺ New centroids
              </button>
              <button
                onClick={reshuffle}
                disabled={isPlaying || isSketch}
                className="pill pill-outline hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
                type="button"
              >
                Reshuffle
              </button>
              <button
                onClick={runAnimation}
                disabled={!hasFit || isPlaying}
                className="pill pill-solid hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
                type="button"
              >
                {isPlaying
                  ? `Running… ${displayedIter}/${lastFrame}`
                  : "Run ▶"}
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
                    ? `awaiting points (need ≥ ${k})`
                    : !hasRun
                    ? `STATE  ·  ${points.length} points  ·  k = ${k}  ·  press Run`
                    : `STATE  ·  iter ${displayedIter}/${lastFrame}  ·  k = ${k}`}
                </span>
                <span
                  className={
                    isPlaying
                      ? "font-mono text-[11px] text-violet-600"
                      : !hasRun
                      ? "font-mono text-[11px] text-zinc-400"
                      : converged
                      ? "font-mono text-[11px] text-emerald-500"
                      : "font-mono text-[11px] text-zinc-400"
                  }
                >
                  {!hasFit
                    ? "—"
                    : !hasRun
                    ? "○ ready"
                    : isPlaying
                    ? "▶ running"
                    : converged
                    ? "✓ converged"
                    : "… max iters"}
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
                    : "press Run to play Lloyd's algorithm · New centroids to re-init"}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[14px] border border-zinc-200 bg-zinc-100 sm:grid-cols-4">
              <Stat label="k" value={String(k)} />
              <Stat label="iter" value={hasFit && hasRun ? String(displayedIter) : "—"} />
              <Stat
                label={
                  <>
                    inertia
                    <InfoTooltip {...glossary.inertia} placement="top" />
                  </>
                }
                value={hasFit && hasRun ? displayedInertia.toFixed(3) : "—"}
              />
              <Stat
                label="status"
                value={
                  !hasFit
                    ? "—"
                    : !hasRun
                    ? "ready"
                    : isPlaying
                    ? "running"
                    : converged
                    ? "converged"
                    : "max iters"
                }
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

            {isSketch && (
              <SidebarSection title={`Points · ${sketchPoints.length}`}>
                <p className="text-[12px] leading-[1.5] text-zinc-500">
                  Click anywhere on the plot to drop a point. Shift+click removes the closest one.
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
            )}

            <SidebarSection
              title={
                <>
                  Clusters
                  <InfoTooltip {...glossary.kmeansK} side="left" />
                  {` · k = ${k}`}
                </>
              }
            >
              <RangeSlider
                value={k}
                min={2}
                max={8}
                step={1}
                onChange={handleKChange}
                accent
              />
              <ScaleLabel min="2" max="8" />
              <p className="text-[11px] leading-[1.5] text-zinc-500">
                {dataset !== "sketch" && (
                  <>
                    True clusters in this dataset:{" "}
                    <span className="font-mono">{kmeansDatasets[dataset].trueK}</span>.
                  </>
                )}
              </p>
            </SidebarSection>

            <SidebarSection title="Display">
              <Toggle label="Voronoi cells" on={showCells} onChange={setShowCells} />
              <Toggle label="Spokes" on={showSpokes} onChange={setShowSpokes} />
            </SidebarSection>

            <SidebarSection
              title={
                <>
                  The math
                  <InfoTooltip {...glossary.lloyds} side="left" />
                </>
              }
            >
              <div className="rounded-lg border border-zinc-100 bg-stone-50 p-3 font-mono text-xs leading-[1.7] text-zinc-800">
                aᵢ = argmin<sub>j</sub> ‖xᵢ − μⱼ‖²
                <br />
                μⱼ = mean( xᵢ : aᵢ = j )
                <br />
                J = Σᵢ ‖xᵢ − μ<sub>aᵢ</sub>‖²
              </div>
            </SidebarSection>

            <SidebarSection
              title={
                <>
                  Centroids
                  <InfoTooltip {...glossary.centroid} side="left" />
                </>
              }
            >
              <p className="text-[11px] leading-[1.5] text-zinc-500">
                Diamond markers on the canvas. They start at random training points and move toward
                the mean of whatever cluster they own each step.
              </p>
            </SidebarSection>
          </aside>
        </div>
      </div>

      <IntroModal
        open={introOpen}
        onClose={() => setIntroOpen(false)}
        kicker="§ k-Means Clustering"
        title="Two steps, repeated until nothing moves."
        slides={KMEANS_SLIDES}
      />
    </div>
  );
}

// ---------- Intro modal slides ----------

// 3 hand-shaped clusters with their "true" assignment for the illustrations.
const KM_DEMO: { x: number; y: number; c: 0 | 1 | 2 }[] = [
  { x: 65, y: 45, c: 0 }, { x: 80, y: 55, c: 0 }, { x: 60, y: 65, c: 0 },
  { x: 75, y: 35, c: 0 }, { x: 90, y: 50, c: 0 }, { x: 50, y: 50, c: 0 },
  { x: 235, y: 50, c: 1 }, { x: 250, y: 65, c: 1 }, { x: 220, y: 60, c: 1 },
  { x: 245, y: 40, c: 1 }, { x: 260, y: 55, c: 1 }, { x: 230, y: 75, c: 1 },
  { x: 150, y: 110, c: 2 }, { x: 165, y: 120, c: 2 }, { x: 135, y: 115, c: 2 },
  { x: 175, y: 105, c: 2 }, { x: 145, y: 100, c: 2 }, { x: 160, y: 95, c: 2 },
];
const KM_PALETTE = ["#7c3aed", "#ea580c", "#0891b2"];

function diamond(cx: number, cy: number, color: string, key?: string | number) {
  const r = 7;
  return (
    <polygon
      key={key}
      points={`${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`}
      fill={color}
      stroke="#0a0a0a"
      strokeWidth="1.2"
    />
  );
}

function IllustPlace() {
  // Centroids dropped at random positions — points still grey (unassigned).
  const cents = [
    { x: 50, y: 30 }, { x: 200, y: 30 }, { x: 110, y: 130 },
  ];
  return (
    <svg viewBox="0 0 320 150" className="block h-auto w-full" aria-hidden>
      {KM_DEMO.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3.5} fill="#71717a" stroke="#fff" strokeWidth="1" />
      ))}
      {cents.map((c, i) => diamond(c.x, c.y, KM_PALETTE[i], i))}
      <text x="20" y="146" fontSize="10" fill="#71717a" fontFamily="ui-monospace, monospace">
        random init · k = 3
      </text>
    </svg>
  );
}

function IllustAssign() {
  // Same random centroids, points colored by nearest centroid.
  const cents = [
    { x: 50, y: 30 }, { x: 200, y: 30 }, { x: 110, y: 130 },
  ];
  const assigned = KM_DEMO.map((p) => {
    let best = 0;
    let bestD = Infinity;
    cents.forEach((c, i) => {
      const d = (p.x - c.x) ** 2 + (p.y - c.y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    return best;
  });
  return (
    <svg viewBox="0 0 320 150" className="block h-auto w-full" aria-hidden>
      {KM_DEMO.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={3.5}
          fill={KM_PALETTE[assigned[i]]}
          stroke="#fff"
          strokeWidth="1"
        />
      ))}
      {cents.map((c, i) => diamond(c.x, c.y, KM_PALETTE[i], i))}
    </svg>
  );
}

function IllustMove() {
  // Show centroids gliding from random init → cluster mean (arrow trails).
  const oldCents = [
    { x: 50, y: 30 }, { x: 200, y: 30 }, { x: 110, y: 130 },
  ];
  const newCents = [
    { x: 70, y: 50 }, { x: 240, y: 57 }, { x: 155, y: 108 },
  ];
  return (
    <svg viewBox="0 0 320 150" className="block h-auto w-full" aria-hidden>
      {KM_DEMO.map((p) => (
        <circle key={`${p.x}-${p.y}`} cx={p.x} cy={p.y} r={3.5} fill={KM_PALETTE[p.c]} stroke="#fff" strokeWidth="1" />
      ))}
      {oldCents.map((o, i) => (
        <line key={`a${i}`} x1={o.x} y1={o.y} x2={newCents[i].x} y2={newCents[i].y} stroke="#52525b" strokeWidth="1" strokeDasharray="3 3" markerEnd="url(#km-arrow)" />
      ))}
      <defs>
        <marker id="km-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0 0 L6 3 L0 6 z" fill="#52525b" />
        </marker>
      </defs>
      {oldCents.map((o, i) => (
        <circle key={`o${i}`} cx={o.x} cy={o.y} r={4} fill="none" stroke={KM_PALETTE[i]} strokeWidth="1" opacity={0.4} />
      ))}
      {newCents.map((c, i) => diamond(c.x, c.y, KM_PALETTE[i], i))}
    </svg>
  );
}

function IllustRepeat() {
  // Three mini snapshots showing convergence.
  const frames = [
    { cents: [{ x: 50, y: 30 }, { x: 200, y: 30 }, { x: 110, y: 130 }] },
    { cents: [{ x: 60, y: 40 }, { x: 230, y: 50 }, { x: 145, y: 115 }] },
    { cents: [{ x: 70, y: 50 }, { x: 245, y: 55 }, { x: 155, y: 108 }] },
  ];
  // Render three side-by-side mini-canvases.
  return (
    <svg viewBox="0 0 320 150" className="block h-auto w-full" aria-hidden>
      {frames.map((frame, fi) => {
        const ox = fi * 110;
        const scale = 0.32;
        return (
          <g key={fi} transform={`translate(${ox}, 0)`}>
            <rect x={3} y={3} width={104} height={130} fill="#fff" stroke="#e4e4e7" rx={6} />
            {KM_DEMO.map((p, i) => (
              <circle
                key={i}
                cx={5 + p.x * scale}
                cy={5 + p.y * scale}
                r={1.8}
                fill={KM_PALETTE[p.c]}
              />
            ))}
            {frame.cents.map((c, i) => (
              <polygon
                key={`c${i}`}
                points={`${5 + c.x * scale},${5 + c.y * scale - 4} ${5 + c.x * scale + 4},${5 + c.y * scale} ${5 + c.x * scale},${5 + c.y * scale + 4} ${5 + c.x * scale - 4},${5 + c.y * scale}`}
                fill={KM_PALETTE[i]}
                stroke="#0a0a0a"
                strokeWidth="0.8"
              />
            ))}
            <text x={6} y={142} fontSize="9" fill="#71717a" fontFamily="ui-monospace, monospace">
              iter {fi}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

const KMEANS_SLIDES: React.ReactNode[] = [
  <p key="intro" className="text-[15px] leading-[1.7] text-zinc-700">
    k-Means is unsupervised — there are no labels to learn from. The algorithm hallucinates a
    structure by alternating between two cheap operations until they stop disagreeing with each
    other.
  </p>,
  <IntroSlide
    key="step1"
    n="01"
    title="Place k centroids"
    illustration={<IllustPlace />}
    body={
      <>
        Pick <span className="font-mono">k</span> starting points — usually a random sample from
        the data (Forgy initialization). The choice matters: bad starts can land in bad local
        minima.
      </>
    }
  />,
  <IntroSlide
    key="step2"
    n="02"
    title="Assign every point"
    illustration={<IllustAssign />}
    body={
      <>
        For each data point, find the nearest centroid and tag it with that cluster index. The
        plane is now partitioned into a Voronoi diagram with <em>k</em> cells.
      </>
    }
  />,
  <IntroSlide
    key="step3"
    n="03"
    title="Move each centroid"
    illustration={<IllustMove />}
    body={
      <>
        Compute the mean position of every cluster&apos;s assigned points and snap each centroid
        to that mean. The Voronoi boundary shifts in response.
      </>
    }
  />,
  <IntroSlide
    key="step4"
    n="04"
    title="Repeat — guaranteed to converge"
    illustration={<IllustRepeat />}
    body={
      <>
        Each iteration is guaranteed to lower (or hold) the inertia. When no point switches
        clusters, the algorithm halts. Usually 5–15 iterations on tidy data.
      </>
    }
  />,
  <div key="try" className="text-[15px] leading-[1.7] text-zinc-700">
    <p>
      Try it: pick three clusters, hit Run. Watch the diamonds glide to the mean of their cluster
      while the Voronoi cells reshape underneath. The inertia stat ticks downward every step until
      the algorithm runs out of work.
    </p>
  </div>,
];

// ---------- Sidebar primitives ----------

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
