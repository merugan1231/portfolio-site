"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type Review = {
  id: string;
  stars: number;
  text: string;
  status: string;
  createdAt: string;
};

type Work = {
  id: string;
  type: string;
  typeCustom?: string;
  title: string;
  summary: string;
  details: string;
  team: string;
  stack: string;
  budget: string;
  potential: string;
  links: { label: string; url: string }[];
  verifyStatus: "unverified" | "pending" | "verified";
  createdAt: string;
  rating: { avg: number; count: number };
};

const TYPE_LABELS: Record<string, string> = {
  site: "Сайт / лендинг", webapp: "Веб-приложение", bot: "Телеграм-бот", mobile: "Мобильное приложение",
  osint: "OSINT-расследование", design: "Дизайн / иллюстрация", script: "Скрипт / автоматизация", custom: "Свой вариант",
};

function Stars({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange?.(n)}
          className={`text-2xl transition-transform ${onChange ? "hover:scale-125" : ""} ${n <= value ? "text-amber-300" : "text-zinc-600"}`}
          aria-label={`${n} звёзд`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function WorkPage() {
  const { id } = useParams<{ id: string }>();
  const [work, setWork] = useState<Work | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [me, setMe] = useState<{ login: string; username: string | null } | null>(null);
  const [viewerIsOwner, setViewerIsOwner] = useState(false);
  const [stars, setStars] = useState(5);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [disputeFor, setDisputeFor] = useState<string | null>(null);
  const [disputeText, setDisputeText] = useState("");

  const load = useCallback(async () => {
    const w = await fetch(`/api/works/${id}`).then((r) => r.json());
    if (w.work) setWork({ ...w.work, rating: w.rating });
    setReviews(w.reviews ?? []);
    setViewerIsOwner(!!w.viewerIsOwner);
    const m = await fetch("/api/auth/me").then((r) => r.json());
    setMe(m.user);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function submitReview() {
    setError("");
    setNotice("");
    const res = await fetch(`/api/works/${id}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stars, text }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.error ?? "Не удалось отправить отзыв");
      return;
    }
    setNotice("Спасибо! Отзыв опубликован.");
    setText("");
    setStars(5);
    load();
  }

  async function submitDispute(reviewId: string) {
    setError("");
    const res = await fetch(`/api/reviews/${reviewId}/dispute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ disputeReason: disputeText }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.error ?? "Не удалось отправить спор");
      return;
    }
    setNotice("Спор отправлен на рассмотрение владельцу сервиса.");
    setDisputeFor(null);
    setDisputeText("");
    load();
  }

  if (!work) {
    return <section className="flex flex-1 items-center justify-center px-6 py-20 text-zinc-400">Загрузка…</section>;
  }

  const isOwner = viewerIsOwner;

  return (
    <section className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <div className="text-xs uppercase tracking-wide text-zinc-500">
        {work.type === "custom" && work.typeCustom ? work.typeCustom : (TYPE_LABELS[work.type] ?? work.type)}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold text-white sm:text-3xl">{work.title}</h1>
        {work.verifyStatus === "verified" && (
          <span className="rounded-full border border-lime-300/30 bg-lime-300/10 px-3 py-1 text-xs text-lime-200">
            ✅ Авторство подтверждено
          </span>
        )}
        {work.verifyStatus === "pending" && (
          <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs text-amber-200">
            ⏳ Авторство на проверке
          </span>
        )}
      </div>

      <div className="mt-2 flex items-center gap-3 text-sm">
        <Stars value={Math.round(work.rating.avg)} />
        <span className="text-zinc-400">
          {work.rating.count ? `${work.rating.avg} из 5 · ${work.rating.count} оценок` : "Пока нет оценок"}
        </span>
      </div>

      <p className="mt-5 text-lg leading-relaxed text-zinc-300">{work.summary}</p>

      {work.links.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-3">
          {work.links.map((l) => (
            <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost !py-2 text-sm">
              {l.label} ↗
            </a>
          ))}
        </div>
      )}

      <div className="card mt-8 p-5 sm:p-6">
        <h2 className="font-bold text-white">Как это было сделано</h2>
        <p className="mt-3 whitespace-pre-line leading-relaxed text-zinc-300">{work.details}</p>
        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          {work.team && (
            <div>
              <dt className="text-xs uppercase tracking-wide text-zinc-500">С кем сделано</dt>
              <dd className="mt-1 text-sm text-zinc-300">{work.team}</dd>
            </div>
          )}
          {work.stack && (
            <div>
              <dt className="text-xs uppercase tracking-wide text-zinc-500">Инструменты</dt>
              <dd className="mt-1 text-sm text-zinc-300">{work.stack}</dd>
            </div>
          )}
          {work.budget && (
            <div>
              <dt className="text-xs uppercase tracking-wide text-zinc-500">Вложения</dt>
              <dd className="mt-1 text-sm text-zinc-300">{work.budget}</dd>
            </div>
          )}
          {work.potential && (
            <div>
              <dt className="text-xs uppercase tracking-wide text-zinc-500">Перспектива</dt>
              <dd className="mt-1 text-sm text-zinc-300">{work.potential}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Отзывы */}
      <div className="mt-10">
        <h2 className="text-xl font-bold text-white">Отзывы</h2>

        {notice && <div className="mt-3 rounded-xl border border-lime-300/30 bg-lime-300/10 px-4 py-3 text-sm text-lime-200">{notice}</div>}
        {error && <div className="mt-3 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</div>}

        {me ? (
          <div className="card mt-4 p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Ваша оценка</span>
              <Stars value={stars} onChange={setStars} />
            </div>
            {stars < 4 && (
              <p className="mt-2 text-xs text-amber-300">
                При оценке ниже 4 звёзд обязательно объясните, что именно не так (от 30 символов).
              </p>
            )}
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="mt-3 min-h-24 w-full rounded-xl border border-white/10 bg-zinc-900/70 px-4 py-3 text-white outline-none focus:border-indigo-400"
              placeholder={stars < 4 ? "Что именно не так? Опишите подробно…" : "Что понравилось? (необязательно)"}
            />
            <button onClick={submitReview} className="btn btn-primary mt-3 text-sm">
              Отправить отзыв
            </button>
          </div>
        ) : (
          <p className="mt-4 text-sm text-zinc-400">
            <Link href="/login" className="text-lime-300 hover:underline">
              Войдите
            </Link>
            , чтобы оценить работу.
          </p>
        )}

        <div className="mt-6 space-y-4">
          {reviews.length === 0 && <p className="text-sm text-zinc-500">Отзывов пока нет — будьте первым.</p>}
          {reviews.map((r) => (
            <div key={r.id} className="card p-5">
              <div className="flex items-center justify-between">
                <Stars value={r.stars} />
                <span className="text-xs text-zinc-500">{new Date(r.createdAt).toLocaleDateString("ru-RU")}</span>
              </div>
              {r.text && <p className="mt-2 whitespace-pre-line text-sm text-zinc-300">{r.text}</p>}
              {isOwner && r.status === "published" && (
                disputeFor === r.id ? (
                  <div className="mt-3 rounded-xl border border-white/10 bg-black/30 p-3">
                    <textarea
                      value={disputeText}
                      onChange={(e) => setDisputeText(e.target.value)}
                      className="min-h-20 w-full rounded-lg border border-white/10 bg-zinc-900/70 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400"
                      placeholder="Почему вы считаете оценку необоснованной? (от 20 символов — увидит владелец сервиса)"
                    />
                    <div className="mt-2 flex gap-2">
                      <button onClick={() => submitDispute(r.id)} className="btn btn-primary !py-1.5 text-xs">
                        Отправить спор
                      </button>
                      <button onClick={() => setDisputeFor(null)} className="btn btn-ghost !py-1.5 text-xs">
                        Отмена
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setDisputeFor(r.id)} className="mt-2 text-xs text-amber-300 hover:underline">
                    Оспорить оценку
                  </button>
                )
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
