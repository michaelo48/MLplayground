import Link from "next/link";
import styles from "./page.module.css";
import { HeroDemo } from "./_components/gradient/HeroDemo";
import { FamilyPill, type Family } from "./_components/FamilyPill";
import { MiniPreview } from "./_components/plots/MiniPreviews";
import {
  techniques,
  familyDescriptions,
  type Technique,
} from "./_lib/techniques";
import { concepts } from "./_lib/concepts";

const families: Family[] = ["Supervised", "Unsupervised"];


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
    body: "You can fit a line. Now: trees, ensembles, and the moment everything clicks — squeezing every drop of signal out of a stubborn dataset.",
    links: [
      "05 Decision trees",
      "06 Random forests & boosting",
      "07 Bias & variance, in practice",
      "08 Cross-validation done right",
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
            ML Playground
          </Link>
          <div className={styles.navLinks}>
            <Link href="/techniques">Concepts</Link>
            <a href="#path">Learning paths</a>
            <Link href="/techniques/linear-regression">Playground</Link>
            <a href="#about">About</a>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <header className={styles.hero}>
        <div className={`${styles.shell} ${styles.heroGrid}`}>
          <div>
            <span className={styles.kicker}>
              <span className={styles.dot} /> Live · 5 interactive lessons
            </span>
            <h1 className={styles.display}>
              Machine learning, <em>by hand.</em>
            </h1>
            <p className={styles.lede}>
              Drop points, drag knobs, watch the model learn. Every concept on ML Playground is a
              thing you can touch — from linear regression to clustering.
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
                <div className={`${styles.num} ${styles.tabular}`}>5</div>
                <div className={styles.lbl}>Concepts</div>
              </div>
              <div className={styles.stat}>
                <div className={`${styles.num} ${styles.tabular}`}>2</div>
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
              Two families, five concepts. Each one is a short lesson with a live visual you can
              interact with.
            </div>
          </div>

          <div className="flex flex-col gap-9">
            {families.map((family) => {
              const items = techniques.filter((t) => t.family === family);
              if (!items.length) return null;
              return (
                <div key={family}>
                  <div className="mb-4 flex items-center gap-3">
                    <FamilyPill family={family} />
                    <span className="font-mono text-xs uppercase tracking-[0.06em] text-zinc-500">
                      {family.toUpperCase()} — {familyDescriptions[family]}
                    </span>
                    <div className="h-px flex-1 bg-zinc-200" />
                  </div>
                  <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 lg:grid-cols-3">
                    {items.map((t) => (
                      <TechniqueCard key={t.slug} technique={t} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className={styles.formulaStrip}>
            <div className={styles.formulaName}>Loss · MSE</div>
            <div className={styles.formula} aria-label="MSE formula">
              L(θ) &nbsp;=&nbsp; <span style={{ fontSize: "1.4em" }}>¹⁄ₙ</span> &nbsp;
              ∑<sub>i=1</sub>
              <sup>n</sup> &nbsp; ( y<sub>i</sub> − ŷ<sub>i</sub> )²
            </div>
            <div className={styles.formulaExplain}>
              Mean squared error: average the squared gap between what the model said and what was
              true. Most regression lessons on ML Playground minimize a version of this.
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
            {concepts.map((c) => (
              <Link key={c.slug} className={styles.tile} href={`/concepts/${c.slug}`}>
                <span className={styles.tNum}>{c.num}</span>
                <span className={styles.tName}>{c.name}</span>
                <span className={styles.tDesc}>{c.blurb}</span>
              </Link>
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
              ML Playground
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
                <Link href="/glossary">Glossary</Link>
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
          <span>© 2026 ML Playground · v0.4.2</span>
          <span>Made for learners, by learners</span>
        </div>
      </footer>
    </div>
  );
}

function TechniqueCard({ technique }: { technique: Technique }) {
  return (
    <Link
      href={`/techniques/${technique.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white transition hover:border-zinc-300 hover:shadow-sm"
    >
      <div className="relative h-[168px] border-b border-zinc-100 bg-zinc-50">
        <MiniPreview kind={technique.name} width={400} height={168} />
      </div>
      <div className="flex flex-col gap-2 p-[18px]">
        <div className="flex justify-between">
          <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-zinc-400">
            {technique.meta}
          </span>
          <span className="text-zinc-400 transition group-hover:text-zinc-700">→</span>
        </div>
        <div className="text-lg font-semibold tracking-[-0.01em]">{technique.name}</div>
        <div className="text-[13.5px] leading-[1.55] text-zinc-600">{technique.blurb}</div>
      </div>
    </Link>
  );
}
