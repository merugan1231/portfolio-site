import Link from "next/link";
import { getRecentVerifiedWorks, getServiceStats, getWorkRating, type Work } from "@/lib/works";
import { getUsers } from "@/lib/storage";
import type { StoredUser } from "@/lib/storage";

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
            Полка работ разработчиков и креаторов
          </span>
          <h1 className="max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-6xl">
            Покажи, <span className="gradient-text">как ты это сделал</span>
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-zinc-400">
            DevShelf — сервис, где программисты, OSINT-специалисты, кейсисты, иллюстраторы и создатели ботов
            собирают портфолио из подтверждённых работ: с процессом, командой, стеком и результатом.
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-4">
            <Link href="/register" className="btn btn-primary">
              Создать портфолио →
            </Link>
            <Link href="/search" className="btn btn-ghost">
              Найти специалиста
            </Link>
          </div>

          {/* Цифры сервиса */}
          <dl className="mt-10 grid w-full max-w-2xl grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "Участников", value: stats.users },
              { label: "Работ", value: stats.works },
              { label: "Подтверждено авторство", value: stats.verified },
              { label: "Оценок", value: stats.reviews },
            ].map((s) => (
              <div key={s.label} className="card px-4 py-5 text-center">
                <dt className="order-2 mt-1 text-xs uppercase tracking-wide text-zinc-500">{s.label}</dt>
                <dd className="order-1 text-3xl font-extrabold text-white">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Как это работает */}
      <section className="border-t border-white/10 bg-white/[0.02] py-20">
        <div className="mx-auto w-full max-w-6xl px-6">
          <h2 className="reveal text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Как это работает
          </h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: "👤", title: "1. Кабинет", text: "Регистрируешься, получаешь юзернейм и личный кабинет — и настраиваешь профиль под себя." },
              { icon: "🗂️", title: "2. Работы", text: "Описываешь работу по пунктам: тип, процесс, команда, стек, вложения, перспектива." },
              { icon: "🛡️", title: "3. Авторство", text: "Вставляешь уникальный код в README или описание — сервис подтверждает авторство автоматически." },
              { icon: "⭐", title: "4. Оценки", text: "Получаешь честные оценки: низкие — только с обоснованием, а несправедливые можно оспорить." },
            ].map((f, i) => (
              <div key={f.title} className="card reveal p-6" style={{ transitionDelay: `${i * 80}ms` }}>
                <span className="text-3xl">{f.icon}</span>
                <h3 className="mt-3 text-lg font-semibold text-white">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Живая полка — свежие подтверждённые работы */}
      <section className="border-t border-white/10 py-20">
        <div className="mx-auto w-full max-w-6xl px-6">
          <div className="reveal flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Живая полка
              </h2>
              <p className="mt-3 max-w-xl text-zinc-400">
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

      {/* Для кого сервис */}
      <section className="mx-auto w-full max-w-6xl px-6 py-20">
        <h2 className="reveal text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Для кого DevShelf
        </h2>
        <div className="mt-8 flex flex-wrap gap-3">
          {[
            "Программисты", "OSINT-специалисты", "Кейсисты", "Иллюстраторы",
            "Веб-разработка", "Telegram-боты", "Мобильные приложения", "Дизайн",
            "Скрипты и автоматизация", "Дашборды", "Аналитика", "И всё, что можно показать",
          ].map((s, i) => (
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
          <div className="card reveal relative flex flex-col items-center gap-6 overflow-hidden p-10 text-center">
            <div className="glow left-1/2 top-0 h-64 w-64 -translate-x-1/2 -translate-y-1/2 bg-violet-500" />
            <h2 className="relative text-3xl font-bold text-white sm:text-4xl">
              Твоя работа заслуживает <span className="gradient-text">полки</span>
            </h2>
            <p className="relative max-w-xl text-zinc-400">
              Бесплатно: кабинет, 5 работ, подтверждение авторства и публичный профиль.
              Pro за 499 ₽/мес снимает лимит работ.
            </p>
            <Link href="/register" className="btn btn-primary relative">
              Начать бесплатно
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
