import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "../../_components/Header";
import { FamilyPill } from "../../_components/FamilyPill";
import { RegressionPlot } from "../../_components/plots/RegressionPlot";
import { LossCurve } from "../../_components/plots/LossCurve";
import { samplePoints } from "../../_lib/sample-data";
import { techniques, techniqueBySlug } from "../../_lib/techniques";

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
  return <ComingSoon name={technique.name} family={technique.family} blurb={technique.blurb} />;
}

/* ────────────────────── Linear Regression playground (Play A) ────────────────────── */

function LinearRegressionPlayground() {
  return (
    <div className="flex min-h-screen flex-1 flex-col bg-white text-zinc-950">
      <Header active="Techniques" />

      {/* Breadcrumb + title */}
      <div className="border-b border-zinc-100 px-14 pt-7 pb-[18px]">
        <div className="font-mono text-xs uppercase tracking-[0.06em] text-zinc-500">
          <Link href="/techniques" className="hover:text-zinc-900">
            Techniques
          </Link>{" "}
          · Supervised · <span className="text-zinc-950">Linear Regression</span>
        </div>
        <div className="mt-2 flex items-end justify-between">
          <h1 className="text-[38px] font-semibold tracking-[-0.025em]">Linear Regression</h1>
          <div className="flex gap-2">
            <span className="pill pill-outline">↺ Reset</span>
            <span className="pill pill-outline">⇧ Export model</span>
            <span className="pill pill-solid">Run ▶</span>
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid min-h-0 flex-1 grid-cols-[260px_1fr_320px]">
        {/* Left: dataset */}
        <aside className="flex flex-col gap-[22px] border-r border-zinc-100 p-[22px]">
          <SidebarSection title="Dataset">
            <PickerRow label="Synthetic — noisy line" active />
            <PickerRow label="Boston housing" />
            <PickerRow label="Auto MPG" />
            <PickerRow label="Sketch your own  +" muted />
          </SidebarSection>

          <SidebarSection title="Points · n = 26">
            <Slider value={65} />
            <ScaleLabel min="10" max="100" />
          </SidebarSection>

          <SidebarSection title="Noise · σ = 0.08">
            <Slider value={30} />
            <ScaleLabel min="0" max="0.5" />
          </SidebarSection>

          <SidebarSection title="Display">
            <Toggle label="Show residuals" on />
            <Toggle label="Show confidence band" />
            <Toggle label="Show grid" on />
          </SidebarSection>
        </aside>

        {/* Center: canvas */}
        <main className="flex min-w-0 flex-col gap-[18px] p-7">
          <div className="flex flex-1 flex-col overflow-hidden rounded-[14px] border border-zinc-200">
            <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
              <span className="font-mono text-[11px] tracking-[0.04em] text-zinc-500">
                FIT  ·  y = 0.621·x + 0.183
              </span>
              <div className="flex gap-3.5 font-mono text-[11px]">
                <span className="text-zinc-500">iter 240/300</span>
                <span className="text-emerald-500">✓ converged</span>
              </div>
            </div>
            <div className="relative flex-1">
              <RegressionPlot
                width={780}
                height={420}
                points={samplePoints}
                slope={0.62}
                intercept={0.18}
                showResiduals
              />
            </div>
          </div>

          <div className="flex h-[152px] flex-col overflow-hidden rounded-[14px] border border-zinc-200">
            <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-2.5">
              <span className="font-mono text-[11px] tracking-[0.04em] text-zinc-500">
                LOSS  ·  mean squared error
              </span>
              <span className="font-mono text-[11px] text-zinc-950">final 0.0042</span>
            </div>
            <div className="flex-1">
              <LossCurve width={780} height={108} />
            </div>
          </div>
        </main>

        {/* Right: hyperparameters + math */}
        <aside className="flex flex-col gap-[22px] border-l border-zinc-100 p-[22px]">
          <SidebarSection title="Optimizer">
            <div className="grid grid-cols-2 gap-1.5">
              {(["OLS (closed form)", "Gradient descent", "SGD", "Adam"] as const).map(
                (label, i) => (
                  <span
                    key={label}
                    className={
                      i === 1
                        ? "pill pill-solid justify-center px-2 py-1.5 text-[11.5px]"
                        : "pill pill-outline justify-center px-2 py-1.5 text-[11.5px]"
                    }
                  >
                    {label}
                  </span>
                ),
              )}
            </div>
          </SidebarSection>

          <SidebarSection title="Learning rate · 0.05">
            <Slider value={20} accent />
            <ScaleLabel min="0.001" max="0.5" />
          </SidebarSection>

          <SidebarSection title="Epochs · 300">
            <Slider value={55} accent />
          </SidebarSection>

          <SidebarSection title="The math">
            <div className="rounded-lg border border-zinc-100 bg-stone-50 p-3 font-mono text-xs leading-[1.7] text-zinc-800">
              ŷ = β₀ + β₁·x
              <br />
              L(β) = (1/n) Σ (yᵢ − ŷᵢ)²
              <br />
              ∂L/∂β₁ = −(2/n) Σ xᵢ(yᵢ − ŷᵢ)
            </div>
          </SidebarSection>
        </aside>
      </div>
    </div>
  );
}

function SidebarSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-zinc-500">
        {title}
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function PickerRow({
  label,
  active,
  muted,
}: {
  label: string;
  active?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-lg border px-2.5 py-2 text-[13px] ${
        active
          ? "border-zinc-950 bg-zinc-50 text-zinc-800"
          : "border-transparent text-zinc-800"
      } ${muted ? "text-zinc-400" : ""}`}
    >
      <span>{label}</span>
      {active && <span className="font-mono text-[10px] text-zinc-500">✓</span>}
    </div>
  );
}

function Slider({ value, accent }: { value: number; accent?: boolean }) {
  return (
    <div className="relative h-2 rounded bg-zinc-100">
      <div
        className={`absolute inset-y-0 left-0 rounded ${
          accent ? "bg-violet-600" : "bg-zinc-950"
        }`}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

function ScaleLabel({ min, max }: { min: string; max: string }) {
  return (
    <div className="mt-1.5 font-mono text-[11px] text-zinc-400">
      {min} ──────── {max}
    </div>
  );
}

function Toggle({ label, on }: { label: string; on?: boolean }) {
  return (
    <div className="flex items-center justify-between text-[13px] text-zinc-800">
      <span>{label}</span>
      <span
        className={`relative inline-block h-[18px] w-[30px] rounded-full transition ${
          on ? "bg-zinc-950" : "bg-zinc-200"
        }`}
      >
        <span
          className={`absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white transition-all ${
            on ? "left-[14px]" : "left-0.5"
          }`}
        />
      </span>
    </div>
  );
}

/* ────────────────────── stub for not-yet-built techniques ────────────────────── */

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
      <div className="border-b border-zinc-100 px-14 pt-7 pb-[18px]">
        <div className="font-mono text-xs uppercase tracking-[0.06em] text-zinc-500">
          <Link href="/techniques" className="hover:text-zinc-900">
            Techniques
          </Link>{" "}
          · {family} · <span className="text-zinc-950">{name}</span>
        </div>
        <div className="mt-2 flex items-end justify-between">
          <h1 className="text-[38px] font-semibold tracking-[-0.025em]">{name}</h1>
          <FamilyPill family={family} />
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center px-14 py-20">
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
