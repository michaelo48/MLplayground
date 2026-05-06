type Props = {
  width: number;
  height: number;
  color?: string;
  points?: number;
};

export function LossCurve({ width, height, color = "#7c3aed", points = 60 }: Props) {
  const pad = 18;
  const w = width - pad * 2;
  const h = height - pad * 2;
  const path: Array<[number, number]> = [];
  for (let i = 0; i < points; i++) {
    const t = i / (points - 1);
    const v = Math.exp(-t * 4) * 0.95 + 0.05 + Math.sin(t * 12) * 0.02 * (1 - t);
    path.push([t, v]);
  }
  const d = path
    .map(([t, v], i) => `${i === 0 ? "M" : "L"} ${pad + t * w} ${pad + (1 - v) * h}`)
    .join(" ");
  const last = path[path.length - 1];
  return (
    <svg width={width} height={height} className="block">
      <rect x={0} y={0} width={width} height={height} fill="#fafafa" />
      <line x1={pad} y1={pad + h} x2={pad + w} y2={pad + h} stroke="#e4e4e7" />
      <line x1={pad} y1={pad} x2={pad} y2={pad + h} stroke="#e4e4e7" />
      <path d={d} stroke={color} strokeWidth={1.8} fill="none" />
      <circle cx={pad + w} cy={pad + (1 - last[1]) * h} r={3} fill={color} />
    </svg>
  );
}
