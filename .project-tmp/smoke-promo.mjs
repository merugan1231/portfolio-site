import { Pool } from "pg";
import { readFileSync } from "fs";

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const dbUrl = env.match(/^DATABASE_URL="?(.+?)"?$/m)?.[1];
const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

const B = "http://localhost:3100";
const ts = Date.now();
const email = `promo${ts}@test.dev`;
const login = `promo${String(ts).slice(-6)}`;
const password = "PromoPass123!";
const uname = `promotest${String(ts).slice(-5)}x`.slice(0, 20);
let cookie = "";
let failed = false;

function show(name, ok, extra = "") {
  console.log(`${ok ? "✅" : "❌"} ${name}${extra ? " — " + extra : ""}`);
  if (!ok) failed = true;
}

async function api(path, opts = {}) {
  const res = await fetch(B + path, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}), ...(opts.headers || {}) },
    redirect: "manual",
  });
  const setC = res.headers.getSetCookie?.() ?? [];
  if (setC.length) {
    const jar = cookie ? cookie.split("; ").filter(Boolean) : [];
    for (const c of setC) {
      const [pair] = c.split(";");
      const name = pair.split("=")[0];
      const idx = jar.findIndex((j) => j.startsWith(name + "="));
      if (idx >= 0) jar[idx] = pair; else jar.push(pair);
    }
    cookie = jar.join("; ");
  }
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
}

try {
  // 1. Регистрация + подтверждение (код берём из БД — письмо теперь реально уходит с домена)
  const reg = await api("/api/auth/register", { method: "POST", body: JSON.stringify({ login, email, password }) });
  show("Регистрация (письмо отправлено)", reg.status === 200 && reg.json?.delivered === true, JSON.stringify(reg.json).slice(0, 120));
  const code = (await pool.query("SELECT value FROM kv_store WHERE key = $1", [`code:${email}`])).rows[0]?.value?.code;
  show("Код подтверждения в БД", !!code, code ?? "не найден");

  const ver = await api("/api/auth/verify", { method: "POST", body: JSON.stringify({ target: email, code }) });
  show("Подтверждение кода", ver.status === 200 && ver.json?.ok === true, JSON.stringify(ver.json).slice(0, 100));

  // 2. Онбординг: юзернейм + роли (осинтер + программист)
  const prof = await api("/api/profile", {
    method: "PUT",
    body: JSON.stringify({ username: uname, displayName: "Промо Тест", roles: ["osint", "developer"] }),
  });
  show("Онбординг: юзернейм + роли сохранены", prof.status === 200, JSON.stringify(prof.json).slice(0, 100));

  const me = await api("/api/auth/me");
  show("me: роли отдаются", me.json?.user?.roles?.includes("osint") && me.json?.user?.roles?.includes("developer"), JSON.stringify(me.json?.user?.roles));

  // 3. Поиск по роли
  const s1 = await api(`/api/users/search?q=${uname.slice(0, 8)}&role=osint`);
  show("Поиск по роли osint находит", s1.json?.users?.some((u) => u.username === uname), `найдено: ${s1.json?.users?.length}`);
  const s2 = await api(`/api/users/search?q=${uname.slice(0, 8)}&role=designer`);
  show("Поиск по роли designer НЕ находит", !s2.json?.users?.some((u) => u.username === uname), `найдено: ${s2.json?.users?.length}`);
  const s3 = await api("/api/users/search?role=developer");
  show("Фильтр без запроса работает", Array.isArray(s3.json?.users), `найдено: ${s3.json?.users?.length}`);

  // 4. Лимит ролей (4 роли -> должно обрезаться до 3)
  const prof2 = await api("/api/profile", {
    method: "PUT",
    body: JSON.stringify({ roles: ["osint", "developer", "designer", "writer"] }),
  });
  const me2 = await api("/api/auth/me");
  show("Лимит 3 роли (4-я отброшена)", me2.json?.user?.roles?.length === 3, JSON.stringify(me2.json?.user?.roles));

  // 5. Промокод: админ-API (временно даём тестовому юзеру права админа в БД)
  const uid = (await pool.query("SELECT id FROM users WHERE email = $1", [email])).rows[0]?.id;
  await pool.query("UPDATE users SET role = 'admin' WHERE id = $1", [uid]);
  const promoCode = `SHELFTEST${String(ts).slice(-5)}`;
  const create1 = await api("/api/admin/promo", { method: "POST", body: JSON.stringify({ code: promoCode, days: 14, note: "смок-тест" }) });
  show("Админ: промокод создан", create1.status === 200 && create1.json?.code === promoCode, JSON.stringify(create1.json));
  const create2 = await api("/api/admin/promo", { method: "POST", body: JSON.stringify({ code: promoCode, days: 7 }) });
  show("Админ: дубликат отклонён", create2.status === 409);
  const create3 = await api("/api/admin/promo", { method: "POST", body: JSON.stringify({ code: "BAD!", days: 7 }) });
  show("Админ: плохой код отклонён", create3.status === 400);
  const list = await api("/api/admin/promo");
  show("Админ: список промокодов", list.status === 200 && list.json?.promoCodes?.some((c) => c.code === promoCode));

  // 6. Активация пользователем
  const redeem1 = await api("/api/promo/redeem", { method: "POST", body: JSON.stringify({ code: promoCode.toLowerCase() }) });
  show("Активация промокода (в нижнем регистре — норм)", redeem1.status === 200 && redeem1.json?.addedDays === 14, JSON.stringify(redeem1.json).slice(0, 120));
  const me3 = await api("/api/auth/me");
  show("После активации: Pro", me3.json?.user?.isPro === true, `plan=${me3.json?.user?.plan}`);
  const redeem2 = await api("/api/promo/redeem", { method: "POST", body: JSON.stringify({ code: promoCode }) });
  show("Повторная активация отклонена", redeem2.status === 409);
  const redeem3 = await api("/api/promo/redeem", { method: "POST", body: JSON.stringify({ code: "NOEXIST-1234" }) });
  show("Несуществующий код — 404", redeem3.status === 404);

  // 7. Не-админ не может создавать промокоды
  await pool.query("UPDATE users SET role = 'user' WHERE id = $1", [uid]);
  const forbidden = await api("/api/admin/promo", { method: "POST", body: JSON.stringify({ code: "HACK123", days: 7 }) });
  show("Не-админ: создание промокода запрещено", forbidden.status === 403);

  // Уборка: тестовый пользователь и промокод
  await pool.query("DELETE FROM promo_codes WHERE code = $1", [promoCode]);
  await pool.query("DELETE FROM reviews WHERE author_id = $1", [uid]);
  await pool.query("DELETE FROM reviews WHERE work_id IN (SELECT id FROM works WHERE user_id = $1)", [uid]);
  await pool.query("DELETE FROM works WHERE user_id = $1", [uid]);
  await pool.query("DELETE FROM kv_store WHERE key LIKE 'session:%' AND value->>'userId' = $1", [uid]);
  await pool.query("DELETE FROM users WHERE id = $1", [uid]);
  await pool.query("DELETE FROM kv_store WHERE key LIKE $1", [`%${email}%`]);
  await pool.end();
  console.log(failed ? "\n❌ Есть падения" : "\n🎉 Все проверки прошли");
  process.exit(failed ? 1 : 0);
} catch (e) {
  console.error("Ошибка:", e.message);
  try { await pool.end(); } catch {}
  process.exit(1);
}
