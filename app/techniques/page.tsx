import Link from "next/link";
import { Header } from "../_components/Header";
import { FamilyPill, type Family } from "../_components/FamilyPill";
import { MiniPreview } from "../_components/plots/MiniPreviews";
import {
  techniques,
  familyDescriptions,
  type Technique,
} from "../_lib/techniques";

const families: Family[] = ["Supervised", "Unsupervised"];

export default function TechniquesIndex() {
  return (
    <div className="flex min-h-screen flex-1 flex-col bg-white text-zinc-950">
      <Header active="Techniques" />

      <section className="px-4 pt-10 sm:px-8 md:px-14 md:pt-12">
        <div className="font-mono text-xs uppercase tracking-[0.06em] text-zinc-500">
          Browse · 5 techniques · 2 families
        </div>
        <h1 className="mt-3.5 text-[36px] font-semibold leading-[1.02] tracking-[-0.03em] sm:text-[44px] lg:text-[56px]">
          The full catalog.
        </h1>
        <p className="mt-3.5 max-w-[640px] text-[15px] leading-[1.55] text-zinc-600 md:text-[17px]">
          Each card is a working playground — not a write-up. Hover to preview the demo, click to
          open it.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-3.5">
          <div className="flex flex-wrap gap-2">
            <span className="pill pill-solid">All · 5</span>
            <span className="pill pill-supervised">Supervised · 3</span>
            <span className="pill pill-unsupervised">Unsupervised · 2</span>
          </div>
          <div className="flex flex-wrap gap-[22px] font-mono text-xs text-zinc-500">
            <span>sort: family ↓</span>
            <span>view: ▦ grid · list</span>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-9 px-4 pt-8 pb-12 sm:px-8 md:px-14">
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
                <div className="h-px flex-1 bg-zinc-100" />
              </div>
              <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 lg:grid-cols-3">
                {items.map((t) => (
                  <IndexCard key={t.slug} technique={t} />
                ))}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}

function IndexCard({ technique }: { technique: Technique }) {
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
