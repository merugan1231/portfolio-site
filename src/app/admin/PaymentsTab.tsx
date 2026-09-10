"use client";

import { useState } from "react";
import type { PaymentReceipt } from "./types";

export default function PaymentsTab({ receipts, onAction }: { receipts: PaymentReceipt[]; onAction: () => void }) {
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function handle(id: string, action: "approve" | "reject") {
    setBusy(id);
    setError("");
    const res = await fetch("/api/admin/pro-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action, reply: reply || undefined }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(null);
    setReply("");
    if (!res.ok) setError(body.error ?? "Ошибка обработки заявки");
    else onAction();
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-white">Заявки на Pro (чеки об оплате)</h2>
      <p className="text-sm text-zinc-500">
        Откройте ссылку на чек, сверьте сумму и имя плательщика. «Подтвердить» — Pro активируется пользователю автоматически.
      </p>
      {error && <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</div>}
      {receipts.length === 0 && <p className="text-sm text-zinc-500">Заявок пока нет 🎉</p>}
      {receipts.map((r) => (
        <div key={r.id} className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="font-semibold text-white">{r.userLogin}</span>
              <span className="ml-2 text-sm text-zinc-300">
                {r.months} мес · {r.amount.toLocaleString("ru-RU")} ₽ · плательщик: <span className="text-zinc-100">{r.payerName}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              {r.status === "pending" && <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2.5 py-1 text-xs text-amber-200">на проверке</span>}
              {r.status === "approved" && <span className="rounded-full border border-lime-300/30 bg-lime-300/10 px-2.5 py-1 text-xs text-lime-200">подтверждён</span>}
              {r.status === "rejected" && <span className="rounded-full border border-zinc-500/30 bg-zinc-500/10 px-2.5 py-1 text-xs text-zinc-400">отклонён</span>}
              <span className="text-xs text-zinc-600">{new Date(r.createdAt).toLocaleString("ru-RU")}</span>
            </div>
          </div>

          {r.receiptUrl && (
            <a
              href={r.receiptUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="mt-2 inline-block text-sm font-medium text-lime-300 underline-offset-2 hover:underline"
            >
              🧾 Открыть чек ↗
            </a>
          )}
          {r.comment && <p className="mt-2 text-sm text-zinc-400">Комментарий: {r.comment}</p>}
          {r.adminReply && (
            <p className="mt-2 rounded-lg border border-indigo-400/20 bg-indigo-500/10 p-3 text-sm text-indigo-200">
              Решение ({r.handledBy}): {r.adminReply}
            </p>
          )}

          {r.status === "pending" && (
            <div className="mt-3">
              <input
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Комментарий (при отклонении — причина, минимум 5 символов)"
                className="w-full rounded-xl border border-white/10 bg-zinc-900/70 px-4 py-2.5 text-sm text-white outline-none transition-colors focus:border-indigo-400"
              />
              <div className="mt-2 flex gap-3">
                <button disabled={busy === r.id} onClick={() => handle(r.id, "approve")} className="btn btn-primary !py-2 text-xs disabled:opacity-50">
                  ✅ Подтвердить и выдать Pro
                </button>
                <button disabled={busy === r.id} onClick={() => handle(r.id, "reject")} className="btn btn-ghost !py-2 text-xs !text-red-400 disabled:opacity-50">
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
