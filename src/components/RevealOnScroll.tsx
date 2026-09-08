"use client";

import { useEffect } from "react";

/**
 * Анимация .reveal: элементы плавно появляются при попадании во viewport.
 * Страховка: через 2 секунды всё, что не было показано, показывается принудительно —
 * контент никогда не остаётся невидимым.
 */
export default function RevealOnScroll() {
  useEffect(() => {
    document.documentElement.classList.add("js");

    const els = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            observer.unobserve(e.target);
          }
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    );
    els.forEach((el) => observer.observe(el));

    const fallback = setTimeout(() => {
      els.forEach((el) => el.classList.add("is-visible"));
    }, 2000);

    return () => {
      observer.disconnect();
      clearTimeout(fallback);
    };
  }, []);

  return null;
}
