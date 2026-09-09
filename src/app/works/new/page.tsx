"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type TypeInfo = { id: string; label: string };

const input =
  "w-full rounded-xl border border-white/10 bg-zinc-900/70 px-4 py-3 text-white outline-none transition-colors focus:border-indigo-400";

export default function NewWorkPage() {
  const router = useRouter();
  const [types, setTypes] = useState<TypeInfo[]>([]);
  const [type, setType] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [details, setDetails] = useState("");
  const [team, setTeam] = useState("");
  const [stack, setStack] = useState("");
  const [budget, setBudget] = useState("");
  const [potential, setPotential] = useState("");
  const [links, setLinks] = useState<{ label: string; url: string }[]>([{ label: "", url: "" }]);
  const [verifyUrl, setVerifyUrl] = useState("");
  const [created, setCreated] = useState<{ id: string; verifyToken: string; verifyStatus: string; verifyNote: string } | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.user) router.push("/login");
      });
    fetch("/api/works")
      .then((r) => r.json())
      .then((d) => {
        setTypes(d.types ?? []);
        if (d.types?.length) setType(d.types[0].id);
      })
      .catch(() => {});
  }, [router]);

  async function submit() {
    setError("");
    setSaving(true);
    const res = await fetch("/api/works", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, title, summary, details, team, stack, budget, potential, links, verifyUrl }),
    });
    const body = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(body.error ?? "Не удалось создать работу");
      return;
    }
    setCreated(body.work);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (created) {
    return (
      <section className="mx-auto w-full max-w-2xl flex-1 px-6 py-14">
        <div className="card p-8">
          <h1 className="text-2xl font-extrabold text-white">Работа создана! 🎉</h1>

          {created.verifyStatus === "verified" ? (
            <div className="mt-4 rounded-xl border border-lime-300/30 bg-lime-300/10 px-5 py-4 text-sm text-lime-200">
              ✅ Авторство подтверждено автоматически — код найден по вашей ссылке.
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-amber-300/30 bg-amber-300/10 px-5 py-4 text-sm text-amber-200">
              ⏳ {created.verifyNote || "Требуется подтверждение авторства."} После размещения кода нажмите «Проверить» в кабинете — или подтвердим вручную.
            </div>
          )}

          <h2 className="mt-6 font-semibold text-white">Как подтвердить авторство</h2>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-zinc-400">
            <li>Скопируйте код ниже.</li>
            <li>Вставьте его туда, где доказывается ваше авторство: в README репозитория, описание проекта, закреплённый пост канала и т.п.</li>
            <li>В кабинете укажите ссылку на это место и нажмите «Проверить код сейчас».</li>
          </ol>
          <div className="mt-4 rounded-xl border border-white/10 bg-black/40 p-4">
            <code className="select-all break-all text-lime-300">{created.verifyToken}</code>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => {
                navigator.clipboard.writeText(created.verifyToken);
                setCreated({ ...created, verifyNote: "Код скопирован!" });
              }}
              className="btn btn-ghost flex-1 text-sm"
            >
              Скопировать код
            </button>
            <button onClick={() => router.push("/cabinet")} className="btn btn-primary flex-1 text-sm">
              В личный кабинет
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <h1 className="text-3xl font-extrabold text-white">Новая работа</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Заполните пункты — так заинтересованные люди смогут подробно узнать о проекте.
      </p>

      <div className="card mt-8 space-y-5 p-6">
        <div>
          <label className="mb-1.5 block text-sm text-zinc-400">Тип работы</label>
          <select value={type} onChange={(e) => setType(e.target.value)} className={input}>
            {types.map((t) => (
              <option key={t.id} value={t.id} className="bg-zinc-900">
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-zinc-400">Название *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={input} placeholder="Интернет-магазин на Next.js" />
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-zinc-400">Краткое описание * (20–400 символов)</label>
          <textarea value={summary} onChange={(e) => setSummary(e.target.value)} className={`${input} min-h-20`} placeholder="О чём проект в двух предложениях" />
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-zinc-400">Как сделано * (подробно: минимум 50 символов)</label>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            className={`${input} min-h-40`}
            placeholder="Что сделали, какие возникли сложности, как решили, что получилось в итоге…"
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm text-zinc-400">С кем сделано</label>
            <input value={team} onChange={(e) => setTeam(e.target.value)} className={input} placeholder="Соло / с дизайнером @name" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-zinc-400">Инструменты и технологии</label>
            <input value={stack} onChange={(e) => setStack(e.target.value)} className={input} placeholder="Next.js, PostgreSQL, Tailwind" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-zinc-400">Сколько вложил (время/деньги)</label>
            <input value={budget} onChange={(e) => setBudget(e.target.value)} className={input} placeholder="2 недели, 30 000 ₽" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-zinc-400">Перспектива (что может принести)</label>
            <input value={potential} onChange={(e) => setPotential(e.target.value)} className={input} placeholder="Рост продаж, портфолио, монетизация…" />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-zinc-400">Ссылки на работу * (до 3: сайт, репозиторий, кейс)</label>
          <div className="space-y-3">
            {links.map((l, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={l.label}
                  onChange={(e) => setLinks(links.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                  className={input}
                  placeholder="Что это (Демо / GitHub)"
                />
                <input
                  value={l.url}
                  onChange={(e) => setLinks(links.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))}
                  className={input}
                  placeholder="https://…"
                />
                {links.length > 1 && (
                  <button onClick={() => setLinks(links.filter((_, j) => j !== i))} className="rounded-xl border border-white/10 px-3 text-red-400 hover:bg-white/5" aria-label="Удалить ссылку">
                    ✕
                  </button>
                )}
              </div>
            ))}
            {links.length < 3 && (
              <button onClick={() => setLinks([...links, { label: "", url: "" }])} className="text-sm text-lime-300 hover:underline">
                + Ещё ссылка
              </button>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/30 p-4">
          <label className="mb-1.5 block text-sm font-medium text-white">Подтверждение авторства</label>
          <p className="text-xs leading-relaxed text-zinc-400">
            После создания работы вы получите уникальный код. Вставьте его в README репозитория, описание проекта
            или закреплённый пост — и укажите здесь ссылку на это место. Сервис сам проверит код и подтвердит авторство.
            Закрытые страницы проверяет владелец сервиса вручную.
          </p>
          <input value={verifyUrl} onChange={(e) => setVerifyUrl(e.target.value)} className={`${input} mt-3`} placeholder="https://github.com/you/project (где будет код)" />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
        <button onClick={submit} disabled={saving} className="btn btn-primary w-full disabled:opacity-50">
          {saving ? "Создаём…" : "Создать работу"}
        </button>
      </div>
    </section>
  );
}
