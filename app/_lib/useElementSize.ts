import { useEffect, useRef, useState } from "react";

// ResizeObserver-backed measurement hook. The initial size seeds SSR /
// pre-hydration renders so the markup isn't blank; once the observer fires
// it's replaced with the real container dimensions.
export function useElementSize<T extends HTMLElement>(initial: { w: number; h: number }) {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState(initial);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      if (r.width > 0 && r.height > 0) {
        setSize({ w: Math.round(r.width), h: Math.round(r.height) });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}
