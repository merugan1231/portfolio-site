"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export type GridCard = {
  key: string;
  id: string;
  demo: boolean;
  title: string;
  summary: string;
  typeLabel: string;
  authorName: string;
  authorUsername: string | null;
  dateLabel: string;
  rating: { avg: number; count: number };
};

const PAGE_SIZE = 12;

/**
 * Сетка работ витрины с порционной подгрузкой: рендерим по 12 карточек,
 * «Показать ещё» добавляет следующую порцию. Все ссылки prefetch'атся
 * на пенсю — клик по карточке переключается мгновенно.
 */
export default function WorkGrid({ cards }: { cards: GridCard[] }) {
  const [shown, setShown] = useState(PAGE_SIZE);
  const router = useRouter();

  // Порция сбрасывается при новом поиске/фильтре (cards изменились)
  useEffect(() => {
    setShown(PAGE_SIZE);
  }, [cards]);

  // Prefetch первых 2 порций ссылок: переход становится мгновенным
  useEffect(() => {
    for (const c of cards.slice(0, PAGE_SIZE * 2)) {
      router.prefetch(`/works/${c.id}`);
    }
  }, [cards, router]);

  const visible = cards.slice(0, shown);
  const hasMore = shown < cards.length;

  return (
    <>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 sm:gap-4">
        {visible.map((c) => (
          <Link
            key={c.key}
            href={`/works/${c.id}`}
            prefetch
            className={`card group flex flex-col p-6 ${c.demo ? "opacity-90" : ""}`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-zinc-400">
                {c.typeLabel}
              </span>
              <span className="text-xs text-amber-300">
                ⭐ {c.rating.count ? `${c.rating.avg} (${c.rating.count})` : "—"}
              </span>
            </div>
            <span className="mt-2 block text-lg font-bold text-white transition-colors group-hover:text-lime-300">
              {c.title}
            </span>
            <p className="mt-1.5 line-clamp-2 flex-1 text-sm text-zinc-400">{c.summary}</p>
            <div className="mt-3 flex items-center justify-between gap-2 text-xs">
              {c.demo ? (
                <Link
                  href={`/u/${c.authorUsername}`}
                  prefetch
                  className="text-zinc-400 transition-colors hover:text-lime-300"
                >
                  {c.authorName} · @{c.authorUsername}
                </Link>
              ) : c.authorUsername ? (
                <span className="text-zinc-400 transition-colors group-hover:text-lime-300">
                  {c.authorName} · @{c.authorUsername}
                </span>
              ) : (
                <span className="text-zinc-600">Автор скрыт</span>
              )}
              <span className="flex items-center gap-2 text-zinc-600">{c.dateLabel}</span>
            </div>
          </Link>
        ))}
      </div>

      {hasMore && (
        <div className="mt-8 text-center">
          <button onClick={() => setShown((s) => s + PAGE_SIZE)} className="btn btn-ghost px-8">
            Показать ещё ({cards.length - shown})
          </button>
        </div>
      )}
    </>
  );
}
