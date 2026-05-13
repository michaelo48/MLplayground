type Series = {
  losses: number[];
  color: string;
  label: string;
  highlighted?: boolean;
  dashed?: boolean;
};

type Props = {
  width: number;
  height: number;
  /** Single trajectory — kept for the static landing-card preview. */
  trajectory?: number[];
  /** Multiple labeled series. Drawn after `trajectory` if both are passed. */
  series?: Series[];
  /** When set, every series draws only up to this index but the x-axis stays
   *  pinned to the full series length, so the curve grows left-to-right. */
  maxIndex?: number;
  color?: string;
};

function defaultPath(points: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let i = 0; i < points; i++) {
    const t = i / (points - 1);
    const v = Math.exp(-t * 4) * 0.95 + 0.05 + Math.sin(t * 12) * 0.02 * (1 - t);
    out.push([t, v]);
  }
  return out;
}

// Coordinates are quantized to 2 decimals before being stringified. Without
// rounding, SSR-vs-client floating-point jitter (e.g. Math.pow variance in
// Adam's bias correction) leaks into the SVG `d` attribute and triggers a
// React hydration mismatch — sub-pixel precision is enough for rendering.
function q(n: number) {
  return (Math.round(n * 100) / 100).toString();
}

function pathFor(
  losses: number[],
  pad: number,
  w: number,
  h: number,
  max: number,
  xDenom: number,
  upTo: number,
) {
  const denom = max || 1;
  const last = Math.min(losses.length - 1, upTo);
  let out = "";
  for (let i = 0; i <= last; i++) {
    const t = i / xDenom;
    const norm = Math.min(1, Math.max(0, losses[i] / denom));
    out += `${i === 0 ? "M" : "L"} ${q(pad + t * w)} ${q(pad + (1 - norm) * h)} `;
  }
  return out;
}

export function LossCurve({
  width,
  height,
  trajectory,
  series,
  maxIndex,
  color = "#7c3aed",
}: Props) {
  const pad = 18;
  const legendH = series && series.length > 0 ? 18 : 0;
  const w = width - pad * 2;
  const h = height - pad * 2 - legendH;

  // Multi-series mode.
  if (series && series.length > 0) {
    // Cap each curve at 2x the largest *initial* loss so a divergent SGD
    // doesn't compress the rest of the plot to a flat line.
    const initialMax = Math.max(...series.map((s) => s.losses[0] ?? 0));
    const cap = initialMax > 0 ? initialMax * 2 : 1;
    const fullLen = Math.max(...series.map((s) => s.losses.length));
    const xDenom = Math.max(1, fullLen - 1);
    const upTo = maxIndex ?? fullLen - 1;
    return (
      <svg width={width} height={height} className="block h-auto max-w-full">
        <rect x={0} y={0} width={width} height={height} fill="#fafafa" />
        <line x1={pad} y1={pad + h} x2={pad + w} y2={pad + h} stroke="#e4e4e7" />
        <line x1={pad} y1={pad} x2={pad} y2={pad + h} stroke="#e4e4e7" />
        {/* Draw non-highlighted first so the selected line sits on top. */}
        {[...series]
          .sort((a, b) => Number(!!a.highlighted) - Number(!!b.highlighted))
          .map((s) => {
            const d = pathFor(s.losses, pad, w, h, cap, xDenom, upTo);
            const op = s.highlighted ? 1 : 0.35;
            const sw = s.highlighted ? 2 : 1.2;
            return (
              <path
                key={s.label}
                d={d}
                stroke={s.color}
                strokeWidth={sw}
                fill="none"
                opacity={op}
                strokeDasharray={s.dashed ? "4 3" : undefined}
              />
            );
          })}
        {/* Legend */}
        <g transform={`translate(${pad}, ${pad + h + 10})`}>
          {series.map((s, i) => {
            const x = i * 76;
            return (
              <g key={s.label} transform={`translate(${x}, 0)`}>
                <line
                  x1={0}
                  y1={4}
                  x2={12}
                  y2={4}
                  stroke={s.color}
                  strokeWidth={s.highlighted ? 2.5 : 1.5}
                  strokeDasharray={s.dashed ? "3 2" : undefined}
                  opacity={s.highlighted ? 1 : 0.6}
                />
                <text
                  x={16}
                  y={7}
                  fontSize={10}
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                  fill={s.highlighted ? "#18181b" : "#71717a"}
                >
                  {s.label}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    );
  }

  // Single-trajectory or default-preview mode (unchanged behavior).
  let path: Array<[number, number]>;
  if (trajectory && trajectory.length > 1) {
    const max = Math.max(...trajectory) || 1;
    path = trajectory.map((v, i) => [i / (trajectory.length - 1), v / max]);
  } else {
    path = defaultPath(60);
  }
  const d = path
    .map(([t, v], i) => `${i === 0 ? "M" : "L"} ${q(pad + t * w)} ${q(pad + (1 - v) * h)}`)
    .join(" ");
  const last = path[path.length - 1];

  return (
    <svg width={width} height={height} className="block h-auto max-w-full">
      <rect x={0} y={0} width={width} height={height} fill="#fafafa" />
      <line x1={pad} y1={pad + h} x2={pad + w} y2={pad + h} stroke="#e4e4e7" />
      <line x1={pad} y1={pad} x2={pad} y2={pad + h} stroke="#e4e4e7" />
      <path d={d} stroke={color} strokeWidth={1.8} fill="none" />
      <circle cx={pad + w} cy={q(pad + (1 - last[1]) * h)} r={3} fill={color} />
    </svg>
  );
}
