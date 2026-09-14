"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Лёгкий параллакс фото-фона hero: слой двигается медленнее скролла.
 * Только transform (GPU), rAF-троттлинг, уважает prefers-reduced-motion
 * (скиллы emil-design-eng + frontend-ui-engineering).
 */
export default function HeroParallax({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    function onScroll() {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const y = window.scrollY;
        if (y < window.innerHeight * 1.2) {
          el!.style.transform = `translate3d(0, ${y * 0.25}px, 0)`;
        }
      });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={ref} className="parallax-layer absolute inset-0" aria-hidden>
      {children}
    </div>
  );
}
