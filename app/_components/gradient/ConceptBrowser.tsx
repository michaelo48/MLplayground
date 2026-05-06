"use client";

import Link from "next/link";
import { type ReactNode, useState } from "react";
import styles from "../../page.module.css";

export type Family = "all" | "supervised" | "unsupervised" | "neural";

export type CardData = {
  slug: string | null; // null = no link (e.g. CTA card)
  size: "feature" | "tall" | "md" | "lg" | "sm";
  topline: string;
  duration: string;
  title: string;
  blurb: string;
  family: Exclude<Family, "all">;
  tags?: string[];
  badge?: string;
  meta?: string;
  viz?: ReactNode;
};

type FilterDef = { id: Family; label: string; count: number };

export function ConceptBrowser({
  cards,
  filters,
}: {
  cards: CardData[];
  filters: FilterDef[];
}) {
  const [active, setActive] = useState<Family>("all");
  const visible = (c: CardData) => active === "all" || c.family === active;

  return (
    <>
      <div className={styles.filterBar}>
        <div className={styles.filterTabs} role="tablist">
          {filters.map((f) => (
            <button
              key={f.id}
              role="tab"
              aria-selected={active === f.id}
              className={`${styles.filterTab} ${active === f.id ? styles.active : ""}`}
              onClick={() => setActive(f.id)}
            >
              {f.label} <span className={styles.filterCount}>{f.count}</span>
            </button>
          ))}
        </div>
        <div className={styles.filterSide}>
          <span className={styles.toggle}>
            <span className={styles.dot} style={{ background: "var(--accent)" }} />
            Sort: recommended
          </span>
        </div>
      </div>

      <div className={styles.conceptGrid}>
        {cards.map((c) => {
          const className = `${styles.card} ${styles[c.size]}`;
          const inner = (
            <>
              <div className={styles.topline}>
                <span>{c.topline}</span>
                <span>{c.duration}</span>
              </div>
              <h3>{c.title}</h3>
              <p>{c.blurb}</p>
              {c.viz && <div className={styles.viz}>{c.viz}</div>}
              {c.tags && c.tags.length > 0 && (
                <div className={styles.tags}>
                  {c.tags.map((t) => (
                    <span key={t} className={styles.tag}>
                      {t}
                    </span>
                  ))}
                </div>
              )}
              {(c.badge || c.meta) && (
                <div className={styles.meta}>
                  {c.badge ? <span className={styles.badge}>{c.badge}</span> : <span />}
                  <span className={styles.arrowR}>{c.meta ?? "Open →"}</span>
                </div>
              )}
            </>
          );

          if (!visible(c)) return null;
          return c.slug ? (
            <Link key={c.title} href={`/techniques/${c.slug}`} className={className}>
              {inner}
            </Link>
          ) : (
            <div key={c.title} className={className}>
              {inner}
            </div>
          );
        })}
      </div>
    </>
  );
}
