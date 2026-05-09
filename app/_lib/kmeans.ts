import { mulberry32, type Point } from "./sample-data";

export type Centroid = { x: number; y: number };

export type KMeansFrame = {
  iter: number;
  centroids: Centroid[];
  assignments: number[]; // centroid index per point
  inertia: number;
  changed: boolean; // whether assignments changed from the previous step
};

function dist2(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

function assignAll(points: Point[], centroids: Centroid[]): number[] {
  return points.map((p) => {
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < centroids.length; i++) {
      const d = dist2(p.x, p.y, centroids[i].x, centroids[i].y);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return best;
  });
}

function meanCentroids(
  points: Point[],
  assignments: number[],
  prev: Centroid[],
): Centroid[] {
  const sums: { x: number; y: number; n: number }[] = prev.map(() => ({
    x: 0,
    y: 0,
    n: 0,
  }));
  for (let i = 0; i < points.length; i++) {
    const a = assignments[i];
    if (a < 0 || a >= sums.length) continue;
    sums[a].x += points[i].x;
    sums[a].y += points[i].y;
    sums[a].n++;
  }
  // Empty clusters keep their previous position — common engineering choice
  // when points are sparse (k > effective # of clusters).
  return sums.map((s, i) =>
    s.n === 0 ? prev[i] : { x: s.x / s.n, y: s.y / s.n },
  );
}

function totalInertia(
  points: Point[],
  centroids: Centroid[],
  assignments: number[],
): number {
  let s = 0;
  for (let i = 0; i < points.length; i++) {
    const c = centroids[assignments[i]];
    if (!c) continue;
    s += dist2(points[i].x, points[i].y, c.x, c.y);
  }
  return s;
}

function arraysEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

// Forgy initialization: k random distinct points as initial centroids. If the
// dataset is empty or smaller than k, fills the rest with deterministic spread
// across the unit square so the slider is always responsive.
export function initCentroids(
  points: Point[],
  k: number,
  seed: number,
): Centroid[] {
  const rand = mulberry32(seed);
  const out: Centroid[] = [];
  if (points.length > 0) {
    const indices = points.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    for (const idx of indices.slice(0, Math.min(k, points.length))) {
      out.push({ ...points[idx] });
    }
  }
  while (out.length < k) {
    out.push({ x: 0.2 + rand() * 0.6, y: 0.2 + rand() * 0.6 });
  }
  return out;
}

// Lloyd's algorithm. Returns one frame per iteration (frame 0 is the initial
// state with assignments derived from the starting centroids; subsequent
// frames are post-update). Stops when assignments stop changing or maxIters
// is hit.
export function runKMeans(
  points: Point[],
  initial: Centroid[],
  maxIters: number,
): KMeansFrame[] {
  let centroids = initial.map((c) => ({ ...c }));
  let assignments = assignAll(points, centroids);
  const frames: KMeansFrame[] = [
    {
      iter: 0,
      centroids: centroids.map((c) => ({ ...c })),
      assignments: assignments.slice(),
      inertia: totalInertia(points, centroids, assignments),
      changed: true,
    },
  ];
  for (let it = 1; it <= maxIters; it++) {
    const prev = assignments;
    centroids = meanCentroids(points, assignments, centroids);
    assignments = assignAll(points, centroids);
    const changed = !arraysEqual(assignments, prev);
    frames.push({
      iter: it,
      centroids: centroids.map((c) => ({ ...c })),
      assignments: assignments.slice(),
      inertia: totalInertia(points, centroids, assignments),
      changed,
    });
    if (!changed) break;
  }
  return frames;
}

// ---------- Datasets ----------

export type DatasetId = "blobs3" | "blobs5" | "anisotropic" | "moons" | "sketch";

export const kmeansDatasets: Record<
  Exclude<DatasetId, "sketch">,
  { label: string; trueK: number; generate: (seed: number) => Point[] }
> = {
  blobs3: { label: "Three clusters", trueK: 3, generate: (s) => generateBlobs(s, 3, 18) },
  blobs5: { label: "Five clusters", trueK: 5, generate: (s) => generateBlobs(s, 5, 14) },
  anisotropic: { label: "Elongated clusters", trueK: 3, generate: generateAnisotropic },
  moons: { label: "Two crescents", trueK: 2, generate: generateMoons },
};

function clamp01(v: number) {
  return Math.max(0.04, Math.min(0.96, v));
}

function generateBlobs(seed: number, k: number, perCluster: number): Point[] {
  const rand = mulberry32(seed);
  const pts: Point[] = [];
  for (let i = 0; i < k; i++) {
    const angle = (i / k) * 2 * Math.PI + rand() * 0.4;
    const radius = 0.30 + rand() * 0.06;
    const cx = 0.5 + radius * Math.cos(angle);
    const cy = 0.5 + radius * Math.sin(angle);
    const spread = 0.07 + rand() * 0.04;
    for (let j = 0; j < perCluster; j++) {
      pts.push({
        x: clamp01(cx + (rand() - 0.5) * spread * 2),
        y: clamp01(cy + (rand() - 0.5) * spread * 2),
      });
    }
  }
  return pts;
}

function generateAnisotropic(seed: number): Point[] {
  const rand = mulberry32(seed);
  const pts: Point[] = [];
  // Three flat ellipses oriented along x — k-means notoriously misses these
  // because it assumes spherical clusters.
  const centers: { x: number; y: number; rotate: number }[] = [
    { x: 0.30, y: 0.30, rotate: 0.4 },
    { x: 0.70, y: 0.50, rotate: -0.3 },
    { x: 0.45, y: 0.78, rotate: 0.2 },
  ];
  for (const c of centers) {
    for (let j = 0; j < 18; j++) {
      const u = (rand() - 0.5) * 0.36;
      const v = (rand() - 0.5) * 0.06;
      const x = c.x + u * Math.cos(c.rotate) - v * Math.sin(c.rotate);
      const y = c.y + u * Math.sin(c.rotate) + v * Math.cos(c.rotate);
      pts.push({ x: clamp01(x), y: clamp01(y) });
    }
  }
  return pts;
}

function generateMoons(seed: number): Point[] {
  const rand = mulberry32(seed);
  const pts: Point[] = [];
  const N = 22;
  const noise = 0.04;
  for (let i = 0; i < N; i++) {
    const t = (i / (N - 1)) * Math.PI;
    pts.push({
      x: clamp01(0.32 + 0.30 * Math.cos(t) + (rand() - 0.5) * noise),
      y: clamp01(0.62 - 0.28 * Math.sin(t) + (rand() - 0.5) * noise),
    });
  }
  for (let i = 0; i < N; i++) {
    const t = (i / (N - 1)) * Math.PI;
    pts.push({
      x: clamp01(0.62 + 0.30 * Math.cos(t + Math.PI) + (rand() - 0.5) * noise),
      y: clamp01(0.42 - 0.28 * Math.sin(t + Math.PI) + (rand() - 0.5) * noise),
    });
  }
  return pts;
}
