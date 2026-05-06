export type Family = "Supervised" | "Unsupervised" | "Neural";

const map: Record<Family, string> = {
  Supervised: "pill-supervised",
  Unsupervised: "pill-unsupervised",
  Neural: "pill-neural",
};

export function FamilyPill({ family }: { family: Family }) {
  return <span className={`pill ${map[family]}`}>{family}</span>;
}
