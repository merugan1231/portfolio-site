import { promises as fs } from "fs";
import path from "path";
import { dbEnabled, kvGet, kvSet, dbReadUsers, dbUpsertUser, type DbUser } from "./db";
import type { Portfolio } from "./portfolio";

/**
 * Единый интерфейс хранилища.
 * - DATABASE_URL задан  -> PostgreSQL (для Vercel/Neon)
 * - не задан            -> локальные JSON-файлы (как раньше)
 */

const DATA_DIR = path.join(process.cwd(), "data");

async function fileRead<T>(file: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, file), "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function fileWrite(file: string, value: unknown): Promise<void> {
  const target = path.join(DATA_DIR, file);
  const tmp = target + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(value, null, 2) + "\n", "utf-8");
  await fs.rename(tmp, target);
}

// ---------- Портфолио ----------

export async function getPortfolio(): Promise<Portfolio> {
  if (dbEnabled()) {
    const doc = await kvGet<Portfolio>("portfolio");
    if (doc) return doc;
  }
  return fileRead<Portfolio>("portfolio.json", { profile: {} as Portfolio["profile"], skills: [], projects: [] });
}

export async function savePortfolio(data: Portfolio): Promise<void> {
  if (dbEnabled()) {
    await kvSet("portfolio", data);
  } else {
    await fileWrite("portfolio.json", data);
  }
}

// ---------- Пользователи ----------

export type StoredUser = DbUser;

export async function getUsers(): Promise<StoredUser[]> {
  if (dbEnabled()) return dbReadUsers();
  const { users } = await fileRead<{ users: StoredUser[] }>("users.json", { users: [] });
  return users;
}

export async function saveUser(u: StoredUser): Promise<void> {
  if (dbEnabled()) return dbUpsertUser(u);
  const users = await getUsers();
  const idx = users.findIndex((x) => x.id === u.id);
  if (idx >= 0) users[idx] = u;
  else users.push(u);
  await fileWrite("users.json", { users });
}

export async function findUserByLogin(login: string): Promise<StoredUser | undefined> {
  const users = await getUsers();
  return users.find((u) => u.login.toLowerCase() === login.toLowerCase());
}

export async function findUserByEmail(email: string): Promise<StoredUser | undefined> {
  const users = await getUsers();
  return users.find((u) => u.email && u.email === email.toLowerCase());
}

/** Коды подтверждения: в БД с TTL или в памяти локально. */
const memCodes = new Map<string, { code: string; payload: Record<string, string>; expiresAt: number }>();

export async function putCode(target: string, code: string, payload: Record<string, string>): Promise<void> {
  if (dbEnabled()) {
    await kvSet(`code:${target}`, { code, payload, expiresAt: Date.now() + 10 * 60 * 1000 });
  } else {
    memCodes.set(target, { code, payload, expiresAt: Date.now() + 10 * 60 * 1000 });
  }
}

export async function takeCode(target: string, code: string): Promise<Record<string, string> | null> {
  let entry: { code: string; payload: Record<string, string>; expiresAt: number } | null = null;
  if (dbEnabled()) {
    entry = await kvGet(`code:${target}`);
    if (entry) await kvSet(`code:${target}`, { ...entry, expiresAt: 0 });
  } else {
    entry = memCodes.get(target) ?? null;
    if (entry) memCodes.delete(target);
  }
  if (!entry || entry.code !== code || Date.now() > entry.expiresAt) return null;
  return entry.payload;
}

// re-export для совместимости
export { dbEnabled };
export type { DbUser };
