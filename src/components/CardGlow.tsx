"use client";

import { useEffect, useRef } from "react";

/**
 * Свечение, следующее за курсором внутри карточки (скилл emil-design-eng:
 * декоративный mouse-tracking). Слушатели вешаются на родительскую карточку,
 * координаты пишутся в CSS-переменные — двигается только градиент (GPU).
 */
export default function CardGlow() {
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    const host = el?.parentElement;
    if (!el || !host) return;

    function onMove(e: PointerEvent) {
      if (!host) return;
      const r = host.getBoundingClientRect();
      host.style.setProperty("--mx", `${e.clientX - r.left}px`);
      host.style.setProperty("--my", `${e.clientY - r.top}px`);
    }

    host.addEventListener("pointermove", onMove);
    return () => host.removeEventListener("pointermove", onMove);
  }, []);

  return <span ref={ref} aria-hidden className="card-glow" />;
}
