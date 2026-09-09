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
  contacts: { label: string; value: string }[];
  plan: "free" | "pro";
  isPro: boolean;
  canChangeName: boolean;
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

  // поля формы
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatarEmoji, setAvatarEmoji] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bio, setBio] = useState("");
  const [bioDetails, setBioDetails] = useState<Record<string, string>>({});
  const [contacts, setContacts] = useState<{ label: string; value: string }[]>([]);

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
      body: JSON.stringify({ username, displayName, avatarEmoji, avatarUrl, bio, bioDetails, contacts }),
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

  const input =
    "w-full rounded-xl border border-white/10 bg-zinc-900/70 px-4 py-3 text-white outline-none transition-colors focus:border-indigo-400";

  if (!profile) return <section className="flex flex-1 items-center justify-center px-6 py-20 text-zinc-400">Загрузка…</section>;

  const daysOnService = Math.max(1, Math.floor((Date.now() - new Date(profile.memberSince).getTime()) / 86400000) + 1);

  return (
    <section className="mx-auto w-full max-w-6xl flex-1 px-6 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Личный кабинет</h1>
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
              <input value={username} onChange={(e) => setUsername(e.target.value)} className={input} disabled={!profile.canChangeName} />
              <span className="mt-1 block text-xs text-zinc-600">
                От 5 символов, начинается и заканчивается буквой; внутри — латиница, цифры и _
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

          {!profile.isPro && (
            <div className="card mt-6 border-amber-300/20 p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-white">⭐ Pro-подписка — 499 ₽/мес</h3>
                  <p className="mt-1 text-sm text-zinc-400">
                    Без лимита работ (на free — максимум 5) и приоритетная проверка авторства.
                  </p>
                </div>
                <button
                  onClick={() => setNotice("Оплата подключим в ближайшее время — напишите нам в Telegram, оформим Pro вручную.")}
                  className="btn btn-primary text-sm"
                >
                  Оформить Pro
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
