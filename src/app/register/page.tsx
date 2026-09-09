"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

type Step = "form" | "code";
type ProviderInfo = { id: string; label: string; short: string };

function RegisterInner() {
  const router = useRouter();
  const search = useSearchParams();

  const [step, setStep] = useState<Step>("form");
  const [login, setLogin] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);

  // Ошибка из URL (например, от OAuth-заглушки)
  useEffect(() => {
    const err = search.get("error");
    if (err) setError(err);
  }, [search]);

  useEffect(() => {
    fetch("/api/auth/providers")
      .then((r) => r.json())
      .then((d) => setProviders(d.providers ?? []))
      .catch(() => setProviders([]));
  }, []);

  const startRegister = useCallback(async () => {
    setError("");
    setInfo("");
    if (password !== password2) {
      setError("Пароли не совпадают");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login, email, password }),
    });
    const body = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(body.error ?? "Ошибка регистрации");
      return;
    }
    if (body.delivered) {
      setInfo("Код отправлен на вашу почту. Проверьте входящие.");
    } else if (body.devCode) {
      setDevCode(body.devCode);
      setInfo(
        body.error
          ? "Письмо не удалось доставить автоматически (ограничение почтового сервиса), поэтому код показан ниже."
          : "Почтовый сервис ещё не подключён — код показан ниже."
      );
    } else {
      setError(body.error ?? "Не удалось отправить письмо");
      return;
    }
    setStep("code");
  }, [login, email, password, password2]);

  const confirmCode = useCallback(async () => {
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target: email.trim().toLowerCase(), code }),
    });
    const body = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(body.error ?? "Неверный код");
      return;
    }
    router.push(body.redirect ?? "/");
    router.refresh();
  }, [email, code, router]);

  const [resending, setResending] = useState(false);
  const [resendLeft, setResendLeft] = useState(0);
  useEffect(() => {
    if (resendLeft <= 0) return;
    const t = setTimeout(() => setResendLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendLeft]);

  const resendCode = useCallback(async () => {
    setError("");
    setResending(true);
    const res = await fetch("/api/auth/resend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target: email.trim().toLowerCase() }),
    });
    const body = await res.json().catch(() => ({}));
    setResending(false);
    if (!res.ok) {
      setError(body.error ?? "Не удалось отправить код повторно");
      return;
    }
    if (body.devCode) setDevCode(body.devCode);
    else if (body.delivered) setInfo("Новый код отправлен на вашу почту.");
    setResendLeft(60);
  }, [email]);

  const input =
    "w-full rounded-xl border border-white/10 bg-zinc-900/70 px-4 py-3 text-white outline-none transition-colors focus:border-indigo-400";

  return (
    <section className="relative flex flex-1 items-center justify-center px-6 py-14">
      <div className="glow left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 bg-violet-500" />
      <div className="card relative w-full max-w-md p-8">
        {step === "form" ? (
          <>
            <h1 className="text-3xl font-extrabold text-white">Регистрация</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Выберите быстрый способ или создайте аккаунт по email. Юзернейм выберете сразу после — он закрепляется один раз.
            </p>

            {/* Быстрые способы */}
            <div className="mt-6 space-y-2.5">
              {providers.map((p) => (
                <a key={p.id} href={`/api/auth/oauth/${p.id}`} className="btn btn-ghost w-full text-sm">
                  {p.label}
                </a>
              ))}
            </div>

            <div className="my-6 flex items-center gap-3 text-xs text-zinc-600">
              <span className="h-px flex-1 bg-white/10" /> или по email{" "}
              <span className="h-px flex-1 bg-white/10" />
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-sm text-zinc-400">Логин для входа</span>
                <input
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  className={input}
                  placeholder="latinica_123"
                  autoComplete="username"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm text-zinc-400">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={input}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm text-zinc-400">Пароль</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={input}
                  placeholder="минимум 8 символов"
                  autoComplete="new-password"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm text-zinc-400">Повторите пароль</span>
                <input
                  type="password"
                  value={password2}
                  onChange={(e) => setPassword2(e.target.value)}
                  className={input}
                  autoComplete="new-password"
                />
              </label>
            </div>
            {error ? (
              <p className="mt-4 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
                {error}
              </p>
            ) : null}
            <button onClick={startRegister} disabled={loading} className="btn btn-primary mt-6 w-full">
              {loading ? "Отправляю код…" : "Зарегистрироваться"}
            </button>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-extrabold text-white">Подтверждение</h1>
            <p className="mt-2 text-sm text-zinc-400">{info}</p>
            {devCode ? (
              <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-center">
                <p className="text-xs uppercase tracking-widest text-amber-300">Демо-режим</p>
                <p className="mt-1 text-3xl font-extrabold tracking-[0.3em] text-amber-200">{devCode}</p>
              </div>
            ) : null}
            <label className="mt-6 block">
              <span className="mb-1.5 block text-sm text-zinc-400">Код из письма</span>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                onKeyDown={(e) => e.key === "Enter" && confirmCode()}
                className={`${input} text-center text-2xl font-bold tracking-[0.4em]`}
                placeholder="000000"
                inputMode="numeric"
              />
            </label>
            {error ? (
              <p className="mt-4 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
                {error}
              </p>
            ) : null}
            <button onClick={confirmCode} disabled={loading} className="btn btn-primary mt-6 w-full">
              {loading ? "Проверяю…" : "Подтвердить и войти"}
            </button>
            <button
              onClick={resendCode}
              disabled={resending || resendLeft > 0}
              className="mt-3 w-full text-center text-sm text-lime-300 transition-colors hover:text-lime-200 disabled:cursor-not-allowed disabled:text-zinc-600"
            >
              {resending ? "Отправляю…" : resendLeft > 0 ? `Отправить код повторно можно через ${resendLeft} с` : "Не пришло письмо? Отправить код повторно"}
            </button>
            <button
              onClick={() => {
                setStep("form");
                setError("");
                setCode("");
                setDevCode("");
              }}
              className="mt-4 w-full text-center text-sm text-zinc-500 hover:text-zinc-300"
            >
              ← Изменить данные
            </button>
          </>
        )}

        <p className="mt-6 text-center text-sm text-zinc-500">
          Уже есть аккаунт?{" "}
          <Link href="/login" className="text-lime-300 hover:underline">
            Войти
          </Link>
        </p>
      </div>
    </section>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="flex flex-1 items-center justify-center text-zinc-500">Загрузка…</div>}>
      <RegisterInner />
    </Suspense>
  );
}
