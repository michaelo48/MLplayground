import Link from "next/link";
import { Header } from "./_components/Header";
import { FamilyPill } from "./_components/FamilyPill";
import { RegressionPlot } from "./_components/plots/RegressionPlot";
import { samplePoints } from "./_lib/sample-data";
import { techniques } from "./_lib/techniques";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-1 flex-col bg-white text-zinc-950">
      <Header active="Home" />

      <section className="grid grid-cols-1 gap-10 px-4 pt-10 sm:px-8 md:gap-14 md:px-14 md:pt-[60px] lg:grid-cols-[1fr_540px]">
        <div>
          <span className="pill pill-outline mb-[22px]">
            ✶ Interactive · No setup · Built for intuition
          </span>
          <h1 className="mt-[22px] max-w-[720px] text-[44px] font-semibold leading-[1.02] tracking-[-0.035em] sm:text-[60px] lg:text-[76px]">
            See machine learning,
            <br />
            <span className="font-serif font-medium italic text-violet-600">in motion.</span>
          </h1>
          <p className="mt-[22px] max-w-[520px] text-[16px] leading-[1.55] text-zinc-600 md:text-[18px]">
            Tweak the data, change a hyperparameter, watch the model learn. Each technique is a
            playground — not a paragraph — so you build intuition the way researchers actually do.
          </p>
          <div className="mt-[30px] flex flex-wrap gap-3">
            <Link
              href="/techniques"
              className="inline-flex h-12 items-center rounded-full bg-zinc-950 px-[22px] text-sm font-medium text-white"
            >
              Start exploring
            </Link>
            <Link
              href="/techniques/linear-regression"
              className="inline-flex h-12 items-center rounded-full border border-zinc-300 bg-white px-[22px] text-sm font-medium"
            >
              Try a 60-second demo →
            </Link>
          </div>
        </div>

        <LiveRegressionCard />
      </section>

      <section className="mt-12 px-4 pb-20 sm:px-8 md:mt-16 md:px-14">
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-2xl font-semibold tracking-[-0.02em]">Pick a technique</h2>
          <Link
            href="/techniques"
            className="font-mono text-xs text-zinc-500 hover:text-zinc-900"
          >
            06 / 06  →  view all
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 lg:grid-cols-3">
          {techniques.map((t) => (
            <Link
              key={t.slug}
              href={`/techniques/${t.slug}`}
              className="flex flex-col gap-2.5 rounded-2xl border border-zinc-200 bg-white p-[18px] transition hover:border-zinc-300 hover:shadow-sm"
            >
              <div className="flex items-center justify-between">
                <FamilyPill family={t.family} />
                <span className="text-zinc-400">→</span>
              </div>
              <div className="text-[17px] font-semibold tracking-[-0.01em]">{t.name}</div>
              <div className="text-[13.5px] leading-[1.5] text-zinc-600">{t.blurb}</div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function LiveRegressionCard() {
  return (
    <div className="overflow-hidden rounded-[18px] border border-zinc-200 bg-white shadow-[0_1px_0_rgba(0,0,0,0.02)]">
      <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
        <span className="font-mono text-[11px] text-zinc-500">linear-regression · live</span>
        <span className="flex gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-zinc-300" />
          <span className="inline-block h-2 w-2 rounded-full bg-zinc-300" />
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
        </span>
      </div>
      <RegressionPlot
        width={540}
        height={340}
        points={samplePoints}
        slope={0.62}
        intercept={0.18}
        showResiduals
      />
      <div className="grid grid-cols-3 border-t border-zinc-100">
        <Stat label="slope" value="0.621" />
        <Stat label="intercept" value="0.183" mid />
        <Stat label="MSE" value="0.0042" />
      </div>
    </div>
  );
}

function Stat({ label, value, mid }: { label: string; value: string; mid?: boolean }) {
  return (
    <div className={`px-4 py-3 text-center ${mid ? "border-x border-zinc-100" : ""}`}>
      <div className="font-mono text-[10.5px] uppercase tracking-[0.06em] text-zinc-400">
        {label}
      </div>
      <div className="mt-1 font-mono text-base font-medium text-zinc-950">{value}</div>
    </div>
  );
}
