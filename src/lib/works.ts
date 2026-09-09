import { createHash, randomBytes } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { dbEnabled, kvGet, kvSet, getPool, ensureTablesSafe } from "./db";

/**
 * Работы пользователей и отзывы на них.
 * Двойной режим хранения: Postgres (DATABASE_URL) или JSON-файлы data/works.json.
 */

export const WORK_TYPES = [
  { id: "site", label: "Сайт / лендинг" },
  { id: "webapp", label: "Веб-приложение" },
  { id: "bot", label: "Телеграм-бот" },
  { id: "mobile", label: "Мобильное приложение" },
  { id: "osint", label: "OSINT-расследование" },
  { id: "design", label: "Дизайн / иллюстрация" },
  { id: "script", label: "Скрипт / автоматизация" },
  { id: "custom", label: "Свой вариант" },
] as const;

export type WorkType = (typeof WORK_TYPES)[number]["id"];

export type WorkLink = { label: string; url: string };

export type Work = {
  id: string;
  userId: string;
  type: WorkType;
  typeCustom: string;    // свой вариант типа (когда type === "custom")
  title: string;
  summary: string;       // краткое описание
  details: string;       // как сделано, подробно
  team: string;          // с кем сделано
  stack: string;         // инструменты и технологии
  budget: string;        // сколько вложил
  potential: string;     // перспектива / что может принести
  links: WorkLink[];     // до 3 ссылок
  verifyToken: string;   // код для подтверждения собственности
  verifyUrl: string;     // где размещён код
  verifyStatus: "unverified" | "pending" | "verified";
  verifyNote: string;    // результат автопроверки
  createdAt: string;
  updatedAt: string;
};

export type Review = {
  id: string;
  workId: string;
  authorId: string;
  stars: number;               // 1..5
  text: string;                // обязателен при stars < 4, от 30 символов
  status: "published" | "disputed" | "removed";
  disputeReason: string;       // текст владельца при оспаривании
  createdAt: string;
};

const DATA_FILE = path.join(process.cwd(), "data", "works.json");

type FileStore = { works: Work[]; reviews: Review[] };

async function fileRead(): Promise<FileStore> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    const data = JSON.parse(raw) as FileStore;
    return { works: data.works ?? [], reviews: data.reviews ?? [] };
  } catch {
    return { works: [], reviews: [] };
  }
}

async function fileWrite(store: FileStore): Promise<void> {
  const tmp = DATA_FILE + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(store, null, 2) + "\n", "utf-8");
  await fs.rename(tmp, DATA_FILE);
}

// ---------- Работы ----------

function rowToWork(r: Record<string, unknown>): Work {
  return {
    id: r.id as string,
    userId: r.user_id as string,
    type: r.type as WorkType,
    typeCustom: (r.type_custom as string) ?? "",
    title: r.title as string,
    summary: r.summary as string,
    details: r.details as string,
    team: r.team as string,
    stack: r.stack as string,
    budget: r.budget as string,
    potential: r.potential as string,
    links: (r.links as WorkLink[]) ?? [],
    verifyToken: r.verify_token as string,
    verifyUrl: (r.verify_url as string) ?? "",
    verifyStatus: (r.verify_status as Work["verifyStatus"]) ?? "unverified",
    verifyNote: (r.verify_note as string) ?? "",
    createdAt: (r.created_at as Date).toISOString(),
    updatedAt: (r.updated_at as Date).toISOString(),
  };
}

export async function createWork(w: Omit<Work, "id" | "verifyToken" | "verifyStatus" | "verifyNote" | "createdAt" | "updatedAt"> & { verifyToken: string }): Promise<Work> {
  const now = new Date().toISOString();
  const full: Work = { ...w, typeCustom: w.typeCustom ?? "", id: `w_${randomBytes(6).toString("hex")}`, verifyStatus: "unverified", verifyNote: "", createdAt: now, updatedAt: now };
  if (dbEnabled()) {
    await ensureTablesSafe();
    await getPool().query(
      `INSERT INTO works (id, user_id, type, type_custom, title, summary, details, team, stack, budget, potential, links, verify_token, verify_url, verify_status, verify_note, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
      [full.id, full.userId, full.type, full.typeCustom, full.title, full.summary, full.details, full.team, full.stack,
       full.budget, full.potential, JSON.stringify(full.links), full.verifyToken, full.verifyUrl,
       full.verifyStatus, full.verifyNote, full.createdAt, full.updatedAt]
    );
  } else {
    const store = await fileRead();
    store.works.push(full);
    await fileWrite(store);
  }
  return full;
}

export async function updateWork(id: string, patch: Partial<Work>): Promise<Work | null> {
  const current = await getWork(id);
  if (!current) return null;
  const next: Work = { ...current, ...patch, id: current.id, userId: current.userId, updatedAt: new Date().toISOString() };
  if (dbEnabled()) {
    await ensureTablesSafe();
    await getPool().query(
      `UPDATE works SET type=$2, type_custom=$3, title=$4, summary=$5, details=$6, team=$7, stack=$8, budget=$9,
        potential=$10, links=$11, verify_url=$12, verify_status=$13, verify_note=$14, updated_at=$15
       WHERE id=$1`,
      [next.id, next.type, next.typeCustom, next.title, next.summary, next.details, next.team, next.stack, next.budget,
       next.potential, JSON.stringify(next.links), next.verifyUrl, next.verifyStatus, next.verifyNote, next.updatedAt]
    );
  } else {
    const store = await fileRead();
    const idx = store.works.findIndex((w) => w.id === id);
    if (idx >= 0) store.works[idx] = next;
    await fileWrite(store);
  }
  return next;
}

export async function getWork(id: string): Promise<Work | null> {
  if (dbEnabled()) {
    await ensureTablesSafe();
    const res = await getPool().query("SELECT * FROM works WHERE id = $1", [id]);
    return res.rows[0] ? rowToWork(res.rows[0]) : null;
  }
  const store = await fileRead();
  return store.works.find((w) => w.id === id) ?? null;
}

export async function getUserWorks(userId: string): Promise<Work[]> {
  if (dbEnabled()) {
    await ensureTablesSafe();
    const res = await getPool().query("SELECT * FROM works WHERE user_id = $1 ORDER BY created_at DESC", [userId]);
    return res.rows.map(rowToWork);
  }
  const store = await fileRead();
  return store.works.filter((w) => w.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// ---------- Отзывы ----------

function rowToReview(r: Record<string, unknown>): Review {
  return {
    id: r.id as string,
    workId: r.work_id as string,
    authorId: r.author_id as string,
    stars: r.stars as number,
    text: r.text as string,
    status: r.status as Review["status"],
    disputeReason: (r.dispute_reason as string) ?? "",
    createdAt: (r.created_at as Date).toISOString(),
  };
}

export async function createReview(r: Omit<Review, "id" | "status" | "disputeReason" | "createdAt">): Promise<Review> {
  const full: Review = { ...r, id: `rv_${randomBytes(6).toString("hex")}`, status: "published", disputeReason: "", createdAt: new Date().toISOString() };
  if (dbEnabled()) {
    await ensureTablesSafe();
    await getPool().query(
      `INSERT INTO reviews (id, work_id, author_id, stars, text, status, dispute_reason, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [full.id, full.workId, full.authorId, full.stars, full.text, full.status, full.disputeReason, full.createdAt]
    );
  } else {
    const store = await fileRead();
    store.reviews.push(full);
    await fileWrite(store);
  }
  return full;
}

export async function getReview(id: string): Promise<Review | null> {
  if (dbEnabled()) {
    await ensureTablesSafe();
    const res = await getPool().query("SELECT * FROM reviews WHERE id = $1", [id]);
    return res.rows[0] ? rowToReview(res.rows[0]) : null;
  }
  const store = await fileRead();
  return store.reviews.find((r) => r.id === id) ?? null;
}

export async function getWorkReviews(workId: string, includeHidden = false): Promise<Review[]> {
  let list: Review[];
  if (dbEnabled()) {
    await ensureTablesSafe();
    const res = await getPool().query("SELECT * FROM reviews WHERE work_id = $1 ORDER BY created_at DESC", [workId]);
    list = res.rows.map(rowToReview);
  } else {
    const store = await fileRead();
    list = store.reviews.filter((r) => r.workId === workId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  return includeHidden ? list : list.filter((r) => r.status === "published");
}

export async function updateReview(id: string, patch: Partial<Review>): Promise<Review | null> {
  const current = await getReview(id);
  if (!current) return null;
  const next: Review = { ...current, ...patch, id: current.id, workId: current.workId, authorId: current.authorId };
  if (dbEnabled()) {
    await ensureTablesSafe();
    await getPool().query(
      `UPDATE reviews SET stars=$2, text=$3, status=$4, dispute_reason=$5 WHERE id=$1`,
      [next.id, next.stars, next.text, next.status, next.disputeReason]
    );
  } else {
    const store = await fileRead();
    const idx = store.reviews.findIndex((r) => r.id === id);
    if (idx >= 0) store.reviews[idx] = next;
    await fileWrite(store);
  }
  return next;
}

/** Отзывы, ожидающие модерации (оспоренные). */
export async function getDisputedReviews(): Promise<Review[]> {
  if (dbEnabled()) {
    await ensureTablesSafe();
    const res = await getPool().query("SELECT * FROM reviews WHERE status = 'disputed' ORDER BY created_at ASC");
    return res.rows.map(rowToReview);
  }
  const store = await fileRead();
  return store.reviews.filter((r) => r.status === "disputed");
}

/** Свежие подтверждённые работы — «живая полка» на главной. */
export async function getRecentVerifiedWorks(limit = 8): Promise<Work[]> {
  if (dbEnabled()) {
    await ensureTablesSafe();
    const res = await getPool().query(
      "SELECT * FROM works WHERE verify_status = 'verified' ORDER BY created_at DESC LIMIT $1",
      [limit]
    );
    return res.rows.map(rowToWork);
  }
  const store = await fileRead();
  return store.works
    .filter((w) => w.verifyStatus === "verified")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

/**
 * Все подтверждённые работы (для раздела «Все работы» с поиском).
 * q — поиск по названию/описанию/стеку; type — фильтр по типу работы.
 */
export async function getAllVerifiedWorks(q = "", type = "", limit = 200): Promise<Work[]> {
  const needle = q.trim().toLowerCase();
  const map = new Map<string, Work>();
  const push = (w: Work) => {
    if (needle) {
      const hay = `${w.title} ${w.summary} ${w.details} ${w.stack} ${w.typeCustom ?? ""}`.toLowerCase();
      if (!hay.includes(needle)) return;
    }
    if (type && w.type !== type) return;
    map.set(w.id, w);
  };
  if (dbEnabled()) {
    await ensureTablesSafe();
    const res = await getPool().query(
      "SELECT * FROM works WHERE verify_status = 'verified' ORDER BY created_at DESC LIMIT $1",
      [limit]
    );
    res.rows.map(rowToWork).forEach(push);
  } else {
    const store = await fileRead();
    store.works.filter((w) => w.verifyStatus === "verified").forEach(push);
  }
  return [...map.values()];
}

/** Авторы работ (login+username) для подписей в разделе всех работ. */
export async function getWorkAuthors(userIds: string[]): Promise<Record<string, { username: string | null; displayName: string }>> {
  const { getUsers } = await import("./storage");
  const users = await getUsers();
  const map: Record<string, { username: string | null; displayName: string }> = {};
  for (const id of [...new Set(userIds)]) {
    const u = users.find((x) => x.id === id);
    if (u) map[id] = { username: u.username, displayName: u.displayName || u.username || u.login };
  }
  return map;
}

/** Публичные цифры сервиса для главной. */
export async function getServiceStats(): Promise<{
  users: number;
  works: number;
  verified: number;
  reviews: number;
}> {
  if (dbEnabled()) {
    await ensureTablesSafe();
    const [u, w, vw, rv] = await Promise.all([
      getPool().query("SELECT count(*)::int AS n FROM users"),
      getPool().query("SELECT count(*)::int AS n FROM works"),
      getPool().query("SELECT count(*)::int AS n FROM works WHERE verify_status = 'verified'"),
      getPool().query("SELECT count(*)::int AS n FROM reviews WHERE status = 'published'"),
    ]);
    return {
      users: u.rows[0]?.n ?? 0,
      works: w.rows[0]?.n ?? 0,
      verified: vw.rows[0]?.n ?? 0,
      reviews: rv.rows[0]?.n ?? 0,
    };
  }
  const store = await fileRead();
  const usersCount = await fileReadUsersCount();
  return {
    users: usersCount,
    works: store.works.length,
    verified: store.works.filter((w) => w.verifyStatus === "verified").length,
    reviews: store.reviews.filter((r) => r.status === "published").length,
  };
}

async function fileReadUsersCount(): Promise<number> {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "data", "users.json"), "utf-8");
    const data = JSON.parse(raw) as { users?: unknown[] };
    return data.users?.length ?? 0;
  } catch {
    return 0;
  }
}

/** Работы, ожидающие проверки авторства (ссылка указана, статус не verified). */
export async function getPendingVerificationWorks(): Promise<Work[]> {
  if (dbEnabled()) {
    await ensureTablesSafe();
    const res = await getPool().query(
      "SELECT * FROM works WHERE verify_status <> 'verified' AND verify_url <> '' ORDER BY created_at ASC"
    );
    return res.rows.map(rowToWork);
  }
  const store = await fileRead();
  return store.works
    .filter((w) => w.verifyStatus !== "verified" && w.verifyUrl)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

// ---------- Рейтинги ----------

export type Rating = { avg: number; count: number };

export function calcRating(reviews: Review[]): Rating {
  const pub = reviews.filter((r) => r.status === "published");
  if (!pub.length) return { avg: 0, count: 0 };
  const sum = pub.reduce((acc, r) => acc + r.stars, 0);
  return { avg: Math.round((sum / pub.length) * 10) / 10, count: pub.length };
}

export async function getWorkRating(workId: string): Promise<Rating> {
  return calcRating(await getWorkReviews(workId));
}

// ---------- Верификация собственности ----------

export function newVerifyToken(): string {
  return `DEV-VERIFY:${randomBytes(5).toString("hex")}`;
}

export function tokenFingerprint(token: string): string {
  return createHash("sha256").update(token).digest("hex").slice(0, 12);
}

function isPublicHttpUrl(raw: string): URL | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  const host = url.hostname.toLowerCase();
  const blocked =
    host === "localhost" || host === "::1" || host.endsWith(".local") || host.endsWith(".internal") ||
    /^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host) || /^0\./.test(host);
  return blocked ? null : url;
}

/**
 * Автопроверка: скачивает страницу по ссылке и ищет в ней код верификации.
 * Возвращает статус и пояснение. Закрытые/недоступные страницы -> pending (ручная проверка).
 */
export async function autoVerify(token: string, rawUrl: string): Promise<{ status: "verified" | "pending"; note: string }> {
  const url = isPublicHttpUrl(rawUrl.trim());
  if (!url) return { status: "pending", note: "Ссылка недоступна или некорректна — требуется ручная проверка." };

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, { signal: controller.signal, redirect: "follow", headers: { "User-Agent": "DevShelf-Verify/1.0" } });
    clearTimeout(timer);
    if (!res.ok) {
      return { status: "pending", note: `Страница ответила ${res.status} — требуется ручная проверка.` };
    }
    const buf = await res.arrayBuffer();
    const text = new TextDecoder("utf-8").decode(buf.slice(0, 512 * 1024));
    if (text.includes(token)) {
      return { status: "verified", note: "Код найден на странице — авторство подтверждено автоматически." };
    }
    return { status: "pending", note: "Код на странице не найден (или страница динамическая) — требуется ручная проверка." };
  } catch {
    return { status: "pending", note: "Не удалось загрузить страницу — требуется ручная проверка." };
  }
}
