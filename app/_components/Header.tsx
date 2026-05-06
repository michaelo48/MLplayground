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
      className={`relative z-10 flex items-center justify-between border-b px-14 py-[22px] ${wrap}`}
    >
      <Link href="/" className="flex items-center gap-2.5 text-base font-semibold tracking-tight">
        <span
          aria-hidden
          className="inline-block h-[11px] w-[11px] rounded-full"
          style={{ background: "linear-gradient(135deg, #34d399, #7c3aed)" }}
        />
        Flowstate ML
      </Link>
      <nav className={`flex gap-7 text-sm ${muteText}`}>
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
      <div className="flex items-center gap-2.5 text-[13px]">
        <span className={`font-mono text-xs ${muteText}`}>v0.4 · build 318</span>
        <span
          className={`rounded-full border px-3.5 py-2 font-medium ${
            dark ? "border-zinc-800" : "border-zinc-200"
          } ${inkText}`}
        >
          Sign in
        </span>
      </div>
    </header>
  );
}
