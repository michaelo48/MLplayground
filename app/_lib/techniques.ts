import type { Family } from "../_components/FamilyPill";

export type Technique = {
  slug: string;
  name: string;
  family: Family;
  blurb: string;
  meta: string;
};

export const techniques: Technique[] = [
  {
    slug: "linear-regression",
    name: "Linear Regression",
    family: "Supervised",
    blurb: "Fit a line to noisy points. Watch the loss surface descend in real time.",
    meta: "fundamentals · 4 min",
  },
  {
    slug: "k-nearest-neighbors",
    name: "k-Nearest Neighbors",
    family: "Supervised",
    blurb: "Drop a point on the plane. See which neighbors decide its class — and why.",
    meta: "intuitive · 5 min",
  },
  {
    slug: "decision-trees",
    name: "Decision Trees",
    family: "Supervised",
    blurb: "Grow a tree split by split. Toggle depth and impurity to see overfitting unfold.",
    meta: "tree-based · 6 min",
  },
  {
    slug: "k-means",
    name: "k-Means Clustering",
    family: "Unsupervised",
    blurb: "Step through Lloyd's algorithm. Move centroids by hand and re-run the assignment.",
    meta: "clustering · 5 min",
  },
  {
    slug: "principal-components",
    name: "Principal Components",
    family: "Unsupervised",
    blurb: "Rotate a high-dimensional cloud into the directions that matter most.",
    meta: "dim. reduction · 6 min",
  },
];

export const familyDescriptions: Record<Family, string> = {
  Supervised: "labeled inputs → predicted output",
  Unsupervised: "find structure in unlabeled data",
};

export function techniqueBySlug(slug: string) {
  return techniques.find((t) => t.slug === slug);
}
