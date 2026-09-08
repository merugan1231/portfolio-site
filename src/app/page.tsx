import Link from "next/link";
import { getPortfolio } from "@/lib/storage";
import ProjectCard from "@/components/ProjectCard";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const { welcome } = await searchParams;
  const { profile, skills, projects } = await getPortfolio();

  return (
    <>
      {/* Приветствие после входа */}
      {welcome ? (
        <div className="mx-auto w-full max-w-6xl px-6 pt-6">
          <div className="rounded-xl border border-lime-300/30 bg-lime-300/10 px-5 py-3 text-sm text-lime-200">
            Добро пожаловать, {welcome}! Вы успешно вошли.
          </div>
        </div>
      ) : null}

      {/* Герой */}
      <section className="relative overflow-hidden">
        <div className="glow left-1/2 top-[-120px] h-[420px] w-[420px] -translate-x-1/2 bg-indigo-500" />
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-6 py-24 text-center sm:py-32">
          <span className="rounded-full border border-lime-300/30 bg-lime-300/10 px-4 py-1.5 text-sm text-lime-200">
            {profile.location} · открыт к заказам
          </span>
          <h1 className="max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-6xl">
            Создаю сайты, которые{" "}
            <span className="gradient-text">продают и впечатляют</span>
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-zinc-400">{profile.title}</p>
          <div className="mt-2 flex flex-wrap justify-center gap-4">
            <Link href="/projects" className="btn btn-primary">
              Смотреть проекты →
            </Link>
            <Link href="/contacts" className="btn btn-ghost">
              Обсудить заказ
            </Link>
          </div>
        </div>
      </section>

      {/* Преимущества */}
      <section className="mx-auto w-full max-w-6xl px-6 pb-20">
        <div className="grid gap-5 sm:grid-cols-3">
          {[
            { icon: "⚡", title: "Скорость", text: "Сайты грузятся меньше секунды — Lighthouse 95+" },
            { icon: "📱", title: "Адаптив", text: "Идеальный вид на телефоне, планшете и ПК" },
            { icon: "🎯", title: "Результат", text: "Дизайн и структура, которые приводят клиентов" },
          ].map((f, i) => (
            <div key={f.title} className="card reveal p-6" style={{ transitionDelay: `${i * 80}ms` }}>
              <span className="text-3xl">{f.icon}</span>
              <h3 className="mt-3 text-lg font-semibold text-white">{f.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-zinc-400">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* О себе (краткий блок со ссылкой на полную страницу) */}
      <section className="border-t border-white/10 bg-white/[0.02] py-20">
        <div className="mx-auto w-full max-w-6xl px-6">
          <div className="reveal flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">О себе</h2>
            <Link
              href="/about"
              className="text-sm font-medium text-lime-300 underline-offset-4 transition-colors hover:text-lime-200 hover:underline"
            >
              Читать подробнее →
            </Link>
          </div>
          <p className="reveal mt-6 max-w-3xl leading-relaxed text-zinc-400">
            {profile.about.split(". ").slice(0, 2).join(". ")}.
          </p>
        </div>
      </section>

      {/* Проекты (превью) */}
      <section className="border-t border-white/10 py-20">
        <div className="mx-auto w-full max-w-6xl px-6">
          <div className="reveal flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Избранные проекты
              </h2>
              <p className="mt-3 text-zinc-400">Каждый проект — это решённая задача клиента.</p>
            </div>
            <Link
              href="/projects"
              className="text-sm font-medium text-lime-300 underline-offset-4 transition-colors hover:text-lime-200 hover:underline"
            >
              Все проекты →
            </Link>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {projects.slice(0, 3).map((p, i) => (
              <div key={p.id} className="reveal" style={{ transitionDelay: `${i * 80}ms` }}>
                <ProjectCard {...p} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Технологии */}
      <section className="mx-auto w-full max-w-6xl px-6 py-20">
        <h2 className="reveal text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Технологии
        </h2>
        <div className="mt-8 flex flex-wrap gap-3">
          {skills.map((s, i) => (
            <span
              key={s}
              className="reveal card cursor-default px-4 py-2 text-sm font-medium text-zinc-200 hover:!border-lime-300/50"
              style={{ transitionDelay: `${i * 40}ms` }}
            >
              {s}
            </span>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-white/10 py-20">
        <div className="mx-auto w-full max-w-6xl px-6">
          <div className="card reveal flex flex-col items-center gap-6 overflow-hidden p-10 text-center">
            <div className="glow left-1/2 top-0 h-64 w-64 -translate-x-1/2 -translate-y-1/2 bg-violet-500" />
            <h2 className="relative text-3xl font-bold text-white sm:text-4xl">
              Есть идея сайта? <span className="gradient-text">Давайте обсудим</span>
            </h2>
            <p className="relative max-w-xl text-zinc-400">
              Расскажите о задаче — предложу решение, сроки и точную смету в течение дня.
            </p>
            <Link href="/contacts" className="btn btn-primary relative">
              Связаться со мной
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
