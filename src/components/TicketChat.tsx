"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ChatMessage = {
  id: number;
  ticketId?: string;
  authorRole: "user" | "admin";
  author: string;
  body: string;
  createdAt: string;
};

type Props = {
  ticketId: string;
  /** Роль того, кто смотрит страницу: "user" — владелец тикета, "admin" — админка */
  meRole: "user" | "admin";
  /** Подпись сообщений пользователя (для админки — логин автора тикета) */
  peerLabel: string;
  /** Первое сообщение тикета (текст заявки) — рисуется первым пузырём */
  initialUserMessage?: { body: string; createdAt?: string } | null;
  /** Ответ администрации из старого поля admin_reply (тикетам до введения переписки) */
  legacyAdminReply?: { body: string; author?: string } | null;
  /** Вызывается после успешной отправки (например, чтобы обновить статусы тикетов) */
  onSent?: () => void;
};

/**
 * Переписка по тикету: пользователь ↔ админ, любое число сообщений.
 * Свёрнута по умолчанию; в развёрнутом виде подгружает историю и
 * подтягивает новые сообщения каждые 10 секунд.
 */
export default function TicketChat({ ticketId, meRole, peerLabel, initialUserMessage, legacyAdminReply, onSent }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const boxRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/tickets/${ticketId}/messages`);
    if (!res.ok) return;
    const data = await res.json().catch(() => ({}));
    setMessages(data.messages ?? []);
    setLoaded(true);
  }, [ticketId]);

  // Загружаем при открытии и подтягиваем новые сообщения, пока переписка развёрнута
  useEffect(() => {
    if (!open) return;
    load();
    const iv = setInterval(load, 10000);
    return () => clearInterval(iv);
  }, [open, load]);

  // Автопрокрутка вниз при появлении новых сообщений
  useEffect(() => {
    if (open && boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight;
  }, [open, messages.length]);

  async function send() {
    const body = text.trim();
    if (body.length < 2 || busy) return;
    setBusy(true);
    setError("");
    const res = await fetch(`/api/tickets/${ticketId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Не удалось отправить сообщение");
      return;
    }
    setText("");
    await load();
    onSent?.();
  }

  // Старые данные (текст заявки и legacy-ответ) как первые пузыри переписки
  const pseudo: ChatMessage[] = [];
  if (initialUserMessage?.body) {
    pseudo.push({
      id: -1,
      authorRole: "user",
      author: "user",
      body: initialUserMessage.body,
      createdAt: initialUserMessage.createdAt ?? "",
    });
  }
  if (legacyAdminReply?.body) {
    pseudo.push({
      id: -2,
      authorRole: "admin",
      author: legacyAdminReply.author ?? "",
      body: legacyAdminReply.body,
      createdAt: "",
    });
  }

  const all = [...pseudo, ...messages];

  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:text-white"
      >
        💬 Переписка{loaded && messages.length > 0 ? ` (${messages.length})` : ""}
        <span className="text-zinc-500">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="mt-3">
          <div ref={boxRef} className="max-h-80 space-y-3 overflow-y-auto rounded-xl border border-white/10 bg-black/20 p-3">
            {all.map((m) => {
              const mine = m.authorRole === meRole;
              const name =
                m.authorRole === "admin"
                  ? meRole === "admin"
                    ? mine
                      ? "Вы"
                      : m.author || "Администрация"
                    : "Администрация"
                  : mine
                    ? "Вы"
                    : peerLabel;
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl border px-3.5 py-2.5 text-sm ${
                      mine ? "border-lime-300/30 bg-lime-300/10 text-lime-100" : "border-white/10 bg-white/[0.04] text-zinc-200"
                    }`}
                  >
                    <div className="text-xs text-zinc-500">
                      {name}
                      {m.createdAt ? ` · ${new Date(m.createdAt).toLocaleString("ru-RU")}` : ""}
                    </div>
                    <div className="mt-1 whitespace-pre-wrap break-words">{m.body}</div>
                  </div>
                </div>
              );
            })}
            {!loaded && <p className="text-sm text-zinc-500">Загрузка переписки…</p>}
          </div>

          <div className="mt-2 flex gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Написать сообщение…"
              rows={1}
              className="min-h-11 flex-1 resize-y rounded-xl border border-white/10 bg-zinc-900/70 px-3.5 py-2.5 text-sm text-white outline-none transition-colors focus:border-indigo-400"
            />
            <button
              onClick={send}
              disabled={busy || text.trim().length < 2}
              className="btn btn-primary !px-4 !py-2 text-xs disabled:opacity-50"
            >
              {busy ? "…" : "Отправить"}
            </button>
          </div>
          <div className="mt-1 text-right text-xs text-zinc-600">{text.length}/3000 · Enter — отправить</div>
          {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
        </div>
      )}
    </div>
  );
}
