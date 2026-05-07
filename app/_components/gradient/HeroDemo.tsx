"use client";

import { useEffect, useRef, useState } from "react";
import styles from "../../page.module.css";

type Point = { x: number; y: number; c: 0 | 1 };
type Algo = "knn" | "logistic";

const ACCENT = "oklch(0.62 0.18 250)";
const WARN = "oklch(0.72 0.16 60)";
const INK = "#16181c";
const PAPER = "#fbfaf6";

function dist(ax: number, ay: number, bx: number, by: number) {
  return Math.hypot(ax - bx, ay - by);
}

function seedDemoPoints(): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i < 18; i++) {
    pts.push({ x: 0.18 + Math.random() * 0.32, y: 0.55 + Math.random() * 0.30, c: 0 });
  }
  for (let i = 0; i < 18; i++) {
    pts.push({ x: 0.55 + Math.random() * 0.32, y: 0.15 + Math.random() * 0.32, c: 1 });
  }
  pts.push({ x: 0.45, y: 0.40, c: 0 });
  pts.push({ x: 0.55, y: 0.55, c: 1 });
  return pts;
}

function predictKNN(points: Point[], x: number, y: number, k: number): -1 | 0 | 1 {
  if (points.length === 0) return -1;
  const sorted = points
    .map((p) => ({ p, d: dist(x, y, p.x, p.y) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, Math.min(k, points.length));
  let c0 = 0, c1 = 0;
  for (const s of sorted) (s.p.c === 0 ? c0++ : c1++);
  if (c0 === c1) return sorted[0].p.c;
  return c0 > c1 ? 0 : 1;
}

function fitLogistic(points: Point[]): [number, number, number] {
  if (points.length < 2) return [0, 0, 0];
  let w0 = 0, w1 = 0, w2 = 0;
  const lr = 0.5;
  const n = points.length;
  for (let iter = 0; iter < 250; iter++) {
    let g0 = 0, g1 = 0, g2 = 0;
    for (const p of points) {
      const z = w0 + w1 * p.x + w2 * p.y;
      const s = 1 / (1 + Math.exp(-z));
      const err = s - p.c;
      g0 += err;
      g1 += err * p.x;
      g2 += err * p.y;
    }
    w0 -= (lr * g0) / n;
    w1 -= (lr * g1) / n;
    w2 -= (lr * g2) / n;
  }
  return [w0, w1, w2];
}

export function HeroDemo() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const [points, setPoints] = useState<Point[]>(() => seedDemoPoints());
  const [activeClass, setActiveClass] = useState<0 | 1>(0);
  const [k, setK] = useState(5);
  const [algo, setAlgo] = useState<Algo>("knn");

  // Logistic weights are derived from points; recompute when the inputs change.
  const logisticW = algo === "logistic" ? fitLogistic(points) : ([0, 0, 0] as [number, number, number]);

  function predict(x: number, y: number): -1 | 0 | 1 {
    if (algo === "knn") return predictKNN(points, x, y, k);
    if (points.length < 2) return -1;
    const z = logisticW[0] + logisticW[1] * x + logisticW[2] * y;
    return 1 / (1 + Math.exp(-z)) >= 0.5 ? 1 : 0;
  }

  const accuracy = (() => {
    if (points.length === 0) return null;
    let correct = 0;
    for (const p of points) {
      if (predict(p.x, p.y) === p.c) correct++;
    }
    return correct / points.length;
  })();

  // Draw whenever state changes; also handle DPR-aware resizing.
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

      // Decision boundary as a coarse cell grid.
      if (points.length >= 2) {
        const cell = 14;
        const cols = Math.ceil(w / cell);
        const rows = Math.ceil(h / cell);
        for (let cx = 0; cx < cols; cx++) {
          for (let cy = 0; cy < rows; cy++) {
            const px = (cx + 0.5) * cell;
            const py = (cy + 0.5) * cell;
            const cls = predict(px / w, py / h);
            if (cls === -1) continue;
            ctx.fillStyle =
              cls === 0
                ? "oklch(0.62 0.18 250 / 0.13)"
                : "oklch(0.72 0.16 60 / 0.16)";
            ctx.fillRect(cx * cell, cy * cell, cell, cell);
          }
        }
      }

      // Logistic decision line on top of the cells, for crispness.
      if (algo === "logistic" && points.length >= 2) {
        const [w0, w1, w2] = logisticW;
        if (Math.abs(w2) > 1e-6) {
          const yL = -(w0 + w1 * 0) / w2;
          const yR = -(w0 + w1 * 1) / w2;
          ctx.strokeStyle = INK;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([5, 4]);
          ctx.beginPath();
          ctx.moveTo(0, yL * h);
          ctx.lineTo(w, yR * h);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      for (const p of points) {
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, 6.5, 0, Math.PI * 2);
        ctx.fillStyle = p.c === 0 ? ACCENT : WARN;
        ctx.fill();
        ctx.strokeStyle = PAPER;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [points, k, algo, logisticW]);

  const onCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    if (e.shiftKey) {
      setPoints((pts) => {
        let best = -1;
        let bestD = 0.03;
        for (let i = 0; i < pts.length; i++) {
          const d = dist(x, y, pts[i].x, pts[i].y);
          if (d < bestD) {
            bestD = d;
            best = i;
          }
        }
        if (best < 0) return pts;
        const next = pts.slice();
        next.splice(best, 1);
        return next;
      });
    } else {
      setPoints((pts) => [...pts, { x, y, c: activeClass }]);
    }
  };

  return (
    <div className={styles.demo} id="demo">
      <div className={styles.demoHead}>
        <div className={styles.demoTitle}>
          <span className={styles.demoPill}>LIVE</span>
          Lesson 03 · Classification boundaries
        </div>
      </div>
      <div className={styles.demoBody}>
        <div ref={wrapRef} className={styles.demoCanvasWrap}>
          <div className={styles.canvasOverlay}>
            <div>x ∈ [0, 1] · y ∈ [0, 1]</div>
            <div>
              {points.length} point{points.length !== 1 ? "s" : ""} · 2 classes
            </div>
          </div>
          <canvas ref={canvasRef} className={styles.canvas} onMouseDown={onCanvasMouseDown} />
          <div className={styles.canvasHelp}>click to drop · shift+click to remove</div>
        </div>
        <aside className={styles.demoSide}>
          <div className={styles.sideSection}>
            <div className={styles.label}>Algorithm</div>
            <div className={styles.algoTabs}>
              <button
                className={`${styles.algoTab} ${algo === "knn" ? styles.active : ""}`}
                onClick={() => setAlgo("knn")}
              >
                <span>k-NN</span>
                <span className={styles.sub}>Distance based</span>
              </button>
              <button
                className={`${styles.algoTab} ${algo === "logistic" ? styles.active : ""}`}
                onClick={() => setAlgo("logistic")}
              >
                <span>Logistic</span>
                <span className={styles.sub}>Linear</span>
              </button>
            </div>
          </div>

          <div className={styles.sideSection}>
            <div className={styles.label}>Drop class</div>
            <div className={styles.classPick}>
              <button
                className={`${styles.classChip} ${activeClass === 0 ? styles.active : ""}`}
                onClick={() => setActiveClass(0)}
              >
                <span className={styles.swatch} style={{ background: ACCENT }} />A
              </button>
              <button
                className={`${styles.classChip} ${activeClass === 1 ? styles.active : ""}`}
                onClick={() => setActiveClass(1)}
              >
                <span className={styles.swatch} style={{ background: WARN }} />B
              </button>
            </div>
          </div>

          <div
            className={`${styles.sideSection} ${styles.kSection} ${algo !== "knn" ? styles.disabled : ""}`}
          >
            <div className={styles.sliderRow}>
              <div className={styles.top}>
                <span className={styles.name}>
                  Neighbors <span className={styles.mono} style={{ color: "var(--ink-3)", fontSize: 11 }}>k</span>
                </span>
                <span className={`${styles.val} ${styles.mono}`}>{k}</span>
              </div>
              <input
                type="range"
                min={1}
                max={21}
                step={2}
                value={k}
                onChange={(e) => setK(parseInt(e.target.value))}
              />
            </div>
          </div>

          <div className={styles.sideSection}>
            <div className={styles.label}>Train accuracy</div>
            <div className={styles.metric}>
              <div className={`${styles.v} ${styles.tabular}`}>
                {accuracy === null ? "— %" : `${(accuracy * 100).toFixed(0)}%`}
              </div>
              <div className={styles.l}>on dropped points</div>
            </div>
          </div>

          <div className={styles.sideActions}>
            <button className={styles.miniBtn} onClick={() => setPoints([])}>
              Clear all
            </button>
            <button className={styles.miniBtn} onClick={() => setPoints(seedDemoPoints())}>
              Demo data
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
