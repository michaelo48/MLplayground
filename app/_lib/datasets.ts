// Shared 2-class point generators consumed by the kNN and decision-tree
// playgrounds. K-Means uses unlabeled `Point`s with different cluster shapes,
// so its datasets live in kmeans.ts and don't share this module.

import { mulberry32 } from "./sample-data";

export type Class = 0 | 1;
export type LabeledPoint = { x: number; y: number; c: Class };

function clamp01(v: number) {
  return Math.max(0.02, Math.min(0.98, v));
}

export function generateBlobs(seed: number): LabeledPoint[] {
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

export function generateMoons(seed: number): LabeledPoint[] {
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

export function generateSpirals(seed: number): LabeledPoint[] {
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

export function generateChecker(seed: number): LabeledPoint[] {
  const rand = mulberry32(seed);
  const pts: LabeledPoint[] = [];
  // 3×3 grid; alternating tiles. Each tile gets a small jittered cluster so
  // the resulting tree has to make multiple axis-aligned splits to separate
  // them.
  for (let gx = 0; gx < 3; gx++) {
    for (let gy = 0; gy < 3; gy++) {
      const c: Class = (gx + gy) % 2 === 0 ? 0 : 1;
      const cx = (gx + 0.5) / 3;
      const cy = (gy + 0.5) / 3;
      for (let i = 0; i < 5; i++) {
        pts.push({
          x: clamp01(cx + (rand() - 0.5) * 0.18),
          y: clamp01(cy + (rand() - 0.5) * 0.18),
          c,
        });
      }
    }
  }
  return pts;
}
