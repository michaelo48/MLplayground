import Link from "next/link";

type HeaderProps = {
  active?: "Home" | "Techniques" | "Glossary" | "About";
  variant?: "light" | "dark";
};

const items: Array<{ label: HeaderProps["active"]; href: string }> = [
  { label: "Techniques", href: "/techniques" },
  { label: "Glossary", href: "/glossary" },
  { label: "About", href: "/about" },
];

export function Header({ active = "Techniques", variant = "light" }: HeaderProps) {
  const dark = variant === "dark";
  const wrap = dark
    ? "bg-zinc-950 text-zinc-50 border-zinc-800"
    : "bg-transparent text-zinc-950 border-zinc-200";
  const muteText = dark ? "text-zinc-400" : "text-zinc-500";
  const inkText = dark ? "text-zinc-50" : "text-zinc-950";

  return (
    <header
      className={`relative z-10 flex items-center justify-between gap-3 border-b px-4 py-4 sm:px-8 md:px-14 md:py-[22px] ${wrap}`}
    >
      <Link
        href="/"
        className="flex shrink-0 items-center gap-2 text-sm font-semibold tracking-tight md:gap-2.5 md:text-base"
      >
        <span
          aria-hidden
          className="inline-block h-[11px] w-[11px] rounded-full"
          style={{ background: "linear-gradient(135deg, #34d399, #7c3aed)" }}
        />
        Flowstate ML
      </Link>
      <nav className={`flex gap-4 text-xs sm:gap-6 sm:text-sm md:gap-7 ${muteText}`}>
        {items.map((item) => {
          const isActive = item.label === active;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={isActive ? `${inkText} font-medium` : ""}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="flex shrink-0 items-center gap-2.5 text-[13px]">
        <span className={`hidden font-mono text-xs lg:inline ${muteText}`}>v0.4 · build 318</span>
      </div>
    </header>
  );
}
