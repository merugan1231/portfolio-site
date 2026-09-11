import { creatorDemoProfile, generateDemoCommunity, showcaseStats, type DemoProfile, type DemoWork } from "@/lib/showcase";

/**
 * Демо-наполнение для витрин: настоящие работы и профили пользователей
 * показываются рядом и всегда в приоритете.
 *
 * Демо-сообщество генерируется детерминированно по витринным счётчикам
 * главной (см. src/lib/showcase.ts): сколько «Участников» показывает
 * счётчик — столько всего профилей; сколько «Работ» — столько работ.
 * Реальные пользователи вычтены из цели, чтобы сумма совпадала точно.
 */

export type { DemoProfile, DemoWork };
export { creatorDemoProfile };

/** Целевые количества демо-слоя при данных базисах из БД. */
export function demoCounts(baseUsers: number, baseWorks: number): { users: number; works: number } {
  const shown = showcaseStats({ users: baseUsers, works: baseWorks, verified: 0, reviews: 0 });
  return {
    users: Math.max(0, shown.users - baseUsers),
    works: Math.max(0, shown.works - baseWorks),
  };
}

/** Кэш генерации на процесс: пересчитывается при смене дня или целевых чисел. */
let cacheDay = -1;
let cachedUsers: DemoProfile[] = [];
let cachedWorks: DemoWork[] = [];

function getCommunity(users: number, works: number): { users: DemoProfile[]; works: DemoWork[] } {
  const day = Math.floor(Date.now() / 86_400_000);
  if (day !== cacheDay || cachedUsers.length !== users || cachedWorks.length !== works) {
    // Работ считаем независимо: просим у генератора столько профилей,
    // чтобы хватило на нужное число работ (≈1.6 работы на профиль)
    const gen = generateDemoCommunity(Math.max(users, Math.ceil(works / 1.6)));
    cacheDay = day;
    cachedUsers = gen.users.slice(0, users);
    cachedWorks = gen.works.slice(0, works);
  }
  return { users: cachedUsers, works: cachedWorks };
}

/**
 * Инициализация витрины текущим «выпуском» демо-сообщества.
 * Вызывается из страниц с реальными числами из БД — дальше все
 * геттеры (профили, поиск, работы) работают с этим выпуском.
 */
export function ensureDemoVolume(baseUsers: number, baseWorks: number): { users: DemoProfile[]; works: DemoWork[] } {
  const target = demoCounts(baseUsers, baseWorks);
  return getCommunity(target.users, target.works);
}

/** Все демо-работы текущего выпуска. */
export function listDemoWorks(): DemoWork[] {
  return cachedWorks;
}

/** Демо-профиль по юзернейму (для /u/<username>). Создатель — только реальный аккаунт. */
export function getDemoProfile(username: string): DemoProfile | null {
  const uname = username.trim().toLowerCase();
  if (!uname) return null;
  return cachedUsers.find((u) => u.username === uname) ?? null;
}

/** Демо-работы конкретного демо-профиля (для страницы профиля). */
export function getDemoWorksByUsername(username: string): DemoWork[] {
  const uname = username.trim().toLowerCase();
  if (!uname) return [];
  return cachedWorks.filter((w) => w.authorUsername.toLowerCase() === uname);
}

/**
 * Поиск демо-профилей: точное совпадение по публичному ID
 * или начало юзернейма / имени. Реальный создатель (ID 1) не дублируется —
 * его аккаунт всегда находится среди настоящих пользователей.
 */
export function searchDemoProfiles(q: string, limit = 20): DemoProfile[] {
  const query = q.trim().toLowerCase();
  if (!query) return [];
  const out: DemoProfile[] = [];
  for (const u of cachedUsers) {
    if (u.id === query || u.username.startsWith(query) || u.displayName.toLowerCase().startsWith(query)) {
      out.push(u);
      if (out.length >= limit) break;
    }
  }
  return out;
}
