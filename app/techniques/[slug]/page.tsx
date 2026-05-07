import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "../../_components/Header";
import { FamilyPill } from "../../_components/FamilyPill";
import { techniques, techniqueBySlug } from "../../_lib/techniques";
import { LinearRegressionPlayground } from "./_playgrounds/LinearRegressionPlayground";
import { KNNPlayground } from "./_playgrounds/KNNPlayground";

export function generateStaticParams() {
  return techniques.map((t) => ({ slug: t.slug }));
}

export default async function TechniquePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const technique = techniqueBySlug(slug);
  if (!technique) notFound();

  if (technique.slug === "linear-regression") {
    return <LinearRegressionPlayground />;
  }
  if (technique.slug === "k-nearest-neighbors") {
    return <KNNPlayground />;
  }
  return <ComingSoon name={technique.name} family={technique.family} blurb={technique.blurb} />;
}

function ComingSoon({
  name,
  family,
  blurb,
}: {
  name: string;
  family: "Supervised" | "Unsupervised" | "Neural";
  blurb: string;
}) {
  return (
    <div className="flex min-h-screen flex-1 flex-col bg-white text-zinc-950">
      <Header active="Techniques" />
      <div className="border-b border-zinc-100 px-4 pt-6 pb-4 sm:px-8 md:px-14 md:pt-7 md:pb-[18px]">
        <div className="font-mono text-xs uppercase tracking-[0.06em] text-zinc-500">
          <Link href="/techniques" className="hover:text-zinc-900">
            Techniques
          </Link>{" "}
          · {family} · <span className="text-zinc-950">{name}</span>
        </div>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <h1 className="text-[28px] font-semibold tracking-[-0.025em] sm:text-[32px] lg:text-[38px]">
            {name}
          </h1>
          <FamilyPill family={family} />
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center px-4 py-16 sm:px-8 md:px-14 md:py-20">
        <div className="max-w-[480px] text-center">
          <div className="font-mono text-xs uppercase tracking-[0.08em] text-zinc-400">
            Playground in progress
          </div>
          <p className="mt-3 text-[18px] leading-[1.55] text-zinc-600">{blurb}</p>
          <p className="mt-3 text-[15px] leading-[1.55] text-zinc-500">
            This technique&apos;s playground is being built.{" "}
            <Link href="/techniques/linear-regression" className="text-zinc-950 underline">
              Try Linear Regression
            </Link>{" "}
            in the meantime.
          </p>
        </div>
      </div>
    </div>
  );
}
