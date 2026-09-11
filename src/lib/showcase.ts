/**
 * Витринный слой демо-сообщества.
 *
 * 1) Формула «живых» счётчиков (раньше жила в LiveStats) вынесена сюда,
 *    чтобы витрина демо-данных генерировалась ровно по тем же числам:
 *    сколько счётчик показывает участников — столько демо-юзеров,
 *    сколько показывает работ — столько демо-работ.
 * 2) Демо-сообщество детерминированное: одинаковые цифры весь день,
 *    на следующий день добавляются новые профили и работы.
 */

export type ShowcaseStats = { users: number; works: number; verified: number; reviews: number };

/** Детерминированный ГПСЧ от числа-семени. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Количество суток с эпохи — семя «сегодняшнего» состояния витрины. */
export function daySeed(): number {
  return Math.floor(Date.now() / 86_400_000);
}

/** Витринные цифры сервиса: базис из БД + суточная надбавка. */
export function showcaseStats(base: ShowcaseStats): ShowcaseStats {
  const days = daySeed();
  const rnd = mulberry32(days);
  const jitter = (n: number) => Math.floor(rnd() * n); // один прогрев последовательности на день

  return {
    // jitter(…)>1 даёт «некруглый» хвост: не 700, а, например, 734
    users: base.users + 103 + Math.floor(days * 0.225) + jitter(47),
    works: base.works + 312 + Math.floor(days * 0.45) + jitter(73),
    verified: base.verified + 227 + Math.floor(days * 0.325) + jitter(53),
    reviews: base.reviews + 1835 + Math.floor(days * 1.1) + jitter(129),
  };
}

// ---------- Демо-сообщество ----------

export type DemoProfile = {
  id: string;            // публичный ID (гекс, как у настоящих пользователей)
  username: string;      // /u/<username>
  displayName: string;
  avatarEmoji: string;
  avatarUrl: string;     // svg-гридент inline (data:), CSP не требуется
  bio: string;
  bioDetails: {
    specialization?: string;
    experience?: string;
    education?: string;
    city?: string;
    languages?: string;
    status?: string;
    achievements?: string;
    funFact?: string;
  };
  roles: string[];       // id из USER_ROLES, макс. 3
  plan: "free" | "pro";
  memberSince: string;   // ISO
  creator?: boolean;     // аккаунт владельца (ID 1)
};

export type DemoWork = {
  id: string;
  title: string;
  summary: string;
  type: string;          // id из WORK_TYPES
  typeCustom: string;
  stack: string[];
  link: string;
  repo: string;
  createdAt: string;     // ISO
  authorUsername: string;
  rating: { avg: number; count: number };
};

const d = (daysAgo: number) => new Date(Date.now() - daysAgo * 86_400_000).toISOString();

// — Имена: слоги + суффиксы, чтобы ни один ник не повторился —

const SYL1 = ["Neo", "Kira", "Ari", "Volt", "Nyx", "Zed", "Mira", "Rune", "Echo", "Flux", "Orion", "Vega", "Lyra", "Cy", "Nova", "Rex", "Sable", "Tori", "Juno", "Pixel", "Hex", "Luna", "Kai", "Rho", "Delta", "Iris", "Onyx", "Zeta", "Mika", "Aster"];
const SYL2 = ["forge", "byte", "wave", "code", "punk", "craft", "shield", "storm", "spark", "hunter", "smith", "ninja", "drift", "port", "link", "gate", "loop", "sync", "path", "mind", "core", "flux", "den", "lab", "works", "hacker", "ghost", "trail", "blink", "scope"];

// — Кусочки биографий —

const CITIES = ["Москва", "Санкт-Петербург", "Новосибирск", "Екатеринбург", "Тбилиси", "Белград", "Алматы", "Ташкент", "Минск", "Вильнюс", "Ереван", "Батуми", "Кисловодск", "Казань", "Нижний Новгород"];
const SPECIALIZATIONS: Record<string, string[]> = {
  developer: ["Fullstack-разработчик", "Frontend-разработчик", "Backend-разработчик", "Python-разработчик", "Mobile-разработчик"],
  osint: ["OSINT-аналитик", "Аналитик открытых источников", "Специалист по цифровой форензике"],
  "osint-author": ["Автор OSINT-кейсов", "Исследователь инфраструктуры", "Кейсист"],
  "osint-revealer": ["Раскрыватель кейсов", "Специалист по деанону инфраструктуры"],
  designer: ["UI/UX-дизайнер", "Иллюстратор", "Бренд-дизайнер", "Product-дизайнер"],
  tester: ["QA-инженер", "Тестировщик автоматизации", "QA-аналитик"],
  devops: ["DevOps-инженер", "SRE", "Инженер инфраструктуры"],
  analyst: ["Продуктовый аналитик", "Data-аналитик"],
  marketer: ["Performance-маркетолог", "SMM-стратег"],
  writer: ["Технический копирайтер", "Автор кейсов и гайдов"],
  gamedev: ["Инди-геймдев", "Геймдизайнер", "Unity-разработчик"],
  other: ["Мультидисциплинарный специалист"],
};
const EDU = ["МГТУ им. Баумана", "ИТМО", "Самообразование + курсы", "Школа 21", "СПбГУ", "Сертификации Google Cloud", "Институт без комплексов", "Skillbox", "Яндекс Практикум", "Университет ИТ"];
const LANGS = ["Русский — родной, английский — B2", "Русский, английский — C1", "Русский — родной, английский — A2", "Русский, английский, немного корейского"];
const STATUS = ["Открыт к заказам", "На проекте", "Ищу команду", "Занят до конца месяца", "Открыт к интересным предложениям"];
const ACHIEVEMENTS = ["2 хакатона, 1 победа", "Open source: 400+ звёзд", "Публикация на habr", "Сертификат OSCP (в процессе)", "Топ-100 в CTF-сезоне", "Кейс отмечен Bellingcat", "Победитель внутрикорпоративного DataFest"];
const FUN_FACTS = ["Собираю клавиатуры и пью слишком много чая", "Разбираю капчи на завтрак", "Пишу шейдеры вместо снов", "Смотрю скриншоты лучше, чем кино", "Мой кот — продакт-менеджер", "Держу домашний кластер из 4 мини-ПК", "Коллекционирую ошибки 500 с продов"];

const ROLE_SETS: string[][] = [
  ["developer"],
  ["developer", "devops"],
  ["osint"],
  ["osint", "osint-author"],
  ["osint-author"],
  ["osint-revealer", "osint"],
  ["designer"],
  ["designer", "developer"],
  ["tester"],
  ["analyst", "developer"],
  ["marketer", "writer"],
  ["gamedev", "developer"],
  ["writer"],
  ["developer", "analyst", "other"],
];

const PRO_SHARE = 0.22; // примерная доля Pro среди демо-юзеров

/** Красивая градиентная аватарка: SVG-дата-URI без внешних запросов. */
function gradientAvatar(seed: number): string {
  const r = mulberry32(seed * 2654435761);
  const hue1 = Math.floor(r() * 360);
  const hue2 = (hue1 + 40 + Math.floor(r() * 120)) % 360;
  const angle = Math.floor(r() * 360);
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><defs><linearGradient id='g' gradientTransform='rotate(${angle} 0.5 0.5)'><stop offset='0%' stop-color='hsl(${hue1},80%,60%)'/><stop offset='100%' stop-color='hsl(${hue2},75%,45%)'/></linearGradient></defs><rect width='100' height='100' fill='url(#g)'/><circle cx='${20 + Math.floor(r() * 60)}' cy='${20 + Math.floor(r() * 60)}' r='18' fill='hsla(${(hue2 + 180) % 360},90%,70%,0.45)'/><circle cx='${20 + Math.floor(r() * 60)}' cy='${20 + Math.floor(r() * 60)}' r='10' fill='hsla(${hue1},90%,85%,0.35)'/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/** Детерминированный выбор из массива. */
function pick<T>(arr: T[], rnd: () => number): T {
  return arr[Math.floor(rnd() * arr.length)];
}

export type GeneratedDemoUser = DemoProfile & { workCount: number };

/**
 * Демо-сообщество: count пользователей, у каждого 0–6 подтверждённых работ.
 * Все данные — от семени дня: за сутки состав не «мигает», на следующий день появляется новый «выпуск».
 */
export function generateDemoCommunity(count: number): { users: GeneratedDemoUser[]; works: DemoWork[] } {
  const total = Math.max(0, Math.floor(count));
  const users: GeneratedDemoUser[] = [];
  const works: DemoWork[] = [];
  if (total === 0) return { users, works };

  const rnd = mulberry32(daySeed() ^ 0x5eed_1234);

  const usedUsernames = new Set<string>();
  const usedIds = new Set<string>(["1"]); // ID 1 — у создателя
  const totalWorksTarget = Math.floor(total * 1.6); // ~1.6 работы на юзера в среднем

  for (let i = 0; i < total; i++) {
    let username = "";
    for (let attempt = 0; attempt < 10; attempt++) {
      const candidate = `${pick(SYL1, rnd).toLowerCase()}${pick(SYL2, rnd).toLowerCase()}${Math.floor(rnd() * 100)}`;
      if (!usedUsernames.has(candidate)) {
        username = candidate;
        break;
      }
    }
    if (!username) continue;
    usedUsernames.add(username);

    // Публичный ID — случайный хекс (10 символов), как у настоящих пользователей
    let id = "";
    for (let attempt = 0; attempt < 10; attempt++) {
      const candidate = Math.floor(rnd() * 0xffffffffff).toString(16).padStart(10, "0");
      if (!usedIds.has(candidate)) {
        id = candidate;
        break;
      }
    }
    if (!id) continue;
    usedIds.add(id);

    const roles = pick(ROLE_SETS, rnd);
    const isPro = rnd() < PRO_SHARE;
    const daysAgo = Math.floor(2 + rnd() * 880);
    const memberSince = d(daysAgo);
    const workCount = Math.min(6, Math.floor(Math.abs(rnd() + rnd() + rnd() - 1) * 5.5)); // 0..6, обычно 0–2

    const bioDetails: DemoProfile["bioDetails"] = {
      specialization: pick(SPECIALIZATIONS[roles[0]] ?? SPECIALIZATIONS.other, rnd),
      experience: `${1 + Math.floor(rnd() * 9)} года в коммерческих и пет-проектах`,
      education: pick(EDU, rnd),
      city: pick(CITIES, rnd),
      languages: pick(LANGS, rnd),
      status: pick(STATUS, rnd),
      achievements: pick(ACHIEVEMENTS, rnd),
      funFact: pick(FUN_FACTS, rnd),
    };

    const displayName = `${pick(SYL1, rnd)}${pick(SYL2, rnd).replace(/^./, (c) => c.toUpperCase())}`;
    const bio =
      pick(
        [
          `${bioDetails.specialization}. Беру проекты, которые могу показать в портфолио.`,
          `Работаю быстро, коммуницирую честно. Пишу код и доки к нему.`,
          `${bioDetails.specialization} — от идеи до продакшена. Люблю чистые метрики и понятные интерфейсы.`,
          `Собираю проекты по вечерам, днём — на проекте. Всё, что делаю, можно проверить.`,
          `Верю в подтверждённое авторство: каждая работа здесь — с пруфами.`,
        ],
        rnd
      );

    users.push({
      id,
      username,
      displayName,
      avatarEmoji: "",
      avatarUrl: gradientAvatar(i + 1),
      bio,
      bioDetails,
      roles,
      plan: isPro ? "pro" : "free",
      memberSince,
      workCount,
    });
  }

  // Работы: каждому юзеру по его workCount
  const TITLE_A = ["Nebula", "Relay", "Atlas", "Pulse", "Vault", "Kinet", "Glyph", "Signal", "Orbit", "Prism", "Echo", "Flux", "Cinder", "Quartz", "Halo", "Vector", "Drift", "Lumen", "Forge", "Harbor", "Tundra", "Cipher", "Mosaic", "Nova"];
  const TITLE_B = ["dashboard", "tracker", "bot", "landing", "explorer", "kit", "case", "store", "monitor", "engine", "wallet", "map", "player", "guard", "pipeline", "widget", "studio", "suite"];
  const STACKS: Record<string, string[]> = {
    site: ["Astro", "Tailwind", "Next.js"],
    webapp: ["React", "Vue 3", "Svelte", "Next.js", "TypeScript"],
    bot: ["Node.js", "aiogram", "Telegraf"],
    mobile: ["React Native", "Expo", "Swift"],
    osint: ["OSINT", "Shodan", "Amass", "Maltego"],
    "osint-reveal": ["Cytoscape.js", "NetworkX", "SpiderFoot"],
    design: ["Figma", "Illustrator", "Procreate"],
    "design-project": ["Figma", "Design Tokens", "UX Research"],
    architecture: ["Kafka", "Redis", "Postgres", "Terraform"],
    script: ["Bash", "Python", "GitHub Actions"],
    custom: ["Rust", "Go", "Zig"],
  };
  const SUMMARY = [
    "Полный цикл: исследование, прототип, прод. Материалы и метрики — внутри кейса.",
    "Оптимизировал загрузку до 0.5 с, Lighthouse 98. Инструкции по развёртыванию в README.",
    "Кейс с таймлайном, скриншотами и выводами. Всё подтверждается ссылками.",
    "Работа сделана под заказ, детали процесса описаны в деталях работы.",
    "Пет-проект, выросший в рабочий инструмент. 1 200+ установок за месяц.",
    "Дизайн-система передана в разработку, компоненты живут в библиотеке.",
    "Автоматизация рутины: минус 6 часов ручной работы в неделю.",
    "Проектирование высоконагруженного сервиса: схемы, ADR, нагрузочные тесты.",
  ];

  // Уникальность названий: + суффикс, если повторилось
  const usedTitles = new Set<string>();
  let workIndex = 0;
  for (const u of users) {
    for (let k = 0; k < u.workCount && works.length < totalWorksTarget + 20; k++) {
      let title = "";
      for (let attempt = 0; attempt < 8; attempt++) {
        const candidate = `${pick(TITLE_A, rnd)} ${pick(TITLE_B, rnd)}`;
        if (!usedTitles.has(candidate)) {
          title = candidate;
          break;
        }
      }
      if (!title) title = `${pick(TITLE_A, rnd)} ${pick(TITLE_B, rnd)} ${workIndex}`;
      usedTitles.add(title);

      const type = pick(Object.keys(STACKS), rnd);
      const stack = STACKS[type];
      const daysAgo = Math.floor(1 + rnd() * 800);
      const ratingCount = Math.floor(2 + rnd() * 60);
      const ratingAvg = Math.round((3.8 + rnd() * 1.2) * 10) / 10;

      works.push({
        id: `wdemo-${u.id}-${k}`,
        title,
        summary: pick(SUMMARY, rnd),
        type,
        typeCustom: "",
        stack: [pick(stack, rnd), pick(stack, rnd), pick(stack, rnd)].filter((s, i, a) => a.indexOf(s) === i),
        link: pick(["https://github.com", "https://vercel.com/templates", "https://figma.com/community", "https://t.me/telegram"], rnd),
        repo: rnd() < 0.6 ? "https://github.com" : "",
        createdAt: d(daysAgo),
        authorUsername: u.username,
        rating: { avg: ratingAvg, count: ratingCount },
      });
      workIndex++;
    }
  }

  // Дата «старения» работ: недавно созданные юзеры — свежие работы
  works.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return { users, works };
}

/** Аккаунт владельца (создателя) — ID 1, живой профиль, всегда первым. */
export function creatorDemoProfile(): DemoProfile {
  return {
    id: "1",
    username: "merugan2010",
    displayName: "Merugan",
    avatarEmoji: "👑",
    avatarUrl: "",
    bio: "Создатель DevShelf. Строю сервис, где авторство работ подтверждено, а портфолио — честное.",
    bioDetails: {
      specialization: "Создатель сервиса",
      experience: "Fullstack-разработка, OSINT, продукт",
      city: "Москва / удалённо",
      languages: "Русский — родной, английский — B2",
      status: "Открыт к обратной связи",
      funFact: "Пишу код ночью, ответы в тикетах — днём",
    },
    roles: ["developer"],
    plan: "pro",
    memberSince: d(900),
    creator: true,
  };
}
