import type { Metadata } from "next";
import Link from "next/link";
import PageBanner from "@/components/PageBanner";
import PhotoStrip from "@/components/PhotoStrip";

export const metadata: Metadata = { title: "О сервисе" };

export default function AboutPage() {
  return (
    <>
      <PageBanner
        photo="https://images.unsplash.com/photo-1531297484001-80022131f5a1?q=80&w=2400&auto=format&fit=crop"
        title={
          <>
            О <span className="gradient-text">сервисе</span>
          </>
        }
        subtitle="About DevShelf · О сервисе"
      />
      <section className="relative mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6 sm:py-16">
      <div className="glow left-[-100px] top-[-80px] h-80 w-80 bg-violet-500" />

      <p className="relative mt-6 text-lg leading-relaxed text-zinc-300">
        <strong className="text-white">DevShelf</strong> — это библиотека работ и портфолио для всех,
        кто что-то создаёт: программистов, OSINT-специалистов, кейсистов, иллюстраторов, разработчиков
        приложений, сайтов и Telegram-ботов — и не только.
      </p>

      <div className="relative mt-10 grid gap-5 sm:grid-cols-2">
        <div className="card reveal p-6">
          <span className="text-3xl">🧑‍💻</span>
          <h2 className="mt-3 text-lg font-semibold text-white">Личное портфолио</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">
            Зарегистрируйтесь, получите личный кабинет и соберите свои работы: с описанием процесса,
            команды, инструментов, вложений и перспектив.
          </p>
        </div>
        <div className="card reveal p-6" style={{ transitionDelay: "80ms" }}>
          <span className="text-3xl">🛡️</span>
          <h2 className="mt-3 text-lg font-semibold text-white">Подтверждение авторства</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">
            Каждая работа получает уникальный код. Разместите его в README или описании проекта —
            и авторство будет подтверждено автоматически.
          </p>
        </div>
        <div className="card reveal p-6" style={{ transitionDelay: "160ms" }}>
          <span className="text-3xl">⭐</span>
          <h2 className="mt-3 text-lg font-semibold text-white">Честные оценки</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">
            Оценка ниже 4 звёзд требует обоснованного объяснения — а владелец работы может оспорить
            несправедливый отзыв, который проверит администрация.
          </p>
        </div>
        <div className="card reveal p-6" style={{ transitionDelay: "240ms" }}>
          <span className="text-3xl">🔍</span>
          <h2 className="mt-3 text-lg font-semibold text-white">Поиск специалистов</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">
            Ищите людей по юзернейму, заходите в профили, изучайте подтверждённые работы —
            нанимайте с пониманием, что и как человек делал.
          </p>
        </div>
      </div>

      <div className="relative mt-10 card reveal p-8">
        <h2 className="text-xl font-bold text-white">Как это работает</h2>
        <ol className="mt-4 space-y-3 text-sm text-zinc-400">
          <li className="flex gap-3">
            <span className="font-bold text-lime-300">01</span> Регистрируетесь — по email или через Google — и получаете юзернейм.
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-lime-300">02</span> Создаёте работу по понятным пунктам: тип, процесс, команда, стек, вложения, перспектива.
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-lime-300">03</span> Подтверждаете авторство уникальным кодом — автоматически или через администрацию.
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-lime-300">04</span> Получаете публичный профиль с работами, оценками и своими контактами — делитесь ссылкой где угодно.
          </li>
        </ol>
      </div>

      <div className="relative mt-10 flex flex-wrap gap-4">
        <Link href="/register" className="btn btn-primary text-sm">
          Начать бесплатно
        </Link>
        <Link href="/search" className="btn btn-ghost text-sm">
          Найти специалиста
        </Link>
      </div>
    </section>

    {/* Фото-полоса перед финалом страницы */}
    <PhotoStrip
      photo="https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=1600&auto=format&fit=crop"
      alt="Рабочее место разработчика"
      caption="Build · Verify · Share · Публикуй · Подтверждай · Делись"
    />
    </>
  );
}
