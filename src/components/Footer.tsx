import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 py-8 sm:py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-5 px-4 sm:flex-row sm:gap-6 sm:px-6">
        <div className="text-center sm:text-left">
          <p className="text-lg font-extrabold text-white">
            Dev<span className="gradient-text">Shelf</span>
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            © {new Date().getFullYear()} — полка работ разработчиков и креаторов
          </p>
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-zinc-400">
          <Link href="/" className="transition-colors hover:text-white">Главная</Link>
          <Link href="/projects" className="transition-colors hover:text-white">Проекты</Link>
          <Link href="/about" className="transition-colors hover:text-white">О сервисе</Link>
          <Link href="/contacts" className="transition-colors hover:text-white">Контакты</Link>
          <Link href="/privacy" className="transition-colors hover:text-white">Конфиденциальность</Link>
          <a
            href="https://t.me/kollew"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary !px-4 !py-2 text-sm"
          >
            Написать в Telegram
          </a>
        </nav>
      </div>
    </footer>
  );
}
