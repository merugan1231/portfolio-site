/**
 * Смоук-тест персистентности сессий в двух режимах.
 * Запуск: npx tsx scripts/smoke-sessions.mts           (файловый режим)
 *         npx tsx --env-file=.env.local scripts/smoke-sessions.mts   (режим БД)
 */
import { existsSync, readFileSync, rmSync } from "fs";
import path from "path";
import { pathToFileURL } from "url";

const storeFile = path.join(process.cwd(), "data", "sessions.json");
const hadStore = existsSync(storeFile);
if (!hadStore) console.log("(файла data/sessions.json не было — файловый тест создаст его)");

async function freshImport(): Promise<typeof import("../src/lib/sessions")> {
  const modPath = pathToFileURL(path.join(process.cwd(), "src/lib/sessions.ts")).href;
  return import(modPath);
}

async function fileMode() {
  let userId = "";
  let token = "";

  // --- Фаза 1: создаём сессию и код ---
  {
    const s = await freshImport();
    const created = await s.createSession("user-123");
    userId = created.userId;
    token = created.token;
    await s.storeCode({ code: "123456", target: "test@example.com", method: "email", purpose: "login", payload: {} });
    console.log("Файл/фаза 1: сессия создана, token =", token.slice(0, 12) + "…");
  }

  // --- Фаза 2: «перезапуск» — новый экземпляр модуля читает из файла ---
  {
    const s = await freshImport();
    const restored = await s.getSession(token);
    const code = await s.verifyCode("test@example.com", "123456");
    console.log("Файл/фаза 2: сессия восстановлена:", restored?.userId === userId ? "ДА" : "НЕТ");
    console.log("Файл/фаза 2: код найден и использован:", !!code ? "ДА" : "НЕТ");
    const s2 = await freshImport();
    await s2.destroySession(token);
    console.log("Файл/фаза 2: logout:", (await s2.getSession(token)) === null ? "ОК" : "ОШИБКА");
    const again = await s2.getSession(token);
    console.log("Файл/фаза 2: logout устойчив к перечитыванию:", again === null ? "ОК" : "ОШИБКА");
  }

  // --- Уборка ---
  if (!hadStore && existsSync(storeFile)) {
    rmSync(storeFile);
    console.log("Уборка: тестовый data/sessions.json удалён");
  } else {
    const raw = JSON.parse(readFileSync(storeFile, "utf-8")) as { sessions: { userId: string }[] };
    raw.sessions = raw.sessions.filter((x) => x.userId !== "user-123");
    (await import("fs")).writeFileSync(storeFile, JSON.stringify(raw, null, 2) + "\n", "utf-8");
    console.log("Уборка: тестовая сессия удалена из data/sessions.json");
  }
}

async function dbMode() {
  // Проверяем, что DATABASE_URL реально подхватился
  const { dbEnabled } = await import("../src/lib/db");
  if (!dbEnabled()) {
    console.log("БД: DATABASE_URL не задан — тест БД пропущен");
    return;
  }
  console.log("БД: режим Postgres активен");

  const s = await freshImport();
  const created = await s.createSession("user-db-test");
  const restored = await s.getSession(created.token);
  console.log("БД: сессия записана и прочитана:", restored?.userId === "user-db-test" ? "ДА" : "НЕТ");

  await s.storeCode({ code: "654321", target: "dbtest@example.com", method: "email", purpose: "login", payload: { a: "1" } });
  const wrong = await s.verifyCode("dbtest@example.com", "000000");
  const right = await s.verifyCode("dbtest@example.com", "654321");
  const reused = await s.verifyCode("dbtest@example.com", "654321");
  console.log("БД: неверный код отклонён:", wrong === null ? "ОК" : "ОШИБКА");
  console.log("БД: верный код принят:", !!right ? "ОК" : "ОШИБКА");
  console.log("БД: повторное использование отклонено:", reused === null ? "ОК" : "ОШИБКА");

  await s.destroySession(created.token);
  console.log("БД: logout:", (await s.getSession(created.token)) === null ? "ОК" : "ОШИБКА");
}

async function main() {
  if (process.env.DATABASE_URL) {
    await dbMode();
  } else {
    await fileMode();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
