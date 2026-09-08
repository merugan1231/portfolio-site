import type { Metadata } from "next";
import Link from "next/link";
import { getPortfolio } from "@/lib/storage";

export const metadata: Metadata = { title: "Обо мне" };
export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const { profile, skills } = await getPortfolio();

  return (
    <section className="relative mx-auto w-full max-w-6xl flex-1 px-6 py-16">
      <div className="glow left-[-100px] top-[-80px] h-80 w-80 bg-violet-500" />
      <h1 className="relative text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
        Обо <span className="gradient-text">мне</span>
      </h1>

      <div className="relative mt-10 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        <div className="card reveal p-8">
          <h2 className="text-2xl font-bold text-white">{profile.name}</h2>
          <p className="mt-1 text-sm uppercase tracking-widest text-lime-300">{profile.title}</p>
          <p className="mt-6 whitespace-pre-line leading-relaxed text-zinc-300">
            {profile.about}
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/contacts" className="btn btn-primary text-sm">
              Связаться
            </Link>
            <Link href="/projects" className="btn btn-ghost text-sm">
              Мои работы
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="card reveal p-6" style={{ transitionDelay: "80ms" }}>
            <h3 className="text-lg font-semibold text-white">Как я работаю</h3>
            <ul className="mt-4 space-y-3 text-sm text-zinc-400">
              <li className="flex gap-3">
                <span className="text-lime-300">01</span> Обсуждаем задачу и цели бизнеса
              </li>
              <li className="flex gap-3">
                <span className="text-lime-300">02</span> Прототип и дизайн-концепция
              </li>
              <li className="flex gap-3">
                <span className="text-lime-300">03</span> Разработка и тестирование
              </li>
              <li className="flex gap-3">
                <span className="text-lime-300">04</span> Запуск, домен и поддержка
              </li>
            </ul>
          </div>
          <div className="card reveal p-6" style={{ transitionDelay: "160ms" }}>
            <h3 className="text-lg font-semibold text-white">Факты</h3>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-2xl font-extrabold text-lime-300">30+</p>
                <p className="text-xs text-zinc-500">проектов</p>
              </div>
              <div>
                <p className="text-2xl font-extrabold text-lime-300">5 лет</p>
                <p className="text-xs text-zinc-500">опыта</p>
              </div>
              <div>
                <p className="text-2xl font-extrabold text-lime-300">98%</p>
                <p className="text-xs text-zinc-500">довольных клиентов</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <h2 className="reveal mt-16 text-2xl font-bold text-white">Мой стек</h2>
      <div className="mt-6 flex flex-wrap gap-3">
        {skills.map((s, i) => (
          <span
            key={s}
            className="reveal card px-4 py-2 text-sm font-medium text-zinc-200 hover:!border-lime-300/50"
            style={{ transitionDelay: `${i * 40}ms` }}
          >
            {s}
          </span>
        ))}
      </div>
    </section>
  );
}
