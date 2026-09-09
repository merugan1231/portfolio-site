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
  plan?: "free" | "pro";
  isPro?: boolean;
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

type DisputedReview = {
  review: { id: string; stars: number; text: string; disputeReason: string; createdAt: string };
  workTitle: string;
  workId: string;
};

type PendingWork = {
  id: string;
  title: string;
  verifyToken: string;
  verifyUrl: string;
  verifyNote: string;
  verifyStatus: string;
};

type PromoCode = {
  code: string;
  days: number;
  createdBy: string;
  createdAt: string;
  usedBy: string | null;
  usedAt: string | null;
  note: string;
};

export default function AdminPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [tab, setTab] = useState<"portfolio" | "users" | "moderation" | "promo">("portfolio");
  const [disputed, setDisputed] = useState<DisputedReview[]>([]);
  const [worksPending, setWorksPending] = useState<PendingWork[]>([]);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);

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
    const [d, u, m, p] = await Promise.all([
      fetch("/api/portfolio").then((r) => r.json()),
      fetch("/api/admin/users").then((r) => (r.ok ? r.json() : { users: [] })),
      fetch("/api/admin/moderation").then((r) => (r.ok ? r.json() : { disputed: [], worksPending: [] })),
      fetch("/api/admin/promo").then((r) => (r.ok ? r.json() : { promoCodes: [] })),
    ]);
    setData(d);
    setUsers(u.users ?? []);
    setDisputed(m.disputed ?? []);
    setWorksPending(m.worksPending ?? []);
    setPromoCodes(p.promoCodes ?? []);
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

  /** Ручная выдача/отключение Pro у пользователя (пока оплата не подключена). */
  const setPro = useCallback(async (userId: string, pro: boolean) => {
    await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, pro }),
    });
    loadAll();
  }, [loadAll]);

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
            ["moderation", `Модерация (${disputed.length + worksPending.length})`],
            ["promo", `Промокоды (${promoCodes.filter((c) => !c.usedBy).length})`],
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
                <th className="px-6 py-4">Тариф</th>
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
                  <td className="px-6 py-4">
                    {u.isPro ? (
                      <span className="flex items-center gap-2">
                        <span className="rounded-md bg-amber-300/10 px-2 py-0.5 text-xs text-amber-300">Pro</span>
                        <button
                          onClick={() => setPro(u.id, false)}
                          className="text-xs text-zinc-500 underline-offset-2 transition-colors hover:text-red-400 hover:underline"
                        >
                          отключить
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setPro(u.id, true)}
                        className="text-xs text-zinc-500 underline-offset-2 transition-colors hover:text-lime-300 hover:underline"
                      >
                        Выдать Pro
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4 text-zinc-500">
                    {new Date(u.createdAt).toLocaleDateString("ru-RU")}
                  </td>
                </tr>
              ))}
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">
                    Пока никто не зарегистрировался
                  </td>
                </tr>              ) : null}
            </tbody>
          </table>
        </section>
      )}

      {tab === "moderation" && (
        <ModerationTab
          disputed={disputed}
          worksPending={worksPending}
          onAction={loadAll}
        />
      )}

      {tab === "promo" && <PromoTab codes={promoCodes} onAction={loadAll} />}
    </div>
  );
}

function PromoTab({ codes, onAction }: { codes: PromoCode[]; onAction: () => void }) {
  const [code, setCode] = useState("");
  const [days, setDays] = useState("30");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{ code: string; days: number } | null>(null);

  async function create() {
    setError("");
    setCreated(null);
    setBusy(true);
    const res = await fetch("/api/admin/promo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.trim(), days: Number(days), note: note.trim() }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(body.error ?? "Не удалось создать промокод");
      return;
    }
    setCreated({ code: body.code, days: body.days });
    setCode("");
    setNote("");
    onAction();
  }

  const inputCls =
    "w-full rounded-xl border border-white/10 bg-zinc-900/70 px-4 py-2.5 text-sm text-white outline-none transition-colors focus:border-indigo-400";

  return (
    <div className="space-y-8">
      <section className="card p-6">
        <h2 className="text-lg font-semibold text-white">Создать промокод</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Код одноразовый: активировавший его пользователь получает Pro на выбранный срок. У кого Pro уже активен — срок прибавится.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto_1fr]">
          <label className="block">
            <span className="mb-1 block text-sm text-zinc-400">Код (A-Z, 0-9, дефис)</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className={`${inputCls} uppercase tracking-wider`}
              placeholder="SHELF-2026"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-zinc-400">Срок Pro (дней)</span>
            <input
              value={days}
              onChange={(e) => setDays(e.target.value.replace(/\D/g, "").slice(0, 4))}
              className={`${inputCls} w-28`}
              inputMode="numeric"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-zinc-400">Заметка (кому/зачем, необязательно)</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} placeholder="для конкурса, другу…" />
          </label>
        </div>
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        {created && (
          <div className="mt-3 rounded-lg border border-lime-300/30 bg-lime-300/10 px-4 py-3 text-sm text-lime-200">
            ✅ Промокод <strong className="select-all tracking-wider">{created.code}</strong> создан — даёт Pro на {created.days} дн.
          </div>
        )}
        <button onClick={create} disabled={busy} className="btn btn-primary mt-4 text-sm disabled:opacity-50">
          {busy ? "Создаю…" : "Создать промокод"}
        </button>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">Все промокоды</h2>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-xs uppercase tracking-wider text-zinc-500">
                <th className="px-4 py-3">Код</th>
                <th className="px-4 py-3">Срок</th>
                <th className="px-4 py-3">Статус</th>
                <th className="px-4 py-3">Заметка</th>
                <th className="px-4 py-3">Создан</th>
              </tr>
            </thead>
            <tbody>
              {codes.map((c) => (
                <tr key={c.code} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-3 font-mono font-semibold text-lime-300">{c.code}</td>
                  <td className="px-4 py-3 text-zinc-300">{c.days} дн.</td>
                  <td className="px-4 py-3">
                    {c.usedBy ? (
                      <span className="text-zinc-500">активирован {c.usedAt ? new Date(c.usedAt).toLocaleDateString("ru-RU") : ""}</span>
                    ) : (
                      <span className="rounded-md bg-lime-300/10 px-2 py-0.5 text-xs text-lime-300">свободен</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">{c.note || "—"}</td>
                  <td className="px-4 py-3 text-zinc-500">{new Date(c.createdAt).toLocaleDateString("ru-RU")}</td>
                </tr>
              ))}
              {codes.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-zinc-500">
                    Промокодов ещё нет
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function ModerationTab({
  disputed,
  worksPending,
  onAction,
}: {
  disputed: DisputedReview[];
  worksPending: PendingWork[];
  onAction: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function decide(reviewId: string, action: "restore" | "remove") {
    setBusy(true);
    await fetch("/api/admin/moderation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewId, action }),
    });
    setBusy(false);
    onAction();
  }

  async function verify(workId: string, status: "verified" | "unverified") {
    setBusy(true);
    await fetch("/api/admin/moderation", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workId, status }),
    });
    setBusy(false);
    onAction();
  }

  return (
    <div className="space-y-8">
      {/* Оспоренные отзывы */}
      <section>
        <h2 className="text-lg font-semibold text-white">Оспоренные отзывы</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Оценка ниже 4 звёзд без объяснения или явная несправедливость — удаляйте, обоснованная — возвращайте в публикацию.
        </p>
        <div className="mt-4 space-y-4">
          {disputed.length === 0 && <p className="text-sm text-zinc-500">Споров нет 🎉</p>}
          {disputed.map(({ review, workTitle }) => (
            <div key={review.id} className="card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-amber-300">{"★".repeat(review.stars)}{"☆".repeat(5 - review.stars)}</span>
                  <span className="ml-3 text-sm text-zinc-400">к работе «{workTitle}»</span>
                </div>
                <span className="text-xs text-zinc-500">{new Date(review.createdAt).toLocaleDateString("ru-RU")}</span>
              </div>
              {review.text && <p className="mt-2 text-sm text-zinc-300">Текст отзыва: {review.text}</p>}
              <p className="mt-2 rounded-lg border border-amber-300/20 bg-amber-300/5 p-3 text-sm text-amber-200">
                Причина спора: {review.disputeReason}
              </p>
              <div className="mt-3 flex gap-3">
                <button disabled={busy} onClick={() => decide(review.id, "restore")} className="btn btn-primary !py-2 text-xs">
                  Оценка обоснована — вернуть
                </button>
                <button disabled={busy} onClick={() => decide(review.id, "remove")} className="btn btn-ghost !py-2 text-xs !text-red-400">
                  Отзыв необоснованный — удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Работы на проверке авторства */}
      <section>
        <h2 className="text-lg font-semibold text-white">Проверка авторства работ</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Автопроверка не смогла подтвердить код (закрытая страница или динамический контент). Откройте ссылку,
          найдите код — и подтвердите вручную.
        </p>
        <div className="mt-4 space-y-4">
          {worksPending.length === 0 && <p className="text-sm text-zinc-500">Всё проверено ✅</p>}
          {worksPending.map((w) => (
            <div key={w.id} className="card p-5">
              <div className="font-semibold text-white">{w.title}</div>
              <div className="mt-1 text-xs text-zinc-500">
                Код: <code className="select-all rounded bg-white/10 px-1.5 py-0.5 text-lime-300">{w.verifyToken}</code>
              </div>
              <a href={w.verifyUrl} target="_blank" rel="noopener noreferrer" className="mt-2 block break-all text-sm text-lime-300 hover:underline">
                {w.verifyUrl} ↗
              </a>
              {w.verifyNote && <p className="mt-1 text-xs text-zinc-500">Автопроверка: {w.verifyNote}</p>}
              <div className="mt-3 flex gap-3">
                <button disabled={busy} onClick={() => verify(w.id, "verified")} className="btn btn-primary !py-2 text-xs">
                  Код на месте — подтвердить
                </button>
                <button disabled={busy} onClick={() => verify(w.id, "unverified")} className="btn btn-ghost !py-2 text-xs !text-red-400">
                  Кода нет — отклонить
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
