"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Found = {
  username: string | null;
  displayName: string;
  avatarEmoji: string;
  avatarUrl: string;
  bio: string;
  roles: string[];
  plan: "free" | "pro";
};

/** Роли-фильтры — как в кабинете (src/lib/users.ts USER_ROLES). */
const ROLES = [
  { id: "developer", label: "Программист", emoji: "💻" },
  { id: "osint", label: "OSINT-аналитик", emoji: "🔍" },
  { id: "designer", label: "Дизайнер", emoji: "🎨" },
  { id: "tester", label: "Тестировщик (QA)", emoji: "🧪" },
  { id: "devops", label: "DevOps", emoji: "⚙️" },
  { id: "analyst", label: "Аналитик", emoji: "📊" },
  { id: "marketer", label: "Маркетолог", emoji: "📈" },
  { id: "writer", label: "Копирайтер", emoji: "✍️" },
  { id: "gamedev", label: "Геймдев", emoji: "🎮" },
  { id: "other", label: "Другое", emoji: "✨" },
];

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [users, setUsers] = useState<Found[]>([]);
  const [searched, setSearched] = useState(false);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (role) p.set("role", role);
    return p.toString();
  }, [q, role]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (!q.trim() && !role) {
        setUsers([]);
        setSearched(false);
        return;
      }
      fetch(`/api/users/search?${query}`)
        .then((r) => r.json())
        .then((d) => {
          setUsers(d.users ?? []);
          setSearched(true);
        })
        .catch(() => setUsers([]));
    }, 250);
    return () => clearTimeout(t);
  }, [query, q, role]);

  const roleLabel = (id: string) => ROLES.find((r) => r.id === id);

  return (
    <section className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="text-2xl font-extrabold text-white sm:text-3xl">Люди</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Найдите пользователя по юзернейму или отфильтруйте по роли — программисты, осинтеры, дизайнеры и другие.
      </p>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="mt-6 w-full rounded-xl border border-white/10 bg-zinc-900/70 px-4 py-3.5 text-white outline-none transition-colors focus:border-indigo-400"
        placeholder="Введите юзернейм…"
        autoFocus
      />

      {/* Фильтры по ролям */}
      <div className="-mx-4 mt-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:overflow-visible sm:px-0">
        <div className="flex gap-2">
        <button
          onClick={() => setRole("")}
          className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
            role === ""
              ? "border-lime-300/50 bg-lime-300/15 text-lime-200"
              : "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-zinc-200"
          }`}
        >
          Все роли
        </button>
        {ROLES.map((r) => (
          <button
            key={r.id}
            onClick={() => setRole(role === r.id ? "" : r.id)}
            className={`shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
              role === r.id
                ? "border-lime-300/50 bg-lime-300/15 text-lime-200"
                : "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-zinc-200"
            }`}
          >
            {r.emoji} {r.label}
          </button>
        ))}
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {searched && users.length === 0 && (
          <p className="text-sm text-zinc-500">Никого не нашли. Попробуйте другой юзернейм или снять фильтр роли.</p>
        )}
        {users.map((u) => (
          <Link key={u.username} href={`/u/${u.username}`} className="card flex items-center gap-4 p-4 transition-transform hover:-translate-y-0.5">
            {u.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={u.avatarUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
            ) : (
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xl">
                {u.avatarEmoji || "🧑‍💻"}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-white">{u.displayName || u.username}</span>
                {u.plan === "pro" && (
                  <span className="rounded-md bg-amber-300/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">PRO</span>
                )}
              </div>
              <div className="text-sm text-zinc-500">@{u.username}</div>
              {u.roles.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {u.roles.map((id) => {
                    const r = roleLabel(id);
                    return r ? (
                      <span key={id} className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] text-zinc-300">
                        {r.emoji} {r.label}
                      </span>
                    ) : null;
                  })}
                </div>
              )}
              {u.bio && <p className="mt-1 line-clamp-1 text-xs text-zinc-500">{u.bio}</p>}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
