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

// Each trajectory records loss once per epoch and the parameters at that same
// epoch (params[0] is the initial state, params[epochs] is the final), so the
// caller can replay the run by indexing into both arrays.
export type Trajectory = { losses: number[]; params: Fit[]; fit: Fit };

function emptyTraj(epochs: number): Trajectory {
  const losses = new Array(epochs + 1).fill(0);
  const params: Fit[] = new Array(epochs + 1).fill({ slope: 0, intercept: 0 });
  return { losses, params, fit: { slope: 0, intercept: 0 } };
}

// Full-batch gradient descent on MSE.
export function gdTrajectory(pts: Point[], lr: number, epochs: number): Trajectory {
  const n = pts.length;
  if (n === 0) return emptyTraj(epochs);
  let b0 = 0;
  let b1 = 0;
  const losses = [mse(pts, { slope: b1, intercept: b0 })];
  const params: Fit[] = [{ slope: b1, intercept: b0 }];
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
    params.push({ slope: b1, intercept: b0 });
  }
  return { losses, params, fit: { slope: b1, intercept: b0 } };
}

// Stochastic GD: one update per point, full pass = one epoch. Records loss
// after each completed epoch so the x-axis matches the other optimizers.
export function sgdTrajectory(
  pts: Point[],
  lr: number,
  epochs: number,
  seed = 1,
): Trajectory {
  const n = pts.length;
  if (n === 0) return emptyTraj(epochs);
  let b0 = 0;
  let b1 = 0;
  const losses = [mse(pts, { slope: b1, intercept: b0 })];
  const params: Fit[] = [{ slope: b1, intercept: b0 }];
  const rand = mulberry32(seed);
  const order = pts.map((_, i) => i);
  for (let e = 0; e < epochs; e++) {
    for (let k = order.length - 1; k > 0; k--) {
      const j = Math.floor(rand() * (k + 1));
      [order[k], order[j]] = [order[j], order[k]];
    }
    for (const idx of order) {
      const p = pts[idx];
      const err = b1 * p.x + b0 - p.y;
      b0 -= lr * 2 * err;
      b1 -= lr * 2 * err * p.x;
    }
    losses.push(mse(pts, { slope: b1, intercept: b0 }));
    params.push({ slope: b1, intercept: b0 });
  }
  return { losses, params, fit: { slope: b1, intercept: b0 } };
}

// Adam (Kingma & Ba) on full-batch gradients. Standard hyperparameters.
export function adamTrajectory(pts: Point[], lr: number, epochs: number): Trajectory {
  const n = pts.length;
  if (n === 0) return emptyTraj(epochs);
  const beta1 = 0.9;
  const beta2 = 0.999;
  const eps = 1e-8;
  let b0 = 0;
  let b1 = 0;
  let m0 = 0, m1 = 0, v0 = 0, v1 = 0;
  const losses = [mse(pts, { slope: b1, intercept: b0 })];
  const params: Fit[] = [{ slope: b1, intercept: b0 }];
  for (let t = 1; t <= epochs; t++) {
    let g0 = 0, g1 = 0;
    for (const p of pts) {
      const err = b1 * p.x + b0 - p.y;
      g0 += err;
      g1 += err * p.x;
    }
    g0 = (2 / n) * g0;
    g1 = (2 / n) * g1;
    m0 = beta1 * m0 + (1 - beta1) * g0;
    m1 = beta1 * m1 + (1 - beta1) * g1;
    v0 = beta2 * v0 + (1 - beta2) * g0 * g0;
    v1 = beta2 * v1 + (1 - beta2) * g1 * g1;
    const mh0 = m0 / (1 - Math.pow(beta1, t));
    const mh1 = m1 / (1 - Math.pow(beta1, t));
    const vh0 = v0 / (1 - Math.pow(beta2, t));
    const vh1 = v1 / (1 - Math.pow(beta2, t));
    b0 -= (lr * mh0) / (Math.sqrt(vh0) + eps);
    b1 -= (lr * mh1) / (Math.sqrt(vh1) + eps);
    losses.push(mse(pts, { slope: b1, intercept: b0 }));
    params.push({ slope: b1, intercept: b0 });
  }
  return { losses, params, fit: { slope: b1, intercept: b0 } };
}

// OLS as a flat "trajectory" so it can sit on the same loss chart as a
// reference floor (the optimum the iterative methods are reaching toward).
export function olsTrajectory(pts: Point[], epochs: number): Trajectory {
  const fit = olsFit(pts);
  const final = mse(pts, fit);
  return {
    losses: new Array(epochs + 1).fill(final),
    params: new Array(epochs + 1).fill(fit),
    fit,
  };
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
