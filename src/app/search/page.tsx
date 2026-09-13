"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Found = {
  id: string | null;
  username: string | null;
  displayName: string;
  avatarEmoji: string;
  avatarUrl: string;
  bio: string;
  roles: string[];
  specialization: string;
  plan: "free" | "pro";
  creator: boolean;
  demo: boolean;
};

/** Роли-фильтры — как в кабинете (src/lib/users.ts USER_ROLES). */
const ROLES = [
  { id: "developer", label: "Программист", emoji: "💻" },
  { id: "osint", label: "OSINT-аналитик", emoji: "🔍" },
  { id: "osint-author", label: "Создатель кейсов", emoji: "🕵️" },
  { id: "osint-revealer", label: "Раскрыватель кейсов", emoji: "🕸️" },
  { id: "designer", label: "Дизайнер", emoji: "🎨" },
  { id: "tester", label: "Тестировщик (QA)", emoji: "🧪" },
  { id: "devops", label: "DevOps", emoji: "⚙️" },
  { id: "analyst", label: "Аналитик", emoji: "📊" },
  { id: "marketer", label: "Маркетолог", emoji: "📈" },
  { id: "writer", label: "Копирайтер", emoji: "✍️" },
  { id: "gamedev", label: "Геймдев", emoji: "🎮" },
  { id: "other", label: "Другое", emoji: "✨" },
];

const PAGE = 24;

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [spec, setSpec] = useState("");
  const [users, setUsers] = useState<Found[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const offsetRef = { current: 0 }; // последняя запрошенная позиция списка

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (role) p.set("role", role);
    if (spec) p.set("spec", spec);
    return p.toString();
  }, [q, role, spec]);

  // Загрузка: при пустом запросе — общий список «Люди», при запросе — поиск
  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      fetch(`/api/users/search?${query}`)
        .then((r) => r.json())
        .then((d) => {
          setUsers(d.users ?? []);
          setHasMore(Boolean(d.hasMore));
          offsetRef.current = d.nextOffset ?? (d.users?.length ?? 0);
          setSearched(true);
        })
        .catch(() => setUsers([]))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  // «Показать ещё»: дозагрузка следующей страницы общего списка
  const loadMore = () => {
    if (loading || !hasMore || q.trim() || role || spec) return;
    setLoading(true);
    fetch(`/api/users/search?offset=${offsetRef.current}`)
      .then((r) => r.json())
      .then((d) => {
        setUsers((prev) => [...prev, ...(d.users ?? [])]);
        setHasMore(Boolean(d.hasMore));
        if (d.nextOffset) offsetRef.current = d.nextOffset;
      })
      .catch(() => setHasMore(false))
      .finally(() => setLoading(false));
  };

  const roleLabel = (id: string) => ROLES.find((r) => r.id === id);

  return (
    <section className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="text-2xl font-extrabold text-white sm:text-3xl">Люди</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Найдите пользователя по юзернейму, имени или ID (например, «1» — аккаунт создателя), по роли или кликните на специфику у любого участника.
      </p>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="mt-6 w-full rounded-xl border border-white/10 bg-zinc-900/70 px-4 py-3.5 text-white outline-none transition-colors focus:border-indigo-400"
        placeholder="Юзернейм, имя или ID…"
        autoFocus
      />

      {/* Фильтры по ролям — переносятся на новую строку, не уходят за рамки страницы */}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => {
            setRole("");
            setSpec("");
          }}
          className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
            role === "" && spec === ""
              ? "border-lime-300/50 bg-lime-300/15 text-lime-200"
              : "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-zinc-200"
          }`}
        >
          Все люди
        </button>
        {ROLES.map((r) => (
          <button
            key={r.id}
            onClick={() => {
              setRole(role === r.id ? "" : r.id);
              setSpec("");
            }}
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

      {/* Активная специализация — отдельная строка-фильтр */}
      {spec && (
        <div className="mt-3 flex items-center gap-2 text-sm">
          <span className="text-zinc-400">Специфика:</span>
          <button
            onClick={() => setSpec("")}
            className="inline-flex items-center gap-1.5 rounded-full border border-lime-300/50 bg-lime-300/15 px-3 py-1 text-xs font-medium text-lime-200 transition-colors hover:bg-lime-300/25"
            title="Снять фильтр"
          >
            {spec} <span className="text-lime-300/70">✕</span>
          </button>
        </div>
      )}

      <div className="mt-6 space-y-3">
        {searched && !loading && users.length === 0 && (
          <p className="text-sm text-zinc-500">Никого не нашли. Попробуйте другой юзернейм, ID, роль или снимите фильтр специфики.</p>
        )}
        {users.map((u) => (
          <div key={`${u.demo ? "demo" : "real"}-${u.username}`} className="card flex items-center gap-4 p-4 transition-transform hover:-translate-y-0.5">
            <Link href={`/u/${u.username}`} className="flex min-w-0 flex-1 items-center gap-4">
              {u.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={u.avatarUrl} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
              ) : (
                <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xl">
                  {u.avatarEmoji || "🧑‍💻"}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-white">{u.displayName || u.username}</span>
                  {u.creator && (
                    <span className="rounded-md bg-violet-400/15 px-1.5 py-0.5 text-[10px] font-bold text-violet-300">👑 СОЗДАТЕЛЬ</span>
                  )}
                  {u.plan === "pro" && (
                    <span className="rounded-md bg-amber-300/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">PRO</span>
                  )}
                </div>
                <div className="text-sm text-zinc-500">
                  @{u.username}
                  {u.id && <span className="ml-2 text-xs text-zinc-600">ID: {u.id}</span>}
                </div>
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
                {/* Специфика: клик фильтрует людей с такой же специализацией */}
                {u.specialization && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSpec(spec === u.specialization ? "" : u.specialization);
                    }}
                    className={`mt-1.5 inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] transition-colors ${
                      spec === u.specialization
                        ? "border-lime-300/50 bg-lime-300/15 text-lime-200"
                        : "border-indigo-300/25 bg-indigo-300/10 text-indigo-200 hover:border-indigo-300/50 hover:bg-indigo-300/20"
                    }`}
                    title={`Показать всех со специализацией «${u.specialization}»`}
                  >
                    🎯 {u.specialization}
                  </button>
                )}
                {u.bio && <p className="mt-1 line-clamp-1 text-xs text-zinc-500">{u.bio}</p>}
              </div>
            </Link>
          </div>
        ))}
      </div>

      {/* «Показать ещё» — только для общего списка (без запроса) */}
      {hasMore && !q.trim() && !role && !spec && (
        <button
          onClick={loadMore}
          disabled={loading}
          className="btn mt-6 w-full"
        >
          {loading ? "Загрузка…" : "Показать ещё"}
        </button>
      )}
    </section>
  );
}
