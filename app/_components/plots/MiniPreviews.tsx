import { mulberry32, samplePoints } from "../../_lib/sample-data";
import { RegressionPlot } from "./RegressionPlot";

type SizeProps = { width: number; height: number };

export function KNNMini({ width, height }: SizeProps) {
  const rand = mulberry32(11);
  const pts: Array<{ x: number; y: number; c: number }> = [];
  for (let i = 0; i < 32; i++) {
    const cls = i % 3;
    const cx = [0.25, 0.55, 0.78][cls];
    const cy = [0.6, 0.35, 0.65][cls];
    pts.push({ x: cx + (rand() - 0.5) * 0.18, y: cy + (rand() - 0.5) * 0.22, c: cls });
  }
  const colors = ["#10b981", "#0ea5e9", "#7c3aed"];
  return (
    <svg width={width} height={height} className="block h-auto max-w-full">
      <rect x={0} y={0} width={width} height={height} fill="#fff" />
      {pts.map((p, i) => (
        <circle
          key={i}
          cx={p.x * width}
          cy={p.y * height}
          r={3.5}
          fill={colors[p.c]}
          fillOpacity={0.85}
        />
      ))}
      <circle cx={0.62 * width} cy={0.5 * height} r={6} fill="#0a0a0a" />
      <circle
        cx={0.62 * width}
        cy={0.5 * height}
        r={26}
        fill="none"
        stroke="#0a0a0a"
        strokeDasharray="3 3"
      />
    </svg>
  );
}

export function TreeMini({ width: w, height: h }: SizeProps) {
  return (
    <svg width={w} height={h} className="block h-auto max-w-full">
      <rect x={0} y={0} width={w} height={h} fill="#fff" />
      <rect x={0} y={0} width={w * 0.55} height={h} fill="rgba(16,185,129,0.10)" />
      <rect x={w * 0.55} y={0} width={w * 0.45} height={h * 0.5} fill="rgba(14,165,233,0.10)" />
      <rect x={w * 0.55} y={h * 0.5} width={w * 0.45} height={h * 0.5} fill="rgba(124,58,237,0.10)" />
      <line x1={w * 0.55} y1={0} x2={w * 0.55} y2={h} stroke="#0a0a0a" strokeWidth={1.4} />
      <line x1={w * 0.55} y1={h * 0.5} x2={w} y2={h * 0.5} stroke="#0a0a0a" strokeWidth={1.4} />
      {Array.from({ length: 30 }).map((_, i) => {
        const r = mulberry32(i + 13);
        const x = r();
        const y = r();
        return <circle key={i} cx={x * w} cy={y * h} r={2.5} fill="#0a0a0a" fillOpacity={0.55} />;
      })}
    </svg>
  );
}

export function KMeansMini({ width, height }: SizeProps) {
  const rand = mulberry32(21);
  const centers: Array<[number, number]> = [
    [0.25, 0.55],
    [0.55, 0.3],
    [0.78, 0.66],
  ];
  const colors = ["#10b981", "#0ea5e9", "#d97706"];
  const pts: Array<{ x: number; y: number; c: number }> = [];
  centers.forEach((c, ci) => {
    for (let i = 0; i < 14; i++) {
      pts.push({ x: c[0] + (rand() - 0.5) * 0.2, y: c[1] + (rand() - 0.5) * 0.22, c: ci });
    }
  });
  return (
    <svg width={width} height={height} className="block h-auto max-w-full">
      <rect x={0} y={0} width={width} height={height} fill="#fff" />
      {pts.map((p, i) => (
        <circle
          key={i}
          cx={p.x * width}
          cy={p.y * height}
          r={3}
          fill={colors[p.c]}
          fillOpacity={0.7}
        />
      ))}
      {centers.map((c, i) => (
        <g key={i}>
          <circle
            cx={c[0] * width}
            cy={c[1] * height}
            r={9}
            fill="#fff"
            stroke={colors[i]}
            strokeWidth={2.4}
          />
          <line
            x1={c[0] * width - 5}
            y1={c[1] * height}
            x2={c[0] * width + 5}
            y2={c[1] * height}
            stroke={colors[i]}
            strokeWidth={2}
          />
          <line
            x1={c[0] * width}
            y1={c[1] * height - 5}
            x2={c[0] * width}
            y2={c[1] * height + 5}
            stroke={colors[i]}
            strokeWidth={2}
          />
        </g>
      ))}
    </svg>
  );
}

export function PCAMini({ width, height }: SizeProps) {
  const rand = mulberry32(33);
  const pts: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < 50; i++) {
    const t = rand();
    const noise = (rand() - 0.5) * 0.15;
    const angle = -0.5;
    const x = 0.5 + (t - 0.5) * 0.6 * Math.cos(angle) - noise * Math.sin(angle);
    const y = 0.5 + (t - 0.5) * 0.6 * Math.sin(angle) + noise * Math.cos(angle);
    pts.push({ x, y });
  }
  return (
    <svg width={width} height={height} className="block h-auto max-w-full">
      <rect x={0} y={0} width={width} height={height} fill="#fff" />
      {pts.map((p, i) => (
        <circle
          key={i}
          cx={p.x * width}
          cy={p.y * height}
          r={3}
          fill="#0a0a0a"
          fillOpacity={0.55}
        />
      ))}
      <line
        x1={0.18 * width}
        y1={0.78 * height}
        x2={0.82 * width}
        y2={0.22 * height}
        stroke="#7c3aed"
        strokeWidth={2.2}
      />
      <line
        x1={0.42 * width}
        y1={0.32 * height}
        x2={0.58 * width}
        y2={0.68 * height}
        stroke="#7c3aed"
        strokeWidth={2.2}
        strokeOpacity={0.45}
      />
    </svg>
  );
}

const previewMap: Record<string, (s: SizeProps) => React.ReactNode> = {
  "Linear Regression": ({ width, height }) => (
    <RegressionPlot
      width={width}
      height={height}
      points={samplePoints}
      slope={0.62}
      intercept={0.18}
    />
  ),
  "k-Nearest Neighbors": (s) => <KNNMini {...s} />,
  "Decision Trees": (s) => <TreeMini {...s} />,
  "k-Means Clustering": (s) => <KMeansMini {...s} />,
  "Principal Components": (s) => <PCAMini {...s} />,
};

export function MiniPreview({ kind, width, height }: SizeProps & { kind: string }) {
  const render = previewMap[kind];
  return render ? <>{render({ width, height })}</> : null;
}
