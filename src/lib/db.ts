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
            verify_extra TEXT NOT NULL DEFAULT '',
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
          CREATE TABLE IF NOT EXISTS promo_codes (
            code TEXT PRIMARY KEY,
            days INTEGER NOT NULL,
            created_by TEXT NOT NULL DEFAULT '',
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            used_by TEXT,
            used_at TIMESTAMPTZ,
            note TEXT NOT NULL DEFAULT '',
            max_uses INTEGER NOT NULL DEFAULT 1,
            uses INTEGER NOT NULL DEFAULT 0,
            valid_until TIMESTAMPTZ
          );
          CREATE TABLE IF NOT EXISTS tickets (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            user_login TEXT NOT NULL DEFAULT '',
            type TEXT NOT NULL DEFAULT 'appeal',
            subject TEXT NOT NULL DEFAULT '',
            message TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'open',
            admin_reply TEXT NOT NULL DEFAULT '',
            handled_by TEXT NOT NULL DEFAULT '',
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
          );
          CREATE INDEX IF NOT EXISTS tickets_user_idx ON tickets (user_id);
          CREATE TABLE IF NOT EXISTS username_requests (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            user_login TEXT NOT NULL DEFAULT '',
            current_username TEXT NOT NULL DEFAULT '',
            requested_username TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'open',
            admin_reply TEXT NOT NULL DEFAULT '',
            handled_by TEXT NOT NULL DEFAULT '',
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
          );
          CREATE INDEX IF NOT EXISTS username_requests_user_idx ON username_requests (user_id);
          CREATE TABLE IF NOT EXISTS payment_receipts (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            user_login TEXT NOT NULL DEFAULT '',
            amount INTEGER NOT NULL DEFAULT 499,
            months INTEGER NOT NULL DEFAULT 1,
            payer_name TEXT NOT NULL DEFAULT '',
            receipt_url TEXT NOT NULL DEFAULT '',
            comment TEXT NOT NULL DEFAULT '',
            status TEXT NOT NULL DEFAULT 'pending',
            admin_reply TEXT NOT NULL DEFAULT '',
            handled_by TEXT NOT NULL DEFAULT '',
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
          );
          CREATE INDEX IF NOT EXISTS payment_receipts_user_idx ON payment_receipts (user_id);
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
          ["roles", "JSONB NOT NULL DEFAULT '[]'"],
          ["status", "TEXT NOT NULL DEFAULT 'active'"],
          ["status_reason", "TEXT NOT NULL DEFAULT ''"],
          ["status_at", "TIMESTAMPTZ"],
        ];
        for (const [name, def] of cols) {
          await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ${name} ${def}`);
        }
        await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS users_username_idx ON users (lower(username)) WHERE username IS NOT NULL AND username <> ''`);
        // Свой вариант типа работы у работ
        await client.query(`ALTER TABLE works ADD COLUMN IF NOT EXISTS type_custom TEXT NOT NULL DEFAULT ''`);
        // Доп. ссылка подтверждения по типу работы (граф кейса, скриншот слоёв, макет)
        await client.query(`ALTER TABLE works ADD COLUMN IF NOT EXISTS verify_extra TEXT NOT NULL DEFAULT ''`);
        // Промокоды: многократная активация и срок действия кода
        await client.query(`ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS max_uses INTEGER NOT NULL DEFAULT 1`);
        await client.query(`ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS uses INTEGER NOT NULL DEFAULT 0`);
        await client.query(`ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS valid_until TIMESTAMPTZ`);
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
  roles: string[];                    // роли пользователя (программист, осинтер, дизайнер…), макс. 3
  status: "active" | "frozen" | "blocked"; // модерация аккаунта
  statusReason: string;               // причина заморозки/блокировки (видит пользователь)
  statusAt: string | null;            // когда применили
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
    roles: (r.roles as string[]) ?? [],
    status: (r.status as DbUser["status"]) ?? "active",
    statusReason: (r.status_reason as string) ?? "",
    statusAt: r.status_at ? (r.status_at as Date).toISOString() : null,
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
                        plan, plan_expires_at, bio_details, roles, status, status_reason, status_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
     ON CONFLICT (id) DO UPDATE SET
       login = EXCLUDED.login, email = EXCLUDED.email, phone = EXCLUDED.phone,
       password_hash = EXCLUDED.password_hash, role = EXCLUDED.role, method = EXCLUDED.method,
       display_name = EXCLUDED.display_name, username = EXCLUDED.username,
       avatar_emoji = EXCLUDED.avatar_emoji, avatar_url = EXCLUDED.avatar_url,
       bio = EXCLUDED.bio, contacts = EXCLUDED.contacts, profile_updated_at = EXCLUDED.profile_updated_at,
       plan = EXCLUDED.plan, plan_expires_at = EXCLUDED.plan_expires_at, bio_details = EXCLUDED.bio_details,
       roles = EXCLUDED.roles, status = EXCLUDED.status, status_reason = EXCLUDED.status_reason,
       status_at = EXCLUDED.status_at`,
    [u.id, u.login, u.email, u.phone, u.passwordHash, u.role, u.method, u.createdAt,
     u.displayName, u.username, u.avatarEmoji, u.avatarUrl, u.bio, JSON.stringify(u.contacts), u.profileUpdatedAt,
     u.plan ?? "free", u.planExpiresAt, JSON.stringify(u.bioDetails ?? {}), JSON.stringify(u.roles ?? []),
     u.status ?? "active", u.statusReason ?? "", u.statusAt]
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
    // Владелец сервиса всегда creator (и в админах): миграция при каждом старте
    await client.query("UPDATE users SET role = 'creator' WHERE login = $1 AND role <> 'creator'", ["merugan2010"]);
    // На всякий случай: creator не может быть заморожен/заблокирован
    await client.query("UPDATE users SET status = 'active', status_reason = '', status_at = NULL WHERE role = 'creator' AND status <> 'active'");
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

// ---------- Промокоды (подписка Pro за код от админа) ----------

export type DbPromoCode = {
  code: string;
  days: number;
  createdBy: string;
  createdAt: string;
  usedBy: string | null;   // последний активировавший (для обратной совместимости)
  usedAt: string | null;
  note: string;
  maxUses: number;         // сколько раз можно активировать (0 = без ограничений)
  uses: number;            // сколько уже активировали
  validUntil: string | null; // до когда код можно активировать (null = бессрочно)
};

function rowToPromo(r: Record<string, unknown>): DbPromoCode {
  return {
    code: r.code as string,
    days: r.days as number,
    createdBy: (r.created_by as string) ?? "",
    createdAt: (r.created_at as Date).toISOString(),
    usedBy: (r.used_by as string) ?? null,
    usedAt: r.used_at ? (r.used_at as Date).toISOString() : null,
    note: (r.note as string) ?? "",
    maxUses: (r.max_uses as number) ?? 1,
    uses: (r.uses as number) ?? 0,
    validUntil: r.valid_until ? (r.valid_until as Date).toISOString() : null,
  };
}

export async function dbCreatePromoCode(p: DbPromoCode): Promise<void> {
  await ensureTables();
  await getPool().query(
    `INSERT INTO promo_codes (code, days, created_by, created_at, note, max_uses, uses, valid_until)
     VALUES ($1, $2, $3, now(), $4, $5, 0, $6) ON CONFLICT (code) DO NOTHING`,
    [p.code, p.days, p.createdBy, p.note, p.maxUses ?? 1, p.validUntil ?? null]
  );
}

export async function dbListPromoCodes(): Promise<DbPromoCode[]> {
  await ensureTables();
  const res = await getPool().query("SELECT * FROM promo_codes ORDER BY created_at DESC LIMIT 100");
  return res.rows.map(rowToPromo);
}

/**
 * Атомарная активация промокода: счётчик использований растёт, пока есть свободные
 * активации и не истёк срок действия кода. Возвращает срок подписки в днях.
 */
export async function dbRedeemPromoCode(code: string, userId: string): Promise<number | null> {
  await ensureTables();
  const res = await getPool().query(
    `UPDATE promo_codes
     SET uses = uses + 1,
         used_at = now(),
         used_by = CASE WHEN max_uses <= 1 THEN $2 ELSE used_by END
     WHERE upper(code) = upper($1)
       AND (max_uses = 0 OR uses < max_uses)
       AND (valid_until IS NULL OR valid_until > now())
     RETURNING days`,
    [code, userId]
  );
  return res.rows[0]?.days ?? null;
}

export async function dbGetPromoCode(code: string): Promise<DbPromoCode | null> {
  await ensureTables();
  const res = await getPool().query("SELECT * FROM promo_codes WHERE upper(code) = upper($1)", [code]);
  return res.rows[0] ? rowToPromo(res.rows[0]) : null;
}

// ---------- Тикеты (оспаривание модерации и обращения) ----------

export type DbTicket = {
  id: string;
  userId: string;
  userLogin: string;
  type: "appeal" | "other";
  subject: string;
  message: string;
  status: "open" | "resolved" | "dismissed";
  adminReply: string;
  handledBy: string;
  createdAt: string;
  updatedAt: string;
};

function rowToTicket(r: Record<string, unknown>): DbTicket {
  return {
    id: r.id as string,
    userId: r.user_id as string,
    userLogin: (r.user_login as string) ?? "",
    type: (r.type as DbTicket["type"]) ?? "appeal",
    subject: (r.subject as string) ?? "",
    message: r.message as string,
    status: (r.status as DbTicket["status"]) ?? "open",
    adminReply: (r.admin_reply as string) ?? "",
    handledBy: (r.handled_by as string) ?? "",
    createdAt: (r.created_at as Date).toISOString(),
    updatedAt: (r.updated_at as Date).toISOString(),
  };
}

export async function dbCreateTicket(t: Omit<DbTicket, "createdAt" | "updatedAt" | "status" | "adminReply" | "handledBy">): Promise<DbTicket> {
  await ensureTables();
  const res = await getPool().query(
    `INSERT INTO tickets (id, user_id, user_login, type, subject, message)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [t.id, t.userId, t.userLogin, t.type, t.subject, t.message]
  );
  return rowToTicket(res.rows[0]);
}

export async function dbListTicketsByUser(userId: string): Promise<DbTicket[]> {
  await ensureTables();
  const res = await getPool().query("SELECT * FROM tickets WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50", [userId]);
  return res.rows.map(rowToTicket);
}

export async function dbListAllTickets(): Promise<DbTicket[]> {
  await ensureTables();
  const res = await getPool().query("SELECT * FROM tickets ORDER BY (status = 'open') DESC, created_at DESC LIMIT 200");
  return res.rows.map(rowToTicket);
}

export async function dbGetTicket(id: string): Promise<DbTicket | null> {
  await ensureTables();
  const res = await getPool().query("SELECT * FROM tickets WHERE id = $1", [id]);
  return res.rows[0] ? rowToTicket(res.rows[0]) : null;
}

export async function dbUpdateTicket(id: string, status: DbTicket["status"], adminReply: string, handledBy: string): Promise<DbTicket | null> {
  await ensureTables();
  const res = await getPool().query(
    `UPDATE tickets SET status = $2, admin_reply = $3, handled_by = $4, updated_at = now() WHERE id = $1 RETURNING *`,
    [id, status, adminReply, handledBy]
  );
  return res.rows[0] ? rowToTicket(res.rows[0]) : null;
}

// ---------- Запросы на смену юзернейма ----------

export type DbUsernameRequest = {
  id: string;
  userId: string;
  userLogin: string;
  currentUsername: string;
  requestedUsername: string;
  status: "open" | "approved" | "dismissed";
  adminReply: string;
  handledBy: string;
  createdAt: string;
  updatedAt: string;
};

function rowToUsernameRequest(r: Record<string, unknown>): DbUsernameRequest {
  return {
    id: r.id as string,
    userId: r.user_id as string,
    userLogin: (r.user_login as string) ?? "",
    currentUsername: (r.current_username as string) ?? "",
    requestedUsername: (r.requested_username as string) ?? "",
    status: (r.status as DbUsernameRequest["status"]) ?? "open",
    adminReply: (r.admin_reply as string) ?? "",
    handledBy: (r.handled_by as string) ?? "",
    createdAt: (r.created_at as Date).toISOString(),
    updatedAt: (r.updated_at as Date).toISOString(),
  };
}

export async function dbCreateUsernameRequest(t: Omit<DbUsernameRequest, "status" | "adminReply" | "handledBy" | "createdAt" | "updatedAt">): Promise<DbUsernameRequest> {
  await ensureTables();
  const res = await getPool().query(
    `INSERT INTO username_requests (id, user_id, user_login, current_username, requested_username)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [t.id, t.userId, t.userLogin, t.currentUsername, t.requestedUsername]
  );
  return rowToUsernameRequest(res.rows[0]);
}

export async function dbListUsernameRequests(status?: "open" | "approved" | "dismissed"): Promise<DbUsernameRequest[]> {
  await ensureTables();
  const res = status
    ? await getPool().query("SELECT * FROM username_requests WHERE status = $1 ORDER BY (status = 'open') DESC, created_at DESC LIMIT 200", [status])
    : await getPool().query("SELECT * FROM username_requests ORDER BY (status = 'open') DESC, created_at DESC LIMIT 200");
  return res.rows.map(rowToUsernameRequest);
}

export async function dbListUsernameRequestsByUser(userId: string): Promise<DbUsernameRequest[]> {
  await ensureTables();
  const res = await getPool().query("SELECT * FROM username_requests WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10", [userId]);
  return res.rows.map(rowToUsernameRequest);
}

export async function dbGetUsernameRequest(id: string): Promise<DbUsernameRequest | null> {
  await ensureTables();
  const res = await getPool().query("SELECT * FROM username_requests WHERE id = $1", [id]);
  return res.rows[0] ? rowToUsernameRequest(res.rows[0]) : null;
}

export async function dbUpdateUsernameRequest(id: string, status: DbUsernameRequest["status"], adminReply: string, handledBy: string): Promise<DbUsernameRequest | null> {
  await ensureTables();
  const res = await getPool().query(
    `UPDATE username_requests SET status = $2, admin_reply = $3, handled_by = $4, updated_at = now() WHERE id = $1 RETURNING *`,
    [id, status, adminReply, handledBy]
  );
  return res.rows[0] ? rowToUsernameRequest(res.rows[0]) : null;
}

// ---------- Заявки на Pro с чеком об оплате ----------

export type DbPaymentReceipt = {
  id: string;
  userId: string;
  userLogin: string;
  amount: number;          // рубли
  months: number;          // на сколько месяцев Pro
  payerName: string;       // имя плательщика (как в переводе)
  receiptUrl: string;      // ссылка на скрин чека
  comment: string;
  status: "pending" | "approved" | "rejected";
  adminReply: string;
  handledBy: string;
  createdAt: string;
  updatedAt: string;
};

function rowToPaymentReceipt(r: Record<string, unknown>): DbPaymentReceipt {
  return {
    id: r.id as string,
    userId: r.user_id as string,
    userLogin: (r.user_login as string) ?? "",
    amount: (r.amount as number) ?? 499,
    months: (r.months as number) ?? 1,
    payerName: (r.payer_name as string) ?? "",
    receiptUrl: (r.receipt_url as string) ?? "",
    comment: (r.comment as string) ?? "",
    status: (r.status as DbPaymentReceipt["status"]) ?? "pending",
    adminReply: (r.admin_reply as string) ?? "",
    handledBy: (r.handled_by as string) ?? "",
    createdAt: (r.created_at as Date).toISOString(),
    updatedAt: (r.updated_at as Date).toISOString(),
  };
}

export async function dbCreatePaymentReceipt(t: Omit<DbPaymentReceipt, "status" | "adminReply" | "handledBy" | "createdAt" | "updatedAt">): Promise<DbPaymentReceipt> {
  await ensureTables();
  const res = await getPool().query(
    `INSERT INTO payment_receipts (id, user_id, user_login, amount, months, payer_name, receipt_url, comment)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [t.id, t.userId, t.userLogin, t.amount, t.months, t.payerName, t.receiptUrl, t.comment]
  );
  return rowToPaymentReceipt(res.rows[0]);
}

export async function dbListPaymentReceipts(): Promise<DbPaymentReceipt[]> {
  await ensureTables();
  const res = await getPool().query("SELECT * FROM payment_receipts ORDER BY (status = 'pending') DESC, created_at DESC LIMIT 200");
  return res.rows.map(rowToPaymentReceipt);
}

export async function dbListPaymentReceiptsByUser(userId: string): Promise<DbPaymentReceipt[]> {
  await ensureTables();
  const res = await getPool().query("SELECT * FROM payment_receipts WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10", [userId]);
  return res.rows.map(rowToPaymentReceipt);
}

export async function dbGetPaymentReceipt(id: string): Promise<DbPaymentReceipt | null> {
  await ensureTables();
  const res = await getPool().query("SELECT * FROM payment_receipts WHERE id = $1", [id]);
  return res.rows[0] ? rowToPaymentReceipt(res.rows[0]) : null;
}

export async function dbUpdatePaymentReceipt(id: string, status: DbPaymentReceipt["status"], adminReply: string, handledBy: string): Promise<DbPaymentReceipt | null> {
  await ensureTables();
  const res = await getPool().query(
    `UPDATE payment_receipts SET status = $2, admin_reply = $3, handled_by = $4, updated_at = now() WHERE id = $1 RETURNING *`,
    [id, status, adminReply, handledBy]
  );
  return res.rows[0] ? rowToPaymentReceipt(res.rows[0]) : null;
}
