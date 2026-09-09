"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Found = {
  username: string | null;
  displayName: string;
  avatarEmoji: string;
  avatarUrl: string;
  bio: string;
};

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [users, setUsers] = useState<Found[]>([]);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      if (!q.trim()) {
        setUsers([]);
        setSearched(false);
        return;
      }
      fetch(`/api/users/search?q=${encodeURIComponent(q.trim())}`)
        .then((r) => r.json())
        .then((d) => {
          setUsers(d.users ?? []);
          setSearched(true);
        })
        .catch(() => setUsers([]));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <section className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <h1 className="text-3xl font-extrabold text-white">Люди</h1>
      <p className="mt-1 text-sm text-zinc-400">Найдите пользователя по юзернейму и посмотрите его подтверждённые работы.</p>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="mt-6 w-full rounded-xl border border-white/10 bg-zinc-900/70 px-4 py-3.5 text-white outline-none transition-colors focus:border-indigo-400"
        placeholder="Введите юзернейм…"
        autoFocus
      />

      <div className="mt-6 space-y-3">
        {searched && users.length === 0 && <p className="text-sm text-zinc-500">Никого не нашли. Попробуйте другое начало юзернейма.</p>}
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
            <div>
              <div className="font-semibold text-white">{u.displayName || u.username}</div>
              <div className="text-sm text-zinc-500">@{u.username}</div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
