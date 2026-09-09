import type { Metadata } from "next";
import Link from "next/link";
import { getPortfolio } from "@/lib/storage";
import type { Project } from "@/lib/portfolio";

export const metadata: Metadata = { title: "Экспозиция" };
export const dynamic = "force-dynamic";

/**
 * «Экспозиция» — индивидуальная подача работ владельца сервиса:
 * вертикальная лента-выставка с чередованием сторон, крупным годом,
 * цветовой полосой по тегам и счётчиком экспонатов.
 */

const ACCENTS = ["bg-lime-300", "bg-indigo-400", "bg-violet-400", "bg-amber-300", "bg-sky-400", "bg-rose-400"];

function accentFor(tags: string[]): string {
  if (!tags.length) return ACCENTS[0];
  let h = 0;
  for (const ch of tags[0]) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return ACCENTS[h % ACCENTS.length];
}

function Exhibit({ p, index }: { p: Project; index: number }) {
  const reversed = index % 2 === 1;
  const accent = accentFor(p.tags);
  return (
    <article
      className="reveal group relative grid gap-6 md:grid-cols-[auto_1fr] md:gap-10"
      style={{ transitionDelay: `${(index % 3) * 80}ms` }}
    >
      {/* Крупный год и цветовая полоса */}
      <div className={`flex items-center gap-4 md:flex-col md:items-stretch md:gap-3 ${reversed ? "md:order-2" : ""}`}>
        <span className={`h-1 w-10 rounded-full md:h-auto md:w-1 md:self-stretch ${accent}`} />
        <span className="select-none text-5xl font-extrabold leading-none text-white/10 transition-colors duration-300 group-hover:text-white/20 sm:text-6xl md:text-7xl">
          {p.year}
        </span>
        <span className="text-xs uppercase tracking-[0.25em] text-zinc-600 md:[writing-mode:vertical-rl]">
          №{String(index + 1).padStart(2, "0")}
        </span>
      </div>

      {/* Тело экспоната */}
      <div className={`card p-7 transition-transform duration-300 group-hover:-translate-y-1 ${reversed ? "md:border-l-2" : "md:border-r-2"}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="text-2xl font-bold text-white transition-colors group-hover:text-lime-300">
            {p.title}
          </h2>
          <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-400 md:hidden">
            {p.year}
          </span>
        </div>
        <p className="mt-3 max-w-3xl leading-relaxed text-zinc-400">{p.description}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {p.tags.map((t) => (
            <span key={t} className={`rounded-md px-2.5 py-1 text-xs font-medium text-black/80 ${accent}`}>
              {t}
            </span>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-5 text-sm font-medium">
          {p.link && (
            <a href={p.link} target="_blank" rel="noopener noreferrer" className="text-lime-300 underline-offset-4 hover:text-lime-200 hover:underline">
              Живой пример ↗
            </a>
          )}
          {p.repo && (
            <a href={p.repo} target="_blank" rel="noopener noreferrer" className="text-zinc-400 underline-offset-4 hover:text-zinc-200 hover:underline">
              Код на GitHub ↗
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

export default async function ProjectsPage() {
  const { projects } = await getPortfolio();

  return (
    <section className="relative mx-auto w-full max-w-5xl flex-1 px-6 py-16">
      <div className="glow right-[-80px] top-[-60px] h-72 w-72 bg-indigo-500" />

      {/* Шапка-афиша */}
      <div className="relative">
        <p className="text-xs uppercase tracking-[0.3em] text-lime-300">DevShelf · выставка работ</p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          Экспозиция
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-zinc-400">
          Каждая работа — экспонат полки: год, теги и ссылки. Листайте вниз, как по выставочному залу.
        </p>
        <div className="mt-6 flex items-center gap-3 text-sm text-zinc-500">
          <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-lime-300" />
          Экспонатов в зале: {projects.length}
        </div>
      </div>

      {/* Лента экспонатов */}
      <div className="relative mt-14 space-y-14">
        <div className="absolute bottom-0 left-[7px] top-2 hidden w-px bg-gradient-to-b from-lime-300/40 via-white/10 to-transparent md:block" aria-hidden />
        {projects.map((p, i) => (
          <Exhibit key={p.id} p={p} index={i} />
        ))}
      </div>

      {projects.length === 0 && (
        <p className="mt-14 text-zinc-500">Зал пока пуст — экспонаты скоро появятся.</p>
      )}

      {/* Финал зала */}
      <div className="card reveal mt-16 flex flex-col items-center gap-4 p-10 text-center">
        <p className="text-2xl font-bold text-white">Конец экспозиции</p>
        <p className="max-w-md text-sm text-zinc-400">
          Хотите такую же работу у себя? Напишите — обсудим задачу.
        </p>
        <Link href="/contacts" className="btn btn-primary text-sm">
          Обсудить заказ
        </Link>
      </div>
    </section>
  );
}
