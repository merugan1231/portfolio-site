import type { Metadata } from "next";
import Link from "next/link";
import { getAllVerifiedWorks, getWorkAuthors, getWorkRating, getServiceStats, WORK_TYPES } from "@/lib/works";
import { ensureDemoVolume, listDemoWorks, type DemoWork } from "@/lib/demo-works";

export const metadata: Metadata = { title: "Все работы пользователей" };
export const dynamic = "force-dynamic";

const TYPE_LABELS: Record<string, string> = Object.fromEntries(WORK_TYPES.map((t) => [t.id, t.label]));

/**
 * «Все работы» — публичная витрина каждого подтверждённого проекта:
 * поиск по названию/описанию/стеку + фильтр по типу. Доступно всем.
 * К реальным работам пользователей добавлено демо-наполнение (витринные
 * примеры), чтобы раздел не выглядел пустым на старте. Демо-карточки
 * помечены плашкой «Демо» и не ведут на страницу работы.
 */

type Card = {
  key: string;
  id: string;
  demo: boolean;
  title: string;
  summary: string;
  typeLabel: string;
  stack: string | string[];
  authorName: string;
  authorUsername: string | null;
  date: Date;
  rating: { avg: number; count: number };
};

function demoMatches(w: DemoWork, q: string, type: string): boolean {
  if (type && w.type !== type) return false;
  if (!q) return true;
  const hay = `${w.title} ${w.summary} ${w.stack.join(" ")} ${w.authorUsername}`.toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .every((part) => hay.includes(part));
}

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  const { q = "", type = "" } = await searchParams;
  const works = await getAllVerifiedWorks(q, type);
  const authors = await getWorkAuthors(works.map((w) => w.userId));
  const withRatings = await Promise.all(
    works.map(async (w) => ({ ...w, rating: await getWorkRating(w.id) }))
  );

  // Демо-сообщество инициализируется числами счётчиков главной:
  // сколько работ показывает счётчик — столько демо-работ существует
  const stats = await getServiceStats();
  const demoAll = ensureDemoVolume(stats.users, stats.works).works;
  const demoWorks = demoAll.filter((w) => demoMatches(w, q, type));

  const realCards: Card[] = withRatings.map((w) => {
    const author = authors[w.userId];
    return {
      key: w.id,
      id: w.id,
      demo: false,
      title: w.title,
      summary: w.summary,
      typeLabel: w.type === "custom" && w.typeCustom ? w.typeCustom : (TYPE_LABELS[w.type] ?? w.type),
      stack: w.stack,
      authorName: author?.displayName || author?.username || "Автор",
      authorUsername: author?.username ?? null,
      date: new Date(w.createdAt),
      rating: w.rating,
    };
  });

  const demoCards: Card[] = demoWorks.map((w) => ({
    key: w.id,
    id: w.id,
    demo: true,
    title: w.title,
    summary: w.summary,
    typeLabel: w.type === "custom" && w.typeCustom ? w.typeCustom : (TYPE_LABELS[w.type] ?? w.type),
    stack: w.stack,
    authorName: w.authorUsername,
    authorUsername: w.authorUsername,
    date: new Date(w.createdAt),
    rating: w.rating,
  }));

  const cards = [...realCards, ...demoCards];

  return (
    <section className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <div className="glow left-[-80px] top-[-60px] h-72 w-72 bg-lime-400" />
      <p className="text-xs uppercase tracking-[0.3em] text-lime-300">DevShelf · галерея сообщества</p>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
        Все работы наших пользователей
      </h1>
      <p className="mt-4 max-w-2xl text-base text-zinc-400 sm:text-lg">
        Каждый проект здесь прошёл подтверждение авторства. Ищите по названию, описанию или стеку, фильтруйте по типу.
      </p>

      {/* Поиск и фильтры */}
      <form className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row" action="/explore">
        <input
          name="q"
          defaultValue={q}
          placeholder="Поиск: react, бот, дашборд…"
          className="flex-1 rounded-xl border border-white/10 bg-zinc-900/70 px-4 py-3 text-white outline-none transition-colors focus:border-indigo-400"
        />
        <select
          name="type"
          defaultValue={type}
          className="rounded-xl border border-white/10 bg-zinc-900/70 px-4 py-3 text-white outline-none focus:border-indigo-400"
        >
          <option value="">Все типы</option>
          {WORK_TYPES.map((t) => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
        <button type="submit" className="btn btn-primary whitespace-nowrap px-6">Найти</button>
      </form>

      <p className="mt-4 text-sm text-zinc-500">
        {cards.length > 0
          ? `Показано работ: ${cards.length}${realCards.length ? ` (из них от участников: ${realCards.length})` : ""}`
          : q || type
            ? "Ничего не нашли — попробуйте изменить запрос."
            : "Пока нет подтверждённых работ — они появятся совсем скоро."}
      </p>

      {/* Сетка работ */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 sm:gap-4">
        {cards.map((c) => {
          const inner = (
            <>
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
                  <Link href={`/u/${c.authorUsername}`} className="text-zinc-400 transition-colors hover:text-lime-300">
                    {c.authorName} · @{c.authorUsername}
                  </Link>
                ) : c.authorUsername ? (
                  <span className="text-zinc-400 transition-colors group-hover:text-lime-300">
                    {c.authorName} · @{c.authorUsername}
                  </span>
                ) : (
                  <span className="text-zinc-600">Автор скрыт</span>
                )}
                <span className="flex items-center gap-2 text-zinc-600">
                  {c.demo && (
                    <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2 py-0.5 text-[10px] font-medium text-amber-200">
                      Демо
                    </span>
                  )}
                  {c.date.toLocaleDateString("ru-RU")}
                </span>
              </div>
            </>
          );

          return c.demo ? (
            <div key={c.key} className="card group flex flex-col p-6 opacity-90">
              {inner}
            </div>
          ) : (
            <Link key={c.key} href={`/works/${c.id}`} className="card group flex flex-col p-6">
              {inner}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
