"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "../../page.module.css";
import {
  type LabeledPoint,
  knnDatasets,
  looAccuracy,
  predictKNN,
} from "../../_lib/knn";

const ACCENT = "oklch(0.62 0.18 250)"; // class A
const ACCENT_RGBA = "oklch(0.62 0.18 250 / 0.13)";
const WARN = "oklch(0.72 0.16 60)"; // class B
const WARN_RGBA = "oklch(0.72 0.16 60 / 0.16)";
const PAPER = "#fbfaf6";
const CELL = 14;
const HIT_RADIUS = 0.04; // when a click counts as "on" the query / a point

export function HeroDemo() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);

  const [seed, setSeed] = useState(7);
  const [extras, setExtras] = useState<LabeledPoint[]>([]);
  const [activeClass, setActiveClass] = useState<0 | 1>(0);
  const [k, setK] = useState(5);
  const [query, setQuery] = useState({ x: 0.52, y: 0.5 });

  // Combine the seeded blobs with anything the user has dropped on top.
  const points = useMemo<LabeledPoint[]>(
    () => [...knnDatasets.blobs.generate(seed), ...extras],
    [seed, extras],
  );

  const effectiveK = Math.min(k, Math.max(1, points.length));
  const accuracy = useMemo(
    () => looAccuracy(points, effectiveK, "euclidean"),
    [points, effectiveK],
  );
  const queryResult = useMemo(
    () => predictKNN(points, query.x, query.y, effectiveK, "euclidean"),
    [points, query.x, query.y, effectiveK],
  );

  // Boundary is expensive (cells × points). Cache it offscreen and only
  // recompute when the inputs that actually change it change — so dragging the
  // query never triggers a rebuild.
  const boundaryCacheRef = useRef<{
    canvas: HTMLCanvasElement | null;
    points: LabeledPoint[] | null;
    k: number;
    w: number;
    h: number;
  }>({ canvas: null, points: null, k: 0, w: 0, h: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const ensureBoundary = (w: number, h: number) => {
      const cache = boundaryCacheRef.current;
      const fresh =
        cache.canvas &&
        cache.points === points &&
        cache.k === effectiveK &&
        cache.w === w &&
        cache.h === h;
      if (fresh) return cache.canvas;

      const off = cache.canvas ?? document.createElement("canvas");
      off.width = Math.max(1, Math.round(w * dpr));
      off.height = Math.max(1, Math.round(h * dpr));
      const offCtx = off.getContext("2d");
      if (!offCtx) return null;
      offCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      offCtx.clearRect(0, 0, w, h);
      if (points.length >= 2) {
        const cols = Math.ceil(w / CELL);
        const rows = Math.ceil(h / CELL);
        for (let cx = 0; cx < cols; cx++) {
          for (let cy = 0; cy < rows; cy++) {
            const px = (cx + 0.5) * CELL;
            const py = (cy + 0.5) * CELL;
            const { cls } = predictKNN(points, px / w, py / h, effectiveK, "euclidean");
            if (cls === -1) continue;
            offCtx.fillStyle = cls === 0 ? ACCENT_RGBA : WARN_RGBA;
            offCtx.fillRect(cx * CELL, cy * CELL, CELL, CELL);
          }
        }
      }
      boundaryCacheRef.current = { canvas: off, points, k: effectiveK, w, h };
      return off;
    };

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

      const off = ensureBoundary(w, h);
      if (off) ctx.drawImage(off, 0, 0, w, h);

      // Dashed lines from query to its k closest neighbors.
      if (queryResult.neighbors.length > 0) {
        ctx.strokeStyle = "rgba(22, 24, 28, 0.45)";
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        for (const nb of queryResult.neighbors) {
          ctx.beginPath();
          ctx.moveTo(query.x * w, query.y * h);
          ctx.lineTo(nb.x * w, nb.y * h);
          ctx.stroke();
        }
        ctx.setLineDash([]);
      }

      // Training points.
      for (const p of points) {
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, 6.5, 0, Math.PI * 2);
        ctx.fillStyle = p.c === 0 ? ACCENT : WARN;
        ctx.fill();
        ctx.strokeStyle = PAPER;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Highlight ring around each chosen neighbor.
      for (const nb of queryResult.neighbors) {
        ctx.beginPath();
        ctx.arc(nb.x * w, nb.y * h, 10, 0, Math.PI * 2);
        ctx.strokeStyle = nb.c === 0 ? ACCENT : WARN;
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }

      // Query marker — open ring colored by predicted class, with a crosshair.
      ctx.beginPath();
      ctx.arc(query.x * w, query.y * h, 10, 0, Math.PI * 2);
      ctx.fillStyle = PAPER;
      ctx.fill();
      ctx.strokeStyle =
        queryResult.cls === 0 ? ACCENT : queryResult.cls === 1 ? WARN : "#9ca3af";
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.strokeStyle = "rgba(22, 24, 28, 0.4)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(query.x * w - 4, query.y * h);
      ctx.lineTo(query.x * w + 4, query.y * h);
      ctx.moveTo(query.x * w, query.y * h - 4);
      ctx.lineTo(query.x * w, query.y * h + 4);
      ctx.stroke();
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [points, effectiveK, query, queryResult]);

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    if (e.shiftKey) {
      // Shift+click — remove the nearest point if within radius, else drop a
      // new one of the active class.
      let bestIdx = -1;
      let bestD = HIT_RADIUS;
      for (let i = 0; i < extras.length; i++) {
        const d = Math.hypot(x - extras[i].x, y - extras[i].y);
        if (d < bestD) {
          bestD = d;
          bestIdx = i;
        }
      }
      if (bestIdx >= 0) {
        setExtras((pts) => pts.slice(0, bestIdx).concat(pts.slice(bestIdx + 1)));
      } else {
        setExtras((pts) => [...pts, { x, y, c: activeClass }]);
      }
      return;
    }

    // Plain click anywhere → move the query and start dragging.
    setQuery({ x, y });
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!draggingRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    setQuery({ x, y });
  };

  const onPointerUp = () => {
    draggingRef.current = false;
  };

  const reshuffle = () => {
    setExtras([]);
    setSeed((s) => s + 1);
  };

  return (
    <div className={styles.demo} id="demo">
      <div className={styles.demoHead}>
        <div className={styles.demoTitle}>
          <span className={styles.demoPill}>LIVE</span>
          Lesson 03 · k-NN, by hand
        </div>
      </div>
      <div className={styles.demoBody}>
        <div ref={wrapRef} className={styles.demoCanvasWrap}>
          <div className={styles.canvasOverlay}>
            <div>
              query · ({query.x.toFixed(2)}, {query.y.toFixed(2)}) →{" "}
              <span
                style={{
                  color:
                    queryResult.cls === 0
                      ? ACCENT
                      : queryResult.cls === 1
                      ? WARN
                      : undefined,
                }}
              >
                {queryResult.cls === 0
                  ? "A"
                  : queryResult.cls === 1
                  ? "B"
                  : "—"}
              </span>
            </div>
            <div>
              {points.length} pts · k = {effectiveK}
            </div>
          </div>
          <canvas
            ref={canvasRef}
            className={styles.canvas}
            style={{ touchAction: "none", cursor: "pointer" }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />
        </div>
        <aside className={styles.demoSide}>
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

          <div className={`${styles.sideSection} ${styles.kSection}`}>
            <div className={styles.sliderRow}>
              <div className={styles.top}>
                <span className={styles.name}>
                  Neighbors{" "}
                  <span
                    className={styles.mono}
                    style={{ color: "var(--ink-3)", fontSize: 11 }}
                  >
                    k
                  </span>
                </span>
                <span className={`${styles.val} ${styles.mono}`}>{effectiveK}</span>
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
            <div className={styles.label}>Query prediction</div>
            <div className={styles.metric}>
              <div
                className={`${styles.v} ${styles.tabular}`}
                style={{
                  color:
                    queryResult.cls === 0
                      ? ACCENT
                      : queryResult.cls === 1
                      ? WARN
                      : undefined,
                }}
              >
                {queryResult.cls === 0
                  ? "Class A"
                  : queryResult.cls === 1
                  ? "Class B"
                  : "—"}
              </div>
              <div className={styles.l}>
                from {queryResult.neighbors.length} nearest neighbor
                {queryResult.neighbors.length !== 1 ? "s" : ""}
              </div>
            </div>
          </div>

          <div className={styles.sideSection}>
            <div className={styles.label}>Train accuracy</div>
            <div className={styles.metric}>
              <div className={`${styles.v} ${styles.tabular}`}>
                {accuracy === null ? "— %" : `${(accuracy * 100).toFixed(0)}%`}
              </div>
              <div className={styles.l}>leave-one-out</div>
            </div>
          </div>

          <div className={styles.sideActions}>
            <button className={styles.miniBtn} onClick={() => setExtras([])}>
              Clear extras
            </button>
            <button className={styles.miniBtn} onClick={reshuffle}>
              Reshuffle
            </button>
          </div>
        </aside>
      </div>
      <div className={styles.canvasHelp}>
        drag to move the query · shift+click to drop / remove a point
      </div>
    </div>
  );
}
