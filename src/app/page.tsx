import Link from "next/link";
import { getRecentVerifiedWorks, getServiceStats, getWorkRating, type Work } from "@/lib/works";
import { getUsers } from "@/lib/storage";
import type { StoredUser } from "@/lib/storage";
import { getCurrentUser } from "@/lib/current-user";
import { AudienceSection } from "@/components/AudienceSection";
import LiveStats from "@/components/LiveStats";
import CardGlow from "@/components/CardGlow";
import HeroParallax from "@/components/HeroParallax";
import { ensureDemoVolume, listDemoShelf } from "@/lib/demo-works";

/* Unsplash-фотографии (Pinterest-эстетика: тёмные, атмосферные, «код и творчество») */
const HERO_PHOTOS = [
  "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=2400&auto=format&fit=crop", // код на экране
  "https://images.unsplash.com/photo-1517180102446-f3ece451e9d8?q=80&w=2400&auto=format&fit=crop", // десктоп разработчика
  "https://images.unsplash.com/photo-1542831371-29b0f74f9713?q=80&w=2400&auto=format&fit=crop", // код крупно
];
const GALLERY_PHOTOS = [
  { url: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?q=80&w=1200&auto=format&fit=crop", h: "h-72", title: "Веб-разработка", meta: "Сайты и приложения" },
  { url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=1200&auto=format&fit=crop", h: "h-52", title: "OSINT-расследования", meta: "Кейсы и анализ" },
  { url: "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=1200&auto=format&fit=crop", h: "h-64", title: "Дизайн", meta: "UI/UX и иллюстрации" },
  { url: "https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?q=80&w=1200&auto=format&fit=crop", h: "h-56", title: "Telegram-боты", meta: "Автоматизация" },
  { url: "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1200&auto=format&fit=crop", h: "h-72", title: "Дашборды", meta: "Данные и метрики" },
  { url: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=1200&auto=format&fit=crop", h: "h-52", title: "Скрипты", meta: "Автоматизация рутины" },
  { url: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=1200&auto=format&fit=crop", h: "h-64", title: "Кибербезопасность", meta: "Защита и аудит" },
  { url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=1200&auto=format&fit=crop", h: "h-56", title: "Мобильные приложения", meta: "iOS и Android" },
];
const MARQUEE_ITEMS = [
  "🛡️ Авторство подтверждено", "💻 12 ролей", "⭐ Честные оценки", "🆔 Цифровой ID",
  "🤖 Telegram-боты", "🔍 OSINT-кейсы", "🎨 Дизайн", "📊 Дашборды", "🌐 Веб-разработка", "🚀 Pro без лимитов",
];

export const dynamic = "force-dynamic";

const TYPE_LABELS: Record<string, string> = {
  site: "Сайт / лендинг", webapp: "Веб-приложение", bot: "Телеграм-бот", mobile: "Мобильное приложение",
  osint: "OSINT-расследование (кейс)", "osint-reveal": "OSINT-раскрытие кейса", design: "Дизайн / иллюстрация",
  "design-project": "Дизайн-проект (UI/UX, брендинг)", architecture: "Архитектура / проектирование", script: "Скрипт / автоматизация", custom: "Свой вариант",
};

function workTypeLabel(w: Work): string {
  if (w.type === "custom" && w.typeCustom) return w.typeCustom;
  return TYPE_LABELS[w.type] ?? w.type;
}

type ShelfItem = {
  id: string;
  title: string;
  summary: string;
  typeLabel: string;
  rating: { avg: number; count: number };
  href: string | null;       // null — демо-работа, страница работы недоступна
  demo: boolean;
  authorName: string;
  authorUsername: string | null;
  authorAvatarUrl: string;
  authorAvatarEmoji: string;
};

function AuthorLine({ item }: { item: ShelfItem }) {
  const avatar = item.authorAvatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={item.authorAvatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
  ) : (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm">
      {item.authorAvatarEmoji || "🧑‍💻"}
    </span>
  );
  const name = <span className="truncate text-sm text-zinc-300">{item.authorName}</span>;
  return (
    <div className="mt-3 flex items-center gap-2 border-t border-white/5 pt-3">
      {item.authorUsername ? (
        <Link href={`/u/${item.authorUsername}`} className="flex min-w-0 items-center gap-2 transition-opacity hover:opacity-80">
          {avatar}
          {name}
          <span className="truncate text-xs text-zinc-500">@{item.authorUsername}</span>
        </Link>
      ) : (
        <>
          {avatar}
          {name}
        </>
      )}
    </div>
  );
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const { welcome } = await searchParams;
  const me = await getCurrentUser();

  // Данные для «живой полки» и цифр сервиса (всё опционально — сайт не падает, если пусто)
  const [stats, recent, users] = await Promise.all([
    getServiceStats(),
    getRecentVerifiedWorks(6),
    getUsers(),
  ]);
  const usersById = new Map(users.map((u) => [u.id, u]));
  const realItems: ShelfItem[] = await Promise.all(
    recent.map(async (w) => {
      const author = usersById.get(w.userId);
      return {
        id: w.id,
        title: w.title,
        summary: w.summary,
        typeLabel: workTypeLabel(w),
        rating: await getWorkRating(w.id),
        href: `/works/${w.id}`,
        demo: false,
        authorName: author?.displayName?.trim() || author?.username || author?.login || "Автор",
        authorUsername: author?.username ?? null,
        authorAvatarUrl: author?.avatarUrl ?? "",
        authorAvatarEmoji: author?.avatarEmoji ?? "",
      };
    })
  );

  // Если реальных работ меньше 6 — полку добираем демо-работами по счётчику.
  // Демо-работы теперь тоже открываются: href ведёт на /works/<id демо-работы>.
  const demoVolume = ensureDemoVolume(stats.users, stats.works).works.length;
  const demoShelf = demoVolume === 0 || realItems.length >= 6 ? [] : listDemoShelf(6 - realItems.length);
  const shelfItems: ShelfItem[] =
    demoShelf.length === 0
      ? realItems
      : [...realItems, ...demoShelf.map((w) => ({ ...w, href: `/works/${w.id}` }))];

  return (
    <>
      {/* Приветствие после входа */}
      {welcome ? (
      <div className="mx-auto w-full max-w-6xl px-4 pt-6 sm:px-6">
        <div className="rounded-xl border border-lime-300/30 bg-lime-300/10 px-5 py-3 text-sm text-lime-200">
            Добро пожаловать, {welcome}! Вы успешно вошли.
          </div>
        </div>
      ) : null}

      {/* Герой с фото-фоном и параллаксом */}
      <section className="relative overflow-hidden">
        <HeroParallax>
          <div className="hero-photo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={HERO_PHOTOS[0]} alt="" fetchPriority="high" />
          </div>
        </HeroParallax>
        <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center gap-5 px-4 pb-16 pt-32 text-center sm:gap-6 sm:px-6 sm:pb-24 sm:pt-40 lg:pb-28 lg:pt-48">
          <span
            className="stagger-item inline-flex items-center gap-2 rounded-full border border-lime-300/30 bg-lime-300/10 px-4 py-1.5 text-xs text-lime-200 sm:text-sm"
            style={{ animationDelay: "0ms" }}
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime-300 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-lime-300" />
            </span>
            Полка работ разработчиков и креаторов
          </span>
          <h1
            className="stagger-item text-glow max-w-4xl text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-6xl lg:text-7xl"
            style={{ animationDelay: "60ms" }}
          >
            Покажи, <span className="gradient-text">как ты это сделал</span>
          </h1>
          <p
            className="stagger-item max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg"
            style={{ animationDelay: "120ms" }}
          >
            DevShelf — сервис, где программисты, OSINT-специалисты, кейсисты, иллюстраторы и создатели ботов
            собирают портфолио из подтверждённых работ: с процессом, командой, стеком и результатом.
          </p>
          <div
            className="stagger-item mt-2 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:justify-center sm:gap-4"
            style={{ animationDelay: "180ms" }}
          >
            <Link href="/register" className="btn btn-primary">
              Создать портфолио →
            </Link>
            <Link href="/search" className="btn btn-ghost">
              Найти специалиста
            </Link>
          </div>
          {/* Чипы доверия */}
          <div
            className="stagger-item mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-zinc-500 sm:text-sm"
            style={{ animationDelay: "240ms" }}
          >
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden>🛡️</span> Авторство подтверждается автоматически
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden>⭐</span> Честные оценки со спорами
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden>🆔</span> Постоянный цифровой ID
            </span>
          </div>

          {/* Цифры сервиса — «живые», слегка меняются каждые несколько секунд */}
          <LiveStats base={stats} />
        </div>
      </section>

      {/* Как это работает */}
      <hr className="hairline mx-auto w-full max-w-5xl" aria-hidden />
      <section className="py-14 sm:py-20">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <p className="reveal eyebrow justify-center">Как это работает</p>
          <h2 className="reveal mt-3 text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Четыре шага до <span className="gradient-text">подтверждённого</span> портфолио
          </h2>
          <div className="mt-8 grid gap-4 sm:mt-10 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
            {            [
              { icon: "👤", slug: "cabinet", title: "1. Кабинет", text: "Регистрируешься, получаешь юзернейм и личный кабинет — и настраиваешь профиль под себя." },
              { icon: "🗂️", slug: "works", title: "2. Работы", text: "Описываешь работу по пунктам: тип, процесс, команда, стек, вложения, перспектива." },
              { icon: "🛡️", slug: "verify", title: "3. Авторство", text: "Вставляешь уникальный код в README или описание — сервис подтверждает авторство автоматически." },
              { icon: "⭐", slug: "reviews", title: "4. Оценки", text: "Получаешь честные оценки: низкие — только с обоснованием, а несправедливые можно оспорить." },
            ].map((f, i) => (
              <Link
                key={f.slug}
                href={`/how/${f.slug}`}
                className="card reveal group block p-6 hover:!border-lime-300/40"
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <CardGlow />
                <span className="text-3xl">{f.icon}</span>
                <h3 className="mt-3 text-lg font-semibold text-white">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{f.text}</p>
                <span className="mt-3 inline-block text-xs font-medium text-lime-300/80 transition-colors group-hover:text-lime-300">
                  Подробнее →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Живая полка — свежие подтверждённые работы */}
      <hr className="hairline mx-auto w-full max-w-5xl" aria-hidden />
      <section className="py-14 sm:py-20">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="reveal flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-4">
            <div>
              <p className="eyebrow">Витрина</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Живая полка
              </h2>
              <p className="mt-3 max-w-xl text-sm text-zinc-400 sm:text-base">
                Свежие работы участников, у которых подтверждено авторство. Обновляется сама — без перезагрузки.
              </p>
            </div>
            <Link
              href="/search"
              className="text-sm font-medium text-lime-300 underline-offset-4 transition-colors hover:text-lime-200 hover:underline"
            >
              Все специалисты →
            </Link>
          </div>

          {shelfItems.length === 0 ? (
            <div className="reveal card mt-10 p-8 text-center">
              <p className="text-zinc-400">
                Полка пока пуста — станьте первым, кто выложит подтверждённую работу.
              </p>
              <Link href="/works/new" className="btn btn-primary mt-4 text-sm">
                Выложить работу
              </Link>
            </div>
          ) : (
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {shelfItems.map((item, i) => (
                <div key={item.id} className="reveal" style={{ transitionDelay: `${i * 60}ms` }}>
                  <div className="card flex h-full flex-col p-5">
                    <CardGlow />
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-full border border-white/10 px-2.5 py-0.5 text-xs text-zinc-400">
                        {item.typeLabel}
                      </span>
                      {item.rating.count > 0 && (
                        <span className="text-xs text-amber-300">⭐ {item.rating.avg}</span>
                      )}
                    </div>
                    {item.href ? (
                      <Link href={item.href} className="mt-2 font-semibold text-white hover:text-lime-300">
                        {item.title}
                      </Link>
                    ) : (
                      <span className="mt-2 font-semibold text-white">{item.title}</span>
                    )}
                    <p className="mt-1.5 line-clamp-3 flex-1 text-sm text-zinc-400">{item.summary}</p>
                    <AuthorLine item={item} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Marquee-лента категорий (пауза на hover, reduced-motion выключает) */}
      <div className="marquee border-y border-white/5 bg-white/[0.02] py-4" aria-hidden>
        <div className="marquee-track">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex shrink-0 items-center gap-12 text-sm font-medium text-zinc-500">
              {MARQUEE_ITEMS.map((m) => (
                <span key={m} className="whitespace-nowrap">{m}</span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Галерея категорий в стиле Pinterest: masonry, зум фото, подписи на hover */}
      <section className="py-14 sm:py-20">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="reveal">
            <p className="eyebrow">Направления</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Каждый найдёт <span className="gradient-text">своё</span>
            </h2>
          </div>
          <div className="masonry mt-10">
            {GALLERY_PHOTOS.map((p, i) => (
              <div key={p.title} className="masonry-item reveal" style={{ transitionDelay: `${(i % 3) * 60}ms` }}>
                <Link href="/explore" className="photo-card block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt={p.title} loading="lazy" className={p.h} />
                  <div className="photo-overlay">
                    <p className="text-sm font-semibold text-white">{p.title}</p>
                    <p className="text-xs text-zinc-400">{p.meta}</p>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Для кого сервис: клик по чипсу открывает описание */}
      <AudienceSection />

      {/* CTA */}
      <hr className="hairline mx-auto w-full max-w-5xl" aria-hidden />
      <section className="py-14 sm:py-20">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="card reveal relative flex flex-col items-center gap-5 overflow-hidden p-7 text-center sm:gap-6 sm:p-10">
            <div className="glow left-1/2 top-0 h-64 w-64 -translate-x-1/2 -translate-y-1/2 bg-violet-500" />
            <h2 className="relative text-2xl font-bold text-white sm:text-4xl">
              Твоя работа заслуживает <span className="gradient-text">полки</span>
            </h2>
            <p className="relative max-w-xl text-sm text-zinc-400 sm:text-base">
              Бесплатно: кабинет, 5 работ, подтверждение авторства и публичный профиль.
              Pro за 499 ₽/мес снимает лимит работ.
            </p>
            {me ? (
              <Link href="/works/new" className="btn btn-primary relative">
                Выложить работу →
              </Link>
            ) : (
              <Link href="/register" className="btn btn-primary relative">
                Начать бесплатно
              </Link>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
