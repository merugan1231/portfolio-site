import { creatorDemoProfile, generateDemoCommunity, showcaseStats, type DemoProfile, type DemoWork } from "@/lib/showcase";
import { WORK_TYPES, getWorkReviews, getWorkRating, type Work, type WorkType, type Review } from "@/lib/works";

const WORK_TYPE_LABELS: Record<string, string> = Object.fromEntries(WORK_TYPES.map((t) => [t.id, t.label]));

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

/**
 * Полка на главной: до n демо-работ текущего выпуска.
 * Берём самые свежие; авторы кликабельны (ведут в демо-профиль).
 */
export function listDemoShelf(n: number): {
  id: string; title: string; summary: string; typeLabel: string;
  rating: { avg: number; count: number }; href: string | null; demo: boolean;
  authorName: string; authorUsername: string | null;
  authorAvatarUrl: string; authorAvatarEmoji: string;
}[] {
  if (n <= 0 || cachedWorks.length === 0) return [];
  return cachedWorks.slice(0, n).map((w) => {
    const author = cachedUsers.find((u) => u.username === w.authorUsername);
    return {
      id: w.id,
      title: w.title,
      summary: w.summary,
      typeLabel: w.typeCustom || WORK_TYPE_LABELS[w.type] || w.type,
      rating: w.rating,
      href: null,
      demo: true,
      authorName: author?.displayName || w.authorUsername,
      authorUsername: author?.username ?? w.authorUsername,
      authorAvatarUrl: author?.avatarUrl ?? "",
      authorAvatarEmoji: author?.avatarEmoji ?? "",
    };
  });
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
 * Полный объект работы из демо-слоя (для страницы /works/[id]).
 * Демо-работы живут вне БД: отзывы у них — настоящие, из общего хранилища
 * (review.workId = id демо-работы), а поля verify_status/verifyToken —
 * «verified» без токена (авторство демо-аккаунта подтверждено по умолчанию).
 */
export function getDemoWorkFull(id: string): Work | null {
  const w = cachedWorks.find((x) => x.id === id);
  if (!w) return null;
  const created = w.createdAt;
  return {
    id: w.id,
    userId: `demo:${w.authorUsername}`,
    type: w.type as WorkType,
    typeCustom: w.typeCustom,
    title: w.title,
    summary: w.summary,
    details:
      `${w.summary}\n\nПроцесс: исследование и прототип, затем основная реализация ` +
      `(${w.stack.join(", ")}). Материалы проекта собраны в кейсе, ссылка выше.

Вложение времени — несколько недель вечерами; результат используется в реальных задачах автора.`,
    team: "",
    stack: w.stack.join(", "),
    budget: "",
    potential: "",
    links: w.link ? [{ label: "Открыть проект", url: w.link }] : [],
    verifyToken: "",
    verifyUrl: "",
    verifyExtra: "",
    verifyStatus: "verified",
    verifyNote: "Демо-работа: авторство подтверждено по умолчанию",
    createdAt: created,
    updatedAt: created,
  };
}

/** Есть ли демо-работа с таким ID. */
export function isDemoWorkId(id: string): boolean {
  return cachedWorks.some((w) => w.id === id);
}

/** Отзывы демо-работы: те же настоящие отзывы из общего хранилища. */
export async function getDemoWorkReviews(workId: string, includeHidden = false): Promise<Review[]> {
  return getWorkReviews(workId, includeHidden);
}

/**
 * Рейтинг демо-работы: настоящие отзывы пользователей складываются
 * с базовой витринной оценкой (средневзвешенно по количеству).
 */
export async function getDemoWorkRating(workId: string): Promise<{ avg: number; count: number }> {
  const base = cachedWorks.find((w) => w.id === workId)?.rating ?? { avg: 0, count: 0 };
  const reviews = await getWorkReviews(workId);
  const realCount = reviews.length;
  const realSum = reviews.reduce((s, r) => s + r.stars, 0);
  const count = base.count + realCount;
  if (count === 0) return { avg: 0, count: 0 };
  const avg = Math.round(((base.avg * base.count + realSum) / count) * 10) / 10;
  return { avg, count };
}

/**
 * Все демо-профили текущего выпуска (для списка «Люди» без запроса).
 * Список большой (сотни), поэтому отдаём страницами.
 */
export function listDemoProfiles(offset = 0, limit = 24): DemoProfile[] {
  return cachedUsers.slice(Math.max(0, offset), Math.max(0, offset) + Math.max(0, limit));
}

/** Сколько всего демо-профилей в текущем выпуске. */
export function countDemoProfiles(): number {
  return cachedUsers.length;
}

/**
 * Демо-профили по категории (роли): роль входит в набор ролей профиля.
 * Используется фильтром категорий на странице «Люди».
 */
export function listDemoProfilesByRole(role: string, limit = 48): DemoProfile[] {
  const r = role.trim();
  if (!r) return [];
  const out: DemoProfile[] = [];
  for (const u of cachedUsers) {
    if ((u.roles ?? []).includes(r)) {
      out.push(u);
      if (out.length >= limit) break;
    }
  }
  return out;
}

/**
 * Демо-профили по специализации: точное совпадение строки специализации
 * или подстрока в ней (регистронезависимо).
 */
export function searchDemoProfilesBySpecialization(specialization: string, limit = 24): DemoProfile[] {
  const needle = specialization.trim().toLowerCase();
  if (!needle) return [];
  const out: DemoProfile[] = [];
  for (const u of cachedUsers) {
    const spec = (u.bioDetails.specialization ?? "").toLowerCase();
    if (spec && (spec === needle || spec.includes(needle))) {
      out.push(u);
      if (out.length >= limit) break;
    }
  }
  return out;
}

/**
 * Поиск демо-профилей: точное совпадение по публичному ID
 * или начало юзернейма / имени. Реальный создатель (ID 1) не дублируется —
 * его аккаунт всегда находится среди настоящих пользователей.
 * Если spec задан — фильтрует по специализации вместо текстового запроса.
 */
export function searchDemoProfiles(q: string, limit = 20, spec?: string): DemoProfile[] {
  if (spec !== undefined) return searchDemoProfilesBySpecialization(spec, limit);
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
