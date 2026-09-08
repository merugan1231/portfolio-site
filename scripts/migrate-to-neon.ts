/**
 * Разовая миграция: создаёт таблицы в Neon и переносит
 * пользователей и портфолио из data/*.json в базу.
 * Запуск: npx tsx scripts/migrate-to-neon.ts
 */
import { readFileSync } from "fs";
import path from "path";
import { initDb, dbUpsertUser, kvSet, dbReadUsers } from "../src/lib/db";
import type { DbUser } from "../src/lib/db";
import type { Portfolio } from "../src/lib/portfolio";
import { isPortfolio } from "../src/lib/portfolio";

async function main() {
  console.log("1) Создаю таблицы (users, kv_store)…");
  await initDb();

  const dataDir = path.join(process.cwd(), "data");

  console.log("2) Переношу пользователей из users.json…");
  const { users } = JSON.parse(readFileSync(path.join(dataDir, "users.json"), "utf-8")) as { users: DbUser[] };
  for (const u of users) {
    await dbUpsertUser(u);
    console.log(`   ✓ ${u.login} (${u.role})`);
  }

  console.log("3) Переношу портфолио из portfolio.json…");
  const portfolio = JSON.parse(readFileSync(path.join(dataDir, "portfolio.json"), "utf-8")) as Portfolio;
  if (!isPortfolio(portfolio)) throw new Error("portfolio.json не прошёл валидацию");
  await kvSet("portfolio", portfolio);
  console.log(`   ✓ профиль: ${portfolio.profile.name || "(без имени)"}, проектов: ${portfolio.projects.length}`);

  const inDb = await dbReadUsers();
  console.log(`Готово. В базе пользователей: ${inDb.length}`);
}

main().catch((e) => {
  console.error("Ошибка миграции:", e);
  process.exit(1);
});
