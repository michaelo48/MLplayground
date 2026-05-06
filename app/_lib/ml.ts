import { mulberry32, type Point } from "./sample-data";

export type Fit = { slope: number; intercept: number };

export function olsFit(pts: Point[]): Fit {
  const n = pts.length;
  if (n === 0) return { slope: 0, intercept: 0 };
  let xMean = 0;
  let yMean = 0;
  for (const p of pts) {
    xMean += p.x;
    yMean += p.y;
  }
  xMean /= n;
  yMean /= n;
  let num = 0;
  let den = 0;
  for (const p of pts) {
    num += (p.x - xMean) * (p.y - yMean);
    den += (p.x - xMean) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  return { slope, intercept: yMean - slope * xMean };
}

export function mse(pts: Point[], { slope, intercept }: Fit): number {
  if (pts.length === 0) return 0;
  let s = 0;
  for (const p of pts) {
    const e = p.y - (slope * p.x + intercept);
    s += e * e;
  }
  return s / pts.length;
}

export function r2(pts: Point[], fit: Fit): number {
  const n = pts.length;
  if (n === 0) return 0;
  let yMean = 0;
  for (const p of pts) yMean += p.y;
  yMean /= n;
  let ssRes = 0;
  let ssTot = 0;
  for (const p of pts) {
    const e = p.y - (fit.slope * p.x + fit.intercept);
    ssRes += e * e;
    ssTot += (p.y - yMean) ** 2;
  }
  return ssTot === 0 ? 0 : 1 - ssRes / ssTot;
}

// Batch gradient descent on MSE. Returns one entry per epoch (loss after the
// step), prefixed with the initial loss — length = epochs + 1.
export function gdTrajectory(pts: Point[], lr: number, epochs: number): number[] {
  const n = pts.length;
  let b0 = 0;
  let b1 = 0;
  const losses = [mse(pts, { slope: b1, intercept: b0 })];
  if (n === 0) {
    for (let i = 0; i < epochs; i++) losses.push(0);
    return losses;
  }
  for (let i = 0; i < epochs; i++) {
    let g0 = 0;
    let g1 = 0;
    for (const p of pts) {
      const err = b1 * p.x + b0 - p.y;
      g0 += err;
      g1 += err * p.x;
    }
    b0 -= lr * ((2 / n) * g0);
    b1 -= lr * ((2 / n) * g1);
    losses.push(mse(pts, { slope: b1, intercept: b0 }));
  }
  return losses;
}

// First epoch where the loss got within `tol` of the trajectory's final
// value. Returns epochs (i.e. did not converge) if the criterion is never met.
export function convergedAt(traj: number[], tol = 1e-5): number {
  if (traj.length < 2) return 0;
  const final = traj[traj.length - 1];
  for (let i = 0; i < traj.length; i++) {
    if (Math.abs(traj[i] - final) <= tol) return i;
  }
  return traj.length - 1;
}

export function generateSyntheticData(
  n: number,
  sigma: number,
  seed: number,
  trueSlope = 0.62,
  trueIntercept = 0.18,
): Point[] {
  const pts: Point[] = [];
  const rand = mulberry32(seed);
  for (let i = 0; i < n; i++) {
    const x = rand();
    const y = trueSlope * x + trueIntercept + (rand() - 0.5) * 2 * sigma;
    pts.push({ x, y: Math.max(0.02, Math.min(0.98, y)) });
  }
  return pts;
}

export type DatasetId = "synthetic" | "boston" | "mpg";

export const datasets: Record<
  DatasetId,
  { label: string; trueSlope: number; trueIntercept: number; seedOffset: number }
> = {
  synthetic: { label: "Synthetic — noisy line", trueSlope: 0.62, trueIntercept: 0.18, seedOffset: 0 },
  boston:    { label: "Boston housing",         trueSlope: 0.45, trueIntercept: 0.30, seedOffset: 100 },
  mpg:       { label: "Auto MPG",               trueSlope: -0.55, trueIntercept: 0.85, seedOffset: 200 },
};
