import Link from "next/link";
import { getRecentVerifiedWorks, getServiceStats, getWorkRating, type Work } from "@/lib/works";
import { getUsers } from "@/lib/storage";
import type { StoredUser } from "@/lib/storage";
import { getCurrentUser } from "@/lib/current-user";
import { AudienceSection } from "@/components/AudienceSection";
import LiveStats from "@/components/LiveStats";
import { ensureDemoVolume, listDemoShelf } from "@/lib/demo-works";

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

  // Если реальных работ меньше 6 — полку добираем демо-работами по счётчику
  const demoVolume = ensureDemoVolume(stats.users, stats.works).works.length;
  const shelfItems: ShelfItem[] =
    realItems.length >= 6 || demoVolume === 0
      ? realItems
      : [...realItems, ...listDemoShelf(6 - realItems.length)];

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

      {/* Герой */}
      <section className="relative overflow-hidden">
        <div className="glow left-1/2 top-[-120px] h-[420px] w-[420px] -translate-x-1/2 bg-indigo-500" />
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-5 px-4 py-14 text-center sm:gap-6 sm:px-6 sm:py-24 lg:py-32">
          <span className="rounded-full border border-lime-300/30 bg-lime-300/10 px-4 py-1.5 text-xs text-lime-200 sm:text-sm">
            Полка работ разработчиков и креаторов
          </span>
          <h1 className="max-w-3xl text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
            Покажи, <span className="gradient-text">как ты это сделал</span>
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg">
            DevShelf — сервис, где программисты, OSINT-специалисты, кейсисты, иллюстраторы и создатели ботов
            собирают портфолио из подтверждённых работ: с процессом, командой, стеком и результатом.
          </p>
          <div className="mt-2 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:justify-center sm:gap-4">
            <Link href="/register" className="btn btn-primary">
              Создать портфолио →
            </Link>
            <Link href="/search" className="btn btn-ghost">
              Найти специалиста
            </Link>
          </div>

          {/* Цифры сервиса — «живые», слегка меняются каждые несколько секунд */}
          <LiveStats base={stats} />
        </div>
      </section>

      {/* Как это работает */}
      <section className="border-t border-white/10 bg-white/[0.02] py-14 sm:py-20">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <h2 className="reveal text-center text-2xl font-bold tracking-tight text-white sm:text-4xl">
            Как это работает
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
                className="card reveal block p-6 transition-all duration-300 hover:-translate-y-1 hover:!border-lime-300/40"
                style={{ transitionDelay: `${i * 80}ms` }}
              >
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
      <section className="border-t border-white/10 py-14 sm:py-20">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="reveal flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white sm:text-4xl">
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
                  <div className="card flex h-full flex-col p-5 transition-transform hover:-translate-y-0.5">
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

      {/* Для кого сервис: клик по чипсу открывает описание */}
      <AudienceSection />

      {/* CTA */}
      <section className="border-t border-white/10 py-14 sm:py-20">
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
