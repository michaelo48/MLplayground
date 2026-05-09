export type Family = "Supervised" | "Unsupervised";

const map: Record<Family, string> = {
  Supervised: "pill-supervised",
  Unsupervised: "pill-unsupervised",
};

export function FamilyPill({ family }: { family: Family }) {
  return <span className={`pill ${map[family]}`}>{family}</span>;
}
