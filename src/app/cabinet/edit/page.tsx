"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Profile = {
  login: string;
  email: string;
  username: string | null;
  displayName: string;
  avatarEmoji: string;
  avatarUrl: string;
  bio: string;
  bioDetails: Record<string, string>;
  roles: string[];
  contacts: { label: string; value: string }[];
  plan: "free" | "pro";
  planExpiresAt: string | null;
  isPro: boolean;
  canChangeName: boolean;
  usernameLocked?: boolean;
  cooldownHours: number;
  memberSince: string;
};

const BIO_FIELDS = [
  { id: "specialization", label: "Специализация", placeholder: "Fullstack-разработчик, OSINT-аналитик, иллюстратор…" },
  { id: "experience", label: "Опыт", placeholder: "3 года коммерческой разработки, 20+ проектов…" },
  { id: "education", label: "Образование", placeholder: "Вуз, курсы, самообразование…" },
  { id: "city", label: "Город", placeholder: "Москва / удалённо" },
  { id: "languages", label: "Языки", placeholder: "Русский — родной, английский — B2" },
  { id: "status", label: "Статус занятости", placeholder: "Открыт к заказам / на проекте / ищу команду" },
  { id: "achievements", label: "Достижения", placeholder: "Хакатоны, публикации, open source, сертификаты…" },
  { id: "funFact", label: "Интересный факт", placeholder: "То, что запомнит вас человек" },
];

type Work = {
  id: string;
  type: string;
  typeCustom?: string;
  title: string;
  summary: string;
  verifyStatus: "unverified" | "pending" | "verified";
  verifyNote: string;
  verifyToken: string;
  verifyUrl: string;
  createdAt: string;
  rating: { avg: number; count: number };
};

const TYPE_LABELS: Record<string, string> = {
  site: "Сайт", webapp: "Веб-приложение", bot: "Телеграм-бот", mobile: "Мобильное приложение",
  osint: "OSINT", design: "Дизайн", script: "Скрипт", custom: "Свой вариант",
};

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
const MAX_ROLES = 3;

const VERIFY_BADGE: Record<Work["verifyStatus"], { text: string; cls: string }> = {
  verified: { text: "✅ Авторство подтверждено", cls: "border-lime-300/30 bg-lime-300/10 text-lime-200" },
  pending: { text: "⏳ На ручной проверке", cls: "border-amber-300/30 bg-amber-300/10 text-amber-200" },
  unverified: { text: "⚠️ Авторство не подтверждено", cls: "border-zinc-500/30 bg-zinc-500/10 text-zinc-400" },
};

export default function CabinetPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [works, setWorks] = useState<Work[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  // Удаление аккаунта
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteSent, setDeleteSent] = useState(false);
  const [deleteDevCode, setDeleteDevCode] = useState("");
  const [deleteCode, setDeleteCode] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);

  // поля формы
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatarEmoji, setAvatarEmoji] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bio, setBio] = useState("");
  const [bioDetails, setBioDetails] = useState<Record<string, string>>({});
  const [roles, setRoles] = useState<string[]>([]);
  const [contacts, setContacts] = useState<{ label: string; value: string }[]>([]);

  // Промокод на Pro
  const [promo, setPromo] = useState("");
  const [promoBusy, setPromoBusy] = useState(false);

  const load = useCallback(async () => {
    const meRes = await fetch("/api/auth/me");
    const me = await meRes.json();
    if (!me.user) {
      router.push("/login");
      return;
    }
    const pRes = await fetch("/api/profile");
    const p = await pRes.json();
    if (p.profile) {
      setProfile(p.profile);
      setUsername(p.profile.username ?? "");
      setDisplayName(p.profile.displayName ?? "");
      setAvatarEmoji(p.profile.avatarEmoji ?? "");
      setAvatarUrl(p.profile.avatarUrl ?? "");
      setBio(p.profile.bio ?? "");
      setBioDetails(p.profile.bioDetails ?? {});
      setRoles(p.profile.roles ?? []);
      setContacts(p.profile.contacts ?? []);
    }
    const wRes = await fetch("/api/works");
    const w = await wRes.json();
    setWorks(w.works ?? []);
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveProfile() {
    setError("");
    setNotice("");
    setSaving(true);
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, displayName, avatarEmoji, avatarUrl, bio, bioDetails, roles, contacts }),
    });
    const body = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(body.error ?? "Ошибка сохранения");
      return;
    }
    setNotice("Профиль сохранён ✅");
    load();
  }

  async function redeemPromo() {
    setError("");
    setNotice("");
    if (!promo.trim()) {
      setError("Введите промокод");
      return;
    }
    setPromoBusy(true);
    const res = await fetch("/api/promo/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: promo.trim() }),
    });
    const body = await res.json().catch(() => ({}));
    setPromoBusy(false);
    if (!res.ok) {
      setError(body.error ?? "Не удалось активировать промокод");
      return;
    }
    setPromo("");
    setNotice(`Промокод активирован ✅ Pro до ${new Date(body.planExpiresAt).toLocaleDateString("ru-RU")}`);
    load();
  }

  async function reverify(workId: string, verifyUrl: string) {
    setNotice("");
    const res = await fetch(`/api/works/${workId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verifyUrl }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) setError(body.error ?? "Ошибка проверки");
    else setNotice("Проверка запущена — обновляем…");
    load();
  }

  async function sendDeleteCode() {
    setDeleteError("");
    setDeleteBusy(true);
    const res = await fetch("/api/profile/delete", { method: "POST" });
    const body = await res.json().catch(() => ({}));
    setDeleteBusy(false);
    if (!res.ok) {
      setDeleteError(body.error ?? "Не удалось отправить код");
      return;
    }
    setDeleteSent(true);
    if (body.devCode) setDeleteDevCode(body.devCode);
    setDeleteResendLeft(60);
  }

  async function resendDeleteCode() {
    setDeleteError("");
    setDeleteBusy(true);
    const res = await fetch("/api/profile/delete/resend", { method: "POST" });
    const body = await res.json().catch(() => ({}));
    setDeleteBusy(false);
    if (!res.ok) {
      setDeleteError(body.error ?? "Не удалось отправить код повторно");
      return;
    }
    if (body.devCode) setDeleteDevCode(body.devCode);
    setDeleteResendLeft(60);
  }

  const [deleteResendLeft, setDeleteResendLeft] = useState(0);
  useEffect(() => {
    if (deleteResendLeft <= 0) return;
    const t = setTimeout(() => setDeleteResendLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [deleteResendLeft]);

  async function confirmDelete() {
    setDeleteError("");
    if (!deleteCode || !deletePassword) {
      setDeleteError("Введите код из письма и пароль");
      return;
    }
    if (!confirm("Аккаунт, все работы и отзывы будут удалены БЕЗВОЗВРАТНО. Продолжить?")) return;
    setDeleteBusy(true);
    const res = await fetch("/api/profile/delete/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: deleteCode, password: deletePassword }),
    });
    const body = await res.json().catch(() => ({}));
    setDeleteBusy(false);
    if (!res.ok) {
      setDeleteError(body.error ?? "Не удалось удалить аккаунт");
      return;
    }
    router.push("/");
    router.refresh();
  }

  const input =
    "w-full rounded-xl border border-white/10 bg-zinc-900/70 px-4 py-3 text-white outline-none transition-colors focus:border-indigo-400";

  if (!profile) return <section className="flex flex-1 items-center justify-center px-6 py-20 text-zinc-400">Загрузка…</section>;

  const daysOnService = Math.max(1, Math.floor((Date.now() - new Date(profile.memberSince).getTime()) / 86400000) + 1);

  return (
    <section className="mx-auto w-full max-w-6xl flex-1 px-6 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/cabinet" className="text-sm text-zinc-500 transition-colors hover:text-zinc-300">
            ← Назад в кабинет
          </Link>
          <h1 className="mt-2 text-3xl font-extrabold text-white">Изменить профиль</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Вы с нами уже {daysOnService} {daysOnService % 10 === 1 && daysOnService % 100 !== 11 ? "день" : "дн."} — это видно только вам.
          </p>
        </div>
        {profile.isPro ? (
          <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-1.5 text-sm font-medium text-amber-200">
            ⭐ Pro-аккаунт
          </span>
        ) : (
          <span className="text-sm text-zinc-500">
            Работ: <span className={works.length >= 5 ? "font-bold text-amber-300" : "text-zinc-300"}>{works.length}</span> из 5 (free)
          </span>
        )}
      </div>

      {notice && <div className="mt-4 rounded-xl border border-lime-300/30 bg-lime-300/10 px-4 py-3 text-sm text-lime-200">{notice}</div>}
      {error && <div className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</div>}

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        {/* Профиль */}
        <div className="card p-6">
          <h2 className="text-lg font-bold text-white">Профиль</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Имя и юзернейм можно менять раз в сутки.
            {!profile.canChangeName && ` Следующая смена через ~${profile.cooldownHours} ч.`}
          </p>

          <div className="mt-5 space-y-4">
            <div className="flex items-center gap-4">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/5 text-2xl">
                {avatarEmoji || "🧑‍💻"}
              </span>
              <label className="flex-1">
                <span className="mb-1.5 block text-sm text-zinc-400">Аватар-эмодзи (если нет картинки)</span>
                <input value={avatarEmoji} onChange={(e) => setAvatarEmoji(e.target.value)} className={input} placeholder="🧑‍💻" />
              </label>
            </div>
            <label className="block">
              <span className="mb-1.5 block text-sm text-zinc-400">Ссылка на аватар (https://…, необязательно)</span>
              <input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} className={input} placeholder="https://…/avatar.jpg" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm text-zinc-400">Имя (видно всем, над юзернеймом)</span>
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={input} disabled={!profile.canChangeName} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm text-zinc-400">
                Юзернейм <span className="text-zinc-600">(по нему вас найдут: /u/username)</span>
              </span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={input}
                placeholder="ещё не задан — задайте сейчас"
                disabled={!!profile.username}
              />
              <span className="mt-1 block text-xs text-zinc-600">
                {profile.username
                  ? "Юзернейм закрепляется за аккаунтом один раз и не меняется."
                  : "От 5 символов, начинается и заканчивается буквой. Задаётся один раз и не меняется!"}
              </span>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm text-zinc-400">О себе (коротко)</span>
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} className={`${input} min-h-20`} />
            </label>
          </div>

          <h3 className="mt-6 text-sm font-semibold text-white">Биография по пунктам (всё необязательно)</h3>
          <p className="mt-1 text-xs text-zinc-500">Заполните что хотите — это видно в вашем публичном профиле и помогает заинтересованным людям узнать вас лучше.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {BIO_FIELDS.map((f) => (
              <label key={f.id} className="block">
                <span className="mb-1 block text-xs text-zinc-500">{f.label}</span>
                <input
                  value={bioDetails[f.id] ?? ""}
                  onChange={(e) => setBioDetails({ ...bioDetails, [f.id]: e.target.value })}
                  className={`${input} !py-2 text-sm`}
                  placeholder={f.placeholder}
                />
              </label>
            ))}
          </div>

          <h3 className="mt-6 text-sm font-semibold text-white">Кто вы? (до {MAX_ROLES} ролей — по ним вас найдут в поиске)</h3>
          <p className="mt-1 text-xs text-zinc-500">Например, вы пишете OSINT-кейсы и программируете — отметьте «OSINT-аналитик» и «Программист».</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {ROLES.map((r) => {
              const active = roles.includes(r.id);
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() =>
                    setRoles(active ? roles.filter((x) => x !== r.id) : roles.length < MAX_ROLES ? [...roles, r.id] : roles)
                  }
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                    active
                      ? "border-lime-300/50 bg-lime-300/15 text-lime-200"
                      : "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-zinc-200"
                  }`}
                >
                  {r.emoji} {r.label}
                </button>
              );
            })}
          </div>

          <h3 className="mt-6 text-sm font-semibold text-white">Ваши контакты (видны в профиле)</h3>
          <div className="mt-3 space-y-3">
            {contacts.map((c, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={c.label}
                  onChange={(e) => setContacts(contacts.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                  className={input}
                  placeholder="Telegram"
                />
                <input
                  value={c.value}
                  onChange={(e) => setContacts(contacts.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))}
                  className={input}
                  placeholder="@username или ссылка"
                />
                <button onClick={() => setContacts(contacts.filter((_, j) => j !== i))} className="rounded-xl border border-white/10 px-3 text-red-400 hover:bg-white/5" aria-label="Удалить контакт">
                  ✕
                </button>
              </div>
            ))}
            {contacts.length < 5 && (
              <button onClick={() => setContacts([...contacts, { label: "", value: "" }])} className="text-sm text-lime-300 hover:underline">
                + Добавить контакт
              </button>
            )}
          </div>

          <button onClick={saveProfile} disabled={saving} className="btn btn-primary mt-6 w-full disabled:opacity-50">
            {saving ? "Сохраняем…" : "Сохранить профиль"}
          </button>
        </div>

        {/* Работы */}
        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Мои работы</h2>
            {works.length >= 5 && !profile.isPro ? (
              <span className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-1.5 text-xs text-amber-200">
                Лимит 5 работ — нужна подписка Pro
              </span>
            ) : (
              <Link href="/works/new" className="btn btn-primary !px-4 !py-2 text-sm">
                + Добавить
              </Link>
            )}
          </div>

          <div className="mt-4 space-y-4">
            {works.length === 0 && (
              <div className="card p-6 text-sm text-zinc-400">
                Пока нет ни одной работы. Нажмите «Добавить», опишите проект по пунктам и подтвердите авторство.
              </div>
            )}
            {works.map((w) => (
              <div key={w.id} className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-zinc-500">
                      {w.type === "custom" && w.typeCustom ? w.typeCustom : (TYPE_LABELS[w.type] ?? w.type)}
                    </div>
                    <Link href={`/works/${w.id}`} className="mt-0.5 block font-semibold text-white hover:text-lime-300">
                      {w.title}
                    </Link>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-xs ${VERIFY_BADGE[w.verifyStatus].cls}`}>
                    {VERIFY_BADGE[w.verifyStatus].text}
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-zinc-400">{w.summary}</p>
                <div className="mt-2 flex items-center gap-3 text-xs text-zinc-500">
                  <span>⭐ {w.rating.count ? `${w.rating.avg} (${w.rating.count})` : "нет оценок"}</span>
                  {w.verifyStatus !== "verified" && (
                    <button onClick={() => reverify(w.id, w.verifyUrl)} className="text-lime-300 hover:underline">
                      Проверить код сейчас
                    </button>
                  )}
                </div>                {w.verifyStatus !== "verified" && (
                  <div className="mt-3 rounded-lg border border-white/10 bg-black/30 p-3 text-xs text-zinc-400">
                    <div>
                      Код подтверждения (вставьте в README / описание / закреп): {" "}
                      <code className="select-all rounded bg-white/10 px-1.5 py-0.5 text-lime-300">{w.verifyToken}</code>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {!profile.isPro ? (
            <div className="card mt-6 border-amber-300/20 p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-white">⭐ Pro-подписка — 499 ₽/мес</h3>
                  <p className="mt-1 text-sm text-zinc-400">
                    Без лимита работ (на free — максимум 5) и приоритетная проверка авторства.
                  </p>
                </div>
                <button
                  onClick={() => setNotice("Оплату подключим в ближайшее время — напишите нам в Telegram, оформим Pro вручную.")}
                  className="btn btn-primary text-sm"
                >
                  Оформить Pro
                </button>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">
                <span className="text-sm text-zinc-400">Есть промокод?</span>
                <input
                  value={promo}
                  onChange={(e) => setPromo(e.target.value.toUpperCase())}
                  className="w-48 rounded-xl border border-white/10 bg-zinc-900/70 px-3 py-2 text-sm uppercase tracking-wider text-white outline-none transition-colors focus:border-indigo-400"
                  placeholder="XXXX-XXXX"
                />
                <button onClick={redeemPromo} disabled={promoBusy} className="btn btn-ghost !py-2 text-sm disabled:opacity-50">
                  {promoBusy ? "Активирую…" : "Активировать"}
                </button>
              </div>
            </div>
          ) : (
            <div className="card mt-6 border-amber-300/20 p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-white">⭐ Pro активен</h3>
                  <p className="mt-1 text-sm text-zinc-400">
                    Без лимита работ. Подписка действует до{" "}
                    <span className="font-semibold text-amber-200">
                      {profile.planExpiresAt ? new Date(profile.planExpiresAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }) : "—"}
                    </span>
                    . Продлить можно промокодом в любой момент.
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">
                <span className="text-sm text-zinc-400">Продлить промокодом:</span>
                <input
                  value={promo}
                  onChange={(e) => setPromo(e.target.value.toUpperCase())}
                  className="w-48 rounded-xl border border-white/10 bg-zinc-900/70 px-3 py-2 text-sm uppercase tracking-wider text-white outline-none transition-colors focus:border-indigo-400"
                  placeholder="XXXX-XXXX"
                />
                <button onClick={redeemPromo} disabled={promoBusy} className="btn btn-ghost !py-2 text-sm disabled:opacity-50">
                  {promoBusy ? "Активирую…" : "Активировать"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Опасная зона: удаление аккаунта */}
      <div className="card mt-10 border-red-400/20 p-6">
        <h2 className="font-bold text-white">Удаление аккаунта</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Аккаунт, все ваши работы и отзывы будут удалены безвозвратно. Для подтверждения нужны код с вашей
          почты ({profile.email || "почта не указана"}) и пароль.
        </p>
        {!deleteOpen ? (
          <button onClick={() => setDeleteOpen(true)} className="btn btn-ghost mt-4 text-sm !text-red-400">
            Я хочу удалить аккаунт
          </button>
        ) : (
          <div className="mt-4 max-w-md space-y-3">
            {!deleteSent ? (
              <button onClick={sendDeleteCode} disabled={deleteBusy} className="btn btn-primary text-sm disabled:opacity-50">
                {deleteBusy ? "Отправляю…" : "1. Получить код на почту"}
              </button>
            ) : (
              <>
                <p className="text-sm text-lime-300">✅ Код отправлен на {profile.email}</p>
                <button
                  onClick={resendDeleteCode}
                  disabled={deleteBusy || deleteResendLeft > 0}
                  className="text-left text-sm text-lime-300 transition-colors hover:text-lime-200 disabled:cursor-not-allowed disabled:text-zinc-600"
                >
                  {deleteResendLeft > 0 ? `Отправить повторно можно через ${deleteResendLeft} с` : "Не пришло письмо? Отправить код повторно"}
                </button>
                {deleteDevCode && (
                  <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
                    Демо-режим, код: <strong>{deleteDevCode}</strong>
                  </div>
                )}
                <input
                  value={deleteCode}
                  onChange={(e) => setDeleteCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className={`${input} text-center tracking-[0.3em]`}
                  placeholder="Код из письма"
                  inputMode="numeric"
                />
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className={input}
                  placeholder="Ваш пароль"
                  autoComplete="current-password"
                />
                {deleteError && <p className="text-sm text-red-400">{deleteError}</p>}
                <div className="flex gap-3">
                  <button onClick={confirmDelete} disabled={deleteBusy} className="btn btn-primary text-sm !bg-red-500/80 disabled:opacity-50">
                    {deleteBusy ? "Удаляю…" : "2. Удалить аккаунт навсегда"}
                  </button>
                  <button
                    onClick={() => {
                      setDeleteOpen(false);
                      setDeleteSent(false);
                      setDeleteCode("");
                      setDeletePassword("");
                      setDeleteError("");
                    }}
                    className="btn btn-ghost text-sm"
                  >
                    Отмена
                  </button>
                </div>
              </>
            )}
            {!deleteSent && deleteError && <p className="text-sm text-red-400">{deleteError}</p>}
          </div>
        )}
      </div>
    </section>
  );
}
