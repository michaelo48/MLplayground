import { mulberry32 } from "./sample-data";

export type Class = 0 | 1;
export type LabeledPoint = { x: number; y: number; c: Class };
export type DistanceMetric = "euclidean" | "manhattan";

export const distanceLabels: Record<DistanceMetric, string> = {
  euclidean: "Euclidean (L²)",
  manhattan: "Manhattan (L¹)",
};

function dist(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  metric: DistanceMetric,
): number {
  if (metric === "manhattan") return Math.abs(ax - bx) + Math.abs(ay - by);
  return Math.hypot(ax - bx, ay - by);
}

export type Prediction = { cls: Class | -1; neighbors: LabeledPoint[] };

export function predictKNN(
  points: LabeledPoint[],
  x: number,
  y: number,
  k: number,
  metric: DistanceMetric = "euclidean",
): Prediction {
  if (points.length === 0) return { cls: -1, neighbors: [] };
  const sorted = points
    .map((p) => ({ p, d: dist(x, y, p.x, p.y, metric) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, Math.min(k, points.length));
  let c0 = 0;
  let c1 = 0;
  for (const s of sorted) (s.p.c === 0 ? c0++ : c1++);
  // Tie-break with the nearest neighbor's class — deterministic and tiny-bias
  // toward whatever was closest, which is what 1-NN would have said anyway.
  const cls: Class = c0 === c1 ? sorted[0].p.c : c0 > c1 ? 0 : 1;
  return { cls, neighbors: sorted.map((s) => s.p) };
}

// Leave-one-out accuracy: for each point, predict using all the others. Honest
// because using the point itself would always score 100% at k = 1.
export function looAccuracy(
  points: LabeledPoint[],
  k: number,
  metric: DistanceMetric,
): number | null {
  if (points.length < 2) return null;
  let correct = 0;
  for (let i = 0; i < points.length; i++) {
    const rest = points.slice(0, i).concat(points.slice(i + 1));
    const { cls } = predictKNN(rest, points[i].x, points[i].y, k, metric);
    if (cls === points[i].c) correct++;
  }
  return correct / points.length;
}

export type DatasetId = "blobs" | "moons" | "spiral" | "sketch";

export const knnDatasets: Record<
  Exclude<DatasetId, "sketch">,
  { label: string; generate: (seed: number) => LabeledPoint[] }
> = {
  blobs: { label: "Two blobs", generate: generateBlobs },
  moons: { label: "Two moons", generate: generateMoons },
  spiral: { label: "Interleaved spirals", generate: generateSpirals },
};

function clamp01(v: number) {
  return Math.max(0.02, Math.min(0.98, v));
}

function generateBlobs(seed: number): LabeledPoint[] {
  const rand = mulberry32(seed);
  const pts: LabeledPoint[] = [];
  for (let i = 0; i < 22; i++) {
    pts.push({ x: clamp01(0.27 + (rand() - 0.5) * 0.32), y: clamp01(0.7 + (rand() - 0.5) * 0.30), c: 0 });
  }
  for (let i = 0; i < 22; i++) {
    pts.push({ x: clamp01(0.72 + (rand() - 0.5) * 0.32), y: clamp01(0.30 + (rand() - 0.5) * 0.30), c: 1 });
  }
  return pts;
}

function generateMoons(seed: number): LabeledPoint[] {
  const rand = mulberry32(seed);
  const pts: LabeledPoint[] = [];
  const N = 26;
  const noise = 0.04;
  for (let i = 0; i < N; i++) {
    const t = (i / (N - 1)) * Math.PI;
    pts.push({
      x: clamp01(0.32 + 0.30 * Math.cos(t) + (rand() - 0.5) * noise),
      y: clamp01(0.62 - 0.28 * Math.sin(t) + (rand() - 0.5) * noise),
      c: 0,
    });
  }
  for (let i = 0; i < N; i++) {
    const t = (i / (N - 1)) * Math.PI;
    pts.push({
      x: clamp01(0.62 + 0.30 * Math.cos(t + Math.PI) + (rand() - 0.5) * noise),
      y: clamp01(0.42 - 0.28 * Math.sin(t + Math.PI) + (rand() - 0.5) * noise),
      c: 1,
    });
  }
  return pts;
}

function generateSpirals(seed: number): LabeledPoint[] {
  const rand = mulberry32(seed);
  const pts: LabeledPoint[] = [];
  const N = 30;
  const noise = 0.025;
  for (let i = 0; i < N; i++) {
    const t = 0.6 + (i / N) * 4.5;
    const r = t * 0.06;
    pts.push({
      x: clamp01(0.5 + r * Math.cos(t) + (rand() - 0.5) * noise),
      y: clamp01(0.5 + r * Math.sin(t) + (rand() - 0.5) * noise),
      c: 0,
    });
    pts.push({
      x: clamp01(0.5 - r * Math.cos(t) + (rand() - 0.5) * noise),
      y: clamp01(0.5 - r * Math.sin(t) + (rand() - 0.5) * noise),
      c: 1,
    });
  }
  return pts;
}
