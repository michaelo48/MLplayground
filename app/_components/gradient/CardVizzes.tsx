// Card mini-vizzes for the Gradient-style homepage. Pure SVG, deterministic
// (seeded PRNG) so server and client renders match.

import { mulberry32 } from "../../_lib/sample-data";

const ACCENT = "oklch(0.62 0.18 250)";
const WARN = "oklch(0.72 0.16 60)";
const INK = "#16181c";

function svgWrap(children: React.ReactNode, key?: string) {
  return (
    <svg
      key={key}
      width="100%"
      height="100%"
      viewBox="0 0 400 200"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {children}
    </svg>
  );
}

export function VizLinear() {
  // Wider viewBox + aspect-preserving scaling (instead of svgWrap's
  // preserve="none") so dots stay circles in the feature card, which is
  // ~3.5:1 — much wider than the default 2:1 viewBox.
  const rand = mulberry32(101);
  const dots: React.ReactNode[] = [];
  for (let i = 0; i < 30; i++) {
    const x = 25 + i * 25;
    const ideal = 175 - i * 4.5;
    const y = ideal + (rand() - 0.5) * 26;
    dots.push(<circle key={i} cx={x} cy={+y.toFixed(1)} r={3.5} fill={ACCENT} />);
  }
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 800 200"
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id="vizLinearGrid" width="32" height="32" patternUnits="userSpaceOnUse">
          <path d="M 32 0 L 0 0 0 32" fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth={1} />
        </pattern>
      </defs>
      <rect width={800} height={200} fill="url(#vizLinearGrid)" />
      <line x1={20} y1={180} x2={780} y2={32} stroke={INK} strokeWidth={2} />
      {dots}
    </svg>
  );
}

export function VizSigmoid() {
  let path = "M 0 180 ";
  for (let x = 0; x <= 400; x += 4) {
    const xn = (x - 200) / 35;
    const y = 180 - 160 / (1 + Math.exp(-xn));
    path += `L ${x} ${y.toFixed(1)} `;
  }
  return svgWrap(
    <>
      <line x1={0} y1={100} x2={400} y2={100} stroke="rgba(0,0,0,0.12)" strokeDasharray="3 3" />
      <line x1={200} y1={0} x2={200} y2={200} stroke="rgba(0,0,0,0.12)" strokeDasharray="3 3" />
      <path d={path} fill="none" stroke={ACCENT} strokeWidth={2.5} />
      <circle cx={200} cy={100} r={4} fill={INK} />
    </>,
  );
}

export function VizTree() {
  return svgWrap(
    <>
      <line x1={200} y1={40} x2={110} y2={100} stroke={INK} strokeWidth={1.5} />
      <line x1={200} y1={40} x2={290} y2={100} stroke={INK} strokeWidth={1.5} />
      <line x1={110} y1={100} x2={60} y2={160} stroke={INK} strokeWidth={1.5} />
      <line x1={110} y1={100} x2={160} y2={160} stroke={INK} strokeWidth={1.5} />
      <line x1={290} y1={100} x2={240} y2={160} stroke={INK} strokeWidth={1.5} />
      <line x1={290} y1={100} x2={340} y2={160} stroke={INK} strokeWidth={1.5} />
      <circle cx={200} cy={40} r={14} fill={INK} />
      <circle cx={110} cy={100} r={11} fill={INK} opacity={0.7} />
      <circle cx={290} cy={100} r={11} fill={INK} opacity={0.7} />
      <circle cx={60} cy={160} r={9} fill={ACCENT} />
      <circle cx={160} cy={160} r={9} fill={WARN} />
      <circle cx={240} cy={160} r={9} fill={ACCENT} />
      <circle cx={340} cy={160} r={9} fill={WARN} />
    </>,
  );
}

export function VizForest() {
  const trees: React.ReactNode[] = [];
  for (let t = 0; t < 5; t++) {
    const ox = 30 + t * 75;
    const op = 0.4 + t * 0.12;
    const opMid = 0.3 + t * 0.12;
    const opLeaf = 0.5 + t * 0.1;
    trees.push(
      <g key={t}>
        <line x1={ox} y1={40} x2={ox - 22} y2={90} stroke={INK} strokeWidth={1.2} opacity={op} />
        <line x1={ox} y1={40} x2={ox + 22} y2={90} stroke={INK} strokeWidth={1.2} opacity={op} />
        <line x1={ox - 22} y1={90} x2={ox - 32} y2={150} stroke={INK} strokeWidth={1.2} opacity={op} />
        <line x1={ox - 22} y1={90} x2={ox - 12} y2={150} stroke={INK} strokeWidth={1.2} opacity={op} />
        <line x1={ox + 22} y1={90} x2={ox + 12} y2={150} stroke={INK} strokeWidth={1.2} opacity={op} />
        <line x1={ox + 22} y1={90} x2={ox + 32} y2={150} stroke={INK} strokeWidth={1.2} opacity={op} />
        <circle cx={ox} cy={40} r={6} fill={INK} opacity={op} />
        <circle cx={ox - 22} cy={90} r={5} fill={INK} opacity={opMid} />
        <circle cx={ox + 22} cy={90} r={5} fill={INK} opacity={opMid} />
        <circle cx={ox - 32} cy={150} r={4} fill={ACCENT} opacity={opLeaf} />
        <circle cx={ox - 12} cy={150} r={4} fill={WARN} opacity={opLeaf} />
        <circle cx={ox + 12} cy={150} r={4} fill={ACCENT} opacity={opLeaf} />
        <circle cx={ox + 32} cy={150} r={4} fill={WARN} opacity={opLeaf} />
      </g>,
    );
  }
  return svgWrap(<>{trees}</>);
}

export function VizPCA() {
  const rand = mulberry32(303);
  const dots: React.ReactNode[] = [];
  for (let i = 0; i < 60; i++) {
    const t = (rand() - 0.5) * 2;
    const noise = (rand() - 0.5) * 0.4;
    const x = 200 + t * 140 + noise * 40;
    const y = 100 + t * 60 + noise * 60;
    dots.push(<circle key={i} cx={+x.toFixed(1)} cy={+y.toFixed(1)} r={3} fill={ACCENT} opacity={0.85} />);
  }
  return svgWrap(
    <>
      {dots}
      <line x1={60} y1={40} x2={340} y2={160} stroke={INK} strokeWidth={2} />
      <line x1={120} y1={170} x2={280} y2={30} stroke={INK} strokeWidth={1.2} strokeDasharray="4 4" opacity={0.5} />
      <text x={350} y={155} fontFamily="var(--mono)" fontSize={10} fill={INK}>PC1</text>
    </>,
  );
}

export function VizKNN() {
  const rand = mulberry32(404);
  const dots: React.ReactNode[] = [];
  for (let i = 0; i < 14; i++) {
    const x = 30 + rand() * 340;
    const y = 20 + rand() * 160;
    const c = x < 200 ? 0 : 1;
    dots.push(
      <circle key={i} cx={+x.toFixed(1)} cy={+y.toFixed(1)} r={4} fill={c === 0 ? ACCENT : WARN} />,
    );
  }
  return svgWrap(
    <>
      {dots}
      <circle cx={200} cy={100} r={6} fill={INK} />
      <circle cx={200} cy={100} r={48} fill="none" stroke={INK} strokeWidth={1} strokeDasharray="4 4" opacity={0.5} />
    </>,
  );
}

export function VizCluster() {
  const blobs = [
    { cx: 25, cy: 35, color: ACCENT },
    { cx: 18, cy: 45, color: ACCENT },
    { cx: 30, cy: 50, color: ACCENT },
    { cx: 22, cy: 55, color: ACCENT },
    { cx: 70, cy: 35, color: WARN },
    { cx: 78, cy: 45, color: WARN },
    { cx: 72, cy: 55, color: WARN },
    { cx: 50, cy: 80, color: "oklch(0.62 0.14 155)" },
    { cx: 42, cy: 85, color: "oklch(0.62 0.14 155)" },
    { cx: 58, cy: 87, color: "oklch(0.62 0.14 155)" },
  ];
  const rand = mulberry32(505);
  return svgWrap(
    <>
      {blobs.flatMap((b, bi) => {
        const out: React.ReactNode[] = [];
        for (let i = 0; i < 8; i++) {
          out.push(
            <circle
              key={`${bi}-${i}`}
              cx={b.cx * 4 + (rand() - 0.5) * 40}
              cy={b.cy * 2 + (rand() - 0.5) * 26}
              r={3 + rand() * 2}
              fill={b.color}
              opacity={0.7}
            />,
          );
        }
        return out;
      })}
    </>,
  );
}
