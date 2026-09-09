"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Ticket = {
  id: string;
  type: "appeal" | "other";
  subject: string;
  message: string;
  status: "open" | "resolved" | "dismissed";
  adminReply: string;
  handledBy: string;
  createdAt: string;
  updatedAt: string;
};

const STATUS_BADGE: Record<Ticket["status"], { text: string; cls: string }> = {
  open: { text: "⏳ На рассмотрении", cls: "border-amber-300/30 bg-amber-300/10 text-amber-200" },
  resolved: { text: "✅ Решён", cls: "border-lime-300/30 bg-lime-300/10 text-lime-200" },
  dismissed: { text: "❌ Отклонён", cls: "border-zinc-500/30 bg-zinc-500/10 text-zinc-400" },
};

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [accountStatus, setAccountStatus] = useState("active");
  const [statusLabel, setStatusLabel] = useState("активен");
  const [statusReason, setStatusReason] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [authed, setAuthed] = useState(true);

  const [type, setType] = useState<"appeal" | "other">("appeal");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/tickets");
    if (res.status === 401) {
      setAuthed(false);
      setLoaded(true);
      return;
    }
    const data = await res.json();
    setTickets(data.tickets ?? []);
    setAccountStatus(data.accountStatus ?? "active");
    setStatusLabel(data.statusLabel ?? "активен");
    setStatusReason(data.statusReason ?? "");
    setLoaded(true);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function submit() {
    setError("");
    setNotice("");
    if (message.trim().length < 20) {
      setError("Опишите ситуацию подробнее (минимум 20 символов)");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, subject: subject.trim(), message: message.trim() }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(body.error ?? "Не удалось отправить тикет");
      return;
    }
    setMessage("");
    setSubject("");
    setNotice("Тикет отправлен — администрация ответит здесь же ✅");
    load();
  }

  if (!loaded) {
    return <section className="flex flex-1 items-center justify-center px-6 py-20 text-zinc-400">Загрузка…</section>;
  }

  if (!authed) {
    return (
      <section className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-20 text-center">
        <p className="text-zinc-400">Тикеты доступны после входа.</p>
        <Link href="/login" className="btn btn-primary text-sm">Войти</Link>
      </section>
    );
  }

  const restricted = accountStatus === "frozen" || accountStatus === "blocked";

  return (
    <section className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <h1 className="text-3xl font-extrabold text-white">Тикеты</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Обращения к администрации: оспаривание модерации, вопросы, жалобы. Ответ появится здесь же.
      </p>

      {/* Баннер при заморозке/блокировке */}
      {restricted && (
        <div className={`mt-6 rounded-2xl border p-6 ${accountStatus === "blocked" ? "border-red-400/30 bg-red-500/10" : "border-amber-300/30 bg-amber-500/10"}`}>
          <h2 className={`text-lg font-bold ${accountStatus === "blocked" ? "text-red-300" : "text-amber-200"}`}>
            {accountStatus === "blocked" ? "🔒 Аккаунт заблокирован" : "🧊 Аккаунт заморожен"}
          </h2>
          {statusReason && (
            <p className="mt-2 text-sm text-zinc-300">
              <span className="font-semibold">Причина:</span> {statusReason}
            </p>
          )}
          <p className="mt-2 text-sm text-zinc-400">
            Считаете это ошибкой? Подайте тикет ниже — администрация рассмотрит его.
          </p>
        </div>
      )}

      {notice && <div className="mt-4 rounded-xl border border-lime-300/30 bg-lime-300/10 px-4 py-3 text-sm text-lime-200">{notice}</div>}
      {error && <div className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</div>}

      {/* Форма нового тикета */}
      <div className="card mt-6 p-6">
        <h2 className="font-bold text-white">Новый тикет</h2>
        <div className="mt-4 flex gap-2">
          {(
            [
              ["appeal", "⚖️ Оспорить модерацию"],
              ["other", "💬 Другое"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setType(id)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                type === id
                  ? "border-lime-300/50 bg-lime-300/15 text-lime-200"
                  : "border-white/10 bg-white/[0.03] text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Тема (необязательно)"
          className="mt-4 w-full rounded-xl border border-white/10 bg-zinc-900/70 px-4 py-3 text-white outline-none transition-colors focus:border-indigo-400"
        />
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Опишите ситуацию: за что вынесено наказание, почему считаете его несправедливым…"
          className="mt-3 min-h-32 w-full rounded-xl border border-white/10 bg-zinc-900/70 px-4 py-3 text-white outline-none transition-colors focus:border-indigo-400"
        />
        <div className="mt-2 text-right text-xs text-zinc-600">{message.length}/3000</div>
        <button onClick={submit} disabled={busy} className="btn btn-primary mt-3 w-full disabled:opacity-50">
          {busy ? "Отправляю…" : "Отправить тикет"}
        </button>
      </div>

      {/* Список тикетов */}
      <h2 className="mt-10 text-lg font-bold text-white">Мои тикеты</h2>
      <div className="mt-4 space-y-4">
        {tickets.length === 0 && <p className="text-sm text-zinc-500">Тикетов пока нет.</p>}
        {tickets.map((t) => (
          <div key={t.id} className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-white">{t.subject}</span>
              <span className={`rounded-full border px-2.5 py-1 text-xs ${STATUS_BADGE[t.status].cls}`}>
                {STATUS_BADGE[t.status].text}
              </span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-400">{t.message}</p>
            {t.adminReply && (
              <div className="mt-3 rounded-lg border border-indigo-400/30 bg-indigo-500/10 p-3 text-sm text-indigo-200">
                <span className="font-semibold">Ответ администрации{t.handledBy ? ` (${t.handledBy})` : ""}:</span> {t.adminReply}
              </div>
            )}
            <div className="mt-2 text-xs text-zinc-600">{new Date(t.createdAt).toLocaleString("ru-RU")}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
