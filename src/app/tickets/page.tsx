"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import TicketChat from "@/components/TicketChat";

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
  const [statusAt, setStatusAt] = useState<string | null>(null);
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
    setStatusAt(data.statusAt ?? null);
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
    <section className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="text-2xl font-extrabold text-white sm:text-3xl">Тикеты</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Обращения к администрации: оспаривание модерации, вопросы, жалобы. Ответ появится здесь же.
      </p>

      {/* Карточка наказания: что применили, когда и за что */}
      {restricted && (
        <div className={`mt-6 rounded-2xl border p-5 sm:p-6 ${accountStatus === "blocked" ? "border-red-400/30 bg-red-500/10" : "border-amber-300/30 bg-amber-500/10"}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className={`text-lg font-bold ${accountStatus === "blocked" ? "text-red-300" : "text-amber-200"}`}>
              {accountStatus === "blocked" ? "🔒 Аккаунт заблокирован" : "🧊 Аккаунт заморожен"}
            </h2>
            <span className={`rounded-full border px-3 py-1 text-xs font-medium ${accountStatus === "blocked" ? "border-red-400/40 bg-red-400/10 text-red-200" : "border-amber-300/40 bg-amber-300/10 text-amber-200"}`}>
              Наказание: {accountStatus === "blocked" ? "блокировка" : "заморозка"}
            </span>
          </div>
          {statusAt && (
            <p className="mt-2 text-xs text-zinc-400">Дата: {new Date(statusAt).toLocaleString("ru-RU")}</p>
          )}
          {statusReason && (
            <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-300">
              <span className="font-semibold">Причина:</span> {statusReason}
            </p>
          )}
          <p className="mt-2 text-sm text-zinc-400">
            Считаете это ошибкой? Нажмите «Оспорить» — заполнится тикет к администрации.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              onClick={() => {
                setType("appeal");
                setSubject(accountStatus === "blocked" ? "Оспаривание блокировки" : "Оспаривание заморозки");
                if (!message.trim()) setMessage(`Считаю ${accountStatus === "blocked" ? "блокировку" : "заморозку"} аккаунта несправедливой. Причина наказания: «${statusReason}». Прошу разобраться и снять наказание.`);
                document.getElementById("new-ticket-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="btn btn-primary text-sm"
            >
              ⚖️ Оспорить
            </button>
            <button
              onClick={() => {
                setType("other");
                setSubject("Обращение к модерации");
                document.getElementById("new-ticket-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="btn btn-ghost text-sm"
            >
              💬 Обращение к модерации
            </button>
          </div>
        </div>
      )}

      {notice && <div className="mt-4 rounded-xl border border-lime-300/30 bg-lime-300/10 px-4 py-3 text-sm text-lime-200">{notice}</div>}
      {error && <div className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</div>}

      {/* Форма нового тикета */}
      <div id="new-ticket-form" className="card mt-6 scroll-mt-24 p-5 sm:p-6">
        <h2 className="font-bold text-white">Новый тикет</h2>
        <div className="mt-4 flex flex-wrap gap-2">
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
      <h2 className="mt-8 text-lg font-bold text-white sm:mt-10">Мои тикеты</h2>
      <div className="mt-4 space-y-4">
        {tickets.length === 0 && <p className="text-sm text-zinc-500">Тикетов пока нет.</p>}
        {tickets.map((t) => (
          <div key={t.id} className="card p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
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
            <TicketChat
              ticketId={t.id}
              meRole="user"
              peerLabel="Администрация"
              initialUserMessage={{ body: t.message, createdAt: t.createdAt }}
              legacyAdminReply={t.adminReply ? { body: t.adminReply, author: t.handledBy } : null}
              onSent={load}
            />
            <div className="mt-2 text-xs text-zinc-600">{new Date(t.createdAt).toLocaleString("ru-RU")}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
