"use client";

import { useEffect } from "react";

/**
 * Анимация .reveal: элементы плавно появляются при попадании во viewport.
 * Важный фикс: следим за появлением НОВЫХ .reveal-элементов (MutationObserver) —
 * иначе после клиентской навигации контент оставался невидимым до перезагрузки.
 * Страховка: через 2.5 секунды всё скрытое показывается принудительно.
 */
export default function RevealOnScroll() {
  useEffect(() => {
    document.documentElement.classList.add("js");

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

    function observeAll(root: ParentNode) {
      root.querySelectorAll<HTMLElement>(".reveal:not(.is-visible)").forEach((el) => {
        observer.observe(el);
      });
    }

    observeAll(document);

    // Новые элементы появляются при клиентской навигации и подгрузке данных
    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          if (node.classList.contains("reveal")) observer.observe(node);
          observeAll(node);
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    const fallback = setTimeout(() => {
      document.querySelectorAll<HTMLElement>(".reveal").forEach((el) => {
        el.classList.add("is-visible");
        observer.unobserve(el);
      });
    }, 2500);

    return () => {
      observer.disconnect();
      mo.disconnect();
      clearTimeout(fallback);
    };
  }, []);

  return null;
}
