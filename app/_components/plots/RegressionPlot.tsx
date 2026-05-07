import type { Point } from "../../_lib/sample-data";

type Palette = "violet" | "amber" | "sky";

type Props = {
  width: number;
  height: number;
  points: Point[];
  slope: number;
  intercept: number;
  showResiduals?: boolean;
  showGrid?: boolean;
  // ±sigma band around the regression line (translucent fill).
  bandSigma?: number;
  palette?: Palette;
  dataDots?: "ink" | "mute";
};

const lineColors: Record<Palette, string> = {
  violet: "#7c3aed",
  amber: "#d97706",
  sky: "#0ea5e9",
};

export function RegressionPlot({
  width,
  height,
  points,
  slope,
  intercept,
  showResiduals = false,
  showGrid = true,
  bandSigma,
  palette = "violet",
  dataDots = "ink",
}: Props) {
  const pad = 24;
  const w = width - pad * 2;
  const h = height - pad * 2;
  const lineColor = lineColors[palette];
  const dotColor = dataDots === "ink" ? "#0a0a0a" : "#52525b";
  const proj = (x: number, y: number): [number, number] => [pad + x * w, pad + h - y * h];
  const [ax, ay] = proj(0, intercept);
  const [bx, by] = proj(1, slope * 1 + intercept);

  const grid: React.ReactNode[] = [];
  if (showGrid) {
    for (let i = 1; i < 5; i++) {
      grid.push(
        <line
          key={`vg${i}`}
          x1={pad + (i / 5) * w}
          x2={pad + (i / 5) * w}
          y1={pad}
          y2={pad + h}
          stroke="#f4f4f5"
        />,
      );
      grid.push(
        <line
          key={`hg${i}`}
          x1={pad}
          x2={pad + w}
          y1={pad + (i / 5) * h}
          y2={pad + (i / 5) * h}
          stroke="#f4f4f5"
        />,
      );
    }
  }

  let band: React.ReactNode = null;
  if (bandSigma && bandSigma > 0) {
    const [tlx, tly] = proj(0, intercept + bandSigma);
    const [trx, try_] = proj(1, slope + intercept + bandSigma);
    const [brx, bry] = proj(1, slope + intercept - bandSigma);
    const [blx, bly] = proj(0, intercept - bandSigma);
    band = (
      <polygon
        points={`${tlx},${tly} ${trx},${try_} ${brx},${bry} ${blx},${bly}`}
        fill={lineColor}
        fillOpacity={0.08}
      />
    );
  }

  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const tickLen = 4;

  return (
    <svg width={width} height={height} className="block h-auto max-w-full">
      <rect x={0} y={0} width={width} height={height} fill="#fff" />
      {grid}
      {band}
      {/* X & Y axes */}
      <line
        x1={pad}
        y1={pad + h}
        x2={pad + w}
        y2={pad + h}
        stroke="#52525b"
        strokeWidth={1.2}
      />
      <line
        x1={pad}
        y1={pad}
        x2={pad}
        y2={pad + h}
        stroke="#52525b"
        strokeWidth={1.2}
      />
      {/* X-axis ticks + labels */}
      {ticks.map((t) => {
        const x = pad + t * w;
        return (
          <g key={`xt${t}`}>
            <line x1={x} y1={pad + h} x2={x} y2={pad + h + tickLen} stroke="#52525b" />
            <text
              x={x}
              y={pad + h + tickLen + 10}
              textAnchor="middle"
              fontSize={9}
              fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              fill="#71717a"
            >
              {t}
            </text>
          </g>
        );
      })}
      {/* Y-axis ticks + labels */}
      {ticks.map((t) => {
        const y = pad + h - t * h;
        return (
          <g key={`yt${t}`}>
            <line x1={pad - tickLen} y1={y} x2={pad} y2={y} stroke="#52525b" />
            <text
              x={pad - tickLen - 3}
              y={y + 3}
              textAnchor="end"
              fontSize={9}
              fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              fill="#71717a"
            >
              {t}
            </text>
          </g>
        );
      })}
      <line
        x1={ax}
        y1={ay}
        x2={bx}
        y2={by}
        stroke={lineColor}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
      {showResiduals &&
        points.map((p, i) => {
          const [px, py] = proj(p.x, p.y);
          const yhat = slope * p.x + intercept;
          const [, pyh] = proj(p.x, yhat);
          return (
            <line
              key={`r${i}`}
              x1={px}
              y1={py}
              x2={px}
              y2={pyh}
              stroke={lineColor}
              strokeOpacity={0.25}
              strokeDasharray="2 2"
            />
          );
        })}
      {points.map((p, i) => {
        const [px, py] = proj(p.x, p.y);
        return <circle key={i} cx={px} cy={py} r={3.2} fill={dotColor} />;
      })}
    </svg>
  );
}
