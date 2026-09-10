"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login, password }),
    });
    const body = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(body.error ?? "Ошибка входа");
      return;
    }
    // Админ — в панель; без юзернейма — в онбординг; остальные — на главную
    router.push(body.redirect ?? (body.role === "admin" ? "/admin" : "/"));
    router.refresh();
  };

  return (
    <section className="relative flex flex-1 items-center justify-center px-4 py-10 sm:px-6 sm:py-16">
      <div className="glow left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 bg-indigo-500" />
      <div className="card relative w-full max-w-md p-6 sm:p-8">
        <h1 className="text-3xl font-extrabold text-white">Вход</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Введите логин и пароль. Администратор попадёт в панель управления.
        </p>

        <div className="mt-8 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm text-zinc-400">Логин</span>
            <input
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              className="w-full rounded-xl border border-white/10 bg-zinc-900/70 px-4 py-3 text-white outline-none transition-colors focus:border-indigo-400"
              autoComplete="username"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm text-zinc-400">Пароль</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              className="w-full rounded-xl border border-white/10 bg-zinc-900/70 px-4 py-3 text-white outline-none transition-colors focus:border-indigo-400"
              autoComplete="current-password"
            />
          </label>
        </div>

        {error ? (
          <p className="mt-4 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
            {error}
          </p>
        ) : null}

        <button onClick={submit} disabled={loading} className="btn btn-primary mt-6 w-full">
          {loading ? "Вхожу…" : "Войти"}
        </button>

        <p className="mt-6 text-center text-sm text-zinc-500">
          Нет аккаунта?{" "}
          <Link href="/register" className="text-lime-300 hover:underline">
            Зарегистрироваться
          </Link>
        </p>
      </div>
    </section>
  );
}
