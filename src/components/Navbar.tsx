"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const LINKS = [
  { href: "/", label: "Главная" },
  { href: "/projects", label: "Проекты" },
  { href: "/search", label: "Люди" },
  { href: "/about", label: "О сервисе" },
  { href: "/contacts", label: "Контакты" },
];

type Me = {
  login: string;
  role: string;
  displayName: string;
  username: string | null;
  avatarEmoji: string;
  avatarUrl: string;
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
  const [me, setMe] = useState<Me | undefined>(undefined);
  const pathname = usePathname();
  const router = useRouter();

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
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0b0c10]/85 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
        <Link href="/" className="text-lg font-extrabold tracking-tight text-white">
          Dev<span className="gradient-text">Shelf</span>
        </Link>

        {/* Десктоп-меню */}
        <nav className="hidden items-center gap-1 sm:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/5 hover:text-white ${
                pathname === l.href ? "text-lime-300" : "text-zinc-400"
              }`}
            >
              {l.label}
            </Link>
          ))}

          {me === undefined ? null : me === null ? (
            <Link href="/login" className="btn btn-ghost ml-3 !px-4 !py-2 text-sm">
              Вход
            </Link>
          ) : (
            <div className="relative ml-3">
              <button
                onClick={() => setMenu(!menu)}
                className="flex items-center gap-2 rounded-full border border-white/10 py-1 pl-1 pr-3 transition-colors hover:bg-white/5"
              >
                <Avatar me={me} size={30} />
                <span className="max-w-[140px] truncate text-sm font-medium text-white">
                  {me.displayName || me.username || me.login}
                </span>
              </button>
              {menu && (
                <div
                  className="absolute right-0 mt-2 w-52 overflow-hidden rounded-xl border border-white/10 bg-[#111318] py-1 shadow-xl"
                  onMouseLeave={() => setMenu(false)}
                >
                  <Link href="/cabinet" onClick={() => setMenu(false)} className="block px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5 hover:text-white">
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
                  {me.role === "admin" && (
                    <Link href="/admin" onClick={() => setMenu(false)} className="block px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5 hover:text-white">
                      Админка
                    </Link>
                  )}
                  <button onClick={logout} className="block w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-white/5">
                    Выйти
                  </button>
                </div>
              )}
            </div>
          )}
        </nav>

        {/* Бургер для мобильных */}
        <button
          onClick={() => setOpen(!open)}
          aria-label="Меню"
          className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 rounded-lg border border-white/10 sm:hidden"
        >
          <span className={`h-0.5 w-5 bg-white transition-transform ${open ? "translate-y-2 rotate-45" : ""}`} />
          <span className={`h-0.5 w-5 bg-white transition-opacity ${open ? "opacity-0" : ""}`} />
          <span className={`h-0.5 w-5 bg-white transition-transform ${open ? "-translate-y-2 -rotate-45" : ""}`} />
        </button>
      </div>

      {/* Мобильное меню */}
      {open && (
        <nav className="border-t border-white/10 bg-[#0b0c10] px-6 py-4 sm:hidden">
          <div className="flex flex-col gap-1">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={`rounded-lg px-4 py-2.5 text-sm font-medium ${
                  pathname === l.href ? "text-lime-300" : "text-zinc-400"
                }`}
              >
                {l.label}
              </Link>
            ))}
            {me ? (
              <>
                <Link href="/cabinet" onClick={() => setOpen(false)} className="rounded-lg px-4 py-2.5 text-sm text-zinc-300">
                  Личный кабинет
                </Link>
                <Link href="/works/new" onClick={() => setOpen(false)} className="rounded-lg px-4 py-2.5 text-sm text-zinc-300">
                  Добавить работу
                </Link>
                <button onClick={logout} className="rounded-lg px-4 py-2.5 text-left text-sm text-red-400">
                  Выйти
                </button>
              </>
            ) : (
              <Link href="/login" onClick={() => setOpen(false)} className="btn btn-ghost mt-2 text-sm">
                Вход
              </Link>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
