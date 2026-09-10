import type { Metadata } from "next";
import Link from "next/link";

import { HOW_LINKS } from "../links";

export const metadata: Metadata = {
  title: "Авторство",
  description: "Как DevShelf подтверждает авторство работ: уникальный код и автоматическая проверка.",
};

export default function HowVerifyPage() {
  return (
    <section className="relative mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-16">
      <div className="glow left-[-80px] top-[-60px] h-72 w-72 bg-amber-500" />
      <Link href="/" className="relative text-sm text-zinc-500 transition-colors hover:text-zinc-300">
        ← На главную
      </Link>

      <p className="relative mt-8 text-xs uppercase tracking-[0.3em] text-lime-300">Как это работает · шаг 3</p>
      <h1 className="relative mt-3 flex items-center gap-3 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
        <span>🛡️</span> Авторство
      </h1>

      <p className="relative mt-6 text-lg leading-relaxed text-zinc-300">
        Главная ценность DevShelf — доверие. Любой может написать «это моё», но подтвердить
        может не каждый. Поэтому каждая работа получает уникальный код, который доказывает,
        что автор — вы.
      </p>

      <div className="relative mt-10 space-y-6">
        <div className="card p-6">
          <h2 className="text-lg font-bold text-white">Как это работает</h2>
          <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-zinc-400">
            <li>При создании работы сервис выдаёт вам уникальный код вида <code className="rounded bg-white/10 px-1.5 py-0.5 text-lime-300">DEV-VERIFY:…</code></li>
            <li>Вы размещаете код там, где доказывается ваше авторство: в README репозитория, описании проекта, закреплённом посте канала — где угодно публичном.</li>
            <li>В кабинете указываете ссылку на это место и нажимаете «Проверить код сейчас».</li>
            <li>Сервис сам открывает страницу и ищет код. Нашёл — работа получает значок <strong className="text-lime-300">«Авторство подтверждено»</strong> автоматически.</li>
          </ol>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-bold text-white">Если автопроверка не прошла</h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            Страница может быть закрытой (приватный репозиторий), динамической или временно недоступной.
            Тогда работа уходит на ручную проверку владельцу сервиса: он откроет ссылку, найдёт код
            и подтвердит авторство. Это занимает обычно немного времени.
          </p>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-bold text-white">Зачем это нужно</h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            Подтверждённые работы видны в вашем публичном профиле и попадают на «Живую полку» на главной.
            Заказчик видит значок и понимает: работу делали вы, и вы готовы это доказать.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href={HOW_LINKS.reviews} className="btn btn-primary text-sm">Следующий шаг: оценки →</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
