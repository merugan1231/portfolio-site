import { Pool, type PoolClient } from "pg";

/**
 * Хранилище на PostgreSQL (Neon и любой другой Postgres).
 * Если DATABASE_URL не задан — используется файловый режим (data/*.json),
 * чтобы сайт работал локально без базы.
 */

let pool: Pool | null = null;
let tablesReady: Promise<void> | null = null;

export function dbEnabled(): boolean {
  return !!process.env.DATABASE_URL;
}

function getPoolInternal(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 3,
    });
  }
  return pool;
}

async function ensureTables(): Promise<void> {
  if (!tablesReady) {
    tablesReady = (async () => {
      const client = await getPool().connect();
      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS kv_store (
            key TEXT PRIMARY KEY,
            value JSONB NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
          );
          CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            login TEXT NOT NULL UNIQUE,
            email TEXT NOT NULL DEFAULT '',
            phone TEXT NOT NULL DEFAULT '',
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'user',
            method TEXT NOT NULL DEFAULT 'email',
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
          );
          CREATE TABLE IF NOT EXISTS works (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            type TEXT NOT NULL,
            title TEXT NOT NULL,
            summary TEXT NOT NULL DEFAULT '',
            details TEXT NOT NULL DEFAULT '',
            team TEXT NOT NULL DEFAULT '',
            stack TEXT NOT NULL DEFAULT '',
            budget TEXT NOT NULL DEFAULT '',
            potential TEXT NOT NULL DEFAULT '',
            links JSONB NOT NULL DEFAULT '[]',
            verify_token TEXT NOT NULL,
            verify_url TEXT NOT NULL DEFAULT '',
            verify_status TEXT NOT NULL DEFAULT 'unverified',
            verify_note TEXT NOT NULL DEFAULT '',
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
          );
          CREATE INDEX IF NOT EXISTS works_user_idx ON works (user_id);
          CREATE TABLE IF NOT EXISTS reviews (
            id TEXT PRIMARY KEY,
            work_id TEXT NOT NULL,
            author_id TEXT NOT NULL,
            stars INTEGER NOT NULL,
            text TEXT NOT NULL DEFAULT '',
            status TEXT NOT NULL DEFAULT 'published',
            dispute_reason TEXT NOT NULL DEFAULT '',
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
          );
          CREATE INDEX IF NOT EXISTS reviews_work_idx ON reviews (work_id);
        `);
        // Миграция: новые колонки профиля (для уже существующих таблиц)
        const cols = [
          ["display_name", "TEXT NOT NULL DEFAULT ''"],
          ["username", "TEXT"],
          ["avatar_emoji", "TEXT NOT NULL DEFAULT ''"],
          ["avatar_url", "TEXT NOT NULL DEFAULT ''"],
          ["bio", "TEXT NOT NULL DEFAULT ''"],
          ["contacts", "JSONB NOT NULL DEFAULT '[]'"],
          ["profile_updated_at", "TIMESTAMPTZ"],
          ["plan", "TEXT NOT NULL DEFAULT 'free'"],
          ["plan_expires_at", "TIMESTAMPTZ"],
          ["bio_details", "JSONB NOT NULL DEFAULT '{}'"],
        ];
        for (const [name, def] of cols) {
          await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ${name} ${def}`);
        }
        await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS users_username_idx ON users (lower(username)) WHERE username IS NOT NULL AND username <> ''`);
        // Свой вариант типа работы у работ
        await client.query(`ALTER TABLE works ADD COLUMN IF NOT EXISTS type_custom TEXT NOT NULL DEFAULT ''`);
      } finally {
        client.release();
      }
    })();
  }
  return tablesReady;
}

/** Доступ к пулу для доменных модулей (works и т.п.). */
export function getPool(): Pool {
  return getPoolInternal();
}

/** Гарантия создания таблиц для внешних модулей. */
export async function ensureTablesSafe(): Promise<void> {
  await ensureTables();
}

/** Универсальное JSON-хранилище для документов (портфолио, коды и т.п.). */
export async function kvGet<T>(key: string): Promise<T | null> {
  await ensureTables();
  const res = await getPool().query("SELECT value FROM kv_store WHERE key = $1", [key]);
  return (res.rows[0]?.value as T) ?? null;
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  await ensureTables();
  await getPool().query(
    `INSERT INTO kv_store (key, value) VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = now()`,
    [key, JSON.stringify(value)]
  );
}

export async function kvDel(key: string): Promise<void> {
  await ensureTables();
  await getPool().query("DELETE FROM kv_store WHERE key = $1", [key]);
}

export type DbUser = {
  id: string;
  login: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: "admin" | "user";
  method: string;
  createdAt: string;
  // Профиль (новое)
  displayName: string;      // имя, высвечивается над username
  username: string | null;  // публичный @юзернейм для поиска (может быть не задан у OAuth-пользователей)
  avatarEmoji: string;
  avatarUrl: string;
  bio: string;
  contacts: { label: string; value: string }[];
  profileUpdatedAt: string | null; // для ограничения смены имени/юза раз в сутки
  plan: "free" | "pro";            // тариф: лимит работ
  planExpiresAt: string | null;    // до когда активен Pro
  bioDetails: Record<string, string>; // биография по пунктам (все необязательны)
};

export const DEFAULT_CONTACTS: { label: string; value: string }[] = [];

function rowToUser(r: Record<string, unknown>): DbUser {
  return {
    id: r.id as string,
    login: r.login as string,
    email: r.email as string,
    phone: r.phone as string,
    passwordHash: r.password_hash as string,
    role: r.role as "admin" | "user",
    method: r.method as string,
    createdAt: (r.created_at as Date).toISOString(),
    displayName: (r.display_name as string) ?? "",
    username: (r.username as string) || null,
    avatarEmoji: (r.avatar_emoji as string) ?? "",
    avatarUrl: (r.avatar_url as string) ?? "",
    bio: (r.bio as string) ?? "",
    contacts: (r.contacts as DbUser["contacts"]) ?? [],
    profileUpdatedAt: r.profile_updated_at ? (r.profile_updated_at as Date).toISOString() : null,
    plan: (r.plan as DbUser["plan"]) ?? "free",
    planExpiresAt: r.plan_expires_at ? (r.plan_expires_at as Date).toISOString() : null,
    bioDetails: (r.bio_details as Record<string, string>) ?? {},
  };
}

export async function dbReadUsers(): Promise<DbUser[]> {
  await ensureTables();
  const res = await getPool().query("SELECT * FROM users ORDER BY created_at ASC");
  return res.rows.map(rowToUser);
}

export async function dbUpsertUser(u: DbUser): Promise<void> {
  await ensureTables();
  await getPool().query(
    `INSERT INTO users (id, login, email, phone, password_hash, role, method, created_at,
                        display_name, username, avatar_emoji, avatar_url, bio, contacts, profile_updated_at,
                        plan, plan_expires_at, bio_details)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
     ON CONFLICT (id) DO UPDATE SET
       login = EXCLUDED.login, email = EXCLUDED.email, phone = EXCLUDED.phone,
       password_hash = EXCLUDED.password_hash, role = EXCLUDED.role, method = EXCLUDED.method,
       display_name = EXCLUDED.display_name, username = EXCLUDED.username,
       avatar_emoji = EXCLUDED.avatar_emoji, avatar_url = EXCLUDED.avatar_url,
       bio = EXCLUDED.bio, contacts = EXCLUDED.contacts, profile_updated_at = EXCLUDED.profile_updated_at,
       plan = EXCLUDED.plan, plan_expires_at = EXCLUDED.plan_expires_at, bio_details = EXCLUDED.bio_details`,
    [u.id, u.login, u.email, u.phone, u.passwordHash, u.role, u.method, u.createdAt,
     u.displayName, u.username, u.avatarEmoji, u.avatarUrl, u.bio, JSON.stringify(u.contacts), u.profileUpdatedAt,
     u.plan ?? "free", u.planExpiresAt, JSON.stringify(u.bioDetails ?? {})]
  );
}

/** Создание таблиц и стартовые данные: админ + портфолио по умолчанию. */
export async function initDb(seedAdmin?: DbUser, seedPortfolio?: unknown): Promise<void> {
  await ensureTables();
  const client: PoolClient = await getPool().connect();
  try {
    if (seedAdmin) {
      const exists = await client.query("SELECT 1 FROM users WHERE login = $1", [seedAdmin.login]);
      if (exists.rowCount === 0) {
        await client.query(
          `INSERT INTO users (id, login, email, phone, password_hash, role, method, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
          [seedAdmin.id, seedAdmin.login, seedAdmin.email, seedAdmin.phone,
           seedAdmin.passwordHash, seedAdmin.role, seedAdmin.method, seedAdmin.createdAt]
        );
      }
    }
    if (seedPortfolio) {
      const exists = await client.query("SELECT 1 FROM kv_store WHERE key = 'portfolio'");
      if (exists.rowCount === 0) {
        await client.query("INSERT INTO kv_store (key, value) VALUES ('portfolio', $1)", [
          JSON.stringify(seedPortfolio),
        ]);
      }
    }
  } finally {
    client.release();
  }
}

export type Tx = PoolClient;

export async function withTx<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
