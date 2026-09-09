import type { Metadata } from "next";
import Link from "next/link";

import { HOW_LINKS } from "../links";

export const metadata: Metadata = {
  title: "Оценки",
  description: "Честная система оценок DevShelf: обоснованные низкие оценки, оспаривание несправедливых отзывов.",
};

export default function HowReviewsPage() {
  return (
    <section className="relative mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <div className="glow left-[-80px] top-[-60px] h-72 w-72 bg-sky-500" />
      <Link href="/" className="relative text-sm text-zinc-500 transition-colors hover:text-zinc-300">
        ← На главную
      </Link>

      <p className="relative mt-8 text-xs uppercase tracking-[0.3em] text-lime-300">Как это работает · шаг 4</p>
      <h1 className="relative mt-3 flex items-center gap-3 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
        <span>⭐</span> Оценки
      </h1>

      <p className="relative mt-6 text-lg leading-relaxed text-zinc-300">
        Оценка — это репутация. Поэтому на DevShelf она честная с обеих сторон: и для автора
        работы, и для того, кто оценивает.
      </p>

      <div className="relative mt-10 space-y-6">
        <div className="card p-6">
          <h2 className="text-lg font-bold text-white">Правила оценок</h2>
          <ul className="mt-4 space-y-3 text-sm leading-relaxed text-zinc-400">
            <li className="flex gap-3"><span className="text-lime-300">•</span> <span>Оценка ставится от 1 до 5 звёзд — только зарегистрированными пользователями и только на чужие работы.</span></li>
            <li className="flex gap-3"><span className="text-lime-300">•</span> <span><strong className="text-zinc-200">Низкая оценка — с объяснением.</strong> Если ставите меньше 4 звёзд, обязательно опишите, что именно не так — минимум 30 символов. Просто «плохо» оставить нельзя.</span></li>
            <li className="flex gap-3"><span className="text-lime-300">•</span> <span>Средний балл работы считается только по опубликованным отзывам.</span></li>
          </ul>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-bold text-white">Оспаривание</h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            Считаете оценку несправедливой? Владелец работы может нажать «Оспорить оценку» и объяснить,
            почему. Спор попадает к администрации сервиса: если отзыв необоснованный (например,
            единица «на эмоциях» без аргументов) — он будет удалён. Если обоснованный — останется.
          </p>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-bold text-white">Итог</h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            Автор видит честную картину: что нравится и над чем работать. Заказчик — реальную репутацию,
            а не накрученные пять звёзд.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/register" className="btn btn-primary text-sm">Начать бесплатно</Link>
            <Link href={HOW_LINKS.cabinet} className="btn btn-ghost text-sm">← К первому шагу</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
