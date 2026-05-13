import {
  type Class,
  type LabeledPoint,
  generateBlobs,
  generateMoons,
  generateSpirals,
} from "./datasets";

export type { Class, LabeledPoint } from "./datasets";
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
  blobs: { label: "Two clusters", generate: generateBlobs },
  moons: { label: "Two crescents", generate: generateMoons },
  spiral: { label: "Tangled spirals", generate: generateSpirals },
};
