"use client";

import { useState } from "react";

/** Поле реквизита с кнопкой копирования. */
export default function CopyField({ label, value, valueHref, mono }: { label: string; value: string; valueHref?: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-black/30 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
        {valueHref ? (
          <a href={valueHref} className={`text-lg font-semibold text-lime-300 ${mono ? "tracking-wider" : ""}`}>
            {value}
          </a>
        ) : (
          <code className={`select-all text-lg font-semibold text-lime-300 ${mono ? "tracking-wider" : ""}`}>{value}</code>
        )}
      </div>
      <button onClick={copy} type="button" className="btn btn-ghost shrink-0 !py-2 text-xs">
        {copied ? "Скопировано!" : "Скопировать"}
      </button>
    </div>
  );
}
