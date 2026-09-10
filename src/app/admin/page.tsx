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
  status: "active" | "frozen" | "blocked";
  statusReason: string;
  statusAt: string | null;
  username: string | null;
};

type Ticket = {
  id: string;
  userId: string;
  userLogin: string;
  type: "appeal" | "other";
  subject: string;
  message: string;
  status: "open" | "resolved" | "dismissed";
  adminReply: string;
  handledBy: string;
  createdAt: string;
  updatedAt: string;
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
  maxUses: number;
  uses: number;
  validUntil: string | null;
};

type UsernameRequest = {
  id: string;
  userId: string;
  userLogin: string;
  currentUsername: string;
  requestedUsername: string;
  status: "open" | "approved" | "dismissed";
  adminReply: string;
  handledBy: string;
  createdAt: string;
  updatedAt: string;
};

export default function AdminPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [tab, setTab] = useState<"portfolio" | "users" | "moderation" | "promo" | "tickets" | "usernames">("portfolio");
  const [disputed, setDisputed] = useState<DisputedReview[]>([]);
  const [worksPending, setWorksPending] = useState<PendingWork[]>([]);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [usernameRequests, setUsernameRequests] = useState<UsernameRequest[]>([]);
  const [myRole, setMyRole] = useState("user");

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
    const isStaffUser = !!s.user && (s.user.role === "admin" || s.user.role === "creator");
    setMe(isStaffUser ? s.user : null);
    if (isStaffUser) setMyRole(s.user.role);
    const [d, u, m, p, t, ur] = await Promise.all([
      fetch("/api/portfolio").then((r) => r.json()),
      fetch("/api/admin/users").then((r) => (r.ok ? r.json() : { users: [] })),
      fetch("/api/admin/moderation").then((r) => (r.ok ? r.json() : { disputed: [], worksPending: [] })),
      fetch("/api/admin/promo").then((r) => (r.ok ? r.json() : { promoCodes: [] })),
      fetch("/api/admin/tickets").then((r) => (r.ok ? r.json() : { tickets: [] })),
      fetch("/api/admin/username-requests").then((r) => (r.ok ? r.json() : { requests: [] })),
    ]);
    setData(d);
    setUsers(u.users ?? []);
    setDisputed(m.disputed ?? []);
    setWorksPending(m.worksPending ?? []);
    setPromoCodes(p.promoCodes ?? []);
    setTickets(t.tickets ?? []);
    setUsernameRequests(ur.requests ?? []);
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

  // ---- Модерация статусов (заморозка/блокировка с причиной) ----
  const [statusTarget, setStatusTarget] = useState<AdminUser | null>(null);
  const [statusKind, setStatusKind] = useState<"frozen" | "blocked">("frozen");
  const [statusReason, setStatusReason] = useState("");
  const [statusError, setStatusError] = useState("");
  const [statusBusy, setStatusBusy] = useState(false);

  const applyStatus = useCallback(
    async (userId: string, status: "frozen" | "blocked" | "active", reason: string) => {
      setStatusBusy(true);
      setStatusError("");
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_status", userId, status, reason }),
      });
      const body = await res.json().catch(() => ({}));
      setStatusBusy(false);
      if (!res.ok) {
        setStatusError(body.error ?? "Не удалось изменить статус");
        return false;
      }
      setStatusTarget(null);
      loadAll();
      return true;
    },
    [loadAll]
  );

  const setUserStatus = useCallback(
    (userId: string, status: "active", reason: string) => {
      void applyStatus(userId, status, reason);
    },
    [applyStatus]
  );

  const setUserRole = useCallback(
    async (userId: string, role: "admin" | "user") => {
      await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_role", userId, role }),
      });
      loadAll();
    },
    [loadAll]
  );

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
    <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
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

      {/* Вкладки — на телефоне прокручиваются вбок, не ломая сетку */}
      <div className="-mx-4 mb-6 overflow-x-auto px-4 pb-1 sm:mx-0 sm:mb-8 sm:overflow-visible sm:px-0">
        <div className="flex gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-1.5">
          {(
            [
              ["portfolio", "Портфолио"],
              ["users", `Пользователи (${users.length})`],
              ["moderation", `Модерация (${disputed.length + worksPending.length})`],
              ["tickets", `Тикеты (${tickets.filter((t) => t.status === "open").length})`],
              ["usernames", `Юзернеймы (${usernameRequests.filter((r) => r.status === "open").length})`],
              ...(myRole === "creator"
                ? [["promo", `Промокоды (${promoCodes.filter((c) => !c.usedBy).length})`] as const]
                : []),
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`shrink-0 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-300 sm:flex-1 sm:px-4 ${
                tab === key
                  ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/25"
                  : "text-zinc-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
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
        /* ---- Пользователи: тариф, статус, роли администрации ---- */
        <section className="card overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-zinc-500">
                <th className="px-4 py-4">Логин</th>
                <th className="px-4 py-4">Email</th>
                <th className="px-4 py-4">Роль</th>
                <th className="px-4 py-4">Статус</th>
                <th className="px-4 py-4">Тариф</th>
                <th className="px-4 py-4">Действия</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isCreatorRow = u.role === "creator";
                const canTouch = !isCreatorRow && u.id !== me?.login;
                return (
                <tr
                  key={u.id}
                  className="border-b border-white/5 align-top text-zinc-300 transition-colors last:border-0 hover:bg-white/[0.03]"
                >
                  <td className="px-4 py-4 font-medium text-white">
                    {u.login}
                    {isCreatorRow && (
                      <span className="ml-2 rounded-md bg-violet-400/15 px-2 py-0.5 text-xs text-violet-300">создатель</span>
                    )}
                    {u.role === "admin" && (
                      <span className="ml-2 rounded-md bg-lime-300/10 px-2 py-0.5 text-xs text-lime-300">админ</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-zinc-400">{u.email || "—"}</td>
                  <td className="px-4 py-4">
                    {u.role === "creator" ? "Создатель" : u.role === "admin" ? "Администратор" : "Пользователь"}
                    {myRole === "creator" && canTouch && (
                      <div className="mt-1">
                        <button
                          onClick={() => setUserRole(u.id, u.role === "admin" ? "user" : "admin")}
                          className="text-xs text-zinc-500 underline-offset-2 transition-colors hover:text-lime-300 hover:underline"
                        >
                          {u.role === "admin" ? "снять админа" : "выдать админа"}
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    {u.status === "active" && <span className="text-lime-400">активен</span>}
                    {u.status === "frozen" && <span className="text-amber-300">заморожен</span>}
                    {u.status === "blocked" && <span className="text-red-400">заблокирован</span>}
                    {u.statusReason && (
                      <div className="mt-1 max-w-40 text-xs text-zinc-500" title={u.statusReason}>
                        {u.statusReason}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4">
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
                  <td className="px-4 py-4">
                    {canTouch ? (
                      <div className="flex flex-col gap-1">
                        {u.status === "active" ? (
                          <button
                            onClick={() => {
                              const target = users.find((x) => x.id === u.id);
                              setStatusTarget(target ?? null);
                              setStatusKind("frozen");
                              setStatusReason("");
                            }}
                            className="text-left text-xs text-amber-300/90 underline-offset-2 hover:text-amber-200 hover:underline"
                          >
                            🧊 заморозить
                          </button>
                        ) : (
                          <button
                            onClick={() => setUserStatus(u.id, "active", "")}
                            className="text-left text-xs text-lime-300 underline-offset-2 hover:text-lime-200 hover:underline"
                          >
                            ♻️ разморозить
                          </button>
                        )}
                        {myRole === "creator" && u.status !== "blocked" && (
                          <button
                            onClick={() => {
                              const target = users.find((x) => x.id === u.id);
                              setStatusTarget(target ?? null);
                              setStatusKind("blocked");
                              setStatusReason("");
                            }}
                            className="text-left text-xs text-red-400 underline-offset-2 hover:text-red-300 hover:underline"
                          >
                            🔒 заблокировать
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-600">—</span>
                    )}
                  </td>
                </tr>
                );
              })}
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
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

      {tab === "promo" && myRole === "creator" && <PromoTab codes={promoCodes} onAction={loadAll} />}

      {tab === "tickets" && <TicketsTab tickets={tickets} onAction={loadAll} />}

      {tab === "usernames" && <UsernameRequestsTab requests={usernameRequests} onAction={loadAll} />}

      {/* Модалка причины заморозки/блокировки */}
      {statusTarget && (
        <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="modal-panel card max-h-[88dvh] w-full max-w-md overflow-y-auto p-6">
            <h3 className="text-lg font-bold text-white">
              {statusKind === "blocked" ? "🔒 Заблокировать" : "🧊 Заморозить"} пользователя {statusTarget.login}
            </h3>
            <p className="mt-2 text-sm text-zinc-400">
              {statusKind === "blocked"
                ? "Заблокированный не может войти и пользоваться сервисом. Причину увидит при попытке входа."
                : "Замороженный может войти, чтобы подать тикет, но не может пользоваться сервисом. Причину увидит в кабинете."}
            </p>
            <textarea
              value={statusReason}
              onChange={(e) => setStatusReason(e.target.value)}
              placeholder="Причина (минимум 10 символов) — её увидит пользователь…"
              className="mt-4 min-h-24 w-full rounded-xl border border-white/10 bg-zinc-900/70 px-4 py-3 text-white outline-none transition-colors focus:border-indigo-400"
            />
            {statusError && <p className="mt-2 text-sm text-red-400">{statusError}</p>}
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => applyStatus(statusTarget.id, statusKind, statusReason.trim())}
                disabled={statusBusy}
                className={`btn text-sm ${statusKind === "blocked" ? "!bg-red-500/80" : "!bg-amber-500/80"} disabled:opacity-50`}
              >
                {statusBusy ? "Применяю…" : statusKind === "blocked" ? "Заблокировать" : "Заморозить"}
              </button>
              <button
                onClick={() => {
                  setStatusTarget(null);
                  setStatusError("");
                }}
                className="btn btn-ghost text-sm"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TicketsTab({ tickets, onAction }: { tickets: Ticket[]; onAction: () => void }) {
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function handle(id: string, status: "resolved" | "dismissed") {
    setBusy(id);
    await fetch(`/api/tickets/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, reply: reply || undefined }),
    });
    setBusy(null);
    setReply("");
    onAction();
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-white">Тикеты пользователей</h2>
      <p className="text-sm text-zinc-500">
        Оспаривания модерации и обращения. Ответ увидит автор тикета на странице «Тикеты».
      </p>
      {tickets.length === 0 && <p className="text-sm text-zinc-500">Тикетов пока нет 🎉</p>}
      {tickets.map((t) => (
        <div key={t.id} className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="font-semibold text-white">{t.subject}</span>
              <span className="ml-2 text-sm text-zinc-500">от {t.userLogin}</span>
              {t.type === "appeal" && (
                <span className="ml-2 rounded-md bg-amber-300/10 px-2 py-0.5 text-xs text-amber-300">оспаривание</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {t.status === "open" && <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2.5 py-1 text-xs text-amber-200">открыт</span>}
              {t.status === "resolved" && <span className="rounded-full border border-lime-300/30 bg-lime-300/10 px-2.5 py-1 text-xs text-lime-200">решён</span>}
              {t.status === "dismissed" && <span className="rounded-full border border-zinc-500/30 bg-zinc-500/10 px-2.5 py-1 text-xs text-zinc-400">отклонён</span>}
              <span className="text-xs text-zinc-600">{new Date(t.createdAt).toLocaleString("ru-RU")}</span>
            </div>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-300">{t.message}</p>
          {t.adminReply && (
            <p className="mt-2 rounded-lg border border-indigo-400/20 bg-indigo-500/10 p-3 text-sm text-indigo-200">
              Ответ ({t.handledBy}): {t.adminReply}
            </p>
          )}
          {t.status === "open" && (
            <div className="mt-3">
              <input
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Ответ пользователю (необязательно)"
                className="w-full rounded-xl border border-white/10 bg-zinc-900/70 px-4 py-2.5 text-sm text-white outline-none transition-colors focus:border-indigo-400"
              />
              <div className="mt-2 flex gap-3">
                <button disabled={busy === t.id} onClick={() => handle(t.id, "resolved")} className="btn btn-primary !py-2 text-xs">
                  ✅ Решён
                </button>
                <button disabled={busy === t.id} onClick={() => handle(t.id, "dismissed")} className="btn btn-ghost !py-2 text-xs !text-red-400">
                  ❌ Отклонить
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function PromoTab({ codes, onAction }: { codes: PromoCode[]; onAction: () => void }) {
  const [code, setCode] = useState("");
  const [days, setDays] = useState("30");
  const [note, setNote] = useState("");
  const [maxUses, setMaxUses] = useState("1");
  const [unlimited, setUnlimited] = useState(false);
  const [validDays, setValidDays] = useState("");
  const [noExpiry, setNoExpiry] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{ code: string; days: number; maxUses: number; validUntil: string | null } | null>(null);

  async function create() {
    setError("");
    setCreated(null);
    setBusy(true);
    const res = await fetch("/api/admin/promo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: code.trim(),
        days: Number(days),
        note: note.trim(),
        maxUses: unlimited ? 0 : Number(maxUses || "1"),
        validDays: noExpiry ? 0 : Number(validDays || "0"),
      }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(body.error ?? "Не удалось создать промокод");
      return;
    }
    setCreated({ code: body.code, days: body.days, maxUses: body.maxUses, validUntil: body.validUntil });
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
          Активировавший получает Pro на выбранный срок. У кого Pro уже активен — срок прибавится.
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
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {/* Активации */}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <span className="block text-sm text-zinc-400">Количество активаций</span>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input type="checkbox" checked={!unlimited} onChange={() => setUnlimited(false)} className="h-4 w-4 accent-lime-400" />
                лимит:
              </label>
              <input
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value.replace(/\D/g, "").slice(0, 4))}
                disabled={unlimited}
                className={`${inputCls} w-24 disabled:opacity-40`}
                inputMode="numeric"
                placeholder="2"
              />
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input type="checkbox" checked={unlimited} onChange={() => setUnlimited(true)} className="h-4 w-4 accent-lime-400" />
                ∞ без ограничений
              </label>
            </div>
            <p className="mt-1.5 text-xs text-zinc-600">Сколько разных пользователей смогут активировать код.</p>
          </div>
          {/* Срок действия кода */}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <span className="block text-sm text-zinc-400">Срок действия самого кода</span>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input type="checkbox" checked={!noExpiry} onChange={() => setNoExpiry(false)} className="h-4 w-4 accent-lime-400" />
                истекает через,
              </label>
              <input
                value={validDays}
                onChange={(e) => setValidDays(e.target.value.replace(/\D/g, "").slice(0, 4))}
                disabled={noExpiry}
                className={`${inputCls} w-24 disabled:opacity-40`}
                inputMode="numeric"
                placeholder="14"
              />
              <span className="text-sm text-zinc-400">дн.</span>
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input type="checkbox" checked={noExpiry} onChange={() => setNoExpiry(true)} className="h-4 w-4 accent-lime-400" />
                бессрочно
              </label>
            </div>
            <p className="mt-1.5 text-xs text-zinc-600">После этой даты код больше нельзя будет активировать.</p>
          </div>
        </div>
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        {created && (
          <div className="mt-3 rounded-lg border border-lime-300/30 bg-lime-300/10 px-4 py-3 text-sm text-lime-200">
            ✅ Промокод <strong className="select-all tracking-wider">{created.code}</strong> создан — даёт Pro на {created.days} дн.,
            активаций: {created.maxUses === 0 ? "∞" : created.maxUses}
            {created.validUntil ? `, действует до ${new Date(created.validUntil).toLocaleDateString("ru-RU")}` : ", бессрочно"}.
          </div>
        )}
        <button onClick={create} disabled={busy} className="btn btn-primary mt-4 text-sm disabled:opacity-50">
          {busy ? "Создаю…" : "Создать промокод"}
        </button>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">Все промокоды</h2>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-xs uppercase tracking-wider text-zinc-500">
                <th className="px-4 py-3">Код</th>
                <th className="px-4 py-3">Срок</th>
                <th className="px-4 py-3">Активации</th>
                <th className="px-4 py-3">Действует</th>
                <th className="px-4 py-3">Заметка</th>
                <th className="px-4 py-3">Создан</th>
              </tr>
            </thead>
            <tbody>
              {codes.map((c) => {
                const exhausted = c.maxUses > 0 && c.uses >= c.maxUses;
                const expired = c.validUntil ? new Date(c.validUntil).getTime() < Date.now() : false;
                return (
                <tr key={c.code} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-3 font-mono font-semibold text-lime-300">{c.code}</td>
                  <td className="px-4 py-3 text-zinc-300">{c.days} дн.</td>
                  <td className="px-4 py-3">
                    {exhausted ? (
                      <span className="text-zinc-500">исчерпан ({c.uses}/{c.maxUses})</span>
                    ) : (
                      <span className="text-zinc-300">{c.uses} / {c.maxUses === 0 ? "∞" : c.maxUses}</span>
                    )}
                    {c.usedBy && c.maxUses <= 1 && (
                      <div className="text-xs text-zinc-600">{c.usedBy}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {expired ? (
                      <span className="text-red-400">истёк</span>
                    ) : c.validUntil ? (
                      <span className="text-zinc-300">до {new Date(c.validUntil).toLocaleDateString("ru-RU")}</span>
                    ) : (
                      <span className="text-zinc-500">бессрочно</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">{c.note || "—"}</td>
                  <td className="px-4 py-3 text-zinc-500">{new Date(c.createdAt).toLocaleDateString("ru-RU")}</td>
                </tr>
                );
              })}
              {codes.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-zinc-500">
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

function UsernameRequestsTab({ requests, onAction }: { requests: UsernameRequest[]; onAction: () => void }) {
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function handle(id: string, action: "approve" | "dismiss") {
    setBusy(id);
    setError("");
    const res = await fetch("/api/admin/username-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action, reply: reply || undefined }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(null);
    setReply("");
    if (!res.ok) setError(body.error ?? "Ошибка обработки запроса");
    onAction();
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-white">Запросы на смену юзернейма</h2>
      <p className="text-sm text-zinc-500">
        Пользователи просят сменить закреплённый юзернейм. Одобрение меняет юзернейм сразу; ответ увидит автор запроса в кабинете.
      </p>
      {error && <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</div>}
      {requests.length === 0 && <p className="text-sm text-zinc-500">Запросов пока нет 🎉</p>}
      {requests.map((r) => (
        <div key={r.id} className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="font-semibold text-white">{r.userLogin}</span>
              <span className="ml-2 text-sm text-zinc-400">
                {r.currentUsername ? `@${r.currentUsername} → ` : "без юзернейма → "}
                <span className="font-medium text-lime-300">@{r.requestedUsername}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              {r.status === "open" && <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2.5 py-1 text-xs text-amber-200">на модерации</span>}
              {r.status === "approved" && <span className="rounded-full border border-lime-300/30 bg-lime-300/10 px-2.5 py-1 text-xs text-lime-200">одобрен</span>}
              {r.status === "dismissed" && <span className="rounded-full border border-zinc-500/30 bg-zinc-500/10 px-2.5 py-1 text-xs text-zinc-400">отклонён</span>}
              <span className="text-xs text-zinc-600">{new Date(r.createdAt).toLocaleString("ru-RU")}</span>
            </div>
          </div>
          {r.adminReply && (
            <p className="mt-2 rounded-lg border border-indigo-400/20 bg-indigo-500/10 p-3 text-sm text-indigo-200">
              Ответ ({r.handledBy}): {r.adminReply}
            </p>
          )}
          {r.status === "open" && (
            <div className="mt-3">
              <input
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Комментарий пользователю (необязательно)"
                className="w-full rounded-xl border border-white/10 bg-zinc-900/70 px-4 py-2.5 text-sm text-white outline-none transition-colors focus:border-indigo-400"
              />
              <div className="mt-2 flex gap-3">
                <button disabled={busy === r.id} onClick={() => handle(r.id, "approve")} className="btn btn-primary !py-2 text-xs disabled:opacity-50">
                  ✅ Одобрить и сменить
                </button>
                <button disabled={busy === r.id} onClick={() => handle(r.id, "dismiss")} className="btn btn-ghost !py-2 text-xs disabled:opacity-50">
                  ❌ Отклонить
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
