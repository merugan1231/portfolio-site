import { randomBytes } from "crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import path from "path";
import { dbEnabled, kvGet, kvSet, kvDel } from "./db";

export type Session = {
  token: string;
  userId: string;
  createdAt: number;
};

export type PendingCode = {
  code: string;
  target: string;
  method: string;
  purpose: "register" | "login";
  payload: Record<string, string>;
  expiresAt: number;
};

const SESSION_TTL = 1000 * 60 * 60 * 24 * 7; // 7 дней
const CODE_TTL = 1000 * 60 * 10; // 10 минут

/**
 * Хранилище сессий и кодов подтверждения — двойной режим, как в storage.ts:
 * - DATABASE_URL задан  -> Postgres, kv_store (ключи session:<token>, code:<target>)
 * - не задан            -> локальный файл data/sessions.json
 *
 * Все операции асинхронные, чтобы работать и в базе, и в файле.
 */

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "sessions.json");

type StoreFile = { sessions?: Session[]; codes?: PendingCode[] };

function isFreshSession(s: Session): boolean {
  return Date.now() - s.createdAt <= SESSION_TTL;
}

function isFreshCode(c: PendingCode): boolean {
  return Date.now() <= c.expiresAt;
}

// ---------- Файловый режим ----------

function fileReadAll(): { sessions: Session[]; codes: PendingCode[] } {
  try {
    const data = JSON.parse(readFileSync(STORE_FILE, "utf-8")) as StoreFile;
    return { sessions: data.sessions ?? [], codes: data.codes ?? [] };
  } catch {
    return { sessions: [], codes: [] };
  }
}

function fileWriteAll(sessions: Session[], codes: PendingCode[]): void {
  try {
    mkdirSync(DATA_DIR, { recursive: true });
    const tmp = STORE_FILE + ".tmp";
    writeFileSync(tmp, JSON.stringify({ sessions, codes }, null, 2) + "\n", "utf-8");
    renameSync(tmp, STORE_FILE);
  } catch (e) {
    console.error("sessions: не удалось сохранить data/sessions.json:", e);
  }
}

// ---------- Публичный API ----------

export async function createSession(userId: string): Promise<Session> {
  const s: Session = { token: randomBytes(32).toString("hex"), userId, createdAt: Date.now() };
  if (dbEnabled()) {
    await kvSet(`session:${s.token}`, s);
  } else {
    const { sessions, codes } = fileReadAll();
    sessions.push(s);
    fileWriteAll(sessions.filter(isFreshSession), codes.filter(isFreshCode));
  }
  return s;
}

export async function getSession(token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  if (dbEnabled()) {
    const s = await kvGet<Session>(`session:${token}`);
    return s && isFreshSession(s) ? s : null;
  }
  return fileReadAll().sessions.find((s) => s.token === token && isFreshSession(s)) ?? null;
}

export async function destroySession(token: string | undefined): Promise<void> {
  if (!token) return;
  if (dbEnabled()) {
    await kvDel(`session:${token}`);
  } else {
    const { sessions, codes } = fileReadAll();
    fileWriteAll(sessions.filter((s) => s.token !== token), codes);
  }
}

/** Удалить все сессии пользователя (при удалении аккаунта). */
export async function destroyUserSessions(userId: string): Promise<void> {
  if (dbEnabled()) {
    const { getPool, ensureTablesSafe } = await import("./db");
    await ensureTablesSafe();
    await getPool().query("DELETE FROM kv_store WHERE key LIKE 'session:%' AND value->>'userId' = $1", [userId]);
  } else {
    const { sessions, codes } = fileReadAll();
    fileWriteAll(sessions.filter((s) => s.userId !== userId), codes);
  }
}

export async function storeCode(entry: Omit<PendingCode, "expiresAt">): Promise<void> {
  const full: PendingCode = { ...entry, expiresAt: Date.now() + CODE_TTL };
  if (dbEnabled()) {
    await kvSet(`code:${entry.target}`, full);
  } else {
    const { sessions, codes } = fileReadAll();
    const rest = codes.filter((c) => c.target !== entry.target && isFreshCode(c));
    fileWriteAll(sessions.filter(isFreshSession), [...rest, full]);
  }
}

export async function verifyCode(target: string, code: string): Promise<PendingCode | null> {
  const read = async (): Promise<PendingCode | null> => {
    if (dbEnabled()) return kvGet<PendingCode>(`code:${target}`);
    return fileReadAll().codes.find((c) => c.target === target) ?? null;
  };
  const remove = async (): Promise<void> => {
    if (dbEnabled()) await kvDel(`code:${target}`);
    else {
      const { sessions, codes } = fileReadAll();
      fileWriteAll(sessions.filter(isFreshSession), codes.filter((c) => c.target !== target));
    }
  };

  const entry = await read();
  if (!entry || entry.code !== code || !isFreshCode(entry)) return null;
  await remove();
  return entry;
}
