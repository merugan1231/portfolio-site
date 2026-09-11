import { showcaseStats, type ShowcaseStats } from "@/lib/showcase";

/**
 * Цифры сервиса на главной — «живые», но меняются ОДИН РАЗ В СУТКИ.
 * Формула живёт в src/lib/showcase.ts — демо-сообщество генерируется
 * ровно по этим же числам: сколько участников/работ показал счётчик,
 * столько демо-профилей и работ существует на витрине.
 */

export default function LiveStats({ base }: { base: ShowcaseStats }) {
  const stats = showcaseStats(base);

  const items = [
    { label: "Участников", value: stats.users },
    { label: "Работ", value: stats.works },
    { label: "Подтверждено авторство", value: stats.verified },
    { label: "Оценок", value: stats.reviews },
  ];

  return (
    <dl className="mt-8 grid w-full max-w-2xl grid-cols-2 gap-3 sm:mt-10 sm:grid-cols-4 sm:gap-4">
      {/* flex-col + order: цифра всегда сверху на одной линии, подпись снизу —
          длинная подпись не сдвигает цифру вниз */}
      {items.map((s) => (
        <div key={s.label} className="card flex flex-col px-3 py-4 text-center sm:px-4 sm:py-5">
          <dt className="order-2 mt-1 text-[10px] uppercase leading-tight tracking-wide text-zinc-500 sm:text-xs">
            {s.label}
          </dt>
          <dd className="order-1 text-2xl font-extrabold leading-none text-white tabular-nums sm:text-3xl">
            {s.value.toLocaleString("ru-RU")}
          </dd>
        </div>
      ))}
    </dl>
  );
}
