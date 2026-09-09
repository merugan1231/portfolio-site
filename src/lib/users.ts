import { createHash, randomBytes, randomInt } from "crypto";
import type { StoredUser } from "./storage";

export type Role = "admin" | "user";

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
