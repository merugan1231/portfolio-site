import type { Metadata } from "next";
import Link from "next/link";
import { getAllVerifiedWorks, getWorkAuthors, getWorkRating, WORK_TYPES } from "@/lib/works";

export const metadata: Metadata = { title: "Все работы пользователей" };
export const dynamic = "force-dynamic";

const TYPE_LABELS: Record<string, string> = Object.fromEntries(WORK_TYPES.map((t) => [t.id, t.label]));

/**
 * «Все работы» — публичная витрина каждого подтверждённого проекта:
 * поиск по названию/описанию/стеку + фильтр по типу. Доступно всем.
 */
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

  return (
    <section className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
      <div className="glow left-[-80px] top-[-60px] h-72 w-72 bg-lime-400" />
      <p className="text-xs uppercase tracking-[0.3em] text-lime-300">DevShelf · галерея сообщества</p>
      <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
        Все работы наших пользователей
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-zinc-400">
        Каждый проект здесь прошёл подтверждение авторства. Ищите по названию, описанию или стеку, фильтруйте по типу.
      </p>

      {/* Поиск и фильтры */}
      <form className="mt-8 flex flex-col gap-3 sm:flex-row" action="/explore">
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
        {works.length > 0 ? `Найдено работ: ${works.length}` : q || type ? "Ничего не нашли — попробуйте изменить запрос." : "Пока нет подтверждённых работ — они появятся совсем скоро."}
      </p>

      {/* Сетка работ */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {withRatings.map((w) => {
          const author = authors[w.userId];
          return (
            <div key={w.id} className="card flex flex-col p-6">
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-zinc-400">
                  {w.type === "custom" && w.typeCustom ? w.typeCustom : (TYPE_LABELS[w.type] ?? w.type)}
                </span>
                <span className="text-xs text-amber-300">
                  ⭐ {w.rating.count ? `${w.rating.avg} (${w.rating.count})` : "—"}
                </span>
              </div>
              <Link href={`/works/${w.id}`} className="mt-2 text-lg font-bold text-white transition-colors hover:text-lime-300">
                {w.title}
              </Link>
              <p className="mt-1.5 line-clamp-2 flex-1 text-sm text-zinc-400">{w.summary}</p>
              <div className="mt-3 flex items-center justify-between gap-2 text-xs">
                {author?.username ? (
                  <Link href={`/u/${author.username}`} className="text-zinc-400 transition-colors hover:text-lime-300">
                    {author.displayName} · @{author.username}
                  </Link>
                ) : (
                  <span className="text-zinc-600">Автор скрыт</span>
                )}
                <span className="text-zinc-600">{new Date(w.createdAt).toLocaleDateString("ru-RU")}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
