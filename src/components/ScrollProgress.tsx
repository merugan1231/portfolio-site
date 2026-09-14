"use client";

import { useEffect, useRef } from "react";

/**
 * Прогресс-бар чтения страницы (скилл emil-design-eng: постоянное движение —
 * линейная логика, обновление в rAF, только transform — GPU).
 */
export default function ScrollProgress() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let raf = 0;
    function update() {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const doc = document.documentElement;
        const max = doc.scrollHeight - window.innerHeight;
        const p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
        el!.style.transform = `scaleX(${p})`;
      });
    }

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="scroll-progress fixed inset-x-0 top-0 w-full"
      style={{ transform: "scaleX(0)" }}
    />
  );
}
