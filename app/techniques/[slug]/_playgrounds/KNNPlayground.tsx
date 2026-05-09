"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Header } from "../../../_components/Header";
import { InfoTooltip } from "../../../_components/InfoTooltip";
import { IntroModal, IntroSlide } from "../../../_components/IntroModal";
import { glossary } from "../../../_lib/glossary";
import {
  type DatasetId,
  type DistanceMetric,
  type LabeledPoint,
  knnDatasets,
  looAccuracy,
  predictKNN,
} from "../../../_lib/knn";

const ACCENT = "#7c3aed"; // class A
const WARN = "#ea580c"; // class B
const CELL = 14;

const DATASET_PICKER: { id: DatasetId; label: string }[] = [
  { id: "blobs", label: knnDatasets.blobs.label },
  { id: "moons", label: knnDatasets.moons.label },
  { id: "spiral", label: knnDatasets.spiral.label },
  { id: "sketch", label: "Draw your own  +" },
];

export function KNNPlayground() {
  const [dataset, setDataset] = useState<DatasetId>("blobs");
  const [seed, setSeed] = useState(7);
  const [k, setK] = useState(5);
  const [metric, setMetric] = useState<DistanceMetric>("euclidean");
  const [showBoundary, setShowBoundary] = useState(true);
  const [showNeighbors, setShowNeighbors] = useState(true);
  const [activeClass, setActiveClass] = useState<0 | 1>(0);
  const [sketchPoints, setSketchPoints] = useState<LabeledPoint[]>([]);
  const [query, setQuery] = useState({ x: 0.5, y: 0.5 });
  const draggingRef = useRef(false);
  const [introOpen, setIntroOpen] = useState(true);

  const points = useMemo<LabeledPoint[]>(() => {
    if (dataset === "sketch") return sketchPoints;
    return knnDatasets[dataset].generate(seed);
  }, [dataset, sketchPoints, seed]);

  const isSketch = dataset === "sketch";
  const hasFit = points.length >= 1;

  // k can't exceed the number of points; clamp the max for the slider.
  const effectiveK = Math.min(k, Math.max(1, points.length));
  const accuracy = useMemo(
    () => looAccuracy(points, effectiveK, metric),
    [points, effectiveK, metric],
  );
  const queryResult = useMemo(
    () => predictKNN(points, query.x, query.y, effectiveK, metric),
    [points, query.x, query.y, effectiveK, metric],
  );

  // ----- Canvas drawing -----
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  // Boundary is expensive (cells × points), so render it once into an offscreen
  // canvas keyed on its inputs and blit it back on every frame. This decouples
  // the per-frame cost from the boundary's size, keeping query drag smooth.
  const boundaryCacheRef = useRef<{
    canvas: HTMLCanvasElement | null;
    points: LabeledPoint[] | null;
    k: number;
    metric: DistanceMetric;
    show: boolean;
    w: number;
    h: number;
  }>({ canvas: null, points: null, k: 0, metric: "euclidean", show: false, w: 0, h: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const ensureBoundary = (w: number, h: number) => {
      const cache = boundaryCacheRef.current;
      const fresh =
        cache.canvas &&
        cache.points === points &&
        cache.k === effectiveK &&
        cache.metric === metric &&
        cache.show === showBoundary &&
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
      if (showBoundary && points.length >= 1) {
        const cols = Math.ceil(w / CELL);
        const rows = Math.ceil(h / CELL);
        for (let cx = 0; cx < cols; cx++) {
          for (let cy = 0; cy < rows; cy++) {
            const px = (cx + 0.5) * CELL;
            const py = (cy + 0.5) * CELL;
            const { cls } = predictKNN(points, px / w, py / h, effectiveK, metric);
            if (cls === -1) continue;
            offCtx.fillStyle =
              cls === 0 ? "rgba(124, 58, 237, 0.10)" : "rgba(234, 88, 12, 0.10)";
            offCtx.fillRect(cx * CELL, cy * CELL, CELL, CELL);
          }
        }
      }
      boundaryCacheRef.current = {
        canvas: off,
        points,
        k: effectiveK,
        metric,
        show: showBoundary,
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

      // Boundary: cached, blit at logical-pixel size.
      const off = ensureBoundary(w, h);
      if (off && showBoundary) ctx.drawImage(off, 0, 0, w, h);

      // Neighbor links (dashed) from query point to its k closest.
      if (showNeighbors && queryResult.neighbors.length > 0) {
        ctx.strokeStyle = "#52525b";
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        for (const nb of queryResult.neighbors) {
          ctx.beginPath();
          ctx.moveTo(query.x * w, query.y * h);
          ctx.lineTo(nb.x * w, nb.y * h);
          ctx.stroke();
        }
        ctx.setLineDash([]);
      }

      // Training points.
      for (const p of points) {
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, 5.5, 0, Math.PI * 2);
        ctx.fillStyle = p.c === 0 ? ACCENT : WARN;
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Highlight ring on each chosen neighbor.
      if (showNeighbors) {
        for (const nb of queryResult.neighbors) {
          ctx.beginPath();
          ctx.arc(nb.x * w, nb.y * h, 9, 0, Math.PI * 2);
          ctx.strokeStyle = nb.c === 0 ? ACCENT : WARN;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }

      // Query point — open ring colored by predicted class.
      ctx.beginPath();
      ctx.arc(query.x * w, query.y * h, 9, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();
      ctx.strokeStyle =
        queryResult.cls === 0 ? ACCENT : queryResult.cls === 1 ? WARN : "#a1a1aa";
      ctx.lineWidth = 2.5;
      ctx.stroke();
      // Crosshair inside.
      ctx.strokeStyle = "#a1a1aa";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(query.x * w - 4, query.y * h);
      ctx.lineTo(query.x * w + 4, query.y * h);
      ctx.moveTo(query.x * w, query.y * h - 4);
      ctx.lineTo(query.x * w, query.y * h + 4);
      ctx.stroke();
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [points, effectiveK, metric, showBoundary, showNeighbors, query, queryResult]);

  // ----- Pointer interaction -----
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    // Drag the query if the click is on (or very near) it.
    const qDist = Math.hypot(x - query.x, y - query.y);
    if (qDist < 0.04) {
      draggingRef.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    if (isSketch) {
      if (e.shiftKey) {
        setSketchPoints((pts) => {
          let bestIdx = -1;
          let bestD = 0.04;
          for (let i = 0; i < pts.length; i++) {
            const d = Math.hypot(x - pts[i].x, y - pts[i].y);
            if (d < bestD) {
              bestD = d;
              bestIdx = i;
            }
          }
          if (bestIdx < 0) return pts;
          const next = pts.slice();
          next.splice(bestIdx, 1);
          return next;
        });
      } else {
        setSketchPoints((pts) => [...pts, { x, y, c: activeClass }]);
      }
    } else {
      // Anywhere else → move the query point there and start dragging.
      setQuery({ x, y });
      draggingRef.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!draggingRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    setQuery({ x, y });
  };

  const onPointerUp = () => {
    draggingRef.current = false;
  };

  const reshuffle = () => {
    if (isSketch) setSketchPoints([]);
    else setSeed((s) => s + 1);
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
            · Supervised · <span className="text-zinc-950">k-Nearest Neighbors</span>
          </div>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <h1 className="text-[28px] font-semibold tracking-[-0.025em] sm:text-[32px] lg:text-[38px]">
              k-Nearest Neighbors
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
                className="pill pill-solid hover:bg-zinc-800"
                type="button"
              >
                {isSketch ? "Clear sketch" : "Reshuffle ⤴"}
              </button>
            </div>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[400px_1fr]">
          <main className="order-1 flex min-w-0 flex-col gap-[18px] p-4 sm:p-6 lg:order-2 lg:p-7">
            <div className="flex max-h-[960px] flex-1 flex-col overflow-hidden rounded-[14px] border border-zinc-200">
              <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
                <span className="font-mono text-[11px] tracking-[0.04em] text-zinc-500">
                  {hasFit
                    ? `QUERY  ·  (${query.x.toFixed(2)}, ${query.y.toFixed(2)})  →  class `
                    : "QUERY  ·  awaiting points"}
                  {hasFit && (
                    <span
                      style={{
                        color:
                          queryResult.cls === 0
                            ? ACCENT
                            : queryResult.cls === 1
                            ? WARN
                            : "#a1a1aa",
                      }}
                    >
                      {queryResult.cls === 0
                        ? "A"
                        : queryResult.cls === 1
                        ? "B"
                        : "—"}
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-3 font-mono text-[11px] text-zinc-500">
                  <span>
                    {points.length} pts · k = {effectiveK}
                  </span>
                </div>
              </div>
              <div ref={wrapRef} className="relative min-h-[320px] flex-1">
                <canvas
                  ref={canvasRef}
                  className={`block h-full w-full touch-none ${
                    isSketch ? "cursor-crosshair" : "cursor-pointer"
                  }`}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerUp}
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 px-3 py-2 text-center font-mono text-[10px] uppercase tracking-[0.06em] text-zinc-400">
                  {isSketch
                    ? "click to add point · shift+click to remove · drag the open ring"
                    : "click anywhere to move the query · drag for live boundary feedback"}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[14px] border border-zinc-200 bg-zinc-100 sm:grid-cols-4">
              <Stat
                label={
                  <>
                    LOO acc
                    <InfoTooltip {...glossary.looAccuracy} placement="top" />
                  </>
                }
                value={accuracy === null ? "—" : `${(accuracy * 100).toFixed(0)}%`}
              />
              <Stat label="k" value={String(effectiveK)} />
              <Stat label="metric" value={metric === "euclidean" ? "L²" : "L¹"} />
              <Stat
                label="query pred"
                value={
                  queryResult.cls === -1
                    ? "—"
                    : queryResult.cls === 0
                    ? "A"
                    : "B"
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
                  onClick={() => setDataset(id)}
                />
              ))}
            </SidebarSection>

            {isSketch && (
              <SidebarSection title={`Drop class · ${sketchPoints.length} pts`}>
                <div className="grid grid-cols-2 gap-1.5">
                  <ClassChip
                    label="A"
                    color={ACCENT}
                    active={activeClass === 0}
                    onClick={() => setActiveClass(0)}
                  />
                  <ClassChip
                    label="B"
                    color={WARN}
                    active={activeClass === 1}
                    onClick={() => setActiveClass(1)}
                  />
                </div>
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
                  Neighbors
                  <InfoTooltip {...glossary.k} side="left" />
                  {` · k = ${effectiveK}`}
                </>
              }
            >
              <RangeSlider
                value={k}
                min={1}
                max={21}
                step={2}
                onChange={setK}
                accent
              />
              <ScaleLabel min="1" max="21" />
              <p className="text-[11px] leading-[1.5] text-zinc-500">
                Odd values avoid ties.{" "}
                <span className="font-mono">
                  k ≈ √n = {Math.round(Math.sqrt(Math.max(1, points.length)))}
                </span>{" "}
                is a common starting heuristic.
              </p>
            </SidebarSection>

            <SidebarSection
              title={
                <>
                  Distance metric
                  <InfoTooltip {...glossary.distanceMetric} side="left" />
                </>
              }
            >
              <div className="grid grid-cols-2 gap-1.5">
                {(["euclidean", "manhattan"] as DistanceMetric[]).map((m) => {
                  const active = metric === m;
                  return (
                    <button
                      key={m}
                      onClick={() => setMetric(m)}
                      className={`pill justify-center px-2 py-1.5 text-[11.5px] ${
                        active ? "pill-solid" : "pill-outline hover:bg-zinc-50"
                      }`}
                    >
                      {m === "euclidean" ? "Euclidean" : "Manhattan"}
                    </button>
                  );
                })}
              </div>
            </SidebarSection>

            <SidebarSection title="Display">
              <Toggle
                label={
                  <>
                    Decision boundary
                    <InfoTooltip {...glossary.decisionBoundary} side="left" />
                  </>
                }
                on={showBoundary}
                onChange={setShowBoundary}
              />
              <Toggle
                label="Neighbor links"
                on={showNeighbors}
                onChange={setShowNeighbors}
              />
            </SidebarSection>

            <SidebarSection title="The math">
              <div className="rounded-lg border border-zinc-100 bg-stone-50 p-3 font-mono text-xs leading-[1.7] text-zinc-800">
                d(x, p) = ‖x − p‖
                <br />
                N_k(x) = k closest training points
                <br />
                ŷ(x) = mode( yᵢ : pᵢ ∈ N_k(x) )
              </div>
            </SidebarSection>
          </aside>
        </div>
      </div>

      <IntroModal
        open={introOpen}
        onClose={() => setIntroOpen(false)}
        kicker="§ k-Nearest Neighbors"
        title="The lazy classifier."
        slides={KNN_SLIDES}
      />
    </div>
  );
}

// ---------- Intro modal slides ----------

// Reused two-class scatter for the kNN illustrations. (x, y, class)
const KNN_DEMO: [number, number, 0 | 1][] = [
  [60, 100, 0], [85, 115, 0], [70, 80, 0], [50, 70, 0], [95, 95, 0],
  [110, 65, 0], [80, 55, 0], [130, 100, 0],
  [220, 50, 1], [240, 70, 1], [210, 85, 1], [255, 45, 1], [200, 60, 1],
  [275, 75, 1], [260, 95, 1], [225, 30, 1],
];
const KNN_QUERY: [number, number] = [165, 75];
const KNN_CLR_A = "#7c3aed";
const KNN_CLR_B = "#ea580c";

function knnDots(highlightK: number = 0, withDistances: boolean = false) {
  // Sort by distance to highlight nearest k.
  const sorted = KNN_DEMO.map((p, i) => ({
    p,
    i,
    d: Math.hypot(p[0] - KNN_QUERY[0], p[1] - KNN_QUERY[1]),
  })).sort((a, b) => a.d - b.d);
  const highlightIdx = new Set(sorted.slice(0, highlightK).map((s) => s.i));
  return (
    <>
      {withDistances &&
        KNN_DEMO.map(([x, y], i) => (
          <line
            key={`d${i}`}
            x1={KNN_QUERY[0]}
            y1={KNN_QUERY[1]}
            x2={x}
            y2={y}
            stroke="#a1a1aa"
            strokeWidth="0.5"
            opacity={0.6}
          />
        ))}
      {highlightK > 0 &&
        sorted.slice(0, highlightK).map((s, i) => (
          <line
            key={`h${i}`}
            x1={KNN_QUERY[0]}
            y1={KNN_QUERY[1]}
            x2={s.p[0]}
            y2={s.p[1]}
            stroke="#52525b"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
        ))}
      {KNN_DEMO.map(([x, y, c], i) => (
        <g key={i}>
          {highlightIdx.has(i) && (
            <circle cx={x} cy={y} r={7.5} fill="none" stroke={c === 0 ? KNN_CLR_A : KNN_CLR_B} strokeWidth="1.5" />
          )}
          <circle cx={x} cy={y} r={4} fill={c === 0 ? KNN_CLR_A : KNN_CLR_B} stroke="#fff" strokeWidth="1" />
        </g>
      ))}
    </>
  );
}

function knnQuery(predictedClass: 0 | 1 | -1 = -1) {
  const stroke = predictedClass === 0 ? KNN_CLR_A : predictedClass === 1 ? KNN_CLR_B : "#71717a";
  return (
    <g>
      <circle cx={KNN_QUERY[0]} cy={KNN_QUERY[1]} r={8} fill="#fff" stroke={stroke} strokeWidth="2.5" />
      <line x1={KNN_QUERY[0] - 3} y1={KNN_QUERY[1]} x2={KNN_QUERY[0] + 3} y2={KNN_QUERY[1]} stroke="#71717a" strokeWidth="1" />
      <line x1={KNN_QUERY[0]} y1={KNN_QUERY[1] - 3} x2={KNN_QUERY[0]} y2={KNN_QUERY[1] + 3} stroke="#71717a" strokeWidth="1" />
    </g>
  );
}

function IllustQuery() {
  return (
    <svg viewBox="0 0 320 150" className="block h-auto w-full" aria-hidden>
      {knnDots()}
      {knnQuery()}
    </svg>
  );
}

function IllustDistances() {
  return (
    <svg viewBox="0 0 320 150" className="block h-auto w-full" aria-hidden>
      {knnDots(0, true)}
      {knnQuery()}
    </svg>
  );
}

function IllustNearestK() {
  return (
    <svg viewBox="0 0 320 150" className="block h-auto w-full" aria-hidden>
      {knnDots(5)}
      {knnQuery()}
    </svg>
  );
}

function IllustVote() {
  // Show 5 dots in a row representing the k votes, with a tally arrow.
  return (
    <svg viewBox="0 0 320 150" className="block h-auto w-full" aria-hidden>
      <text x="20" y="32" fontSize="11" fill="#71717a" fontFamily="ui-monospace, monospace">k = 5 closest</text>
      {[KNN_CLR_A, KNN_CLR_A, KNN_CLR_B, KNN_CLR_A, KNN_CLR_B].map((c, i) => (
        <circle key={i} cx={40 + i * 28} cy={62} r={8} fill={c} stroke="#fff" strokeWidth="1.5" />
      ))}
      <text x="20" y="98" fontSize="11" fill="#71717a" fontFamily="ui-monospace, monospace">
        tally:  A × 3  ·  B × 2
      </text>
      <text x="20" y="124" fontSize="13" fill={KNN_CLR_A} fontFamily="ui-monospace, monospace">
        → predict A
      </text>
    </svg>
  );
}

const KNN_SLIDES: React.ReactNode[] = [
  <p key="intro" className="text-[15px] leading-[1.7] text-zinc-700">
    k-Nearest Neighbors trains nothing. The &ldquo;model&rdquo; is just the dataset itself — when
    you ask it to classify a new point, it looks up the{" "}
    <span className="font-mono">k</span> closest training points and lets them vote.
  </p>,
  <IntroSlide
    key="step1"
    n="01"
    title="Drop a query point"
    illustration={<IllustQuery />}
    body={
      <>
        The open ring on the canvas is the point being classified. Drag it anywhere — into a
        cluster, between them, or off in empty space — and the prediction updates live.
      </>
    }
  />,
  <IntroSlide
    key="step2"
    n="02"
    title="Measure distance to every training point"
    illustration={<IllustDistances />}
    body={
      <>
        For each labelled point, compute{" "}
        <span className="font-mono">d(query, p)</span>. Euclidean is the default; Manhattan
        distorts the boundary into something more axis-aligned.
      </>
    }
  />,
  <IntroSlide
    key="step3"
    n="03"
    title="Take the closest k"
    illustration={<IllustNearestK />}
    body={
      <>
        Sort by distance, keep the first <span className="font-mono">k</span>. Those are the only
        points that get a vote. Everything else is ignored — even if it&apos;s a hair beyond the
        cutoff.
      </>
    }
  />,
  <IntroSlide
    key="step4"
    n="04"
    title="Majority vote"
    illustration={<IllustVote />}
    body={
      <>
        Whichever class shows up most among the <span className="font-mono">k</span> wins. Ties
        break to the single nearest neighbor (kNN&apos;s default behaviour at{" "}
        <span className="font-mono">k = 1</span>).
      </>
    }
  />,
  <div key="try" className="text-[15px] leading-[1.7] text-zinc-700">
    <p>
      Try it: pick the spirals dataset, set <span className="font-mono">k = 1</span>, and the
      boundary shatters into shards. Slide <span className="font-mono">k</span> up to 21 and watch
      the spirals fuse into a smooth blob — the model stops seeing detail.
    </p>
  </div>,
];

// ---------- Sidebar primitives (mirrors LinearRegressionPlayground) ----------

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

function ClassChip({
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
