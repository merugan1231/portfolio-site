"use client";

import { useState } from "react";

export default function ReceiptForm() {
  const [months, setMonths] = useState("1");
  const [payerName, setPayerName] = useState("");
  const [receiptUrl, setReceiptUrl] = useState("");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setOk("");
    setBusy(true);
    const res = await fetch("/api/pro-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ months: Number(months), payerName, receiptUrl, comment }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      if (res.status === 401) {
        setError("Войдите, чтобы отправить заявку на Pro.");
        return;
      }
      setError(body.error ?? "Не удалось отправить заявку");
      return;
    }
    setOk("Заявка отправлена! После проверки Pro активируется автоматически — статус виден в кабинете.");
    setPayerName("");
    setReceiptUrl("");
    setComment("");
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-sm text-zinc-400">Срок подписки</span>
        <select
          value={months}
          onChange={(e) => setMonths(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-zinc-900/70 px-4 py-3 text-white outline-none transition-colors focus:border-indigo-400"
        >
          <option value="1">1 месяц — 499 ₽</option>
          <option value="2">2 месяца — 998 ₽</option>
          <option value="3">3 месяца — 1 497 ₽</option>
          <option value="6">6 месяцев — 2 994 ₽</option>
          <option value="12">12 месяцев — 5 988 ₽</option>
        </select>
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm text-zinc-400">Имя плательщика (как в переводе) *</span>
        <input
          value={payerName}
          onChange={(e) => setPayerName(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-zinc-900/70 px-4 py-3 text-white outline-none transition-colors focus:border-indigo-400"
          placeholder="Иван И."
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm text-zinc-400">Ссылка на скрин чека *</span>
        <input
          value={receiptUrl}
          onChange={(e) => setReceiptUrl(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-zinc-900/70 px-4 py-3 text-white outline-none transition-colors focus:border-indigo-400"
          placeholder="https://… (скрин перевода)"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm text-zinc-400">Комментарий (необязательно)</span>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="min-h-20 w-full rounded-xl border border-white/10 bg-zinc-900/70 px-4 py-3 text-white outline-none transition-colors focus:border-indigo-400"
          placeholder="Например: перевёл через СБП с карты Т-Банка"
        />
      </label>

      {ok && <div className="rounded-xl border border-lime-300/30 bg-lime-300/10 px-4 py-3 text-sm text-lime-200">{ok}</div>}
      {error && <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</div>}

      <button type="submit" disabled={busy} className="btn btn-primary w-full disabled:opacity-50">
        {busy ? "Отправляю…" : "Отправить на проверку"}
      </button>
    </form>
  );
}
