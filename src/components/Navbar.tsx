"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const LINKS = [
  { href: "/", label: "Главная" },
  { href: "/explore", label: "Все работы" },
  { href: "/search", label: "Люди" },
  { href: "/about", label: "О сервисе" },
];

/* Мега-меню «Сервисы»: сгруппированные ссылки с описаниями */
const SERVICES = [
  {
    group: "Портфолио",
    items: [
      { href: "/works/new", icon: "➕", title: "Добавить работу", desc: "11 типов: сайт, бот, OSINT-кейс, дизайн…" },
      { href: "/explore", icon: "🗂️", title: "Витрина работ", desc: "Всё, что подтвердили участники" },
      { href: "/projects", icon: "🧩", title: "Проекты сервиса", desc: "На чём сделан сам DevShelf" },
    ],
  },
  {
    group: "Сообщество",
    items: [
      { href: "/search", icon: "🔎", title: "Люди и поиск", desc: "По ID, роли и специфике" },
      { href: "/how/cabinet", icon: "👤", title: "Личный кабинет", desc: "Профиль, биография, контакты" },
      { href: "/how/verify", icon: "🛡️", title: "Авторство DEV-VERIFY", desc: "Как работает подтверждение" },
    ],
  },
  {
    group: "Ещё",
    items: [
      { href: "/pro-payment", icon: "⭐", title: "DevShelf Pro", desc: "Безлимит работ — 499 ₽/мес" },
      { href: "/tickets", icon: "🎫", title: "Поддержка", desc: "Живые тикеты с админом" },
      { href: "/contacts", icon: "✈️", title: "Контакты", desc: "Telegram, ответ за час" },
    ],
  },
];

type Me = {
  login: string;
  role: string;
  displayName: string;
  username: string | null;
  avatarEmoji: string;
  avatarUrl: string;
  isPro?: boolean;
} | null;

function Avatar({ me, size }: { me: NonNullable<Me>; size: number }) {
  if (me.avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={me.avatarUrl} alt="" width={size} height={size} className="rounded-full object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <span
      className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5"
      style={{ width: size, height: size, fontSize: size * 0.55 }}
    >
      {me.avatarEmoji || "🧑‍💻"}
    </span>
  );
}

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [mega, setMega] = useState(false);
  const [me, setMe] = useState<Me | undefined>(undefined);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const megaRef = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  // Закрытие всплывающих панелей: Escape и клик вне (frontend-ui-engineering)
  useEffect(() => {
    if (!menu && !mega) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenu(false);
        setMega(false);
      }
    }
    function onPointer(e: PointerEvent) {
      const t = e.target as Node;
      if (menu && menuRef.current && !menuRef.current.contains(t)) setMenu(false);
      if (mega && megaRef.current && !megaRef.current.contains(t)) setMega(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [menu, mega]);

  // Смена страницы закрывает всё
  useEffect(() => {
    setMega(false);
  }, [pathname]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setMe(d.user))
      .catch(() => setMe(null));
  }, [pathname]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    setMe(null);
    setMenu(false);
    router.push("/");
    router.refresh();
  }

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-30 px-3 pt-3 sm:px-6 sm:pt-4">
      <div className="pointer-events-auto mx-auto flex h-14 w-full max-w-5xl items-center justify-between rounded-2xl border border-white/10 bg-[#0b0c10]/70 px-3 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.6)] backdrop-blur-xl sm:px-5">
        <Link href="/" onClick={() => setOpen(false)} className="text-lg font-extrabold tracking-tight text-white">
          Dev<span className="gradient-text">Shelf</span>
        </Link>

        {/* Десктоп-меню (планшет: только логотип + аватар/вход) */}
        <nav className="hidden items-center gap-1 lg:flex">
          {LINKS.map((l) =>
            l.href === "/explore" ? (
              <div key={l.href} ref={megaRef} className="relative">
                <button
                  onClick={() => setMega(!mega)}
                  aria-expanded={mega}
                  aria-haspopup="true"
                  className={`nav-link flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium hover:bg-white/5 hover:text-white ${
                    mega || pathname === l.href ? "text-lime-300" : "text-zinc-400"
                  }`}
                >
                  Сервисы
                  <span className={`text-[10px] transition-transform duration-200 ${mega ? "rotate-180" : ""}`}>▾</span>
                </button>
                {mega && (
                  <div className="mega-menu absolute left-1/2 top-full z-40 mt-3 w-[640px] -translate-x-1/2">
                    <div className="rounded-2xl border border-white/10 bg-[#0e1015]/95 p-5 shadow-[0_24px_64px_-16px_rgba(0,0,0,0.7)] backdrop-blur-xl">
                      <div className="grid grid-cols-3 gap-5">
                        {SERVICES.map((g) => (
                          <div key={g.group}>
                            <p className="px-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                              {g.group}
                            </p>
                            <div className="mt-2 space-y-0.5">
                              {g.items.map((it) => (
                                <Link
                                  key={it.href}
                                  href={it.href}
                                  onClick={() => setMega(false)}
                                  className="block rounded-xl px-2 py-2 transition-colors hover:bg-white/5"
                                >
                                  <span className="flex items-center gap-2 text-sm font-medium text-zinc-100">
                                    <span aria-hidden>{it.icon}</span>
                                    {it.title}
                                  </span>
                                  <span className="mt-0.5 block px-6 text-xs leading-snug text-zinc-500">
                                    {it.desc}
                                  </span>
                                </Link>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 flex items-center justify-between rounded-xl border border-lime-300/20 bg-lime-300/[0.06] px-4 py-3">
                        <span className="text-xs text-zinc-300">
                          🛡️ Каждая работа проходит проверку авторства кодом DEV-VERIFY
                        </span>
                        <Link href="/how/verify" onClick={() => setMega(false)} className="text-xs font-semibold text-lime-300 hover:text-lime-200">
                          Как это работает →
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                key={l.href}
                href={l.href}
                className={`nav-link rounded-lg px-4 py-2 text-sm font-medium hover:bg-white/5 hover:text-white ${
                  pathname === l.href ? "text-lime-300" : "text-zinc-400"
                }`}
              >
                {l.label}
              </Link>
            )
          )}

          {me === undefined ? null : me === null ? (
            <Link href="/login" className="btn btn-ghost ml-3 !px-4 !py-2 text-sm">
              Вход
            </Link>
          ) : (
            <div className="ml-3 flex items-center gap-2">
              {/* Pro: приобрести или продлить */}
              <Link
                href="/pro-payment"
                className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  // duration по умолчанию 150ms: цвет меняется быстро, без «плавающих» сдвигов
                  me.isPro
                    ? "border-amber-300/40 bg-amber-300/10 text-amber-200 hover:bg-amber-300/20"
                    : "border-amber-300/40 bg-gradient-to-r from-amber-400/20 to-orange-400/20 text-amber-200 hover:from-amber-400/30 hover:to-orange-400/30"
                }`}
              >
                {me.isPro ? "⭐ Продлить Pro" : "⭐ Преобрести Pro"}
              </Link>
              <div className="relative">
              <button
                onClick={() => setMenu(!menu)}
                aria-haspopup="menu"
                aria-expanded={menu}
                className="flex items-center gap-2 rounded-full border border-white/10 py-1 pl-1 pr-3 transition-transform active:scale-[0.97] hover:bg-white/5"
              >
                <Avatar me={me} size={30} />
                <span className="max-w-[140px] truncate text-sm font-medium text-white">
                  {me.displayName || me.username || me.login}
                </span>
              </button>
              {menu && (
                <div
                  ref={menuRef}
                  role="menu"
                  className="dropdown absolute right-0 mt-2 w-52 overflow-hidden rounded-xl border border-white/10 bg-[#111318] py-1 shadow-xl"
                >
                  <Link role="menuitem" href="/cabinet" onClick={() => setMenu(false)} className="block px-4 py-2.5 text-sm text-zinc-300 transition-colors hover:bg-white/5 hover:text-white">
                    Личный кабинет
                  </Link>
                  {me.username && (
                    <Link href={`/u/${me.username}`} onClick={() => setMenu(false)} className="block px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5 hover:text-white">
                      Мой публичный профиль
                    </Link>
                  )}
                  <Link href="/works/new" onClick={() => setMenu(false)} className="block px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5 hover:text-white">
                    Добавить работу
                  </Link>
                  <Link href="/tickets" onClick={() => setMenu(false)} className="block px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5 hover:text-white">
                    Тикеты
                  </Link>
                  {(me.role === "admin" || me.role === "creator") && (
                    <Link href="/admin" onClick={() => setMenu(false)} className="block px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5 hover:text-white">
                      Админка
                    </Link>
                  )}
                  <button role="menuitem" onClick={logout} className="block w-full px-4 py-2.5 text-left text-sm text-red-400 transition-colors hover:bg-white/5">
                    Выйти
                  </button>
                </div>
              )}
              </div>
            </div>
          )}
        </nav>

        {/* Бургер для мобильных и планшетов */}
        <button
          onClick={() => setOpen(!open)}
          aria-label="Меню"
          aria-expanded={open}
          className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 rounded-lg border border-white/10 transition-colors hover:bg-white/5 lg:hidden"
        >
          <span className={`h-0.5 w-5 bg-white transition-transform ${open ? "translate-y-2 rotate-45" : ""}`} />
          <span className={`h-0.5 w-5 bg-white transition-opacity ${open ? "opacity-0" : ""}`} />
          <span className={`h-0.5 w-5 bg-white transition-transform ${open ? "-translate-y-2 -rotate-45" : ""}`} />
        </button>
      </div>

      {/* Мобильное меню */}
      {open && (
        <nav className="mobile-menu pointer-events-auto mt-2 max-h-[calc(100dvh-88px)] overflow-y-auto rounded-2xl border border-white/10 bg-[#0b0c10]/95 px-4 pb-8 pt-4 backdrop-blur-xl lg:hidden">
          <div className="flex flex-col gap-1">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={`rounded-xl px-4 py-3 text-base font-medium transition-colors ${
                  pathname === l.href
                    ? "bg-lime-300/10 text-lime-300"
                    : "text-zinc-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                {l.label}
              </Link>
            ))}

            {/* Сервисы (плоское подменю) */}
            <p className="mt-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Сервисы</p>
            {SERVICES.flatMap((g) => g.items).map((it) => (
              <Link
                key={`m-${it.href}`}
                href={it.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-4 py-2.5 text-sm text-zinc-300 transition-colors hover:bg-white/5 hover:text-white"
              >
                <span aria-hidden className="mr-2">{it.icon}</span>
                {it.title}
              </Link>
            ))}

            {me ? (
              <>
                <div className="mt-3 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <Avatar me={me} size={36} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white">
                      {me.displayName || me.username || me.login}
                    </div>
                    {me.username && <div className="truncate text-xs text-zinc-500">@{me.username}</div>}
                  </div>
                </div>
                <Link href="/cabinet" onClick={() => setOpen(false)} className="mt-1 rounded-xl px-4 py-3 text-base text-zinc-300 transition-colors hover:bg-white/5 hover:text-white">
                  🗄️ Личный кабинет
                </Link>
                {me.username && (
                  <Link href={`/u/${me.username}`} onClick={() => setOpen(false)} className="rounded-xl px-4 py-3 text-base text-zinc-300 transition-colors hover:bg-white/5 hover:text-white">
                    🌐 Мой профиль
                  </Link>
                )}
                <Link href="/works/new" onClick={() => setOpen(false)} className="rounded-xl px-4 py-3 text-base text-zinc-300 transition-colors hover:bg-white/5 hover:text-white">
                  ➕ Добавить работу
                </Link>
                <Link
                  href="/pro-payment"
                  onClick={() => setOpen(false)}
                  className={`rounded-xl px-4 py-3 text-base font-medium transition-colors ${
                    me.isPro ? "text-amber-200 hover:bg-amber-400/10" : "bg-gradient-to-r from-amber-400/15 to-orange-400/15 text-amber-200 hover:from-amber-400/25"
                  }`}
                >
                  {me.isPro ? "⭐ Продлить Pro" : "⭐ Преобрести Pro"}
                </Link>
                <Link href="/tickets" onClick={() => setOpen(false)} className="rounded-xl px-4 py-3 text-base text-zinc-300 transition-colors hover:bg-white/5 hover:text-white">
                  🎫 Тикеты
                </Link>
                {(me.role === "admin" || me.role === "creator") && (
                  <Link href="/admin" onClick={() => setOpen(false)} className="rounded-xl px-4 py-3 text-base text-zinc-300 transition-colors hover:bg-white/5 hover:text-white">
                    🛠️ Админка
                  </Link>
                )}
                <button onClick={logout} className="mt-1 rounded-xl px-4 py-3 text-left text-base text-red-400 transition-colors hover:bg-red-500/10">
                  Выйти
                </button>
              </>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link href="/login" onClick={() => setOpen(false)} className="btn btn-ghost text-sm">
                  Вход
                </Link>
                <Link href="/register" onClick={() => setOpen(false)} className="btn btn-primary text-sm">
                  Регистрация
                </Link>
              </div>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
