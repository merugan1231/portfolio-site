import { promises as fs } from "fs";
import path from "path";
import { dbEnabled, kvGet, kvSet, dbReadUsers, dbUpsertUser, getPool, ensureTablesSafe, type DbUser } from "./db";
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

/** Публичный юзернейм (@name) — без учёта регистра. */
export async function findUserByUsername(username: string): Promise<StoredUser | undefined> {
  const q = username.trim().toLowerCase();
  if (!q) return undefined;
  const users = await getUsers();
  return users.find((u) => u.username && u.username.toLowerCase() === q);
}

/** Поиск пользователей по началу юзернейма (для поиска людей). */
export async function searchUsersByUsername(q: string, limit = 10): Promise<StoredUser[]> {
  const prefix = q.trim().toLowerCase();
  if (!prefix) return [];
  const users = await getUsers();
  return users
    .filter((u) => u.username && u.username.toLowerCase().startsWith(prefix))
    .slice(0, limit);
}

export async function findUserByEmail(email: string): Promise<StoredUser | undefined> {
  const users = await getUsers();
  return users.find((u) => u.email && u.email === email.toLowerCase());
}

/**
 * Полное удаление аккаунта: пользователь, его работы и отзывы на них,
 * его отзывы на чужие работы, сессии и коды подтверждения.
 * Возвращает количество удалённых работ (для отчёта).
 */
export async function deleteUserCompletely(userId: string): Promise<{ worksDeleted: number }> {
  if (dbEnabled()) {
    await ensureTablesSafe();
    const pool = getPool();
    const u = await pool.query("SELECT email FROM users WHERE id = $1", [userId]);
    const email = (u.rows[0]?.email as string) ?? "";
    const w = await pool.query("SELECT count(*)::int AS n FROM works WHERE user_id = $1", [userId]);
    await pool.query("DELETE FROM reviews WHERE author_id = $1", [userId]);
    await pool.query("DELETE FROM reviews WHERE work_id IN (SELECT id FROM works WHERE user_id = $1)", [userId]);
    await pool.query("DELETE FROM works WHERE user_id = $1", [userId]);
    await pool.query("DELETE FROM kv_store WHERE key LIKE 'session:%' AND value->>'userId' = $1", [userId]);
    if (email) {
      await pool.query("DELETE FROM kv_store WHERE key LIKE 'code:%' AND value->'payload'->>'email' = $1", [email]);
    }
    await pool.query("DELETE FROM users WHERE id = $1", [userId]);
    return { worksDeleted: w.rows[0]?.n ?? 0 };
  }
  // Файловый режим
  const users = await getUsers();
  const target = users.find((u) => u.id === userId);
  await fileWrite("users.json", { users: users.filter((u) => u.id !== userId) });
  const worksFile = path.join(DATA_DIR, "works.json");
  try {
    const raw = await fs.readFile(worksFile, "utf-8");
    const store = JSON.parse(raw) as { works: { id: string; userId: string }[]; reviews: { id: string; workId: string; authorId: string }[] };
    const myWorkIds = new Set(store.works.filter((w) => w.userId === userId).map((w) => w.id));
    const keptWorks = store.works.filter((w) => w.userId !== userId);
    const keptReviews = store.reviews.filter((r) => r.authorId !== userId && !myWorkIds.has(r.workId));
    await fileWrite("works.json", { works: keptWorks, reviews: keptReviews });
    return { worksDeleted: myWorkIds.size };
  } catch {
    return { worksDeleted: 0 };
  }
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
