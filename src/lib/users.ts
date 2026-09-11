import { createHash, randomBytes, randomInt } from "crypto";
import type { StoredUser } from "./storage";

/**
 * Простой rate-limit в памяти процесса: окно на ключ (IP+логин).
 * Защита от перебора паролей и спама кодами. На serverless — per-instance,
 * что всё равно резко удорожает атаку.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 5000) {
      // чистим устаревшие, чтобы память не текла
      for (const [k, v] of buckets) if (now > v.resetAt) buckets.delete(k);
    }
    return { ok: true, retryAfterSec: 0 };
  }
  b.count += 1;
  if (b.count > limit) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((b.resetAt - now) / 1000)) };
  }
  return { ok: true, retryAfterSec: 0 };
}

/** IP запроса (за прокси Vercel — из x-forwarded-for). */
export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export type Role = "creator" | "admin" | "user";

/** Логин владельца сервиса — главный администратор (creator). */
export const CREATOR_LOGIN = "merugan2010";

export type AccountStatus = "active" | "frozen" | "blocked";

export const STATUS_LABELS: Record<AccountStatus, string> = {
  active: "активен",
  frozen: "заморожен",
  blocked: "заблокирован",
};

export function isStaff(u: { role?: string | null } | null | undefined): boolean {
  return u?.role === "creator" || u?.role === "admin";
}

export function isCreator(u: { role?: string | null } | null | undefined): boolean {
  return u?.role === "creator";
}

export type User = StoredUser;

/** Правило пользователя: имя и юзернейм можно менять раз в сутки. */
const PROFILE_CHANGE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

/**
 * Юзернейм: от 5 символов, начинается и заканчивается буквой,
 * внутри — латиница, цифры и _. Задаётся один раз и не меняется.
 */
export const USERNAME_RE = /^[a-zA-Z][a-zA-Z0-9_]{3,22}[a-zA-Z]$/;
export const USERNAME_RULE =
  "от 5 до 24 символов, начинается и заканчивается буквой, внутри — латиница, цифры и _";
export const USERNAME_LOCKED_MSG = "Юзернейм закрепляется за аккаунтом один раз и не меняется";

/** Лимит работ на бесплатном тарифе. */
export const FREE_WORK_LIMIT = 5;
export const PRO_PRICE_LABEL = "499 ₽/мес";

/** Pro активен, если план pro и подписка не истекла. */
export function isPro(u: { plan?: string | null; planExpiresAt?: string | null }): boolean {
  if (u.plan !== "pro") return false;
  if (u.planExpiresAt && new Date(u.planExpiresAt).getTime() < Date.now()) return false;
  return true;
}

/** Пункты биографии в профиле — все необязательные, заполняются по желанию. */
export const BIO_DETAIL_FIELDS = [
  { id: "specialization", label: "Специализация", placeholder: "Fullstack-разработчик, OSINT-аналитик, иллюстратор…" },
  { id: "experience", label: "Опыт", placeholder: "3 года коммерческой разработки, 20+ проектов…" },
  { id: "education", label: "Образование", placeholder: "Вуз, курсы, самообразование…" },
  { id: "city", label: "Город", placeholder: "Москва / удалённо" },
  { id: "languages", label: "Языки", placeholder: "Русский — родной, английский — B2" },
  { id: "status", label: "Статус занятости", placeholder: "Открыт к заказам / на проекте / ищу команду" },
  { id: "achievements", label: "Достижения", placeholder: "Хакатоны, публикации, open source, сертификаты…" },
  { id: "funFact", label: "Интересный факт", placeholder: "То, что запомнит вас человек" },
] as const;

export type BioDetailId = (typeof BIO_DETAIL_FIELDS)[number]["id"];
export type BioDetails = Partial<Record<BioDetailId, string>>;
export const BIO_DETAIL_IDS = BIO_DETAIL_FIELDS.map((f) => f.id) as BioDetailId[];

/**
 * Роли пользователя (кто он по деятельности) — показываются в профиле
 * и по ним работает фильтр в поиске людей. Максимум 3 на аккаунт.
 */
export const USER_ROLES = [
  { id: "developer", label: "Программист", emoji: "💻" },
  { id: "osint", label: "OSINT-аналитик", emoji: "🔍" },
  { id: "osint-author", label: "Создатель кейсов", emoji: "🕵️" },
  { id: "osint-revealer", label: "Раскрыватель кейсов", emoji: "🕸️" },
  { id: "designer", label: "Дизайнер", emoji: "🎨" },
  { id: "tester", label: "Тестировщик (QA)", emoji: "🧪" },
  { id: "devops", label: "DevOps", emoji: "⚙️" },
  { id: "analyst", label: "Аналитик", emoji: "📊" },
  { id: "marketer", label: "Маркетолог", emoji: "📈" },
  { id: "writer", label: "Копирайтер", emoji: "✍️" },
  { id: "gamedev", label: "Геймдев", emoji: "🎮" },
  { id: "other", label: "Другое", emoji: "✨" },
] as const;

export type UserRoleId = (typeof USER_ROLES)[number]["id"];
export const USER_ROLE_IDS = USER_ROLES.map((r) => r.id) as UserRoleId[];
export const MAX_USER_ROLES = 3;

export function roleLabel(id: string): string {
  return USER_ROLES.find((r) => r.id === id)?.label ?? id;
}

export function roleEmoji(id: string): string {
  return USER_ROLES.find((r) => r.id === id)?.emoji ?? "•";
}

export function hashPassword(password: string): string {
  return "sha256:" + createHash("sha256").update(`pf-user::${password}`).digest("hex");
}

export function newId(prefix: string): string {
  return `${prefix}_${randomBytes(6).toString("hex")}`;
}

/** Публичный случайный ID пользователя (10 символов, hex). ID «1» — только у создателя. */
export function newPublicId(): string {
  return randomBytes(5).toString("hex");
}

export function generateCode(): string {
  return String(randomInt(100000, 1000000));
}

/** Публичное имя: displayName или username или login. */
export function publicName(u: StoredUser): string {
  return u.displayName?.trim() || u.username || u.login;
}

/** Прошли ли сутки с последней смены профиля. */
export function canChangeProfile(u: StoredUser): boolean {
  return !u.profileUpdatedAt || Date.now() - new Date(u.profileUpdatedAt).getTime() >= PROFILE_CHANGE_COOLDOWN_MS;
}

/** Через сколько можно менять снова (мс) — 0 если можно уже сейчас. */
export function profileCooldownLeft(u: StoredUser): number {
  if (!u.profileUpdatedAt) return 0;
  const left = PROFILE_CHANGE_COOLDOWN_MS - (Date.now() - new Date(u.profileUpdatedAt).getTime());
  return left > 0 ? left : 0;
}
