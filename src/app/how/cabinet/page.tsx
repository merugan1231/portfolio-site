import type { Metadata } from "next";
import Link from "next/link";

import { HOW_LINKS } from "../links";

export const metadata: Metadata = {
  title: "Личный кабинет",
  description: "Как устроен личный кабинет DevShelf: профиль, биография, контакты и стаж на сервисе.",
};

export default function HowCabinetPage() {
  return (
    <section className="relative mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <div className="glow left-[-80px] top-[-60px] h-72 w-72 bg-indigo-500" />
      <Link href="/" className="relative text-sm text-zinc-500 transition-colors hover:text-zinc-300">
        ← На главную
      </Link>

      <p className="relative mt-8 text-xs uppercase tracking-[0.3em] text-lime-300">Как это работает · шаг 1</p>
      <h1 className="relative mt-3 flex items-center gap-3 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
        <span>👤</span> Личный кабинет
      </h1>

      <p className="relative mt-6 text-lg leading-relaxed text-zinc-300">
        Кабинет — это ваш командный центр на DevShelf. Всё, что вы делаете на сервисе,
        собирается здесь: профиль, работы, оценки и настройки.
      </p>

      <div className="relative mt-10 space-y-6">
        <div className="card p-6">
          <h2 className="text-lg font-bold text-white">Что внутри</h2>
          <ul className="mt-4 space-y-3 text-sm leading-relaxed text-zinc-400">
            <li className="flex gap-3"><span className="text-lime-300">•</span> <span><strong className="text-zinc-200">Юзернейм</strong> — ваше имя в системе. Выбирается один раз и закрепляется навсегда: по нему вас находят через поиск, ваш профиль живёт по адресу <code className="rounded bg-white/10 px-1.5 py-0.5 text-lime-300">/u/юзернейм</code>.</span></li>
            <li className="flex gap-3"><span className="text-lime-300">•</span> <span><strong className="text-zinc-200">Имя и аватар</strong> — имя отображается над юзернеймом, его можно менять раз в сутки. Аватар — эмодзи или ссылка на картинку.</span></li>
            <li className="flex gap-3"><span className="text-lime-300">•</span> <span><strong className="text-zinc-200">Биография по пунктам</strong> — специализация, опыт, образование, город, языки, статус занятости, достижения и интересный факт. Все пункты необязательные: заполняйте только то, чем готовы поделиться.</span></li>
            <li className="flex gap-3"><span className="text-lime-300">•</span> <span><strong className="text-zinc-200">Свои контакты</strong> — до 5 любых (Telegram, GitHub, что угодно). Они видны в вашем публичном профиле, чтобы заказчики могли связаться.</span></li>
            <li className="flex gap-3"><span className="text-lime-300">•</span> <span><strong className="text-zinc-200">Стаж</strong> — сколько дней вы на сервисе. Это видно только вам.</span></li>
          </ul>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-bold text-white">Мои работы</h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            В кабинете живёт список всех ваших работ со статусом авторства и оценками. На бесплатном
            тарифе можно опубликовать до 5 работ; подписка Pro снимает лимит. Здесь же — код
            подтверждения каждой работы и кнопка перепроверки.
          </p>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-bold text-white">Как попасть</h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            Зарегистрируйтесь по email или через Google — и сразу после выберите юзернейм.
            Юзернейм задаётся один раз, выбирайте тот, с которым готовы жить долго.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/register" className="btn btn-primary text-sm">Создать кабинет</Link>
            <Link href={HOW_LINKS.works} className="btn btn-ghost text-sm">Следующий шаг: работы →</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
