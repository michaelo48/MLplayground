import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "../../_components/Header";
import { concepts, conceptBySlug } from "../../_lib/concepts";

export function generateStaticParams() {
  return concepts.map((c) => ({ slug: c.slug }));
}

export default async function ConceptPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const concept = conceptBySlug(slug);
  if (!concept) notFound();

  const idx = concepts.findIndex((c) => c.slug === slug);
  const prev = idx > 0 ? concepts[idx - 1] : null;
  const next = idx < concepts.length - 1 ? concepts[idx + 1] : null;

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-white text-zinc-950">
      <Header active="Techniques" />

      <div className="mx-auto flex w-full max-w-[1320px] flex-1 flex-col">
      <div className="border-b border-zinc-100 px-4 pt-6 pb-5 sm:px-8 md:px-14 md:pt-7">
        <div className="mx-auto w-full max-w-[820px]">
          <div className="font-mono text-xs uppercase tracking-[0.06em] text-zinc-500">
            <Link href="/#more" className="hover:text-zinc-900">
              Concepts
            </Link>{" "}
            · {concept.num} · <span className="text-zinc-950">{concept.name}</span>
          </div>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
            <h1 className="text-[34px] font-semibold tracking-[-0.025em] sm:text-[40px] lg:text-[48px]">
              {concept.name}
            </h1>
            <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-zinc-500">
              {concept.num} · ~{concept.readMinutes} min read
            </span>
          </div>
          <p className="mt-3 text-[15px] leading-[1.55] text-zinc-600 md:text-[17px]">
            {concept.blurb}
          </p>
        </div>
      </div>

      <article className="mx-auto w-full max-w-[820px] px-4 py-10 sm:px-8 md:py-12">
        {concept.body}

        {concept.related && concept.related.length > 0 && (
          <aside className="mt-12 rounded-2xl border border-zinc-200 bg-stone-50 p-5">
            <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-zinc-500">
              See it on a playground
            </div>
            <ul className="mt-3 flex flex-wrap gap-2">
              {concept.related.map((r) => (
                <li key={r.slug}>
                  <Link
                    href={`/techniques/${r.slug}`}
                    className="pill pill-outline hover:bg-white"
                  >
                    {r.label} →
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </article>

      <nav className="mt-auto border-t border-zinc-100 px-4 py-8 sm:px-8 md:px-14">
        <div className="mx-auto flex w-full max-w-[820px] flex-wrap items-stretch gap-3">
          {prev ? (
            <Link
              href={`/concepts/${prev.slug}`}
              className="group flex flex-1 flex-col gap-1 rounded-xl border border-zinc-200 px-4 py-3 transition hover:border-zinc-300 hover:bg-stone-50"
            >
              <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-zinc-400">
                ← {prev.num}
              </span>
              <span className="text-[15px] font-medium text-zinc-950">{prev.name}</span>
            </Link>
          ) : (
            <span className="flex-1" />
          )}
          {next ? (
            <Link
              href={`/concepts/${next.slug}`}
              className="group flex flex-1 flex-col items-end gap-1 rounded-xl border border-zinc-200 px-4 py-3 text-right transition hover:border-zinc-300 hover:bg-stone-50"
            >
              <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-zinc-400">
                {next.num} →
              </span>
              <span className="text-[15px] font-medium text-zinc-950">{next.name}</span>
            </Link>
          ) : (
            <span className="flex-1" />
          )}
        </div>
      </nav>
      </div>
    </div>
  );
}
