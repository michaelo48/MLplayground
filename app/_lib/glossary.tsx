import type { ReactNode } from "react";

type Entry = { term: string; definition: ReactNode };

export const glossary: Record<string, Entry> = {
  dataset: {
    term: "Dataset",
    definition:
      "A collection of training examples — here, (x, y) pairs the model tries to fit a line through.",
  },
  noise: {
    term: "Noise (σ)",
    definition:
      "Random scatter added to each y. Larger σ means more spread around the underlying line, so the fit is harder and the residuals grow.",
  },
  residuals: {
    term: "Residuals",
    definition:
      "The vertical gap between each observed point and the model's prediction. Squared and averaged, residuals are exactly what the loss penalizes.",
  },
  confidenceBand: {
    term: "Confidence band",
    definition:
      "A ±1σ band around the fitted line, where σ is the standard deviation of the residuals. Roughly two thirds of points should land inside it.",
  },
  optimizer: {
    term: "Optimizer",
    definition: (
      <>
        <p className="mb-2">
          The algorithm that adjusts the model&apos;s parameters to lower the loss. Different
          optimizers trade off speed, memory, and stability.
        </p>
        <ul className="space-y-1 text-zinc-600">
          <li>
            <b className="text-zinc-900">OLS</b> — exact closed-form solution, no iteration needed.
          </li>
          <li>
            <b className="text-zinc-900">GD</b> — iterative steps in the gradient direction.
          </li>
          <li>
            <b className="text-zinc-900">SGD</b> — like GD, but one random example per step.
          </li>
          <li>
            <b className="text-zinc-900">Adam</b> — adaptive per-parameter learning rates.
          </li>
        </ul>
      </>
    ),
  },
  learningRate: {
    term: "Learning rate",
    definition:
      "How big a step the optimizer takes in the gradient direction each iteration. Too small and training crawls; too large and it overshoots or diverges.",
  },
  epochs: {
    term: "Epochs",
    definition:
      "One epoch is one full pass over the dataset. More epochs give the optimizer more chances to refine its parameters — at the cost of compute.",
  },
  mse: {
    term: "Mean squared error",
    definition:
      "The average of (y − ŷ)² across the dataset. Lower is better. Sensitive to outliers because the errors are squared.",
  },
  r2: {
    term: "R² · coefficient of determination",
    definition:
      "The fraction of variance in y that the model explains. 1.0 is a perfect fit; 0 means the model is no better than predicting the mean; negative means it's worse.",
  },
  k: {
    term: "k · neighbors",
    definition: (
      <>
        <p className="mb-2">
          How many nearest training points get a vote on the query&apos;s class.
        </p>
        <ul className="space-y-1 text-zinc-600">
          <li>
            <b className="text-zinc-900">Small k</b> — jagged boundary, fits noise, high variance.
          </li>
          <li>
            <b className="text-zinc-900">Large k</b> — smooth boundary, can blur small clusters,
            high bias.
          </li>
        </ul>
      </>
    ),
  },
  distanceMetric: {
    term: "Distance metric",
    definition: (
      <>
        <p className="mb-2">How &ldquo;close&rdquo; two points are.</p>
        <ul className="space-y-1 text-zinc-600">
          <li>
            <b className="text-zinc-900">Euclidean (L²)</b> — straight-line distance,{" "}
            <span className="font-mono">√(Δx² + Δy²)</span>. The default.
          </li>
          <li>
            <b className="text-zinc-900">Manhattan (L¹)</b> —{" "}
            <span className="font-mono">|Δx| + |Δy|</span>. Prefers axis-aligned neighborhoods.
          </li>
        </ul>
      </>
    ),
  },
  decisionBoundary: {
    term: "Decision boundary",
    definition:
      "The frontier between regions classified as one class vs. the other. For kNN it's a Voronoi-like patchwork — sharp and irregular near the data, smoothing out as k grows.",
  },
  looAccuracy: {
    term: "Leave-one-out accuracy",
    definition:
      "For each training point, predict its class using all the others. Honest because using a point to predict itself would always score 100% at k = 1.",
  },
  centroid: {
    term: "Centroid",
    definition:
      "The mean position of all points currently assigned to a cluster. K-means alternates between assigning points to the nearest centroid and moving each centroid to the mean of its assigned points.",
  },
  inertia: {
    term: "Inertia · within-cluster sum of squares",
    definition:
      "The sum of squared distances from each point to its assigned centroid. K-means tries to minimize this — every assignment and update step is guaranteed to lower it (or leave it unchanged).",
  },
  kmeansK: {
    term: "k · clusters",
    definition: (
      <>
        <p className="mb-2">
          The number of clusters to find. Unlike kNN this is a structural choice — k-means
          will always find <em>exactly</em> k groups, even if the data has fewer (or more) natural
          ones.
        </p>
        <p className="text-zinc-600">
          Common heuristics: the elbow plot of inertia vs k, or the silhouette score.
        </p>
      </>
    ),
  },
  lloyds: {
    term: "Lloyd's algorithm",
    definition:
      "The standard procedure for k-means: pick initial centroids → assign each point to its nearest centroid → move each centroid to the mean of its assignees → repeat until assignments stop changing.",
  },
  maxDepth: {
    term: "Max depth",
    definition: (
      <>
        <p className="mb-2">
          The longest chain of splits the tree is allowed to grow. Each level doubles the worst-case
          number of leaves, so depth controls capacity directly.
        </p>
        <ul className="space-y-1 text-zinc-600">
          <li>
            <b className="text-zinc-900">Shallow</b> — broad regions, high bias, ignores fine
            structure.
          </li>
          <li>
            <b className="text-zinc-900">Deep</b> — tight regions, fits training noise, high
            variance.
          </li>
        </ul>
      </>
    ),
  },
  minSamplesLeaf: {
    term: "Min samples / leaf",
    definition:
      "A split is only allowed if both children would still contain at least this many points. Acts as a soft regularizer — stops the tree from carving a tile around every isolated point.",
  },
  criterion: {
    term: "Split criterion",
    definition: (
      <>
        <p className="mb-2">
          The impurity measure the tree minimises when picking each split. Both reward pure children;
          the difference is mostly cosmetic on real data.
        </p>
        <ul className="space-y-1 text-zinc-600">
          <li>
            <b className="text-zinc-900">Gini</b> — 1 − Σ pₖ². Cheaper, used by CART/sklearn default.
          </li>
          <li>
            <b className="text-zinc-900">Entropy</b> — −Σ pₖ log pₖ. The information-theoretic measure
            (used by ID3/C4.5).
          </li>
        </ul>
      </>
    ),
  },
};
