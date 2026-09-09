import { createHash, randomBytes, randomInt } from "crypto";
import type { StoredUser } from "./storage";

export type Role = "admin" | "user";

export type User = StoredUser;

/** Правило пользователя: имя и юзернейм можно менять раз в сутки. */
const PROFILE_CHANGE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export const USERNAME_RE = /^[a-zA-Z0-9_]{3,24}$/;

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
