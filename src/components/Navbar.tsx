"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Главная" },
  { href: "/projects", label: "Проекты" },
  { href: "/about", label: "Обо мне" },
  { href: "/contacts", label: "Контакты" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0b0c10]/85 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
        <Link href="/" className="text-lg font-extrabold tracking-tight text-white">
          Merugan<span className="gradient-text">MM</span>
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
          <Link
            href="/login"
            className="btn btn-ghost ml-3 !px-4 !py-2 text-sm"
          >
            Вход
          </Link>
        </nav>

        {/* Бургер для мобильных */}
        <button
          onClick={() => setOpen(!open)}
          aria-label="Меню"
          className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 rounded-lg border border-white/10 sm:hidden"
        >
          <span
            className={`h-0.5 w-5 bg-white transition-all duration-300 ${open ? "translate-y-2 rotate-45" : ""}`}
          />
          <span className={`h-0.5 w-5 bg-white transition-all duration-300 ${open ? "opacity-0" : ""}`} />
          <span
            className={`h-0.5 w-5 bg-white transition-all duration-300 ${open ? "-translate-y-2 -rotate-45" : ""}`}
          />
        </button>
      </div>

      {/* Мобильное меню */}
      {open ? (
        <nav className="border-t border-white/10 bg-[#0b0c10]/95 px-6 py-4 sm:hidden">
          <div className="flex flex-col gap-1">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={`rounded-lg px-4 py-3 text-sm font-medium transition-colors hover:bg-white/5 ${
                  pathname === l.href ? "text-lime-300" : "text-zinc-300"
                }`}
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="btn btn-ghost mt-2 text-sm"
            >
              Вход
            </Link>
          </div>
        </nav>
      ) : null}
    </header>
  );
}
