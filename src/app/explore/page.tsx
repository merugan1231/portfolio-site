import type { Metadata } from "next";
import Link from "next/link";
import { getAllVerifiedWorks, getWorkAuthors, getWorkRating, getServiceStats, WORK_TYPES } from "@/lib/works";
import { ensureDemoVolume, listDemoWorks, type DemoWork } from "@/lib/demo-works";
import PageBanner from "@/components/PageBanner";
import WorkGrid, { type GridCard } from "@/components/WorkGrid";

export const metadata: Metadata = { title: "Все работы пользователей" };
export const dynamic = "force-dynamic";

const TYPE_LABELS: Record<string, string> = Object.fromEntries(WORK_TYPES.map((t) => [t.id, t.label]));

/**
 * «Все работы» — публичная витрина каждого подтверждённого проекта:
 * поиск по названию/описанию/стеку + фильтр по типу. Доступно всем.
 * К реальным работам пользователей добавлено демо-наполнение (витринные
 * примеры), чтобы раздел не выглядел пустым на старте. Демо-карточки
 * открываются так же, как настоящие: у них есть своя страница /works/<id>.
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

  const cards: GridCard[] = [...realCards, ...demoCards].map((c) => ({
    key: c.key,
    id: c.id,
    demo: c.demo,
    title: c.title,
    summary: c.summary,
    typeLabel: c.typeLabel,
    authorName: c.authorName,
    authorUsername: c.authorUsername,
    dateLabel: c.date.toLocaleDateString("ru-RU"),
    rating: c.rating,
  }));

  return (
    <>
      {/* Фото-баннер раздела (EN-подпись + RU подзаголовок) */}
      <PageBanner
        photo="https://images.unsplash.com/photo-1461749280684-dccba630e2f6?q=80&w=2400&auto=format&fit=crop"
        title="Все работы наших пользователей"
        subtitle="Community Gallery · Галерея сообщества"
      >
        <p className="max-w-2xl text-base text-zinc-300 sm:text-lg">
          Каждый проект здесь прошёл подтверждение авторства. Ищите по названию, описанию или стеку, фильтруйте по типу.
        </p>
      </PageBanner>

      <section className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
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

      {/* Сетка работ: порции по 12 + «Показать ещё», prefetch ссылок — переход мгновенный */}
      <WorkGrid cards={cards} />
    </section>
    </>
  );
}
