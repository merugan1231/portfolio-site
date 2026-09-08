"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Portfolio, Project } from "@/lib/portfolio";

type Me = { login: string; role: string; email: string } | null;
type AdminUser = {
  id: string;
  login: string;
  email: string;
  role: string;
  method: string;
  createdAt: string;
};

const newProject = (): Project => ({
  id: `p${Date.now()}`,
  title: "Новый проект",
  description: "",
  tags: [],
  link: "",
  repo: "",
  year: String(new Date().getFullYear()),
});

export default function AdminPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [tab, setTab] = useState<"portfolio" | "users">("portfolio");

  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(false);

  const [data, setData] = useState<Portfolio | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  const loadAll = useCallback(async () => {
    const s = await fetch("/api/auth/me").then((r) => r.json());
    setMe(s.user && s.user.role === "admin" ? s.user : null);
    const [d, u] = await Promise.all([
      fetch("/api/portfolio").then((r) => r.json()),
      fetch("/api/admin/users").then((r) => (r.ok ? r.json() : { users: [] })),
    ]);
    setData(d);
    setUsers(u.users ?? []);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const doLogin = async () => {
    setLoginError("");
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login, password }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json();
      setLoginError(body.error ?? "Ошибка входа");
      return;
    }
    const body = await res.json();
    if (body.role !== "admin") {
      setLoginError("Этот аккаунт не имеет прав администратора");
      return;
    }
    await loadAll();
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setMe(null);
    router.push("/");
    router.refresh();
  };

  const save = useCallback(async () => {
    if (!data) return;
    setSaving(true);
    setNotice("");
    const res = await fetch("/api/portfolio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setSaving(false);
    setNotice(res.ok ? "✓ Сохранено" : "Ошибка сохранения");
    setTimeout(() => setNotice(""), 3000);
  }, [data]);

  if (me === undefined || (me && !data)) {
    return (
      <div className="flex flex-1 items-center justify-center text-zinc-500">Загрузка…</div>
    );
  }

  // ---- Экран входа (видят все, но войти может только админ) ----
  if (!me) {
    return (
      <section className="relative flex flex-1 items-center justify-center px-6 py-16">
        <div className="glow left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 bg-indigo-500" />
        <div className="card relative w-full max-w-md p-8">
          <h1 className="text-3xl font-extrabold text-white">Панель управления</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Доступ только для администратора сайта.
          </p>
          <div className="mt-8 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm text-zinc-400">Логин</span>
              <input
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-zinc-900/70 px-4 py-3 text-white outline-none transition-colors focus:border-indigo-400"
                autoComplete="username"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm text-zinc-400">Пароль</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && doLogin()}
                className="w-full rounded-xl border border-white/10 bg-zinc-900/70 px-4 py-3 text-white outline-none transition-colors focus:border-indigo-400"
                autoComplete="current-password"
              />
            </label>
          </div>
          {loginError ? (
            <p className="mt-4 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
              {loginError}
            </p>
          ) : null}
          <button onClick={doLogin} disabled={loading} className="btn btn-primary mt-6 w-full">
            {loading ? "Вхожу…" : "Войти"}
          </button>
          <Link href="/" className="mt-4 block text-center text-sm text-zinc-500 hover:text-zinc-300">
            ← На сайт
          </Link>
        </div>
      </section>
    );
  }

  // ---- Панель ----
  const setProfile = (key: string, value: string) =>
    setData({ ...data!, profile: { ...data!.profile, [key]: value } });

  const updateProject = (id: string, patch: Partial<Project>) =>
    setData({
      ...data!,
      projects: data!.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    });

  const input =
    "w-full rounded-xl border border-white/10 bg-zinc-900/70 px-4 py-2.5 text-sm text-white outline-none transition-colors focus:border-indigo-400";

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Панель управления</h1>
          <p className="mt-1 text-sm text-zinc-500">Вы вошли как {me.login}</p>
        </div>
        <div className="flex items-center gap-3">
          {notice ? <span className="text-sm text-emerald-400">{notice}</span> : null}
          <button onClick={save} disabled={saving} className="btn btn-primary !py-2.5 text-sm">
            {saving ? "Сохраняю…" : "Сохранить"}
          </button>
          <button onClick={logout} className="btn btn-ghost !py-2.5 text-sm">
            Выйти
          </button>
        </div>
      </div>

      {/* Вкладки */}
      <div className="mb-8 flex gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-1.5">
        {(
          [
            ["portfolio", "Портфолио"],
            ["users", `Пользователи (${users.length})`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-300 ${
              tab === key
                ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/25"
                : "text-zinc-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "portfolio" ? (
        <>
          <Link href="/" className="mb-6 inline-block text-sm text-lime-300 hover:underline">
            ← Посмотреть сайт
          </Link>

          {/* Профиль */}
          <section className="card mb-8 p-6">
            <h2 className="mb-4 text-xl font-semibold text-white">Профиль</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {(
                [
                  ["name", "Имя / ник"],
                  ["title", "Заголовок / профессия"],
                  ["location", "Город"],
                  ["email", "Email"],
                  ["phone", "Телефон"],
                  ["telegram", "Ссылка Telegram"],
                  ["github", "Ссылка GitHub"],
                  ["website", "Дополнительный сайт"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="block">
                  <span className="mb-1 block text-sm text-zinc-400">{label}</span>
                  <input
                    value={data!.profile[key]}
                    onChange={(e) => setProfile(key, e.target.value)}
                    className={input}
                  />
                </label>
              ))}
            </div>
            <label className="mt-4 block">
              <span className="mb-1 block text-sm text-zinc-400">О себе</span>
              <textarea
                value={data!.profile.about}
                onChange={(e) => setProfile("about", e.target.value)}
                rows={4}
                className={input}
              />
            </label>
          </section>

          {/* Навыки */}
          <section className="card mb-8 p-6">
            <h2 className="mb-4 text-xl font-semibold text-white">Навыки (через запятую)</h2>
            <textarea
              value={data!.skills.join(", ")}
              onChange={(e) =>
                setData({
                  ...data!,
                  skills: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                })
              }
              rows={2}
              className={input}
            />
          </section>

          {/* Проекты */}
          <section className="mb-10 space-y-6">
            <h2 className="text-xl font-semibold text-white">Проекты</h2>
            {data!.projects.map((p) => (
              <div key={p.id} className="card p-6">
                <div className="mb-4 grid gap-4 sm:grid-cols-[1fr_100px]">
                  <label className="block">
                    <span className="mb-1 block text-sm text-zinc-400">Название</span>
                    <input
                      value={p.title}
                      onChange={(e) => updateProject(p.id, { title: e.target.value })}
                      className={input}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm text-zinc-400">Год</span>
                    <input
                      value={p.year}
                      onChange={(e) => updateProject(p.id, { year: e.target.value })}
                      className={input}
                    />
                  </label>
                </div>
                <label className="mb-4 block">
                  <span className="mb-1 block text-sm text-zinc-400">Описание</span>
                  <textarea
                    value={p.description}
                    onChange={(e) => updateProject(p.id, { description: e.target.value })}
                    rows={3}
                    className={input}
                  />
                </label>
                <div className="mb-4 grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-sm text-zinc-400">Теги (через запятую)</span>
                    <input
                      value={p.tags.join(", ")}
                      onChange={(e) =>
                        updateProject(p.id, {
                          tags: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                        })
                      }
                      className={input}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm text-zinc-400">Ссылка на сайт</span>
                    <input
                      value={p.link}
                      onChange={(e) => updateProject(p.id, { link: e.target.value })}
                      placeholder="https://…"
                      className={input}
                    />
                  </label>
                </div>
                <div className="flex items-end gap-4">
                  <label className="block flex-1">
                    <span className="mb-1 block text-sm text-zinc-400">Ссылка на код (GitHub)</span>
                    <input
                      value={p.repo}
                      onChange={(e) => updateProject(p.id, { repo: e.target.value })}
                      placeholder="https://github.com/…"
                      className={input}
                    />
                  </label>
                  <button
                    onClick={() =>
                      setData({ ...data!, projects: data!.projects.filter((x) => x.id !== p.id) })
                    }
                    className="rounded-xl border border-red-400/30 px-4 py-2.5 text-sm text-red-400 transition-colors hover:bg-red-500/10"
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ))}
            <button
              onClick={() => setData({ ...data!, projects: [...data!.projects, newProject()] })}
              className="btn btn-ghost text-sm"
            >
              + Добавить проект
            </button>
          </section>
        </>
      ) : (
        /* ---- Пользователи ---- */
        <section className="card overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-zinc-500">
                <th className="px-6 py-4">Логин</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Роль</th>
                <th className="px-6 py-4">Дата</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-white/5 text-zinc-300 transition-colors last:border-0 hover:bg-white/[0.03]"
                >
                  <td className="px-6 py-4 font-medium text-white">
                    {u.login}
                    {u.role === "admin" ? (
                      <span className="ml-2 rounded-md bg-lime-300/10 px-2 py-0.5 text-xs text-lime-300">
                        админ
                      </span>
                    ) : null}
                  </td>
                  <td className="px-6 py-4 text-zinc-400">{u.email || "—"}</td>
                  <td className="px-6 py-4">{u.role === "admin" ? "Администратор" : "Пользователь"}</td>
                  <td className="px-6 py-4 text-zinc-500">
                    {new Date(u.createdAt).toLocaleDateString("ru-RU")}
                  </td>
                </tr>
              ))}
              {users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-zinc-500">
                    Пока никто не зарегистрировался
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
