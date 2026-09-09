"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

/** Онбординг после входа через Google: подтвердить/изменить юзернейм и имя. */
export default function OnboardingPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.user) {
          router.push("/login");
          return;
        }
        setUsername(d.user.username ?? "");
        setDisplayName(d.user.displayName ?? "");
        if (!d.user.needsProfile) {
          // Профиль уже полный — онбординг не нужен
          router.push("/cabinet");
          return;
        }
        setLoading(false);
      })
      .catch(() => router.push("/login"));
  }, [router]);

  async function save() {
    setError("");
    setSaving(true);
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, displayName }),
    });
    const body = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(body.error ?? "Не удалось сохранить");
      return;
    }
    router.push("/cabinet?welcome=1");
    router.refresh();
  }

  const input =
    "w-full rounded-xl border border-white/10 bg-zinc-900/70 px-4 py-3 text-white outline-none transition-colors focus:border-indigo-400";

  return (
    <section className="relative flex flex-1 items-center justify-center px-6 py-14">
      <div className="glow left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 bg-violet-500" />
      <div className="card relative w-full max-w-md p-8">
        {loading ? (
          <p className="text-sm text-zinc-400">Загружаем профиль…</p>
        ) : (
          <>
            <h1 className="text-2xl font-extrabold text-white">Почти готово!</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Подтвердите ваш юзернейм (по нему вас найдут другие пользователи) и имя,
              которое будет отображаться над юзернеймом. Позже их можно менять раз в сутки.
            </p>
            <div className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-sm text-zinc-400">Юзернейм (для поиска)</span>
                <input value={username} onChange={(e) => setUsername(e.target.value)} className={input} placeholder="my_username" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm text-zinc-400">Имя (отображается над юзернеймом)</span>
                <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={input} placeholder="Иван Петров" />
              </label>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <button onClick={save} disabled={saving} className="btn btn-primary w-full disabled:opacity-50">
                {saving ? "Сохраняем…" : "Продолжить"}
              </button>
              <p className="text-center text-xs text-zinc-500">
                Можно пропустить и заполнить позже в{" "}
                <Link href="/cabinet" className="text-lime-300 hover:underline">
                  личном кабинете
                </Link>
              </p>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
