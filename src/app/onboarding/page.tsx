"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

/**
 * Онбординг после любой регистрации (email или Google):
 * — Юзернейм: обязателен, закрепляется ОДИН раз и не меняется.
 * — Имя: необязательно, можно изменить позже (раз в сутки).
 * Есть галочки «Заполню позже» для быстрого входа.
 */
export default function OnboardingPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [skipName, setSkipName] = useState(false);
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
        if (d.user.username) {
          // Юзернейм уже закреплён — онбординг не нужен
          router.push("/cabinet");
          return;
        }
        setLoading(false);
      })
      .catch(() => router.push("/login"));
  }, [router]);

  async function save() {
    setError("");
    if (!skipName && displayName.trim() && displayName.trim().length < 2) {
      setError("Имя: минимум 2 символа (или отметьте «Заполню позже»)");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: username.trim(),
        displayName: skipName ? undefined : displayName.trim(),
      }),
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
            <h1 className="text-2xl font-extrabold text-white">Последний шаг</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Выберите юзернейм — по нему вас найдут другие пользователи.
            </p>

            <div className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-sm text-zinc-400">Юзернейм</span>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && username.trim() && save()}
                  className={input}
                  placeholder="ivan_dev"
                  autoComplete="off"
                  autoFocus
                />
                <span className="mt-1.5 block rounded-lg border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-xs leading-relaxed text-amber-200">
                  ⚠️ Юзернейм закрепляется за аккаунтом <strong>один раз</strong> — изменить его
                  после подтверждения не получится. Выбирайте внимательно.
                </span>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm text-zinc-400">
                  Имя <span className="text-zinc-600">(необязательно, высветится над юзернеймом)</span>
                </span>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className={input}
                  placeholder="Иван Петров"
                  disabled={skipName}
                  autoComplete="name"
                />
              </label>

              {/* Галочка «Заполню позже» — только для имени */}
              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-zinc-400">
                <input
                  type="checkbox"
                  checked={skipName}
                  onChange={(e) => setSkipName(e.target.checked)}
                  className="h-4 w-4 accent-lime-400"
                />
                Заполню позже
              </label>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <button
                onClick={save}
                disabled={saving || !username.trim()}
                className="btn btn-primary w-full disabled:opacity-50"
              >
                {saving ? "Сохраняем…" : "Завершить регистрацию"}
              </button>

              <p className="text-center text-xs text-zinc-500">
                Юзернейм обязателен. Имя можно заполнить позже в{" "}
                <Link href="/cabinet" className="text-lime-300 hover:underline">
                  личном кабинете
                </Link>
                .
              </p>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
