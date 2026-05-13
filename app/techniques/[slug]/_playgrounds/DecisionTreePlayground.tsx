"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Header } from "../../../_components/Header";
import { InfoTooltip } from "../../../_components/InfoTooltip";
import { IntroModal, IntroSlide } from "../../../_components/IntroModal";
import {
  ClassChip,
  PickerRow,
  RangeSlider,
  ScaleLabel,
  SidebarSection,
  Stat,
  Toggle,
} from "../../../_components/playground/primitives";
import { glossary } from "../../../_lib/glossary";
import {
  type BuiltTree,
  type Criterion,
  type DatasetId,
  type LabeledPoint,
  type TreeNode,
  activeSplitNodes,
  buildTree,
  trainAccuracy,
  treeDatasets,
  treeLeaves,
  visibleDepth,
} from "../../../_lib/tree";

const ACCENT = "#7c3aed"; // class A
const WARN = "#ea580c"; // class B
const FRAME_MS = 650;

const DATASET_PICKER: { id: DatasetId; label: string }[] = [
  { id: "blobs", label: treeDatasets.blobs.label },
  { id: "moons", label: treeDatasets.moons.label },
  { id: "spiral", label: treeDatasets.spiral.label },
  { id: "checker", label: treeDatasets.checker.label },
  { id: "sketch", label: "Draw your own  +" },
];

export function DecisionTreePlayground() {
  const [dataset, setDataset] = useState<DatasetId>("checker");
  const [seed, setSeed] = useState(7);
  const [maxDepth, setMaxDepth] = useState(4);
  const [minSamplesLeaf, setMinSamplesLeaf] = useState(2);
  const [criterion, setCriterion] = useState<Criterion>("gini");
  const [showRegions, setShowRegions] = useState(true);
  const [showSplits, setShowSplits] = useState(true);
  const [showPoints, setShowPoints] = useState(true);
  const [activeClass, setActiveClass] = useState<0 | 1>(0);
  const [sketchPoints, setSketchPoints] = useState<LabeledPoint[]>([]);
  const [introOpen, setIntroOpen] = useState(true);

  const points = useMemo<LabeledPoint[]>(() => {
    if (dataset === "sketch") return sketchPoints;
    return treeDatasets[dataset].generate(seed);
  }, [dataset, sketchPoints, seed]);

  const isSketch = dataset === "sketch";

  const tree: BuiltTree = useMemo(
    () => buildTree(points, { maxDepth, minSamplesLeaf, criterion }),
    [points, maxDepth, minSamplesLeaf, criterion],
  );

  // `step` counts how many splits from `tree.splitOrder` have been applied.
  // Resets to 0 (no splits visible) on every tree change so the canvas only
  // shows decision regions after the user clicks Grow or scrubs the slider.
  const [step, setStep] = useState(0);
  // Until the user explicitly grows the tree, the canvas hides regions and
  // split lines entirely — only the data points show. Mirrors KMeans's
  // hasRun gate.
  const [hasRun, setHasRun] = useState(false);
  useEffect(() => {
    setStep(0);
    setHasRun(false);
  }, [tree]);

  const safeStep = Math.max(0, Math.min(step, tree.totalSplits));
  // Effective frame for everything visualisation-driven: 0 (no splits) until
  // the user has run, regardless of where the slider sits.
  const renderStep = hasRun ? safeStep : 0;
  const leaves = useMemo(() => treeLeaves(tree, renderStep), [tree, renderStep]);
  const internals = useMemo(() => activeSplitNodes(tree, renderStep), [tree, renderStep]);
  const accuracy = useMemo(
    () => trainAccuracy(tree, renderStep, points),
    [tree, renderStep, points],
  );
  const depthShown = useMemo(() => visibleDepth(tree, renderStep), [tree, renderStep]);

  // ----- Animation -----
  const [isPlaying, setIsPlaying] = useState(false);
  const rafRef = useRef<number | null>(null);
  const tickStartRef = useRef<number | null>(null);
  const tickFromRef = useRef<number>(0);

  useEffect(() => {
    if (!isPlaying) return;
    tickStartRef.current = null;
    const loop = (ts: number) => {
      if (tickStartRef.current == null) tickStartRef.current = ts;
      const elapsed = ts - tickStartRef.current;
      const advance = Math.floor(elapsed / FRAME_MS);
      const next = tickFromRef.current + advance;
      if (next >= tree.totalSplits) {
        setStep(tree.totalSplits);
        setIsPlaying(false);
        return;
      }
      setStep(next);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, tree.totalSplits]);

  const runAnimation = () => {
    if (tree.totalSplits === 0) return;
    tickFromRef.current = 0;
    setStep(0);
    setHasRun(true);
    setIsPlaying(true);
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

      // Decision regions: one filled rect per leaf. Opacity scales with purity
      // so impure leaves read as fainter — same intuition as kNN's tinting.
      if (showRegions) {
        for (const leaf of leaves) {
          const alpha = 0.10 + 0.18 * (leaf.purity - 0.5) * 2;
          ctx.fillStyle =
            leaf.cls === 0
              ? `rgba(124, 58, 237, ${alpha.toFixed(3)})`
              : `rgba(234, 88, 12, ${alpha.toFixed(3)})`;
          ctx.fillRect(
            leaf.xmin * w,
            leaf.ymin * h,
            (leaf.xmax - leaf.xmin) * w,
            (leaf.ymax - leaf.ymin) * h,
          );
        }
      }

      // Split lines: each active internal node draws one segment within its
      // own bounding box. The line is constrained to the box so deep splits
      // don't draw across siblings' regions.
      if (showSplits) {
        ctx.strokeStyle = "#0a0a0a";
        ctx.lineWidth = 1.25;
        for (const node of internals) {
          if (!node.split) continue;
          const { feature, threshold } = node.split;
          ctx.beginPath();
          if (feature === 0) {
            const x = threshold * w;
            ctx.moveTo(x, node.ymin * h);
            ctx.lineTo(x, node.ymax * h);
          } else {
            const y = threshold * h;
            ctx.moveTo(node.xmin * w, y);
            ctx.lineTo(node.xmax * w, y);
          }
          ctx.stroke();
        }
        // Soft outline around each leaf to help it read as a region.
        ctx.strokeStyle = "rgba(10,10,10,0.04)";
        ctx.lineWidth = 1;
        for (const leaf of leaves) {
          ctx.strokeRect(
            leaf.xmin * w,
            leaf.ymin * h,
            (leaf.xmax - leaf.xmin) * w,
            (leaf.ymax - leaf.ymin) * h,
          );
        }
      }

      if (showPoints) {
        for (const p of points) {
          ctx.beginPath();
          ctx.arc(p.x * w, p.y * h, 5, 0, Math.PI * 2);
          ctx.fillStyle = p.c === 0 ? ACCENT : WARN;
          ctx.fill();
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [points, leaves, internals, showRegions, showSplits, showPoints]);

  // ----- Pointer interaction (sketch only) -----
  const onCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isSketch) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
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
  };

  const reshuffle = () => {
    if (isSketch) setSketchPoints([]);
    else setSeed((s) => s + 1);
  };

  // The Run pill is disabled when the tree is empty (e.g. sketch with one
  // class — no impurity to reduce).
  const canRun = tree.totalSplits > 0;

  return (
    <div className="flex flex-col bg-white text-zinc-950">
      <div className="flex flex-col lg:h-screen">
        <Header active="Techniques" />
        <div className="border-b border-zinc-100 px-4 pt-6 pb-4 sm:px-8 md:px-14 md:pt-7 md:pb-[18px]">
          <div className="font-mono text-xs uppercase tracking-[0.06em] text-zinc-500">
            <Link href="/techniques" className="hover:text-zinc-900">
              Techniques
            </Link>{" "}
            · Supervised · <span className="text-zinc-950">Decision Trees</span>
          </div>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <h1 className="text-[28px] font-semibold tracking-[-0.025em] sm:text-[32px] lg:text-[38px]">
              Decision Trees
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
            <div className="flex max-h-[640px] flex-1 flex-col overflow-hidden rounded-[14px] border border-zinc-200">
              <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
                <span className="font-mono text-[11px] tracking-[0.04em] text-zinc-500">
                  TREE · {tree.totalSplits === 0
                    ? "no splits available"
                    : !hasRun
                    ? `0 / ${tree.totalSplits} splits — click Grow to start`
                    : `${renderStep} / ${tree.totalSplits} splits applied`}
                </span>
                <div className="flex items-center gap-3 font-mono text-[11px] text-zinc-500">
                  <span>
                    {points.length} pts · depth {depthShown}/{maxDepth}
                  </span>
                </div>
              </div>
              <div ref={wrapRef} className="relative min-h-[320px] flex-1">
                <canvas
                  ref={canvasRef}
                  className={`block h-full w-full touch-none ${
                    isSketch ? "cursor-crosshair" : "cursor-default"
                  }`}
                  onPointerDown={onCanvasPointerDown}
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 px-3 py-2 text-center font-mono text-[10px] uppercase tracking-[0.06em] text-zinc-400">
                  {isSketch
                    ? "click to add point · shift+click to remove"
                    : "split lines partition the plane · scrub Step or click Grow"}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[14px] border border-zinc-200 bg-zinc-100 sm:grid-cols-4">
              <Stat
                label="train acc"
                value={accuracy === null ? "—" : `${(accuracy * 100).toFixed(0)}%`}
              />
              <Stat label="leaves" value={String(leaves.length)} />
              <Stat
                label={
                  <>
                    depth
                    <InfoTooltip {...glossary.maxDepth} placement="top" />
                  </>
                }
                value={`${depthShown}/${maxDepth}`}
              />
              <Stat
                label={
                  <>
                    criterion
                    <InfoTooltip {...glossary.criterion} placement="top" />
                  </>
                }
                value={criterion === "gini" ? "Gini" : "Entropy"}
              />
            </div>

            <TreeDiagram tree={tree} step={renderStep} />
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
                  Max depth
                  <InfoTooltip {...glossary.maxDepth} side="left" />
                  {` · ${maxDepth}`}
                </>
              }
            >
              <RangeSlider value={maxDepth} min={0} max={8} step={1} onChange={setMaxDepth} accent />
              <ScaleLabel min="0" max="8" />
              <p className="text-[11px] leading-[1.5] text-zinc-500">
                Higher depth fits the data more tightly. Beyond what the dataset deserves you start
                memorising noise.
              </p>
            </SidebarSection>

            <SidebarSection
              title={
                <>
                  Min samples / leaf
                  <InfoTooltip {...glossary.minSamplesLeaf} side="left" />
                  {` · ${minSamplesLeaf}`}
                </>
              }
            >
              <RangeSlider
                value={minSamplesLeaf}
                min={1}
                max={10}
                step={1}
                onChange={setMinSamplesLeaf}
                accent
              />
              <ScaleLabel min="1" max="10" />
            </SidebarSection>

            <SidebarSection
              title={
                <>
                  Criterion
                  <InfoTooltip {...glossary.criterion} side="left" />
                </>
              }
            >
              <div className="grid grid-cols-2 gap-1.5">
                {(["gini", "entropy"] as Criterion[]).map((c) => {
                  const active = criterion === c;
                  return (
                    <button
                      key={c}
                      onClick={() => setCriterion(c)}
                      className={`pill justify-center px-2 py-1.5 text-[11.5px] ${
                        active ? "pill-solid" : "pill-outline hover:bg-zinc-50"
                      }`}
                    >
                      {c === "gini" ? "Gini" : "Entropy"}
                    </button>
                  );
                })}
              </div>
            </SidebarSection>

            <SidebarSection title="Grow tree">
              <button
                onClick={runAnimation}
                disabled={!canRun || isPlaying}
                className="pill pill-solid w-full justify-center hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
                type="button"
              >
                {isPlaying ? `Growing… ${renderStep}/${tree.totalSplits}` : "Grow ▶"}
              </button>
            </SidebarSection>

            {tree.totalSplits > 0 && (
              <SidebarSection
                title={
                  <>
                    Step
                    {` · ${renderStep} / ${tree.totalSplits}`}
                  </>
                }
              >
                <RangeSlider
                  value={renderStep}
                  min={0}
                  max={tree.totalSplits}
                  step={1}
                  onChange={(v) => {
                    setIsPlaying(false);
                    setHasRun(true);
                    setStep(v);
                  }}
                />
                <p className="text-[11px] leading-[1.5] text-zinc-500">
                  Scrub to apply splits one-by-one in the order they were chosen by impurity gain.
                </p>
              </SidebarSection>
            )}

            <SidebarSection title="Display">
              <Toggle label="Decision regions" on={showRegions} onChange={setShowRegions} />
              <Toggle label="Split lines" on={showSplits} onChange={setShowSplits} />
              <Toggle label="Training points" on={showPoints} onChange={setShowPoints} />
            </SidebarSection>

            <SidebarSection title="The math">
              <div className="rounded-lg border border-zinc-100 bg-stone-50 p-3 font-mono text-xs leading-[1.7] text-zinc-800">
                {criterion === "gini" ? (
                  <>
                    Gini(t) = 1 − ∑ pₖ²
                    <br />
                  </>
                ) : (
                  <>
                    H(t) = − ∑ pₖ · log pₖ
                    <br />
                  </>
                )}
                gain = I(parent) − Σ (nₖ/n) · I(child)
                <br />
                pick (feature, threshold) with max gain
              </div>
            </SidebarSection>
          </aside>
        </div>
      </div>

      <IntroModal
        open={introOpen}
        onClose={() => setIntroOpen(false)}
        kicker="§ Decision Trees"
        title="Twenty questions for data."
        slides={DECISION_TREE_SLIDES}
      />
    </div>
  );
}

// ---------- Tree diagram ----------

type Layout = { x: number; y: number; node: TreeNode };

function layoutTree(
  tree: BuiltTree,
  step: number,
): { nodes: Layout[]; edges: { from: Layout; to: Layout }[]; depth: number; leaves: number } {
  const applied = new Set(tree.splitOrder.slice(0, step));
  const positions = new Map<number, Layout>();
  const edges: { from: Layout; to: Layout }[] = [];
  let leafCounter = 0;
  let maxDepth = 0;

  const walk = (node: TreeNode): number => {
    if (node.depth > maxDepth) maxDepth = node.depth;
    const isInternal = !!node.split && applied.has(node.id);
    if (!isInternal) {
      const x = leafCounter + 0.5;
      leafCounter += 1;
      positions.set(node.id, { x, y: node.depth, node });
      return x;
    }
    const lx = walk(node.split!.left);
    const rx = walk(node.split!.right);
    const x = (lx + rx) / 2;
    positions.set(node.id, { x, y: node.depth, node });
    return x;
  };
  walk(tree.root);

  // Collect edges after positioning so children definitely have positions.
  const collectEdges = (node: TreeNode) => {
    if (!node.split || !applied.has(node.id)) return;
    const here = positions.get(node.id)!;
    for (const child of [node.split.left, node.split.right]) {
      const c = positions.get(child.id)!;
      edges.push({ from: here, to: c });
      collectEdges(child);
    }
  };
  collectEdges(tree.root);

  return {
    nodes: Array.from(positions.values()),
    edges,
    depth: maxDepth,
    leaves: leafCounter,
  };
}

function TreeDiagram({ tree, step }: { tree: BuiltTree; step: number }) {
  const { nodes, edges, depth, leaves } = useMemo(() => layoutTree(tree, step), [tree, step]);
  const appliedIds = useMemo(() => new Set(tree.splitOrder.slice(0, step)), [tree, step]);

  if (leaves === 0) return null;

  // Reserve one slot per leaf horizontally and one row per depth level.
  const padX = 32;
  const padY = 26;
  const slotW = 78;
  const rowH = 64;
  const width = Math.max(280, leaves * slotW + padX * 2);
  const height = Math.max(120, (depth + 1) * rowH + padY * 2);

  const project = ({ x, y }: Layout) => ({
    px: padX + x * slotW,
    py: padY + y * rowH,
  });

  return (
    <div className="flex flex-col overflow-hidden rounded-[14px] border border-zinc-200">
      <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
        <span className="font-mono text-[11px] tracking-[0.04em] text-zinc-500">
          TREE STRUCTURE · {leaves} {leaves === 1 ? "leaf" : "leaves"}
        </span>
        <span className="font-mono text-[11px] text-zinc-500">depth {depth}</span>
      </div>
      <div className="overflow-x-auto bg-stone-50">
        <svg width={width} height={height} className="block" aria-hidden>
          {edges.map(({ from, to }, i) => {
            const a = project(from);
            const b = project(to);
            return (
              <line
                key={i}
                x1={a.px}
                y1={a.py}
                x2={b.px}
                y2={b.py}
                stroke="#a1a1aa"
                strokeWidth="1"
              />
            );
          })}
          {nodes.map((n) => {
            const { px, py } = project(n);
            const isInternal = !!n.node.split && appliedIds.has(n.node.id);
            const fill = n.node.cls === 0 ? ACCENT : WARN;
            const r = 11;
            if (isInternal && n.node.split) {
              const featLabel = n.node.split.feature === 0 ? "x" : "y";
              return (
                <g key={n.node.id}>
                  <circle
                    cx={px}
                    cy={py}
                    r={r}
                    fill="#fff"
                    stroke="#0a0a0a"
                    strokeWidth="1.4"
                  />
                  <text
                    x={px}
                    y={py + 4}
                    fontSize="10"
                    fontFamily="ui-monospace, monospace"
                    fill="#0a0a0a"
                    textAnchor="middle"
                  >
                    {featLabel}
                  </text>
                  <text
                    x={px}
                    y={py + r + 13}
                    fontSize="10"
                    fontFamily="ui-monospace, monospace"
                    fill="#52525b"
                    textAnchor="middle"
                  >
                    ≤ {n.node.split.threshold.toFixed(2)}
                  </text>
                </g>
              );
            }
            // Leaf
            return (
              <g key={n.node.id}>
                <circle cx={px} cy={py} r={r} fill={fill} stroke="#fff" strokeWidth="1.5" />
                <text
                  x={px}
                  y={py + 4}
                  fontSize="10"
                  fontFamily="ui-monospace, monospace"
                  fill="#fff"
                  textAnchor="middle"
                >
                  {n.node.cls === 0 ? "A" : "B"}
                </text>
                <text
                  x={px}
                  y={py + r + 13}
                  fontSize="9.5"
                  fontFamily="ui-monospace, monospace"
                  fill="#71717a"
                  textAnchor="middle"
                >
                  {n.node.pointIdx.length} · {(n.node.purity * 100).toFixed(0)}%
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// ---------- Intro modal slides ----------

const TREE_DEMO: [number, number, 0 | 1][] = [
  [55, 35, 0], [70, 40, 0], [85, 30, 0], [60, 55, 0], [80, 60, 0],
  [200, 35, 1], [220, 50, 1], [240, 30, 1], [215, 65, 1], [235, 60, 1],
  [60, 110, 1], [80, 120, 1], [70, 100, 1], [55, 125, 1],
  [210, 105, 0], [230, 115, 0], [220, 125, 0], [240, 100, 0],
];

function treeDots(highlightSplit?: { feature: 0 | 1; threshold: number; box?: { xmin: number; xmax: number; ymin: number; ymax: number } }) {
  return (
    <>
      {TREE_DEMO.map(([x, y, c], i) => (
        <circle key={i} cx={x} cy={y} r={4} fill={c === 0 ? ACCENT : WARN} stroke="#fff" strokeWidth="1" />
      ))}
      {highlightSplit && (
        highlightSplit.feature === 0 ? (
          <line
            x1={highlightSplit.threshold}
            y1={highlightSplit.box?.ymin ?? 15}
            x2={highlightSplit.threshold}
            y2={highlightSplit.box?.ymax ?? 145}
            stroke="#0a0a0a"
            strokeWidth="1.8"
            strokeDasharray="4 3"
          />
        ) : (
          <line
            x1={highlightSplit.box?.xmin ?? 30}
            y1={highlightSplit.threshold}
            x2={highlightSplit.box?.xmax ?? 290}
            y2={highlightSplit.threshold}
            stroke="#0a0a0a"
            strokeWidth="1.8"
            strokeDasharray="4 3"
          />
        )
      )}
    </>
  );
}

function IllustQuestion() {
  return (
    <svg viewBox="0 0 320 160" className="block h-auto w-full" aria-hidden>
      <rect x={20} y={15} width={280} height={130} fill="#fafafa" stroke="#e4e4e7" />
      {treeDots()}
      <text x="160" y="158" fontSize="10" fill="#71717a" fontFamily="ui-monospace, monospace" textAnchor="middle">
        which axis-aligned cut separates classes best?
      </text>
    </svg>
  );
}

function IllustFirstSplit() {
  return (
    <svg viewBox="0 0 320 160" className="block h-auto w-full" aria-hidden>
      <rect x={20} y={15} width={280} height={130} fill="#fafafa" stroke="#e4e4e7" />
      <rect x={20} y={15} width={130} height={130} fill="rgba(124,58,237,0.06)" />
      <rect x={150} y={15} width={150} height={130} fill="rgba(234,88,12,0.06)" />
      {treeDots({ feature: 0, threshold: 150 })}
      <text x="160" y="158" fontSize="10" fill="#71717a" fontFamily="ui-monospace, monospace" textAnchor="middle">
        x ≤ 150 separates left clusters from right
      </text>
    </svg>
  );
}

function IllustRecurse() {
  return (
    <svg viewBox="0 0 320 160" className="block h-auto w-full" aria-hidden>
      <rect x={20} y={15} width={280} height={130} fill="#fafafa" stroke="#e4e4e7" />
      <rect x={20} y={15} width={130} height={70} fill="rgba(124,58,237,0.10)" />
      <rect x={20} y={85} width={130} height={60} fill="rgba(234,88,12,0.10)" />
      <rect x={150} y={15} width={150} height={70} fill="rgba(234,88,12,0.10)" />
      <rect x={150} y={85} width={150} height={60} fill="rgba(124,58,237,0.10)" />
      {treeDots()}
      <line x1={150} y1={15} x2={150} y2={145} stroke="#0a0a0a" strokeWidth="1.4" />
      <line x1={20} y1={85} x2={150} y2={85} stroke="#0a0a0a" strokeWidth="1.2" strokeDasharray="3 3" />
      <line x1={150} y1={85} x2={300} y2={85} stroke="#0a0a0a" strokeWidth="1.2" strokeDasharray="3 3" />
    </svg>
  );
}

function IllustOverfit() {
  // A miniature picture of an over-grown tree: lots of tiny rectangles, each
  // chasing one stray point.
  return (
    <svg viewBox="0 0 320 160" className="block h-auto w-full" aria-hidden>
      <rect x={20} y={15} width={280} height={130} fill="#fafafa" stroke="#e4e4e7" />
      {/* Tiny over-fit cells. */}
      {[
        [20, 15, 50, 50], [70, 15, 80, 30], [70, 45, 40, 40],
        [110, 45, 40, 40], [20, 65, 50, 30], [20, 95, 70, 50],
        [90, 85, 60, 60], [150, 15, 60, 50], [210, 15, 90, 30],
        [150, 65, 90, 40], [240, 45, 60, 40], [210, 105, 90, 40],
        [150, 105, 60, 40],
      ].map(([x, y, w, h], i) => (
        <rect
          key={i}
          x={x}
          y={y}
          width={w}
          height={h}
          fill={i % 2 === 0 ? "rgba(124,58,237,0.10)" : "rgba(234,88,12,0.10)"}
          stroke="#0a0a0a"
          strokeWidth="0.5"
        />
      ))}
      {treeDots()}
      <text x="160" y="158" fontSize="10" fill="#71717a" fontFamily="ui-monospace, monospace" textAnchor="middle">
        deep enough → memorise every point
      </text>
    </svg>
  );
}

const DECISION_TREE_SLIDES: React.ReactNode[] = [
  <p key="intro" className="text-[15px] leading-[1.7] text-zinc-700">
    A decision tree is twenty questions for data. At each node it picks one feature, picks a
    threshold, and routes points left or right. Repeat on each side until each region is pure
    enough — or until you hit your depth limit.
  </p>,
  <IntroSlide
    key="step1"
    n="01"
    title="Find the most informative cut"
    illustration={<IllustQuestion />}
    body={
      <>
        For every feature and every candidate threshold, ask: how much would this split lower
        impurity? Try <span className="font-mono">x ≤ 0.32</span>,{" "}
        <span className="font-mono">y ≤ 0.7</span>, … and pick the winner.
      </>
    }
  />,
  <IntroSlide
    key="step2"
    n="02"
    title="Split on the best gain"
    illustration={<IllustFirstSplit />}
    body={
      <>
        Apply the split that drops <em>weighted child impurity</em> the most. The left side gets
        every point with feature ≤ threshold; the right side gets the rest.
      </>
    }
  />,
  <IntroSlide
    key="step3"
    n="03"
    title="Recurse — each side is a new problem"
    illustration={<IllustRecurse />}
    body={
      <>
        Run the same routine on the two children, ignoring everything outside their box. Stop when
        a node is pure, has too few samples, or has hit <span className="font-mono">max_depth</span>.
      </>
    }
  />,
  <IntroSlide
    key="step4"
    n="04"
    title="Watch overfitting unfold"
    illustration={<IllustOverfit />}
    body={
      <>
        With max_depth high enough, the tree will carve a tile around every single training point —
        100% accuracy on the train set, but the boundary now traces noise instead of structure.
      </>
    }
  />,
  <div key="try" className="text-[15px] leading-[1.7] text-zinc-700">
    <p>
      Try it: pick the checkerboard, set <span className="font-mono">max_depth = 2</span>, and
      watch the tree get only one quadrant right. Crank depth up and it splits every tile cleanly —
      then keep going and it starts chasing single mislabelled points.
    </p>
  </div>,
];

