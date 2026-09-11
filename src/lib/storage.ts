import { promises as fs } from "fs";
import path from "path";
import { dbEnabled, kvGet, kvSet, kvDel, dbReadUsers, dbUpsertUser, getPool, ensureTablesSafe, type DbUser } from "./db";
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
  // Файловый режим: владелец всегда creator, персонал всегда активен
  for (const u of users) {
    const mutable = u as { login: string; role: string; status?: string };
    if (mutable.login === "merugan2010" && mutable.role !== "creator") {
      mutable.role = "creator";
    }
    if (mutable.role !== "user" && mutable.status && mutable.status !== "active") {
      mutable.status = "active";
    }
    // Владелец всегда имеет публичный ID «1»
    if (mutable.login === "merugan2010" && (u as { publicId?: string | null }).publicId !== "1") {
      (u as { publicId?: string | null }).publicId = "1";
    }
  }
  return users;
}

export async function saveUser(u: StoredUser): Promise<void> {
  // publicId — каноничное поле; public_id дублируем для прямого чтения файла
  const withPid = { ...u, publicId: u.publicId ?? null, public_id: u.publicId ?? null } as StoredUser;
  if (dbEnabled()) return dbUpsertUser(withPid);
  const users = await getUsers();
  const idx = users.findIndex((x) => x.id === withPid.id);
  if (idx >= 0) users[idx] = withPid;
  else users.push(withPid);
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

/**
 * Поиск пользователей для страницы «Люди»: по началу юзернейма и/или роли.
 * role — id из USER_ROLES; если задан, фильтруем по нему.
 */
export async function searchUsersByUsername(q: string, limit = 10, role?: string): Promise<StoredUser[]> {
  const prefix = q.trim().toLowerCase();
  if (!prefix && !role) return [];
  const users = await getUsers();
  return users
    .filter((u) => {
      if (!u.username) return false;
      if (role && !(u.roles ?? []).includes(role)) return false;
      if (prefix && !u.username.toLowerCase().startsWith(prefix)) return false;
      return true;
    })
    .slice(0, limit);
}

export async function findUserByEmail(email: string): Promise<StoredUser | undefined> {
  const users = await getUsers();
  return users.find((u) => u.email && u.email === email.toLowerCase());
}

export async function findUserById(id: string): Promise<StoredUser | undefined> {
  const users = await getUsers();
  return users.find((u) => u.id === id);
}

export async function findUsernameRequest(id: string): Promise<DbUsernameRequest | null> {
  if (dbEnabled()) {
    const { dbGetUsernameRequest } = await import("./db");
    return dbGetUsernameRequest(id);
  }
  return memUsernameRequests.find((r) => r.id === id) ?? null;
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
const memCodes = new Map<string, { code: string; payload: Record<string, string>; expiresAt: number; attempts: number }>();

/** Максимум неверных попыток ввода кода — после код сгорает. */
const CODE_MAX_ATTEMPTS = 10;

export async function putCode(target: string, code: string, payload: Record<string, string>): Promise<void> {
  if (dbEnabled()) {
    await kvSet(`code:${target}`, { code, payload, expiresAt: Date.now() + 10 * 60 * 1000, attempts: 0 });
  } else {
    memCodes.set(target, { code, payload, expiresAt: Date.now() + 10 * 60 * 1000, attempts: 0 });
  }
}

/**
 * Проверка кода. Неверный ввод НЕ сжигает код: попытки считаются
 * (максимум CODE_MAX_ATTEMPTS, потом код сгорает), верный — погашает код.
 * Возвращает payload при успехе, null при провале.
 */
export async function takeCode(target: string, code: string): Promise<Record<string, string> | null> {
  let entry: { code: string; payload: Record<string, string>; expiresAt: number; attempts: number } | null = null;
  if (dbEnabled()) {
    entry = await kvGet(`code:${target}`);
  } else {
    entry = memCodes.get(target) ?? null;
  }
  if (!entry || Date.now() > entry.expiresAt) {
    if (entry) await removeCode(target);
    return null;
  }
  if (entry.code === code) {
    await removeCode(target);
    return entry.payload;
  }
  const attempts = (entry.attempts ?? 0) + 1;
  if (attempts >= CODE_MAX_ATTEMPTS) {
    await removeCode(target);
  } else if (dbEnabled()) {
    await kvSet(`code:${target}`, { ...entry, attempts });
  } else {
    memCodes.set(target, { ...entry, attempts });
  }
  return null;
}

/** Осталось попыток у кода (для сообщений). */
export async function codeAttemptsLeft(target: string): Promise<number> {
  const entry = dbEnabled() ? await kvGet<{ attempts?: number } | null>(`code:${target}`) : memCodes.get(target) ?? null;
  if (!entry) return 0;
  return Math.max(0, CODE_MAX_ATTEMPTS - (entry.attempts ?? 0));
}

async function removeCode(target: string): Promise<void> {
  if (dbEnabled()) await kvDel(`code:${target}`);
  else memCodes.delete(target);
}

// ---------- Тикеты и статусы аккаунтов (обёртки; в файловом режиме — в памяти) ----------

import {
  dbCreateTicket, dbListTicketsByUser, dbListAllTickets, dbUpdateTicket,
  dbListTicketMessages, dbAddTicketMessage,
  type DbTicket, type DbTicketMessage,
} from "./db";
import {
  dbCreateUsernameRequest, dbListUsernameRequests, dbListUsernameRequestsByUser, dbUpdateUsernameRequest,
  type DbUsernameRequest,
} from "./db";
import {
  dbCreatePaymentReceipt, dbListPaymentReceipts, dbListPaymentReceiptsByUser, dbGetPaymentReceipt, dbUpdatePaymentReceipt,
  type DbPaymentReceipt,
} from "./db";

export type Ticket = DbTicket;
const memTickets: Ticket[] = [];

export function createTicket(t: { userId: string; userLogin: string; type: "appeal" | "other"; subject: string; message: string }): Promise<Ticket> {
  if (dbEnabled()) {
    return dbCreateTicket({ ...t, id: `t_${Math.random().toString(16).slice(2, 10)}` });
  }
  const ticket: Ticket = {
    ...t,
    id: `t_${Math.random().toString(16).slice(2, 10)}`,
    status: "open",
    adminReply: "",
    handledBy: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  memTickets.unshift(ticket);
  return Promise.resolve(ticket);
}

export function listTicketsByUser(userId: string): Promise<Ticket[]> {
  return dbEnabled() ? dbListTicketsByUser(userId) : Promise.resolve(memTickets.filter((t) => t.userId === userId));
}

export function listAllTickets(): Promise<Ticket[]> {
  return dbEnabled() ? dbListAllTickets() : Promise.resolve([...memTickets]);
}

export function resolveTicket(id: string, status: "resolved" | "dismissed", adminReply: string, handledBy: string): Promise<Ticket | null> {
  if (dbEnabled()) return dbUpdateTicket(id, status, adminReply, handledBy);
  const t = memTickets.find((x) => x.id === id) ?? null;
  if (t) {
    t.status = status;
    t.adminReply = adminReply;
    t.handledBy = handledBy;
    t.updatedAt = new Date().toISOString();
  }
  return Promise.resolve(t);
}

// ---------- Переписка в тикетах (обёртки; в файловом режиме — в памяти) ----------

export type TicketMessage = DbTicketMessage;
const memTicketMessages: TicketMessage[] = [];

export function listTicketMessages(ticketId: string): Promise<TicketMessage[]> {
  return dbEnabled()
    ? dbListTicketMessages(ticketId)
    : Promise.resolve(
        memTicketMessages
          .filter((m) => m.ticketId === ticketId)
          .sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : a.id - b.id))
      );
}

export function addTicketMessage(ticketId: string, authorRole: "user" | "admin", author: string, body: string): Promise<TicketMessage> {
  if (dbEnabled()) return dbAddTicketMessage(ticketId, authorRole, author, body);
  const msg: TicketMessage = {
    id: Date.now(),
    ticketId,
    authorRole,
    author,
    body,
    createdAt: new Date().toISOString(),
  };
  memTicketMessages.push(msg);
  if (authorRole === "user") {
    const t = memTickets.find((x) => x.id === ticketId);
    if (t) {
      t.status = "open";
      t.updatedAt = msg.createdAt;
    }
  } else {
    const t = memTickets.find((x) => x.id === ticketId);
    if (t) t.updatedAt = msg.createdAt;
  }
  return Promise.resolve(msg);
}

// re-export для совместимости
export { dbEnabled, kvGet, kvSet, kvDel };
export type { DbUser, DbUsernameRequest };

// ---------- Запросы на смену юзернейма (обёртки; в файловом режиме — в памяти) ----------

const memUsernameRequests: DbUsernameRequest[] = [];

export function createUsernameRequest(t: { userId: string; userLogin: string; currentUsername: string; requestedUsername: string; id: string }): Promise<DbUsernameRequest> {
  if (dbEnabled()) return dbCreateUsernameRequest(t);
  const req: DbUsernameRequest = {
    ...t,
    status: "open",
    adminReply: "",
    handledBy: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  memUsernameRequests.unshift(req);
  return Promise.resolve(req);
}

export function listUsernameRequests(): Promise<DbUsernameRequest[]> {
  return dbEnabled()
    ? dbListUsernameRequests()
    : Promise.resolve([...memUsernameRequests].sort((a, b) => Number(b.status === "open") - Number(a.status === "open")));
}

export function listUsernameRequestsByUser(userId: string): Promise<DbUsernameRequest[]> {
  return dbEnabled()
    ? dbListUsernameRequestsByUser(userId)
    : Promise.resolve(memUsernameRequests.filter((r) => r.userId === userId));
}

export function updateUsernameRequest(id: string, status: DbUsernameRequest["status"], adminReply: string, handledBy: string): Promise<DbUsernameRequest | null> {
  if (dbEnabled()) return dbUpdateUsernameRequest(id, status, adminReply, handledBy);
  const r = memUsernameRequests.find((x) => x.id === id) ?? null;
  if (r) {
    r.status = status;
    r.adminReply = adminReply;
    r.handledBy = handledBy;
    r.updatedAt = new Date().toISOString();
  }
  return Promise.resolve(r);
}

// ---------- Заявки на Pro с чеком (обёртки; в файловом режиме — в памяти) ----------

const memPaymentReceipts: DbPaymentReceipt[] = [];

export function createPaymentReceipt(t: { id: string; userId: string; userLogin: string; amount: number; months: number; payerName: string; receiptUrl: string; comment: string }): Promise<DbPaymentReceipt> {
  if (dbEnabled()) return dbCreatePaymentReceipt(t);
  const r: DbPaymentReceipt = {
    ...t,
    status: "pending",
    adminReply: "",
    handledBy: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  memPaymentReceipts.unshift(r);
  return Promise.resolve(r);
}

export function listPaymentReceipts(): Promise<DbPaymentReceipt[]> {
  if (dbEnabled()) return dbListPaymentReceipts();
  return Promise.resolve([...memPaymentReceipts].sort((a, b) => Number(b.status === "pending") - Number(a.status === "pending")));
}

export function listPaymentReceiptsByUser(userId: string): Promise<DbPaymentReceipt[]> {
  if (dbEnabled()) return dbListPaymentReceiptsByUser(userId);
  return Promise.resolve(memPaymentReceipts.filter((r) => r.userId === userId));
}

export function getPaymentReceipt(id: string): Promise<DbPaymentReceipt | null> {
  if (dbEnabled()) return dbGetPaymentReceipt(id);
  return Promise.resolve(memPaymentReceipts.find((r) => r.id === id) ?? null);
}

export function updatePaymentReceipt(id: string, status: DbPaymentReceipt["status"], adminReply: string, handledBy: string): Promise<DbPaymentReceipt | null> {
  if (dbEnabled()) return dbUpdatePaymentReceipt(id, status, adminReply, handledBy);
  const r = memPaymentReceipts.find((x) => x.id === id) ?? null;
  if (r) {
    r.status = status;
    r.adminReply = adminReply;
    r.handledBy = handledBy;
    r.updatedAt = new Date().toISOString();
  }
  return Promise.resolve(r);
}
