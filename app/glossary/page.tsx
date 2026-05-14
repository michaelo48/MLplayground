import Link from "next/link";
import { Header } from "../_components/Header";
import { FamilyPill, type Family } from "../_components/FamilyPill";
import { glossary } from "../_lib/glossary";

type Section = {
  id: string;
  title: string;
  family?: Family;
  techniqueSlug?: string;
  blurb: string;
  // Order here is the order entries are rendered in the section.
  keys: Array<keyof typeof glossary>;
};

// Grouping lives next to the page (not in glossary.tsx) so the data file can
// stay a flat Record consumed by every InfoTooltip without metadata baggage.
const sections: Section[] = [
  {
    id: "general",
    title: "General",
    blurb:
      "Terms that show up across every technique. Start here if you're new to the language of supervised learning.",
    keys: ["dataset"],
  },
  {
    id: "linear-regression",
    title: "Linear regression",
    family: "Supervised",
    techniqueSlug: "linear-regression",
    blurb:
      "Fitting a line through noisy points, plus the loss functions and optimizers used to land it.",
    keys: [
      "noise",
      "residuals",
      "confidenceBand",
      "optimizer",
      "learningRate",
      "epochs",
      "mse",
      "r2",
    ],
  },
  {
    id: "k-nearest-neighbors",
    title: "k-Nearest neighbors",
    family: "Supervised",
    techniqueSlug: "k-nearest-neighbors",
    blurb:
      "Lazy classification by neighbor vote. The math is trivial; the geometry of the boundary is everything.",
    keys: ["k", "distanceMetric", "decisionBoundary", "looAccuracy"],
  },
  {
    id: "decision-trees",
    title: "Decision trees",
    family: "Supervised",
    techniqueSlug: "decision-trees",
    blurb:
      "Greedy axis-aligned splits, ranked by how much they purify the children. Easy to overfit, easy to read.",
    keys: ["maxDepth", "minSamplesLeaf", "criterion"],
  },
  {
    id: "k-means",
    title: "k-Means clustering",
    family: "Unsupervised",
    techniqueSlug: "k-means",
    blurb:
      "Two alternating moves — assign to nearest centroid, snap centroid to assigned mean — until nothing changes.",
    keys: ["kmeansK", "centroid", "inertia", "lloyds"],
  },
  {
    id: "principal-components",
    title: "Principal components",
    family: "Unsupervised",
    techniqueSlug: "principal-components",
    blurb:
      "An eigendecomposition of the covariance matrix. PCA reorients the cloud onto the axes of maximum variance.",
    keys: [
      "principalComponent",
      "eigenvalue",
      "varianceExplained",
      "projection",
      "covariance",
      "pcaView",
    ],
  },
];

// Stable slug → anchor id (used by the A-Z jump links). Lower-cased term with
// non-alphanumerics replaced by dashes, matching what humans would expect to
// land on if someone copies a glossary anchor into a URL.
function anchorFor(key: string) {
  return key.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default function GlossaryPage() {
  const totalTerms = Object.keys(glossary).length;
  const alphabetical = (Object.keys(glossary) as Array<keyof typeof glossary>)
    .map((k) => ({ key: k, term: glossary[k].term }))
    .sort((a, b) => a.term.localeCompare(b.term));

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-white text-zinc-950">
      <Header active="Glossary" />

      <div className="mx-auto w-full max-w-[1320px]">
      <section className="px-4 pt-10 sm:px-8 md:px-14 md:pt-12">
        <div className="font-mono text-xs uppercase tracking-[0.06em] text-zinc-500">
          Reference · {totalTerms} terms · {sections.length} groups
        </div>
        <h1 className="mt-3.5 text-[36px] font-semibold leading-[1.02] tracking-[-0.03em] sm:text-[44px] lg:text-[56px]">
          The glossary.
        </h1>
        <p className="mt-3.5 max-w-[640px] text-[15px] leading-[1.55] text-zinc-600 md:text-[17px]">
          Every term that shows up on a playground sidebar, defined once and linked from the ⓘ
          tooltips. Grouped by where it earns its keep.
        </p>

        <div className="mt-7 flex flex-wrap gap-x-3 gap-y-2 border-b border-zinc-200 pb-5">
          {alphabetical.map(({ key, term }) => (
            <a
              key={key}
              href={`#${anchorFor(key)}`}
              className="font-mono text-[11px] uppercase tracking-[0.06em] text-zinc-500 transition hover:text-zinc-950"
            >
              {term}
            </a>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-12 px-4 pt-10 pb-16 sm:px-8 md:px-14">
        {sections.map((s) => (
          <SectionBlock key={s.id} section={s} />
        ))}
      </section>
      </div>
    </div>
  );
}

function SectionBlock({ section }: { section: Section }) {
  return (
    <div id={section.id}>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {section.family ? (
          <FamilyPill family={section.family} />
        ) : (
          <span className="pill pill-outline">General</span>
        )}
        <span className="font-mono text-xs uppercase tracking-[0.06em] text-zinc-500">
          §{" "}
          {section.techniqueSlug ? (
            <Link
              href={`/techniques/${section.techniqueSlug}`}
              className="text-zinc-500 underline-offset-4 hover:text-zinc-950 hover:underline"
            >
              {section.title}
            </Link>
          ) : (
            section.title
          )}
        </span>
        <div className="h-px flex-1 bg-zinc-100" />
        {section.techniqueSlug && (
          <Link
            href={`/techniques/${section.techniqueSlug}`}
            className="font-mono text-[11px] uppercase tracking-[0.06em] text-zinc-400 hover:text-zinc-950"
          >
            open playground →
          </Link>
        )}
      </div>
      <p className="mb-5 max-w-[720px] text-[14px] leading-[1.55] text-zinc-600">
        {section.blurb}
      </p>
      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
        {section.keys.map((key) => (
          <Entry key={key as string} entryKey={key} />
        ))}
      </div>
    </div>
  );
}

function Entry({ entryKey }: { entryKey: keyof typeof glossary }) {
  const entry = glossary[entryKey];
  return (
    <article
      id={anchorFor(entryKey as string)}
      className="group flex scroll-mt-24 flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-[18px] transition hover:border-zinc-300"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[16px] font-semibold tracking-[-0.01em] text-zinc-950">
          {entry.term}
        </h3>
        <a
          href={`#${anchorFor(entryKey as string)}`}
          aria-label={`Anchor link to ${entry.term}`}
          className="font-mono text-[11px] text-zinc-300 opacity-0 transition group-hover:opacity-100 hover:text-zinc-700"
        >
          #
        </a>
      </div>
      <div className="text-[13.5px] leading-[1.6] text-zinc-700">
        {entry.definition}
      </div>
    </article>
  );
}
