import type { Metadata } from "next";

export const metadata: Metadata = { title: "Контакты" };

export default function ContactsPage() {
  return (
    <section className="relative mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-16">
      <div className="glow left-1/2 top-[-80px] h-72 w-72 -translate-x-1/2 bg-lime-400" />
      <div className="relative text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          Контакты
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-zinc-400">
          Есть предложения по сервису, вопросы по рекламе или проблемы с аккаунтом и отзывами?
          Пишите в Telegram — отвечаю лично.
        </p>
      </div>

      <a
        href="https://t.me/kollew"
        target="_blank"
        rel="noopener noreferrer"
        className="card reveal group relative mt-10 block overflow-hidden p-8 hover:!border-sky-400/60"
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-sky-500/20 to-sky-500/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        <div className="relative flex items-center justify-between">
          <span className="text-5xl transition-transform duration-500 group-hover:scale-125 group-hover:-rotate-6">✈️</span>
          <span className="text-sm text-zinc-500 transition-all duration-300 group-hover:translate-x-1 group-hover:text-zinc-300">→</span>
        </div>
        <h2 className="relative mt-4 text-2xl font-bold text-white">Telegram</h2>
        <p className="relative mt-1 text-sm text-zinc-400">@kollew — предложения, реклама, поддержка, споры по оценкам</p>
        <span className="relative mt-5 inline-flex items-center gap-2 text-sm font-semibold text-lime-300">
          Открыть Telegram
          <span className="transition-transform duration-300 group-hover:translate-x-1.5">→</span>
        </span>
      </a>

      <p className="relative mt-8 text-center text-sm text-zinc-500">
        Обычно отвечаю в течение часа. Ночные сообщения читаю утром.
      </p>
    </section>
  );
}
