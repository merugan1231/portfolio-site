"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Profile = {
  login?: string;
  username: string | null;
  displayName: string;
  avatarEmoji: string;
  avatarUrl: string;
  bio: string;
  roles: string[];
  plan: "free" | "pro";
  planExpiresAt: string | null;
  isPro: boolean;
  memberSince: string;
};

type Work = {
  id: string;
  title: string;
  verifyStatus: "unverified" | "pending" | "verified";
  rating: { avg: number; count: number };
};

const ROLES: Record<string, { label: string; emoji: string }> = {
  developer: { label: "Программист", emoji: "💻" },
  osint: { label: "OSINT-аналитик", emoji: "🔍" },
  designer: { label: "Дизайнер", emoji: "🎨" },
  tester: { label: "Тестировщик (QA)", emoji: "🧪" },
  devops: { label: "DevOps", emoji: "⚙️" },
  analyst: { label: "Аналитик", emoji: "📊" },
  marketer: { label: "Маркетолог", emoji: "📈" },
  writer: { label: "Копирайтер", emoji: "✍️" },
  gamedev: { label: "Геймдев", emoji: "🎮" },
  other: { label: "Другое", emoji: "✨" },
};

const VERIFY_SHORT: Record<Work["verifyStatus"], string> = {
  verified: "✅",
  pending: "⏳",
  unverified: "⚠️",
};

export default function CabinetPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [works, setWorks] = useState<Work[]>([]);

  const load = useCallback(async () => {
    const meRes = await fetch("/api/auth/me");
    const me = await meRes.json();
    if (!me.user) {
      router.push("/login");
      return;
    }
    const pRes = await fetch("/api/profile");
    const p = await pRes.json();
    if (p.profile) setProfile(p.profile);
    const wRes = await fetch("/api/works");
    const w = await wRes.json();
    setWorks(w.works ?? []);
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  if (!profile) {
    return <section className="flex flex-1 items-center justify-center px-6 py-20 text-zinc-400">Загрузка…</section>;
  }

  const daysOnService = Math.max(1, Math.floor((Date.now() - new Date(profile.memberSince).getTime()) / 86400000) + 1);
  const rated = works.filter((w) => w.rating.count > 0);
  const avgRating =
    rated.length > 0
      ? (rated.reduce((s, w) => s + w.rating.avg * w.rating.count, 0) / rated.reduce((s, w) => s + w.rating.count, 0)).toFixed(1)
      : null;
  const verifiedCount = works.filter((w) => w.verifyStatus === "verified").length;

  return (
    <section className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
      {/* Шапка: кто я */}
      <div className="card flex flex-col items-start gap-5 p-8 sm:flex-row sm:items-center">
        {profile.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.avatarUrl} alt="" className="h-20 w-20 rounded-full object-cover" />
        ) : (
          <span className="inline-flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-white/5 text-4xl">
            {profile.avatarEmoji || "🧑‍💻"}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-extrabold text-white">{profile.displayName || profile.username || profile.login}</h1>
            {profile.isPro ? (
              <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs font-medium text-amber-200">
                ⭐ Pro{profile.planExpiresAt ? ` до ${new Date(profile.planExpiresAt).toLocaleDateString("ru-RU")}` : ""}
              </span>
            ) : (
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-zinc-400">Free</span>
            )}
          </div>
          {profile.username && <p className="mt-0.5 text-sm text-zinc-400">@{profile.username}</p>}
          {(profile.roles ?? []).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(profile.roles ?? []).map((id) => {
                const r = ROLES[id];
                return r ? (
                  <span key={id} className="rounded-full border border-lime-300/25 bg-lime-300/10 px-2.5 py-0.5 text-xs font-medium text-lime-200">
                    {r.emoji} {r.label}
                  </span>
                ) : null;
              })}
            </div>
          )}
          {profile.bio && <p className="mt-2 max-w-xl text-sm text-zinc-400">{profile.bio}</p>}
        </div>
      </div>

      {/* Цифры */}
      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        <div className="card p-5">
          <div className="text-3xl font-extrabold text-white">{works.length}<span className="text-base font-medium text-zinc-500">{profile.isPro ? "" : " / 5"}</span></div>
          <div className="mt-1 text-xs uppercase tracking-wide text-zinc-500">Работ опубликовано</div>
        </div>
        <div className="card p-5">
          <div className="text-3xl font-extrabold text-lime-300">{verifiedCount}</div>
          <div className="mt-1 text-xs uppercase tracking-wide text-zinc-500">Авторство подтверждено</div>
        </div>
        <div className="card p-5">
          <div className="text-3xl font-extrabold text-amber-300">{avgRating ?? "—"}</div>
          <div className="mt-1 text-xs uppercase tracking-wide text-zinc-500">Средняя оценка</div>
        </div>
        <div className="card p-5">
          <div className="text-3xl font-extrabold text-indigo-300">{daysOnService}</div>
          <div className="mt-1 text-xs uppercase tracking-wide text-zinc-500">{daysOnService % 10 === 1 && daysOnService % 100 !== 11 ? "день с нами" : "дней с нами"}</div>
        </div>
      </div>

      {/* Вкладки-действия */}
      <h2 className="mt-10 text-lg font-bold text-white">Управление</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Link href="/cabinet/edit" className="card group p-6 transition-transform hover:-translate-y-0.5">
          <div className="text-2xl">✏️</div>
          <div className="mt-2 font-bold text-white transition-colors group-hover:text-lime-300">Изменить профиль</div>
          <p className="mt-1 text-sm text-zinc-400">
            Аватар, имя, роли, биография по пунктам, контакты — и всё содержимое кабинета: работы, подписка Pro, промокоды.
          </p>
        </Link>
        <Link href="/works/new" className="card group p-6 transition-transform hover:-translate-y-0.5">
          <div className="text-2xl">➕</div>
          <div className="mt-2 font-bold text-white transition-colors group-hover:text-lime-300">Добавить работу</div>
          <p className="mt-1 text-sm text-zinc-400">
            Опишите проект по пунктам, получите код авторства и подтвердите его автоматически.
          </p>
        </Link>
        <Link
          href={profile.username ? `/u/${profile.username}` : "/cabinet/edit"}
          className="card group p-6 transition-transform hover:-translate-y-0.5"
        >
          <div className="text-2xl">🌐</div>
          <div className="mt-2 font-bold text-white transition-colors group-hover:text-lime-300">Мой публичный профиль</div>
          <p className="mt-1 text-sm text-zinc-400">
            {profile.username
              ? `Так вас видят другие: DevShelf · /u/${profile.username}`
              : "Сначала задайте юзернейм — он закрепляется один раз."}
          </p>
        </Link>
        <Link href="/search" className="card group p-6 transition-transform hover:-translate-y-0.5">
          <div className="text-2xl">🔎</div>
          <div className="mt-2 font-bold text-white transition-colors group-hover:text-lime-300">Найти людей</div>
          <p className="mt-1 text-sm text-zinc-400">
            Поиск по юзернейму и ролям: программисты, осинтеры, дизайнеры и другие.
          </p>
        </Link>
      </div>

      {/* Последние работы */}
      {works.length > 0 && (
        <>
          <h2 className="mt-10 text-lg font-bold text-white">Мои работы</h2>
          <div className="mt-4 space-y-3">
            {works.slice(0, 5).map((w) => (
              <Link key={w.id} href={`/works/${w.id}`} className="card flex items-center justify-between gap-3 p-4 transition-transform hover:-translate-y-0.5">
                <span className="font-medium text-white">{w.title}</span>
                <span className="flex items-center gap-3 text-xs text-zinc-500">
                  <span>{VERIFY_SHORT[w.verifyStatus]}</span>
                  <span>⭐ {w.rating.count ? `${w.rating.avg} (${w.rating.count})` : "—"}</span>
                </span>
              </Link>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
