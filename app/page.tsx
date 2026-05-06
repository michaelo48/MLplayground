import Link from "next/link";
import styles from "./page.module.css";
import { HeroDemo } from "./_components/gradient/HeroDemo";
import {
  ConceptBrowser,
  type CardData,
} from "./_components/gradient/ConceptBrowser";
import {
  VizCluster,
  VizKNN,
  VizLinear,
  VizNN,
  VizPCA,
  VizTree,
} from "./_components/gradient/CardVizzes";

const filters = [
  { id: "all", label: "All", count: 6 },
  { id: "supervised", label: "Supervised", count: 3 },
  { id: "unsupervised", label: "Unsupervised", count: 2 },
  { id: "neural", label: "Neural nets", count: 1 },
] as const;

const cards: CardData[] = [
  {
    slug: "linear-regression",
    size: "feature",
    topline: "L01 · Supervised · Regression",
    duration: "Lesson · ~10 min",
    title: "Linear regression — the line that fits.",
    blurb:
      "Start with the simplest possible model. Drag points onto the chart and watch the line minimize squared error in real time. Builds intuition for every model that follows.",
    family: "supervised",
    tags: ["least squares", "closed form", "gradient descent"],
    badge: "START HERE",
    meta: "Open lesson →",
    viz: <VizLinear />,
  },
  {
    slug: "k-means",
    size: "tall",
    topline: "L08 · Unsupervised",
    duration: "~12 min",
    title: "k-Means clustering",
    blurb:
      "Group unlabeled points by repeatedly assigning each to its nearest center, then recomputing centers.",
    family: "unsupervised",
    tags: ["iterative"],
    meta: "Open →",
    viz: <VizCluster />,
  },
  {
    slug: "decision-trees",
    size: "md",
    topline: "L11 · Trees",
    duration: "~11 min",
    title: "Decision trees",
    blurb:
      "Twenty questions for data: split on the feature that reduces uncertainty most, then split again.",
    family: "supervised",
    tags: ["entropy", "gini"],
    viz: <VizTree />,
  },
  {
    slug: "k-nearest-neighbors",
    size: "md",
    topline: "L03 · Supervised",
    duration: "~7 min",
    title: "k-nearest neighbors",
    blurb:
      "The lazy classifier. To label a new point, ask its k closest neighbors. Featured in the demo above.",
    family: "supervised",
    tags: ["distance", "non-parametric"],
    viz: <VizKNN />,
  },
  {
    slug: "principal-components",
    size: "md",
    topline: "L09 · Unsupervised",
    duration: "~10 min",
    title: "Principal components",
    blurb:
      "Find the axes along which your data actually varies. Compress 50 dimensions into 2 you can plot.",
    family: "unsupervised",
    tags: ["eigenvectors"],
    viz: <VizPCA />,
  },
  {
    slug: "neural-networks",
    size: "feature",
    topline: "L15 · Neural networks",
    duration: "Lesson · ~14 min",
    title: "Backprop, in slow motion.",
    blurb:
      "Step through gradient descent one nudge at a time. See exactly which weights move, in which direction, and by how much — for a tiny two-layer net learning XOR.",
    family: "neural",
    tags: ["chain rule", "SGD", "activation functions"],
    badge: "UPDATED",
    meta: "Open lesson →",
    viz: <VizNN />,
  },
];

const tiles = [
  ["C 01", "Bias vs. variance", "Too simple, you miss the pattern. Too complex, you memorize noise."],
  ["C 02", "Train / test split", "The golden rule: never grade a model on its homework."],
  ["C 03", "Cross-validation", "k-fold: rotate which slice plays the role of test."],
  ["C 04", "Regularization (L1, L2)", "Punish big weights. Get smaller, simpler models."],
  ["C 05", "Confusion matrix", "Four numbers that tell you exactly how a classifier fails."],
  ["C 06", "Precision & recall", "Two ways to be right, two ways to be wrong."],
  ["C 07", "ROC & AUC", "Sweep the threshold; trade false positives for true ones."],
  ["C 08", "The curse of dimensionality", "Why 1000 features is almost always worse than 10 good ones."],
];

const paths = [
  {
    num: "PATH 01 · ~3 hours",
    title: "The first model",
    body: "You've heard the words but never trained anything. We'll start at linear regression and build to a working classifier — no calculus required.",
    links: [
      "01 What is a model?",
      "02 Linear regression by hand",
      "03 Loss and how it shrinks",
      "04 Your first classifier",
    ],
  },
  {
    num: "PATH 02 · ~5 hours",
    title: "From models to learning",
    body: "You can fit a line. Now: trees, ensembles, and the moment everything clicks — gradient descent on a small neural net.",
    links: [
      "05 Decision trees",
      "06 Random forests & boosting",
      "07 The perceptron",
      "08 Backprop, in slow motion",
    ],
  },
  {
    num: "PATH 03 · ~6 hours",
    title: "Beyond labels",
    body: "Unsupervised learning, dimensionality reduction, and reinforcement learning. For when you've got data but no answers — yet.",
    links: [
      "09 k-Means & hierarchical",
      "10 PCA & t-SNE",
      "11 Markov decision processes",
      "12 Q-learning on a grid",
    ],
  },
];

export default function Home() {
  return (
    <div className={styles.page}>
      {/* NAV */}
      <nav className={styles.nav}>
        <div className={`${styles.shell} ${styles.navInner}`}>
          <Link className={styles.brand} href="/">
            <span className={styles.brandMark} />
            Flowstate ML
          </Link>
          <div className={styles.navLinks}>
            <Link href="/techniques">Concepts</Link>
            <a href="#path">Learning paths</a>
            <Link href="/techniques/linear-regression">Playground</Link>
            <a href="#about">About</a>
          </div>
          <button className={styles.navCta}>
            <span className={styles.dot} />
            Start learning
          </button>
        </div>
      </nav>

      {/* HERO */}
      <header className={styles.hero}>
        <div className={`${styles.shell} ${styles.heroGrid}`}>
          <div>
            <span className={styles.kicker}>
              <span className={styles.dot} /> Live · 6 interactive lessons
            </span>
            <h1 className={styles.display}>
              Machine learning, <em>by hand.</em>
            </h1>
            <p className={styles.lede}>
              Drop points, drag knobs, watch the model learn. Every concept on Flowstate is a thing
              you can touch — from k-nearest neighbors to backprop.
            </p>
            <div className={styles.heroCtas}>
              <Link className={`${styles.btn} ${styles.btnPrimary}`} href="/techniques">
                Browse all concepts <span className={styles.arrow}>→</span>
              </Link>
              <Link className={`${styles.btn} ${styles.btnGhost}`} href="/techniques/linear-regression">
                Open the playground
              </Link>
            </div>
            <div className={styles.heroMeta}>
              <div className={styles.stat}>
                <div className={`${styles.num} ${styles.tabular}`}>6</div>
                <div className={styles.lbl}>Concepts</div>
              </div>
              <div className={styles.stat}>
                <div className={`${styles.num} ${styles.tabular}`}>3</div>
                <div className={styles.lbl}>Topic families</div>
              </div>
              <div className={styles.stat}>
                <div className={`${styles.num} ${styles.tabular}`}>~10 min</div>
                <div className={styles.lbl}>Per lesson</div>
              </div>
            </div>
          </div>

          <HeroDemo />
        </div>
      </header>

      {/* BROWSE */}
      <section className={styles.section} id="browse">
        <div className={styles.shell}>
          <div className={styles.secHead}>
            <div className={styles.secNum}>§ 01</div>
            <h2 className={styles.secTitle}>
              Browse concepts by <em>family</em>
            </h2>
            <div className={styles.secDesc}>
              Three families, six concepts. Each one is a short lesson with a live visual you can
              interact with.
            </div>
          </div>

          <ConceptBrowser cards={cards} filters={[...filters]} />

          <div className={styles.formulaStrip}>
            <div className={styles.formulaName}>Loss · MSE</div>
            <div className={styles.formula} aria-label="MSE formula">
              L(θ) &nbsp;=&nbsp; <span style={{ fontSize: "1.4em" }}>¹⁄ₙ</span> &nbsp;
              ∑<sub>i=1</sub>
              <sup>n</sup> &nbsp; ( y<sub>i</sub> − ŷ<sub>i</sub> )²
            </div>
            <div className={styles.formulaExplain}>
              Mean squared error: average the squared gap between what the model said and what was
              true. Most regression lessons on Flowstate minimize a version of this.
            </div>
          </div>
        </div>
      </section>

      {/* TILES */}
      <section className={styles.section} id="more">
        <div className={styles.shell}>
          <div className={styles.secHead}>
            <div className={styles.secNum}>§ 02</div>
            <h2 className={styles.secTitle}>
              Smaller ideas, <em>big consequences</em>
            </h2>
            <div className={styles.secDesc}>
              Bite-sized concepts that show up everywhere — bias, regularization, the curse of
              dimensionality. Read in 2-3 minutes each.
            </div>
          </div>

          <div className={styles.tiles}>
            {tiles.map(([num, name, desc]) => (
              <a key={num} className={styles.tile} href="#">
                <span className={styles.tNum}>{num}</span>
                <span className={styles.tName}>{name}</span>
                <span className={styles.tDesc}>{desc}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* PATHS */}
      <section className={styles.section} id="path">
        <div className={styles.shell}>
          <div className={styles.secHead}>
            <div className={styles.secNum}>§ 03</div>
            <h2 className={styles.secTitle}>
              Three paths through, <em>pick yours.</em>
            </h2>
            <div className={styles.secDesc}>
              Same concepts, different routes — choose the one that matches where you are now.
            </div>
          </div>

          <div className={styles.pathWrap}>
            {paths.map((p) => (
              <div key={p.num} className={styles.pathStep}>
                <div className={styles.num}>{p.num}</div>
                <h4>{p.title}</h4>
                <p>{p.body}</p>
                <div className={styles.links}>
                  {p.links.map((l) => (
                    <a key={l} href="#">
                      {l} <span className={styles.ar}>→</span>
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className={styles.footer} id="about">
        <div className={`${styles.shell} ${styles.footerGrid}`}>
          <div className={styles.brandBlock}>
            <div className={styles.brand} style={{ color: "var(--paper)" }}>
              <span className={styles.brandMark} />
              Flowstate ML
            </div>
            <p>
              An interactive textbook for machine learning. Every concept is a thing you can touch,
              drag, and break.
            </p>
          </div>
          <div>
            <h5>Learn</h5>
            <ul>
              <li>
                <Link href="/techniques">All concepts</Link>
              </li>
              <li>
                <a href="#path">Learning paths</a>
              </li>
              <li>
                <Link href="/techniques/linear-regression">Playground</Link>
              </li>
              <li>
                <a href="#">Glossary</a>
              </li>
            </ul>
          </div>
          <div>
            <h5>Topics</h5>
            <ul>
              <li>
                <a href="#">Supervised</a>
              </li>
              <li>
                <a href="#">Unsupervised</a>
              </li>
              <li>
                <a href="#">Neural networks</a>
              </li>
              <li>
                <a href="#">Reinforcement</a>
              </li>
            </ul>
          </div>
          <div>
            <h5>About</h5>
            <ul>
              <li>
                <a href="#">Pedagogy</a>
              </li>
              <li>
                <a href="#">Contributors</a>
              </li>
              <li>
                <a href="#">Open source</a>
              </li>
              <li>
                <a href="#">Newsletter</a>
              </li>
            </ul>
          </div>
        </div>
        <div className={`${styles.shell} ${styles.footerBottom}`}>
          <span>© 2026 Flowstate ML · v0.4.2</span>
          <span>Made for learners, by learners</span>
        </div>
      </footer>
    </div>
  );
}
