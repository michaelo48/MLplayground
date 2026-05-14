import type { ReactNode } from "react";

export type Concept = {
  slug: string;
  num: string; // "C 01", etc. — also used on the home-page tile
  name: string;
  // One-liner shown on the home-page tile and at the top of the detail page.
  blurb: string;
  // Estimated read time in minutes — used in the page eyebrow.
  readMinutes: number;
  body: ReactNode;
  // Slugs of related techniques (links to /techniques/<slug>).
  related?: { slug: string; label: string }[];
};

// ---------- Inline illustration helpers ----------
//
// Concepts pages aren't interactive — they get small static SVGs to anchor
// the prose. Kept inline so the content + visual stay together and so each
// concept stays self-contained.

function BiasVarianceIllust() {
  // Three panels: underfit (too smooth), just right, overfit (wiggly).
  // Each panel reuses the same scatter so the difference is purely in the fit.
  const pts: Array<[number, number]> = [
    [10, 70], [18, 64], [26, 60], [34, 50], [42, 46],
    [50, 38], [58, 36], [66, 30], [74, 28], [82, 24], [90, 22],
  ];
  const panel = (i: number, title: string, line: ReactNode) => (
    <g key={i} transform={`translate(${i * 110}, 0)`}>
      <rect x={2} y={2} width={104} height={100} rx={8} fill="#fff" stroke="#e4e4e7" />
      {pts.map((p, j) => (
        <circle key={j} cx={p[0] * 1.04 + 2} cy={p[1] * 1.04 + 2} r={2.2} fill="#0a0a0a" fillOpacity={0.55} />
      ))}
      {line}
      <text x={6} y={120} fontSize={10} fontFamily="ui-monospace, monospace" fill="#71717a">
        {title}
      </text>
    </g>
  );
  return (
    <svg viewBox="0 0 330 130" className="block h-auto w-full">
      {panel(
        0,
        "underfit",
        <line x1={8} y1={62} x2={102} y2={42} stroke="#7c3aed" strokeWidth={1.6} />,
      )}
      {panel(
        1,
        "just right",
        <path
          d="M 8 75 Q 50 35 102 22"
          fill="none"
          stroke="#7c3aed"
          strokeWidth={1.6}
        />,
      )}
      {panel(
        2,
        "overfit",
        <path
          d="M 8 76 L 18 60 L 28 70 L 38 48 L 48 56 L 58 36 L 68 44 L 78 28 L 88 32 L 102 22"
          fill="none"
          stroke="#7c3aed"
          strokeWidth={1.6}
        />,
      )}
    </svg>
  );
}

function SplitIllust() {
  // Horizontal "dataset" bar split 80/20 into train and test sections.
  return (
    <svg viewBox="0 0 320 70" className="block h-auto w-full">
      <rect x={4} y={20} width={250} height={28} rx={6} fill="#7c3aed" fillOpacity={0.85} />
      <rect x={258} y={20} width={58} height={28} rx={6} fill="#ea580c" fillOpacity={0.85} />
      <text x={12} y={38} fontSize={11} fontFamily="ui-monospace, monospace" fill="#fff">
        train (80%) — model sees this
      </text>
      <text x={262} y={38} fontSize={10} fontFamily="ui-monospace, monospace" fill="#fff">
        test (20%)
      </text>
      <text x={4} y={64} fontSize={10} fontFamily="ui-monospace, monospace" fill="#71717a">
        dataset · shuffled, split once
      </text>
    </svg>
  );
}

function KFoldIllust() {
  // 5 rows × 5 columns. In each row, one cell is the test fold (orange), the
  // rest are train (violet). Reading the table top-to-bottom shows the fold
  // rotating through the data.
  const rows = 5;
  const cols = 5;
  return (
    <svg viewBox="0 0 330 130" className="block h-auto w-full">
      {Array.from({ length: rows }).map((_, r) =>
        Array.from({ length: cols }).map((__, c) => {
          const isTest = c === r;
          return (
            <rect
              key={`${r}-${c}`}
              x={40 + c * 50}
              y={6 + r * 22}
              width={46}
              height={18}
              rx={3}
              fill={isTest ? "#ea580c" : "#7c3aed"}
              fillOpacity={isTest ? 0.85 : 0.5}
            />
          );
        }),
      )}
      {Array.from({ length: rows }).map((_, r) => (
        <text
          key={r}
          x={6}
          y={20 + r * 22}
          fontSize={10}
          fontFamily="ui-monospace, monospace"
          fill="#71717a"
        >
          fold {r + 1}
        </text>
      ))}
      <text x={40} y={125} fontSize={10} fontFamily="ui-monospace, monospace" fill="#71717a">
        violet = train · orange = test
      </text>
    </svg>
  );
}

function RegIllust() {
  // L1 (diamond) vs L2 (circle) constraint regions with the unregularized
  // optimum off-axis. The L1 corner forces the solution onto the y-axis →
  // sparsity. The L2 circle pulls but never zeroes.
  return (
    <svg viewBox="0 0 320 150" className="block h-auto w-full">
      {/* Axes */}
      <line x1={60} y1={120} x2={260} y2={120} stroke="#a1a1aa" strokeWidth={0.8} />
      <line x1={160} y1={20} x2={160} y2={120} stroke="#a1a1aa" strokeWidth={0.8} />
      {/* Loss contour */}
      <ellipse cx={210} cy={50} rx={36} ry={22} fill="none" stroke="#a1a1aa" strokeDasharray="3 3" />
      <ellipse cx={210} cy={50} rx={20} ry={12} fill="none" stroke="#a1a1aa" strokeDasharray="3 3" />
      <circle cx={210} cy={50} r={3} fill="#18181b" />
      <text x={216} y={48} fontSize={10} fontFamily="ui-monospace, monospace" fill="#18181b">
        unregularized β*
      </text>
      {/* L2 ball */}
      <circle cx={160} cy={70} r={32} fill="rgba(124,58,237,0.15)" stroke="#7c3aed" strokeWidth={1.4} />
      <text x={120} y={108} fontSize={10} fontFamily="ui-monospace, monospace" fill="#7c3aed">
        L2 — round
      </text>
      {/* L1 diamond */}
      <polygon
        points="160,38 192,70 160,102 128,70"
        fill="rgba(234,88,12,0.10)"
        stroke="#ea580c"
        strokeWidth={1.4}
      />
      <text x={190} y={120} fontSize={10} fontFamily="ui-monospace, monospace" fill="#ea580c">
        L1 — corners
      </text>
    </svg>
  );
}

function ConfusionIllust() {
  const cell = (
    x: number,
    y: number,
    label: string,
    sub: string,
    bg: string,
    fg: string,
  ) => (
    <g key={label}>
      <rect x={x} y={y} width={84} height={48} rx={6} fill={bg} />
      <text x={x + 8} y={y + 18} fontSize={11} fontFamily="ui-monospace, monospace" fill={fg}>
        {label}
      </text>
      <text x={x + 8} y={y + 36} fontSize={10} fontFamily="ui-monospace, monospace" fill={fg} fillOpacity={0.8}>
        {sub}
      </text>
    </g>
  );
  return (
    <svg viewBox="0 0 340 150" className="block h-auto w-full">
      {/* Column header — centered horizontally over the two cell columns. */}
      <text
        x={192}
        y={14}
        fontSize={11}
        fontFamily="ui-monospace, monospace"
        fill="#71717a"
        textAnchor="middle"
      >
        predicted class
      </text>
      {/* Row header — rotated 90° and centered vertically on the cell rows. */}
      <text
        x={20}
        y={76}
        fontSize={11}
        fontFamily="ui-monospace, monospace"
        fill="#71717a"
        textAnchor="middle"
        transform="rotate(-90 20 76)"
      >
        actual class
      </text>
      {cell(100, 24, "TP", "true positive", "rgba(16,185,129,0.18)", "#047857")}
      {cell(200, 24, "FN", "false negative", "rgba(234,88,12,0.18)", "#b45309")}
      {cell(100, 80, "FP", "false positive", "rgba(234,88,12,0.18)", "#b45309")}
      {cell(200, 80, "TN", "true negative", "rgba(16,185,129,0.18)", "#047857")}
    </svg>
  );
}

function PRIllust() {
  return (
    <svg viewBox="0 0 320 150" className="block h-auto w-full">
      <line x1={40} y1={120} x2={300} y2={120} stroke="#a1a1aa" strokeWidth={0.8} />
      <line x1={40} y1={20} x2={40} y2={120} stroke="#a1a1aa" strokeWidth={0.8} />
      <text x={4} y={70} fontSize={10} fontFamily="ui-monospace, monospace" fill="#71717a">
        precision
      </text>
      <text x={150} y={142} fontSize={10} fontFamily="ui-monospace, monospace" fill="#71717a">
        recall
      </text>
      <path
        d="M 40 32 Q 130 38 200 64 Q 250 96 295 118"
        fill="none"
        stroke="#7c3aed"
        strokeWidth={1.8}
      />
      <circle cx={130} cy={48} r={4} fill="#18181b" />
      <text x={140} y={50} fontSize={10} fontFamily="ui-monospace, monospace" fill="#18181b">
        favor precision
      </text>
      <circle cx={250} cy={96} r={4} fill="#18181b" />
      <text x={170} y={110} fontSize={10} fontFamily="ui-monospace, monospace" fill="#18181b">
        favor recall
      </text>
    </svg>
  );
}

function ROCIllust() {
  return (
    <svg viewBox="0 0 320 150" className="block h-auto w-full">
      <line x1={40} y1={120} x2={300} y2={120} stroke="#a1a1aa" strokeWidth={0.8} />
      <line x1={40} y1={20} x2={40} y2={120} stroke="#a1a1aa" strokeWidth={0.8} />
      <line x1={40} y1={120} x2={300} y2={20} stroke="#a1a1aa" strokeWidth={0.8} strokeDasharray="3 3" />
      <text x={4} y={70} fontSize={10} fontFamily="ui-monospace, monospace" fill="#71717a">
        TPR
      </text>
      <text x={150} y={142} fontSize={10} fontFamily="ui-monospace, monospace" fill="#71717a">
        FPR
      </text>
      <path
        d="M 40 120 Q 60 50 130 32 Q 220 24 300 20"
        fill="none"
        stroke="#7c3aed"
        strokeWidth={1.8}
      />
      <text x={210} y={64} fontSize={10} fontFamily="ui-monospace, monospace" fill="#7c3aed">
        AUC ≈ 0.92
      </text>
      <text x={140} y={94} fontSize={10} fontFamily="ui-monospace, monospace" fill="#71717a">
        random
      </text>
    </svg>
  );
}

function CurseIllust() {
  // Histograms: in 2D the nearest neighbor is much closer than the farthest;
  // in 100D the distances concentrate.
  return (
    <svg viewBox="0 0 320 130" className="block h-auto w-full">
      <text x={4} y={14} fontSize={10} fontFamily="ui-monospace, monospace" fill="#71717a">
        pairwise distance distribution
      </text>
      {/* 2D panel */}
      <text x={4} y={32} fontSize={10} fontFamily="ui-monospace, monospace" fill="#18181b">
        d = 2
      </text>
      {[6, 14, 18, 14, 8, 5, 3, 2, 1].map((h, i) => (
        <rect key={`a${i}`} x={40 + i * 14} y={48 - h * 1.4} width={12} height={h * 1.4} fill="#7c3aed" fillOpacity={0.7} />
      ))}
      {/* 100D panel */}
      <text x={4} y={80} fontSize={10} fontFamily="ui-monospace, monospace" fill="#18181b">
        d = 100
      </text>
      {[0, 0, 0, 1, 4, 14, 18, 14, 5, 1, 0].map((h, i) => (
        <rect key={`b${i}`} x={40 + i * 14} y={108 - h * 1.4} width={12} height={h * 1.4} fill="#ea580c" fillOpacity={0.7} />
      ))}
      <text x={40} y={124} fontSize={10} fontFamily="ui-monospace, monospace" fill="#71717a">
        distances concentrate as d grows
      </text>
    </svg>
  );
}

// ---------- Content ----------

function Lede({ children }: { children: ReactNode }) {
  return (
    <p className="text-[17px] leading-[1.55] text-zinc-700 md:text-[18px]">{children}</p>
  );
}

function H({ children }: { children: ReactNode }) {
  return (
    <h2 className="mt-9 mb-3 text-[20px] font-semibold tracking-[-0.01em] text-zinc-950 md:text-[22px]">
      {children}
    </h2>
  );
}

function P({ children }: { children: ReactNode }) {
  return <p className="my-3 text-[15px] leading-[1.7] text-zinc-700">{children}</p>;
}

function Note({ children }: { children: ReactNode }) {
  return (
    <p className="my-3 rounded-lg border border-zinc-200 bg-stone-50 px-4 py-3 text-[14px] leading-[1.65] text-zinc-700">
      {children}
    </p>
  );
}

function Figure({ children, caption }: { children: ReactNode; caption?: string }) {
  return (
    <figure className="my-6 rounded-xl border border-zinc-200 bg-white p-4">
      {children}
      {caption && (
        <figcaption className="mt-2 text-center font-mono text-[11px] uppercase tracking-[0.06em] text-zinc-500">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

export const concepts: Concept[] = [
  {
    slug: "bias-vs-variance",
    num: "C 01",
    name: "Bias vs. variance",
    blurb:
      "Too simple, you miss the pattern. Too complex, you memorize noise.",
    readMinutes: 3,
    related: [{ slug: "linear-regression", label: "Linear Regression" }],
    body: (
      <>
        <Lede>
          Every model&apos;s expected error decomposes into three terms: <b>bias</b> (the wrong
          answer it keeps insisting on), <b>variance</b> (the wobble between different training
          sets), and <b>irreducible noise</b> (the part of the world the data never captures). You
          can&apos;t beat noise, but you can choose where to spend on the other two.
        </Lede>
        <H>The decomposition</H>
        <P>
          For squared error on a fixed query point{" "}
          <span className="font-mono">x</span>, averaged over draws of the training set:
        </P>
        <Note>
          <span className="font-mono">
            E[(y − ŷ(x))²] = Bias(ŷ(x))² + Var(ŷ(x)) + σ²
          </span>
        </Note>
        <P>
          Bias is how far the model&apos;s average prediction sits from the truth — a structural
          mistake. Variance is how much that prediction jitters when you reroll the training set —
          a sensitivity to the specific data. Most practical regularization (smaller trees, ridge
          penalties, dropout, more data) is a deliberate trade: accept a little more bias for a
          lot less variance.
        </P>
        <H>The same picture, three times</H>
        <Figure caption="same scatter, three fits — bias falls left → right, variance climbs">
          <BiasVarianceIllust />
        </Figure>
        <P>
          Underfit fits the same boring line no matter which training sample you draw (low
          variance, high bias). Overfit traces a different wiggle on every sample (high variance,
          low bias on the training set, terrible bias on the test set). The sweet spot is the one
          you can&apos;t spot just by looking at training error — you need a held-out set.
        </P>
        <H>Where to look for it</H>
        <P>
          A <i>learning curve</i> plots train and validation error against training-set size: a
          large gap is variance, both curves plateauing high is bias. A <i>validation curve</i>{" "}
          plots both against a complexity knob (max depth, regularization strength, polynomial
          degree) — the spread between the two is the variance you&apos;d like to remove.
        </P>
      </>
    ),
  },
  {
    slug: "train-test-split",
    num: "C 02",
    name: "Train / test split",
    blurb:
      "The golden rule: never grade a model on its homework.",
    readMinutes: 2,
    related: [{ slug: "linear-regression", label: "Linear Regression" }],
    body: (
      <>
        <Lede>
          A model&apos;s performance on data it has already seen is almost meaningless — a memo
          rized lookup table gets 100%. The fix is the simplest discipline in ML: split your data
          into a <b>train</b> partition the model fits to, and a <b>test</b> partition you only
          touch at the end to score it.
        </Lede>
        <H>Why bother</H>
        <P>
          Without a held-out partition you can&apos;t tell whether a model has learned the
          underlying signal or memorised the specific rows. Training error always drops as you add
          capacity; test error is what tells you when that capacity stopped being useful and
          started overfitting.
        </P>
        <Figure caption="80/20 is a common default — bigger n lets you take a smaller test fraction">
          <SplitIllust />
        </Figure>
        <H>Picking the ratio</H>
        <P>
          Common defaults are 80/20 or 70/30 for small datasets, 90/10 (or even 99/1) when n
          climbs into the millions. The test fold needs to be big enough that its accuracy
          estimate has small standard error — a 1000-row test set gives roughly ±1.5% precision
          on a binary accuracy, which is usually enough.
        </P>
        <H>Where it breaks</H>
        <P>
          Random splits leak signal whenever rows aren&apos;t independent. Time series? Split
          chronologically — training on tomorrow to predict yesterday is the most common version
          of this mistake. Grouped data (multiple rows per user, per patient)? Split by group, or
          you&apos;ll measure how well the model recognises individuals rather than how well it
          generalises to new ones.
        </P>
        <Note>
          A test set is single-use. The moment you tweak the model based on test-set numbers, it
          stops being a test set and becomes part of your training loop. That&apos;s what
          validation sets — and{" "}
          <a href="/concepts/cross-validation" className="underline">cross-validation</a> — are
          for.
        </Note>
      </>
    ),
  },
  {
    slug: "cross-validation",
    num: "C 03",
    name: "Cross-validation",
    blurb:
      "k-fold: rotate which slice plays the role of test.",
    readMinutes: 3,
    body: (
      <>
        <Lede>
          A single train/test split gives one performance estimate. <b>k-fold cross-validation</b>{" "}
          gives you k of them — every row takes a turn as the held-out test — and reports the
          mean. The result is a less noisy answer to "how good is this model, really?" and a
          principled way to tune hyperparameters without burning your test set.
        </Lede>
        <H>The procedure</H>
        <P>
          Split the training data into k roughly-equal folds. For each fold: train on the other
          k−1, evaluate on the held-out one. Average the k scores. With k = 5 you spend 5× the
          training compute, but every row contributes to both training (in 4 folds) and
          evaluation (in 1).
        </P>
        <Figure caption="5-fold CV — each row of data ends up in the test fold exactly once">
          <KFoldIllust />
        </Figure>
        <H>Variants</H>
        <P>
          <b>Stratified k-fold</b> preserves the class ratio in each fold — important on
          imbalanced classification. <b>Leave-one-out (LOOCV)</b> sets k = n: maximally
          data-efficient, expensive, and has higher variance than k = 5 or 10. <b>Group k-fold</b>{" "}
          keeps all rows from the same user/patient/customer in the same fold so the model
          can&apos;t cheat by recognising group identity.
        </P>
        <H>The leakage trap</H>
        <P>
          Fit your preprocessing (scaling, imputation, feature selection) on the train fold only,
          not on the full dataset. If you scale with the mean and standard deviation of every row
          and then split, the test fold has seen its own statistics — a small but real form of
          leakage that pumps up your reported numbers.
        </P>
      </>
    ),
  },
  {
    slug: "regularization",
    num: "C 04",
    name: "Regularization (L1, L2)",
    blurb:
      "Punish big weights. Get smaller, simpler models.",
    readMinutes: 3,
    related: [{ slug: "linear-regression", label: "Linear Regression" }],
    body: (
      <>
        <Lede>
          Big weights memorize. Adding a penalty on weight magnitude to the loss shrinks them,
          trading a tiny bit of training accuracy for a model that generalizes better. <b>L1</b>{" "}
          (lasso) and <b>L2</b> (ridge) are the same idea with different geometries — and the
          geometry changes everything.
        </Lede>
        <H>L2 / ridge</H>
        <Note>
          <span className="font-mono">L(β) = MSE + λ · Σ βⱼ²</span>
        </Note>
        <P>
          The penalty is a smooth bowl. Coefficients shrink toward zero proportional to their
          size, but they never reach exactly zero. The closed-form solution stays closed-form
          (just add λ to the diagonal of <span className="font-mono">XᵀX</span> before
          inverting), and the result is numerically stable even when features are correlated.
        </P>
        <H>L1 / lasso</H>
        <Note>
          <span className="font-mono">L(β) = MSE + λ · Σ |βⱼ|</span>
        </Note>
        <P>
          The penalty has corners. The optimum often lands <i>on</i> one of those corners —
          meaning some coefficients are driven to <b>exactly</b> zero. L1 doesn&apos;t just
          shrink, it <i>selects</i>: features that don&apos;t earn their keep get dropped from
          the model entirely.
        </P>
        <Figure caption="L1's diamond corners force sparse solutions — L2's circle just shrinks">
          <RegIllust />
        </Figure>
        <H>Picking λ</H>
        <P>
          λ controls the strength: zero means no penalty (back to plain OLS), large means the
          loss only cares about keeping weights small. The right value depends on the dataset, so
          pick it by{" "}
          <a href="/concepts/cross-validation" className="underline">cross-validation</a>:
          sweep a log-spaced grid, take the λ with the lowest mean validation error.
        </P>
      </>
    ),
  },
  {
    slug: "confusion-matrix",
    num: "C 05",
    name: "Confusion matrix",
    blurb:
      "Four numbers that tell you exactly how a classifier fails.",
    readMinutes: 2,
    body: (
      <>
        <Lede>
          A classifier doesn&apos;t just have an accuracy — every prediction lands in one of four
          cells, and the distribution across those cells is where every richer metric comes from:
          precision, recall, F1, ROC, the lot.
        </Lede>
        <H>The 2×2</H>
        <Figure caption="binary classification — every prediction lands in exactly one cell">
          <ConfusionIllust />
        </Figure>
        <P>
          <b>True positive</b>: model said yes, actually yes. <b>True negative</b>: model said
          no, actually no. <b>False positive</b>: model said yes, actually no (Type I error).
          <b> False negative</b>: model said no, actually yes (Type II error). Accuracy is{" "}
          <span className="font-mono">(TP + TN) / total</span> — which can be misleading the
          moment classes get imbalanced.
        </P>
        <H>The asymmetric costs are the point</H>
        <P>
          Medical screening: a false negative misses a sick patient — costly. A false positive
          buys a follow-up scan — cheap. Spam filter: a false positive eats your important email
          — costly. A false negative is one more spam to delete — cheap. The classifier is the
          same machine; the threshold you pick depends on which mistake hurts more.
        </P>
        <H>Multi-class</H>
        <P>
          For C classes the matrix is C × C — the diagonal is the right answers, off-diagonals
          tell you <i>which</i> classes get confused with each other (digits 4 and 9 in MNIST,
          husky and wolf in image classification). The off-diagonals are usually more informative
          than the overall accuracy.
        </P>
      </>
    ),
  },
  {
    slug: "precision-recall",
    num: "C 06",
    name: "Precision & recall",
    blurb:
      "Two ways to be right, two ways to be wrong.",
    readMinutes: 2,
    body: (
      <>
        <Lede>
          Accuracy isn&apos;t enough when classes are imbalanced — a "always predict negative"
          classifier on a 99/1 split scores 99%. <b>Precision</b> and <b>recall</b> answer the
          two questions accuracy hides: of the things I flagged, how many were right? Of the
          things I should have caught, how many did I?
        </Lede>
        <H>The definitions</H>
        <Note>
          <span className="font-mono">precision = TP / (TP + FP)</span>{" "}
          — share of positive predictions that were correct.
          <br />
          <span className="font-mono">recall &nbsp;&nbsp;&nbsp;= TP / (TP + FN)</span>{" "}
          — share of actual positives the model caught.
        </Note>
        <P>
          A spam filter with 99% precision but 30% recall lets two thirds of spam through but
          almost never flags a real email. A medical screener with 95% recall but 20% precision
          catches almost every sick patient — and sends four healthy ones for follow-up testing
          for every sick one it found.
        </P>
        <H>The tradeoff</H>
        <Figure caption="precision-recall curve · sliding the decision threshold moves along the curve">
          <PRIllust />
        </Figure>
        <P>
          Most classifiers output a score, not a hard label. Slide the threshold up and you keep
          only the most confident positives — precision rises, recall falls. Slide it down and
          you catch more — recall rises, precision falls. The curve is the model; the dot is the
          threshold you picked.
        </P>
        <H>F1 and friends</H>
        <P>
          When you need a single number, <b>F1</b> is the harmonic mean of precision and recall
          — it punishes lopsidedness, so 50/50 (F1 = 0.5) beats 99/1 (F1 ≈ 0.02). The general
          form, <b>F-β</b>, leans toward recall (β &gt; 1) or precision (β &lt; 1) depending on
          which mistake hurts more.
        </P>
      </>
    ),
  },
  {
    slug: "roc-auc",
    num: "C 07",
    name: "ROC & AUC",
    blurb:
      "Sweep the threshold; trade false positives for true ones.",
    readMinutes: 3,
    body: (
      <>
        <Lede>
          Most classifiers output a score, not a hard label. The <b>ROC curve</b> traces what
          happens as you slide the decision threshold; the area under it — <b>AUC</b> — is a
          threshold-free quality measure that&apos;s especially useful when you don&apos;t yet
          know which precision/recall tradeoff you&apos;ll want at deployment.
        </Lede>
        <H>Reading the curve</H>
        <Figure caption="ROC: TPR vs FPR · dashed diagonal is random · top-left is perfect">
          <ROCIllust />
        </Figure>
        <P>
          The x-axis is false positive rate (FPR =&nbsp;
          <span className="font-mono">FP / (FP + TN)</span>) — the share of negatives the model
          mistakenly flagged. The y-axis is true positive rate (TPR = recall). The curve starts
          at the origin (threshold so high nothing is positive) and ends at the top-right
          (threshold so low everything is). The shape between is the model.
        </P>
        <H>The AUC interpretation that sticks</H>
        <P>
          AUC isn&apos;t just &quot;area under a curve&quot; — it&apos;s exactly the probability
          that the model ranks a randomly-chosen positive example above a randomly-chosen
          negative one. AUC = 0.5 is no better than random; 1.0 is perfect ranking; below 0.5
          means your labels are flipped.
        </P>
        <H>Where ROC misleads</H>
        <P>
          On heavily imbalanced data, FPR can stay low even when precision is terrible — there
          are so many negatives that even a small FPR translates to a flood of false positives.
          When positives are rare (fraud, rare disease), prefer the precision-recall curve. AUC
          still tells you whether the model can rank — it just doesn&apos;t tell you whether the
          top of the ranking is usable.
        </P>
      </>
    ),
  },
  {
    slug: "curse-of-dimensionality",
    num: "C 08",
    name: "The curse of dimensionality",
    blurb:
      "Why 1000 features is almost always worse than 10 good ones.",
    readMinutes: 3,
    related: [{ slug: "principal-components", label: "Principal Components" }],
    body: (
      <>
        <Lede>
          Add features and the volume of feature space grows exponentially. Pairwise distances
          flatten, your nearest neighbors become barely closer than your farthest, and every
          method that depends on locality — kNN, kernel methods, clustering — starts to falter.
          Welcome to the curse.
        </Lede>
        <H>Volume blows up</H>
        <P>
          A unit hypercube in d dimensions has volume 1, but the unit hypersphere inside it has
          volume that goes to <i>zero</i> as d grows — almost all the volume is in the corners.
          The same data spread across a low-dim space gets sparser and sparser as d climbs; to
          maintain the same density you&apos;d need exponentially more samples.
        </P>
        <H>Distances concentrate</H>
        <Figure caption="distance distribution gets tighter as d grows — nearest ≈ farthest in 100D">
          <CurseIllust />
        </Figure>
        <P>
          In high dimensions, the ratio of the farthest to the nearest distance approaches 1.
          Every point is roughly the same distance from every other point. &quot;Nearest
          neighbor&quot; loses its meaning; kNN&apos;s vote tally is taken from points that
          aren&apos;t actually close to your query in any useful sense.
        </P>
        <H>What to do about it</H>
        <P>
          Three responses, in increasing order of effort: <b>regularize</b> (L1/L2 push the model
          to use a small number of features), <b>select features</b> by hand or with a wrapper
          method, or <b>reduce dimensions</b> with{" "}
          <a href="/techniques/principal-components" className="underline">PCA</a> / t-SNE /
          UMAP. The honest answer to high dimensions is usually: most of those features
          aren&apos;t signal.
        </P>
      </>
    ),
  },
];

export function conceptBySlug(slug: string) {
  return concepts.find((c) => c.slug === slug);
}
