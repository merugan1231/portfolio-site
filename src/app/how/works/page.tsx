import type { Metadata } from "next";
import Link from "next/link";

import { HOW_LINKS } from "../links";

export const metadata: Metadata = {
  title: "Работы",
  description: "Как описать работу на DevShelf: тип, процесс, команда, стек, вложения и перспектива.",
};

export default function HowWorksPage() {
  return (
    <section className="relative mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-16">
      <div className="glow left-[-80px] top-[-60px] h-72 w-72 bg-violet-500" />
      <Link href="/" className="relative text-sm text-zinc-500 transition-colors hover:text-zinc-300">
        ← На главную
      </Link>

      <p className="relative mt-8 text-xs uppercase tracking-[0.3em] text-lime-300">Как это работает · шаг 2</p>
      <h1 className="relative mt-3 flex items-center gap-3 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
        <span>🗂️</span> Работы
      </h1>

      <p className="relative mt-6 text-lg leading-relaxed text-zinc-300">
        Работа на DevShelf — это не картинка и не ссылка. Это история проекта, рассказанная
        по понятным пунктам: заинтересованный человек видит не только результат, но и то,
        какой путь вы прошли.
      </p>

      <div className="relative mt-10 space-y-6">
        <div className="card p-6">
          <h2 className="text-lg font-bold text-white">Пункты описания</h2>
          <ul className="mt-4 space-y-3 text-sm leading-relaxed text-zinc-400">
            <li className="flex gap-3"><span className="text-lime-300">•</span> <span><strong className="text-zinc-200">Тип</strong> — сайт, веб-приложение, бот, OSINT-расследование, дизайн, скрипт… Если ничего не подходит — выбирайте «Свой вариант» и пишите свой.</span></li>
            <li className="flex gap-3"><span className="text-lime-300">•</span> <span><strong className="text-zinc-200">Название и краткое описание</strong> — о чём проект в двух предложениях.</span></li>
            <li className="flex gap-3"><span className="text-lime-300">•</span> <span><strong className="text-zinc-200">Как сделано</strong> — самое главное: какие были сложности, как решали, что получилось. Минимум 50 символов, максимум — ваше красноречие.</span></li>
            <li className="flex gap-3"><span className="text-lime-300">•</span> <span><strong className="text-zinc-200">С кем сделано</strong> — соло или с командой.</span></li>
            <li className="flex gap-3"><span className="text-lime-300">•</span> <span><strong className="text-zinc-200">Инструменты и технологии</strong> — стек проекта.</span></li>
            <li className="flex gap-3"><span className="text-lime-300">•</span> <span><strong className="text-zinc-200">Вложения</strong> — сколько времени и денег ушло.</span></li>
            <li className="flex gap-3"><span className="text-lime-300">•</span> <span><strong className="text-zinc-200">Перспектива</strong> — что работа может принести дальше.</span></li>
            <li className="flex gap-3"><span className="text-lime-300">•</span> <span><strong className="text-zinc-200">Ссылки</strong> — до трёх: демо, репозиторий, кейс.</span></li>
          </ul>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-bold text-white">Лимиты</h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            На бесплатном тарифе — до 5 работ. Этого достаточно для стартового портфолио.
            Если хочется больше — <Link href="/cabinet" className="text-lime-300 hover:underline">Pro за 499 ₽/мес</Link> снимает ограничение.
          </p>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-bold text-white">Что дальше</h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            После создания работы вы получите уникальный код подтверждения. Следующий шаг —
            подтвердить авторство.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/works/new" className="btn btn-primary text-sm">Создать работу</Link>
            <Link href={HOW_LINKS.verify} className="btn btn-ghost text-sm">Следующий шаг: авторство →</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
