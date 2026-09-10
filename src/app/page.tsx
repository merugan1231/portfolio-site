import Link from "next/link";
import { getRecentVerifiedWorks, getServiceStats, getWorkRating, type Work } from "@/lib/works";
import { getUsers } from "@/lib/storage";
import type { StoredUser } from "@/lib/storage";
import { getCurrentUser } from "@/lib/current-user";
import { AudienceSection } from "@/components/AudienceSection";

export const dynamic = "force-dynamic";

const TYPE_LABELS: Record<string, string> = {
  site: "Сайт", webapp: "Веб-приложение", bot: "Телеграм-бот", mobile: "Мобильное приложение",
  osint: "OSINT", design: "Дизайн", script: "Скрипт",
};

function workTypeLabel(w: Work): string {
  if (w.type === "custom" && w.typeCustom) return w.typeCustom;
  return TYPE_LABELS[w.type] ?? w.type;
}

function AuthorLine({ author }: { author: StoredUser | undefined }) {
  if (!author) return null;
  const name = author.displayName?.trim() || author.username || author.login;
  return (
    <div className="mt-3 flex items-center gap-2 border-t border-white/5 pt-3">
      {author.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={author.avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
      ) : (
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm">
          {author.avatarEmoji || "🧑‍💻"}
        </span>
      )}
      <span className="truncate text-sm text-zinc-300">{name}</span>
      {author.username && (
        <span className="truncate text-xs text-zinc-500">@{author.username}</span>
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
  const recentWithMeta = await Promise.all(
    recent.map(async (w) => ({
      work: w,
      author: usersById.get(w.userId),
      rating: await getWorkRating(w.id),
    }))
  );

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

          {/* Цифры сервиса */}
          <dl className="mt-8 grid w-full max-w-2xl grid-cols-2 gap-3 sm:mt-10 sm:grid-cols-4 sm:gap-4">
            {[
              { label: "Участников", value: stats.users },
              { label: "Работ", value: stats.works },
              { label: "Подтверждено авторство", value: stats.verified },
              { label: "Оценок", value: stats.reviews },
            ].map((s) => (
              <div key={s.label} className="card px-3 py-4 text-center sm:px-4 sm:py-5">
                <dt className="order-2 mt-1 text-[10px] uppercase leading-tight tracking-wide text-zinc-500 sm:text-xs">{s.label}</dt>
                <dd className="order-1 text-2xl font-extrabold text-white sm:text-3xl">{s.value}</dd>
              </div>
            ))}
          </dl>
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

          {recentWithMeta.length === 0 ? (
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
              {recentWithMeta.map(({ work, author, rating }, i) => (
                <div key={work.id} className="reveal" style={{ transitionDelay: `${i * 60}ms` }}>
                  <div className="card flex h-full flex-col p-5 transition-transform hover:-translate-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-full border border-white/10 px-2.5 py-0.5 text-xs text-zinc-400">
                        {workTypeLabel(work)}
                      </span>
                      {rating.count > 0 && (
                        <span className="text-xs text-amber-300">⭐ {rating.avg}</span>
                      )}
                    </div>
                    <Link href={`/works/${work.id}`} className="mt-2 font-semibold text-white hover:text-lime-300">
                      {work.title}
                    </Link>
                    <p className="mt-1.5 line-clamp-3 flex-1 text-sm text-zinc-400">{work.summary}</p>
                    <AuthorLine author={author} />
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
