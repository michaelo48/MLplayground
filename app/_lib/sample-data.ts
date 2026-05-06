export function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Point = { x: number; y: number };

export const samplePoints: Point[] = (() => {
  const pts: Point[] = [];
  const rand = mulberry32(7);
  for (let i = 0; i < 26; i++) {
    const x = rand();
    const y = 0.62 * x + 0.18 + (rand() - 0.5) * 0.16;
    pts.push({ x, y: Math.max(0.02, Math.min(0.98, y)) });
  }
  return pts;
})();
