import type { Metadata } from "next";

export const metadata: Metadata = { title: "Контакты" };

const CONTACTS = [
  {
    id: "telegram",
    title: "Telegram",
    subtitle: "Самый быстрый ответ — обычно в течение часа",
    cta: "Открыть Telegram",
    href: "https://t.me/kollew",
    icon: "✈️",
    accent: "from-sky-500/20 to-sky-500/5",
    border: "hover:!border-sky-400/60",
  },
  {
    id: "whatsapp",
    title: "WhatsApp",
    subtitle: "Для голосовых сообщений и созвонов",
    cta: "Открыть WhatsApp",
    href: "https://wa.me/79881532375",
    icon: "💬",
    accent: "from-emerald-500/20 to-emerald-500/5",
    border: "hover:!border-emerald-400/60",
  },
  {
    id: "call",
    title: "Позвонить",
    subtitle: "Ежедневно с 10:00 до 22:00 по МСК",
    cta: "Позвонить",
    href: "tel:+79881532375",
    icon: "📞",
    accent: "from-indigo-500/20 to-indigo-500/5",
    border: "hover:!border-indigo-400/60",
  },
  {
    id: "sms",
    title: "SMS",
    subtitle: "Коротко опишите задачу — перезвоню",
    cta: "Написать SMS",
    href: "sms:+79881532375",
    icon: "✉️",
    accent: "from-fuchsia-500/20 to-fuchsia-500/5",
    border: "hover:!border-fuchsia-400/60",
  },
];

export default function ContactsPage() {
  return (
    <section className="relative mx-auto w-full max-w-6xl flex-1 px-6 py-16">
      <div className="glow left-1/2 top-[-80px] h-72 w-72 -translate-x-1/2 bg-lime-400" />
      <div className="relative text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          Свяжитесь <span className="gradient-text">со мной</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-zinc-400">
          Выберите удобный способ — кнопка откроет нужный сервис или приложение.
        </p>
      </div>

      <div className="relative mt-12 grid gap-5 sm:grid-cols-2">
        {CONTACTS.map((c, i) => (
          <a
            key={c.id}
            href={c.href}
            target={c.href.startsWith("http") ? "_blank" : undefined}
            rel={c.href.startsWith("http") ? "noopener noreferrer" : undefined}
            className={`card reveal group relative overflow-hidden p-7 ${c.border}`}
            style={{ transitionDelay: `${i * 80}ms` }}
          >
            <div
              className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${c.accent} opacity-0 transition-opacity duration-500 group-hover:opacity-100`}
            />
            <div className="relative flex items-start justify-between gap-4">
              <span className="text-4xl transition-transform duration-500 group-hover:scale-125 group-hover:-rotate-6">
                {c.icon}
              </span>
              <span className="text-sm text-zinc-500 transition-all duration-300 group-hover:translate-x-1 group-hover:text-zinc-300">
                →
              </span>
            </div>
            <h2 className="relative mt-4 text-xl font-bold text-white">{c.title}</h2>
            <p className="relative mt-1 text-sm text-zinc-400">{c.subtitle}</p>
            <span className="relative mt-5 inline-flex items-center gap-2 text-sm font-semibold text-lime-300">
              {c.cta}
              <span className="transition-transform duration-300 group-hover:translate-x-1.5">→</span>
            </span>
          </a>
        ))}
      </div>

      <p className="relative mt-10 text-center text-sm text-zinc-500">
        Обычно отвечаю в течение часа. Ночные сообщения читаю утром.
      </p>
    </section>
  );
}
