"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type Profile = {
  id: string | null;
  username: string | null;
  displayName: string;
  avatarEmoji: string;
  avatarUrl: string;
  bio: string;
  bioDetails: Record<string, string>;
  roles: string[];
  contacts: { label: string; value: string }[];
  plan: "free" | "pro";
  memberSince: string;
  creator: boolean;
};

const BIO_LABELS: Record<string, string> = {
  specialization: "Специализация",
  experience: "Опыт",
  education: "Образование",
  city: "Город",
  languages: "Языки",
  status: "Статус занятости",
  achievements: "Достижения",
  funFact: "Интересный факт",
};

const ROLE_LABELS: Record<string, { label: string; emoji: string }> = {
  developer: { label: "Программист", emoji: "💻" },
  osint: { label: "OSINT-аналитик", emoji: "🔍" },
  "osint-author": { label: "Создатель кейсов", emoji: "🕵️" },
  "osint-revealer": { label: "Раскрыватель кейсов", emoji: "🕸️" },
  designer: { label: "Дизайнер", emoji: "🎨" },
  tester: { label: "Тестировщик (QA)", emoji: "🧪" },
  devops: { label: "DevOps", emoji: "⚙️" },
  analyst: { label: "Аналитик", emoji: "📊" },
  marketer: { label: "Маркетолог", emoji: "📈" },
  writer: { label: "Копирайтер", emoji: "✍️" },
  gamedev: { label: "Геймдев", emoji: "🎮" },
  other: { label: "Другое", emoji: "✨" },
};

type Work = {
  id: string;
  type: string;
  typeCustom?: string;
  title: string;
  summary: string;
  rating: { avg: number; count: number };
  links: { label: string; url: string }[];
};

const TYPE_LABELS: Record<string, string> = {
  site: "Сайт", webapp: "Веб-приложение", bot: "Телеграм-бот", mobile: "Мобильное приложение",
  osint: "OSINT", design: "Дизайн", script: "Скрипт", custom: "Свой вариант",
};

export default function PublicProfilePage() {
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [works, setWorks] = useState<Work[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/u/${username}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) {
          setError(d.error ?? "Пользователь не найден");
          return;
        }
        setProfile(d.profile);
        setWorks((d.works ?? []).map((w: Work & { demo?: boolean }) => ({ ...w, demo: w.demo ?? false })));
      })
      .catch(() => setError("Пользователь не найден"));
  }, [username]);

  if (error) {
    return (
      <section className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-20 text-center">
        <p className="text-zinc-400">{error}</p>
        <Link href="/search" className="btn btn-ghost text-sm">
          Найти другого пользователя
        </Link>
      </section>
    );
  }

  if (!profile) {
    return <section className="flex flex-1 items-center justify-center px-6 py-20 text-zinc-400">Загрузка…</section>;
  }

  return (
    <section className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <div className="card flex flex-col items-start gap-5 p-6 sm:flex-row sm:items-center sm:p-8">
        {profile.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.avatarUrl} alt="" className="h-20 w-20 rounded-full object-cover" />
        ) : (
          <span className="inline-flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-white/5 text-4xl">
            {profile.avatarEmoji || "🧑‍💻"}
          </span>
        )}          <div>
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-extrabold text-white">
            {profile.displayName || profile.username}
            {profile.creator && (
              <span
                title="Аккаунт владельца сервиса"
                className="inline-flex items-center gap-1 rounded-full border border-violet-300/30 bg-violet-400/15 px-2.5 py-0.5 text-xs font-semibold text-violet-200"
              >
                👑 Создатель
              </span>
            )}
          </h1>
          <p className="text-sm text-zinc-400">
            @{profile.username}
            {profile.id && <span className="ml-2 text-xs text-zinc-600">ID: {profile.id}</span>}
          </p>
          {(profile.roles ?? []).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(profile.roles ?? []).map((id) => {
                const r = ROLE_LABELS[id];
                return r ? (
                  <span key={id} className="rounded-full border border-lime-300/25 bg-lime-300/10 px-2.5 py-0.5 text-xs font-medium text-lime-200">
                    {r.emoji} {r.label}
                  </span>
                ) : null;
              })}
            </div>
          )}
          {profile.bio && <p className="mt-2 max-w-xl text-sm text-zinc-300">{profile.bio}</p>}
          {profile.plan === "pro" && (
            <span className="mt-2 inline-block rounded-full border border-amber-300/30 bg-amber-300/10 px-2.5 py-0.5 text-xs text-amber-200">
              ⭐ Pro
            </span>
          )}
          {profile.contacts.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {profile.contacts.map((c, i) => (
                <a
                  key={i}
                  href={/^https?:\/\//.test(c.value) ? c.value : `#${c.label}`}
                  target={/^https?:\/\//.test(c.value) ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-300 hover:bg-white/5"
                >
                  {c.label}: {c.value}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      {Object.keys(profile.bioDetails ?? {}).length > 0 && (
        <div className="card mt-6 p-6">
          <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-400">Биография</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            {Object.entries(profile.bioDetails).map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs uppercase tracking-wide text-zinc-500">{BIO_LABELS[k] ?? k}</dt>
                <dd className="mt-1 text-sm text-zinc-300">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <h2 className="mt-8 text-xl font-bold text-white sm:mt-10">
        Подтверждённые работы <span className="text-sm font-normal text-zinc-500">({works.length})</span>
      </h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 sm:gap-4">
        {works.length === 0 && <p className="text-sm text-zinc-500">Пока нет подтверждённых работ.</p>}
        {works.map((w) => {
          const isDemo = (w as Work & { demo?: boolean }).demo === true;
          const card = (
            <>
              <div className="text-xs uppercase tracking-wide text-zinc-500">
                {w.type === "custom" && w.typeCustom ? w.typeCustom : (TYPE_LABELS[w.type] ?? w.type)}
              </div>
              <div className="mt-1 font-semibold text-white">{w.title}</div>
              <p className="mt-1.5 line-clamp-2 text-sm text-zinc-400">{w.summary}</p>
              <div className="mt-2 flex items-center justify-between text-xs text-amber-300">
                <span>⭐ {w.rating.count ? `${w.rating.avg} (${w.rating.count})` : "нет оценок"}</span>
                {isDemo && (
                  <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2 py-0.5 text-[10px] font-medium text-amber-200">
                    Демо
                  </span>
                )}
              </div>
            </>
          );
          return isDemo ? (
            <div key={w.id} className="card block p-5 opacity-90">
              {card}
            </div>
          ) : (
            <Link key={w.id} href={`/works/${w.id}`} className="card block p-5 transition-transform hover:-translate-y-0.5">
              {card}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
