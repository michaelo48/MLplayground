import {
  type Class,
  type LabeledPoint,
  generateBlobs,
  generateChecker,
  generateMoons,
  generateSpirals,
} from "./datasets";

export type Criterion = "gini" | "entropy";
// 0 = x, 1 = y. We restrict to 2-D axis-aligned splits.
export type TreeFeature = 0 | 1;

export const criterionLabels: Record<Criterion, string> = {
  gini: "Gini",
  entropy: "Entropy",
};

export type TreeNode = {
  id: number; // assigned in creation order, root = 0
  depth: number;
  pointIdx: number[]; // indices into the source points array
  cls: Class; // majority class of node's samples
  // Fraction of node's samples that match `cls`. 0.5 = totally mixed,
  // 1.0 = pure. Used for tinting and for the leaf-info readout.
  purity: number;
  // Bounding box in [0, 1] feature space inherited from the path of splits
  // taken to reach this node. Splits drawn on the canvas live inside this box.
  xmin: number;
  xmax: number;
  ymin: number;
  ymax: number;
  split?: {
    feature: TreeFeature;
    threshold: number;
    gain: number;
    left: TreeNode;
    right: TreeNode;
  };
};

export type BuildOptions = {
  maxDepth: number;
  minSamplesLeaf: number;
  criterion: Criterion;
};

export type BuiltTree = {
  root: TreeNode;
  // IDs of internal nodes in the order their split was applied (best-first by
  // impurity gain). The playground's frame index is an offset into this list.
  splitOrder: number[];
  totalSplits: number;
};

function impurity(a: number, b: number, criterion: Criterion): number {
  const n = a + b;
  if (n === 0) return 0;
  const pa = a / n;
  const pb = b / n;
  if (criterion === "gini") return 1 - pa * pa - pb * pb;
  // Shannon entropy in nats. 0 * log(0) = 0 by convention.
  let h = 0;
  if (pa > 0) h -= pa * Math.log(pa);
  if (pb > 0) h -= pb * Math.log(pb);
  return h;
}

function majority(idx: number[], points: LabeledPoint[]): { cls: Class; purity: number } {
  if (idx.length === 0) return { cls: 0, purity: 1 };
  let a = 0;
  let b = 0;
  for (const i of idx) (points[i].c === 0 ? a++ : b++);
  const cls: Class = a >= b ? 0 : 1;
  return { cls, purity: Math.max(a, b) / idx.length };
}

function featureOf(p: LabeledPoint, f: TreeFeature): number {
  return f === 0 ? p.x : p.y;
}

type BestSplit = { feature: TreeFeature; threshold: number; gain: number };

function findBestSplit(
  node: TreeNode,
  points: LabeledPoint[],
  options: BuildOptions,
): BestSplit | null {
  if (node.pointIdx.length < 2 * options.minSamplesLeaf) return null;

  let totalA = 0;
  let totalB = 0;
  for (const i of node.pointIdx) (points[i].c === 0 ? totalA++ : totalB++);
  const parentImp = impurity(totalA, totalB, options.criterion);
  if (parentImp === 0) return null;

  let best: BestSplit | null = null;

  for (const f of [0, 1] as TreeFeature[]) {
    const sorted = node.pointIdx
      .slice()
      .sort((i, j) => featureOf(points[i], f) - featureOf(points[j], f));
    let leftA = 0;
    let leftB = 0;
    let rightA = totalA;
    let rightB = totalB;
    for (let i = 0; i < sorted.length - 1; i++) {
      const here = points[sorted[i]];
      if (here.c === 0) {
        leftA++;
        rightA--;
      } else {
        leftB++;
        rightB--;
      }
      const v1 = featureOf(here, f);
      const v2 = featureOf(points[sorted[i + 1]], f);
      // Skip ties — splitting between equal values is meaningless.
      if (v1 === v2) continue;
      const leftCount = leftA + leftB;
      const rightCount = rightA + rightB;
      if (leftCount < options.minSamplesLeaf) continue;
      if (rightCount < options.minSamplesLeaf) continue;
      const leftImp = impurity(leftA, leftB, options.criterion);
      const rightImp = impurity(rightA, rightB, options.criterion);
      const weighted = (leftImp * leftCount + rightImp * rightCount) / sorted.length;
      const gain = parentImp - weighted;
      if (gain <= 0) continue;
      if (!best || gain > best.gain) {
        best = { feature: f, threshold: (v1 + v2) / 2, gain };
      }
    }
  }
  return best;
}

export function buildTree(points: LabeledPoint[], options: BuildOptions): BuiltTree {
  const allIdx = points.map((_, i) => i);
  const rootStats = majority(allIdx, points);
  const root: TreeNode = {
    id: 0,
    depth: 0,
    pointIdx: allIdx,
    cls: rootStats.cls,
    purity: rootStats.purity,
    xmin: 0,
    xmax: 1,
    ymin: 0,
    ymax: 1,
  };
  let nextId = 1;
  const splitOrder: number[] = [];

  type Candidate = { node: TreeNode; split: BestSplit };
  const queue: Candidate[] = [];

  const enqueueIfSplittable = (node: TreeNode) => {
    if (node.depth >= options.maxDepth) return;
    if (node.pointIdx.length < 2 * options.minSamplesLeaf) return;
    if (node.purity === 1) return;
    const best = findBestSplit(node, points, options);
    if (!best) return;
    queue.push({ node, split: best });
  };

  enqueueIfSplittable(root);

  while (queue.length > 0) {
    // Best-first: pop the candidate with the largest impurity gain. Tiny queue
    // (≤ leaf count) so the linear scan is fine.
    let bestI = 0;
    for (let i = 1; i < queue.length; i++) {
      if (queue[i].split.gain > queue[bestI].split.gain) bestI = i;
    }
    const { node, split } = queue.splice(bestI, 1)[0];

    const leftIdx: number[] = [];
    const rightIdx: number[] = [];
    for (const i of node.pointIdx) {
      if (featureOf(points[i], split.feature) <= split.threshold) leftIdx.push(i);
      else rightIdx.push(i);
    }
    const leftStats = majority(leftIdx, points);
    const rightStats = majority(rightIdx, points);
    const leftBox = {
      xmin: node.xmin,
      xmax: split.feature === 0 ? split.threshold : node.xmax,
      ymin: node.ymin,
      ymax: split.feature === 1 ? split.threshold : node.ymax,
    };
    const rightBox = {
      xmin: split.feature === 0 ? split.threshold : node.xmin,
      xmax: node.xmax,
      ymin: split.feature === 1 ? split.threshold : node.ymin,
      ymax: node.ymax,
    };
    const left: TreeNode = {
      id: nextId++,
      depth: node.depth + 1,
      pointIdx: leftIdx,
      cls: leftStats.cls,
      purity: leftStats.purity,
      ...leftBox,
    };
    const right: TreeNode = {
      id: nextId++,
      depth: node.depth + 1,
      pointIdx: rightIdx,
      cls: rightStats.cls,
      purity: rightStats.purity,
      ...rightBox,
    };
    node.split = { feature: split.feature, threshold: split.threshold, gain: split.gain, left, right };
    splitOrder.push(node.id);

    enqueueIfSplittable(left);
    enqueueIfSplittable(right);
  }

  return { root, splitOrder, totalSplits: splitOrder.length };
}

// ---------- Frame-aware traversal ----------
//
// To animate growth, callers pass `splitsApplied` — the number of splits from
// the front of `splitOrder` that have happened so far. Any internal node whose
// id appears in that prefix is treated as split; everything else collapses to
// a leaf at its current state.

function appliedSet(tree: BuiltTree, splitsApplied: number): Set<number> {
  const n = Math.max(0, Math.min(splitsApplied, tree.splitOrder.length));
  return new Set(tree.splitOrder.slice(0, n));
}

export function treeLeaves(tree: BuiltTree, splitsApplied: number): TreeNode[] {
  const applied = appliedSet(tree, splitsApplied);
  const out: TreeNode[] = [];
  const walk = (node: TreeNode) => {
    if (node.split && applied.has(node.id)) {
      walk(node.split.left);
      walk(node.split.right);
    } else {
      out.push(node);
    }
  };
  walk(tree.root);
  return out;
}

export function activeSplitNodes(tree: BuiltTree, splitsApplied: number): TreeNode[] {
  const applied = appliedSet(tree, splitsApplied);
  const out: TreeNode[] = [];
  const walk = (node: TreeNode) => {
    if (node.split && applied.has(node.id)) {
      out.push(node);
      walk(node.split.left);
      walk(node.split.right);
    }
  };
  walk(tree.root);
  return out;
}

export function predictTree(
  tree: BuiltTree,
  splitsApplied: number,
  x: number,
  y: number,
): Class {
  const applied = appliedSet(tree, splitsApplied);
  let node = tree.root;
  while (node.split && applied.has(node.id)) {
    const v = featureOf({ x, y, c: 0 }, node.split.feature);
    node = v <= node.split.threshold ? node.split.left : node.split.right;
  }
  return node.cls;
}

export function trainAccuracy(
  tree: BuiltTree,
  splitsApplied: number,
  points: LabeledPoint[],
): number | null {
  if (points.length === 0) return null;
  let correct = 0;
  for (const p of points) {
    if (predictTree(tree, splitsApplied, p.x, p.y) === p.c) correct++;
  }
  return correct / points.length;
}

export function visibleDepth(tree: BuiltTree, splitsApplied: number): number {
  const applied = appliedSet(tree, splitsApplied);
  let max = 0;
  const walk = (node: TreeNode) => {
    if (node.depth > max) max = node.depth;
    if (node.split && applied.has(node.id)) {
      walk(node.split.left);
      walk(node.split.right);
    }
  };
  walk(tree.root);
  return max;
}

// ---------- Datasets ----------

export type { LabeledPoint, Class } from "./datasets";
export type DatasetId = "blobs" | "moons" | "spiral" | "checker" | "sketch";

export const treeDatasets: Record<
  Exclude<DatasetId, "sketch">,
  { label: string; generate: (seed: number) => LabeledPoint[] }
> = {
  blobs: { label: "Two clusters", generate: generateBlobs },
  moons: { label: "Two crescents", generate: generateMoons },
  spiral: { label: "Tangled spirals", generate: generateSpirals },
  // Trees thrive on axis-aligned structure; the checkerboard is the showcase
  // dataset where kNN-style smoothness fails and trees carve the grid cleanly.
  checker: { label: "Checkerboard", generate: generateChecker },
};
