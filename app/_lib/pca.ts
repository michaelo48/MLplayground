import { mulberry32, type Point } from "./sample-data";

export type DatasetId =
  | "correlated"
  | "antiCorrelated"
  | "isotropic"
  | "twoBlobs"
  | "sketch";

export type Vec2 = { x: number; y: number };

export type PCAResult = {
  mean: Vec2;
  // Eigenvalues sorted descending — λ₁ ≥ λ₂ ≥ 0.
  lambda1: number;
  lambda2: number;
  // Orthonormal eigenvectors. pc1 points along the direction of largest
  // variance; pc2 is perpendicular. Both have length 1.
  pc1: Vec2;
  pc2: Vec2;
  // Angle of pc1 in radians, measured from +x (canvas space — y grows down).
  angle: number;
};

// Closed-form symmetric 2x2 eigendecomposition. For inputs < 2 we return a
// trivial result so the playground never has to special-case empty data.
export function pca(points: Point[]): PCAResult {
  const n = points.length;
  if (n < 2) {
    return {
      mean: { x: 0.5, y: 0.5 },
      lambda1: 0,
      lambda2: 0,
      pc1: { x: 1, y: 0 },
      pc2: { x: 0, y: 1 },
      angle: 0,
    };
  }
  let mx = 0;
  let my = 0;
  for (const p of points) {
    mx += p.x;
    my += p.y;
  }
  mx /= n;
  my /= n;
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (const p of points) {
    const dx = p.x - mx;
    const dy = p.y - my;
    sxx += dx * dx;
    syy += dy * dy;
    sxy += dx * dy;
  }
  // Population covariance (divide by n). The eigenvectors are scale-invariant
  // here, so n vs n-1 only shifts the eigenvalues by a constant factor.
  sxx /= n;
  syy /= n;
  sxy /= n;
  const tr = sxx + syy;
  const det = sxx * syy - sxy * sxy;
  const disc = Math.max(0, tr * tr / 4 - det);
  const root = Math.sqrt(disc);
  const lambda1 = tr / 2 + root;
  const lambda2 = Math.max(0, tr / 2 - root);
  // For a symmetric matrix [[sxx, sxy], [sxy, syy]] the eigenvector for λ
  // satisfies (sxx − λ)·x + sxy·y = 0 → direction (sxy, λ − sxx). When sxy
  // is tiny the matrix is already diagonal; fall back to axis-aligned bases.
  let pc1: Vec2;
  if (Math.abs(sxy) > 1e-12) {
    pc1 = normalize({ x: sxy, y: lambda1 - sxx });
  } else if (sxx >= syy) {
    pc1 = { x: 1, y: 0 };
  } else {
    pc1 = { x: 0, y: 1 };
  }
  const pc2: Vec2 = { x: -pc1.y, y: pc1.x };
  return {
    mean: { x: mx, y: my },
    lambda1,
    lambda2,
    pc1,
    pc2,
    angle: Math.atan2(pc1.y, pc1.x),
  };
}

function normalize(v: Vec2): Vec2 {
  const m = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / m, y: v.y / m };
}

// Score (signed distance along an axis) of a point about a mean. Returns the
// 1D coordinate of `p` in the orthonormal basis (pc1, pc2).
export function score(p: Point, mean: Vec2, axis: Vec2): number {
  return (p.x - mean.x) * axis.x + (p.y - mean.y) * axis.y;
}

// Project p onto the line through `mean` along `axis`. Drops the component
// orthogonal to `axis` — that's the information PCA discards when going from
// 2D to 1D.
export function project(p: Point, mean: Vec2, axis: Vec2): Point {
  const s = score(p, mean, axis);
  return { x: mean.x + s * axis.x, y: mean.y + s * axis.y };
}

// Rotate p around `mean` so that `axis` (the new "x") lies on the horizontal.
// Used by the "rotated" view that aligns PC1 with the canvas's x axis so the
// variance-along-PC1 picture is immediately readable.
export function rotateAroundMean(p: Point, mean: Vec2, axis: Vec2): Point {
  const dx = p.x - mean.x;
  const dy = p.y - mean.y;
  // Build the rotation matrix that sends `axis` to (1, 0):
  //   R = [[ax,  ay], [-ay, ax]]
  return {
    x: mean.x + axis.x * dx + axis.y * dy,
    y: mean.y - axis.y * dx + axis.x * dy,
  };
}

// ---------- Datasets ----------

export const pcaDatasets: Record<
  Exclude<DatasetId, "sketch">,
  { label: string; generate: (seed: number, n: number, noise: number) => Point[] }
> = {
  correlated: {
    label: "Correlated — strong PC1",
    generate: (seed, n, noise) => generateLine(seed, n, noise, 0.55),
  },
  antiCorrelated: {
    label: "Anti-correlated",
    generate: (seed, n, noise) => generateLine(seed, n, noise, -0.55),
  },
  isotropic: {
    label: "Isotropic — no direction",
    generate: generateIsotropic,
  },
  twoBlobs: {
    label: "Two blobs",
    generate: generateTwoBlobs,
  },
};

function clamp01(v: number) {
  return Math.max(0.04, Math.min(0.96, v));
}

function generateLine(
  seed: number,
  n: number,
  noise: number,
  slope: number,
): Point[] {
  const rand = mulberry32(seed);
  const pts: Point[] = [];
  // Spread `t` across roughly ±0.32 so the cloud fills the canvas without
  // clipping under typical noise levels.
  for (let i = 0; i < n; i++) {
    const t = (rand() - 0.5) * 0.64;
    const perp = (rand() - 0.5) * noise * 2;
    const x = 0.5 + t;
    const y = 0.5 + slope * t + perp;
    pts.push({ x: clamp01(x), y: clamp01(y) });
  }
  return pts;
}

function generateIsotropic(seed: number, n: number, noise: number): Point[] {
  const rand = mulberry32(seed);
  const pts: Point[] = [];
  const r = 0.18 + noise;
  for (let i = 0; i < n; i++) {
    // Box-Muller-ish: two uniforms → a roughly circular gaussian-shaped cloud.
    const u = rand() - 0.5;
    const v = rand() - 0.5;
    pts.push({ x: clamp01(0.5 + u * r * 2), y: clamp01(0.5 + v * r * 2) });
  }
  return pts;
}

function generateTwoBlobs(seed: number, n: number, noise: number): Point[] {
  const rand = mulberry32(seed);
  const pts: Point[] = [];
  // Two tight blobs offset along a diagonal — PC1 should connect them.
  const c1 = { x: 0.32, y: 0.36 };
  const c2 = { x: 0.68, y: 0.64 };
  const spread = 0.05 + noise * 0.5;
  for (let i = 0; i < n; i++) {
    const c = i % 2 === 0 ? c1 : c2;
    pts.push({
      x: clamp01(c.x + (rand() - 0.5) * spread * 2),
      y: clamp01(c.y + (rand() - 0.5) * spread * 2),
    });
  }
  return pts;
}
