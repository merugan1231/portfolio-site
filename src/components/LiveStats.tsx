/**
 * Цифры сервиса на главной — «живые», но меняются ОДИН РАЗ В СУТКИ.
 * Базис = реальные цифры из БД, поверх — витринная надбавка, которая
 * монотонно растёт со временем (детерминированно от текущей даты):
 * все сутки показываются одни и те же цифры, на следующий день — чуть больше.
 */

type Stats = { users: number; works: number; verified: number; reviews: number };

/** Детерминированный ГПСЧ от числа-семени (одинаковые цифры весь день). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function LiveStats({ base }: { base: Stats }) {
  const days = Math.floor(Date.now() / 86_400_000);
  const rnd = mulberry32(days);
  const jitter = (n: number) => Math.floor(rnd() * n); // один прогрев последовательности на день

  const stats: Stats = {
    users: base.users + 412 + Math.floor(days * 0.9) + jitter(3),
    works: base.works + 1246 + Math.floor(days * 1.8) + jitter(4),
    verified: base.verified + 907 + Math.floor(days * 1.3) + jitter(3),
    reviews: base.reviews + 7341 + Math.floor(days * 4.4) + jitter(9),
  };

  const items = [
    { label: "Участников", value: stats.users },
    { label: "Работ", value: stats.works },
    { label: "Подтверждено авторство", value: stats.verified },
    { label: "Оценок", value: stats.reviews },
  ];

  return (
    <dl className="mt-8 grid w-full max-w-2xl grid-cols-2 gap-3 sm:mt-10 sm:grid-cols-4 sm:gap-4">
      {items.map((s) => (
        <div key={s.label} className="card px-3 py-4 text-center sm:px-4 sm:py-5">
          <dt className="order-2 mt-1 text-[10px] uppercase leading-tight tracking-wide text-zinc-500 sm:text-xs">
            {s.label}
          </dt>
          <dd className="order-1 text-2xl font-extrabold text-white tabular-nums sm:text-3xl">
            {s.value.toLocaleString("ru-RU")}
          </dd>
        </div>
      ))}
    </dl>
  );
}
