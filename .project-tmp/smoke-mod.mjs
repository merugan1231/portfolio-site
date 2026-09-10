import { Pool } from "pg";
import { readFileSync } from "fs";

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const dbUrl = env.match(/^DATABASE_URL="?(.+?)"?$/m)?.[1];
const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

const B = "http://localhost:3100";
const ts = Date.now();
const email = `mod${ts}@test.dev`;
const login = `mod${String(ts).slice(-6)}`;
const password = "ModPass123!";
const uname = `modtest${String(ts).slice(-5)}x`.slice(0, 20);
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

async function loginAs(l, p) {
  cookie = "";
  const res = await api("/api/auth/login", { method: "POST", body: JSON.stringify({ login: l, password: p }) });
  return res;
}

try {
  // --- Регистрация тестового юзера (код из БД) ---
  await api("/api/auth/register", { method: "POST", body: JSON.stringify({ login, email, password }) });
  let code = (await pool.query("SELECT value FROM kv_store WHERE key = $1", [`code:${email}`])).rows[0]?.value?.code;
  const ver = await api("/api/auth/verify", { method: "POST", body: JSON.stringify({ target: email, code }) });
  show("Регистрация + подтверждение", ver.status === 200);

  // Невалидный код НЕ сжигает код (после неудачи старый код всё ещё работает)
  const bad = await api("/api/auth/verify", { method: "POST", body: JSON.stringify({ target: "nosuch@x.dev", code: "000001" }) });
  show("Неверный код на чужом адресе — 400", bad.status === 400);

  // Онбординг
  await api("/api/profile", { method: "PUT", body: JSON.stringify({ username: uname, displayName: "Мод Тест" }) });

  // --- Механика кодов: неверный ввод не сжигает ---
  await api("/api/profile/delete", { method: "POST" });
  const uid = (await pool.query("SELECT id FROM users WHERE email = $1", [email])).rows[0]?.id;
  const delKey = `code:delete:${uid}`;
  const real = (await pool.query("SELECT value FROM kv_store WHERE key = $1", [delKey])).rows[0]?.value?.code;
  const wrong1 = await api("/api/profile/delete/confirm", { method: "POST", body: JSON.stringify({ code: "000001", password }) });
  const wrong2 = await api("/api/profile/delete/confirm", { method: "POST", body: JSON.stringify({ code: "000002", password }) });
  const stillOk = (await pool.query("SELECT value FROM kv_store WHERE key = $1", [delKey])).rows[0]?.value?.code;
  show("Неверный код не сжигает (2 неверных попытки)", wrong1.status === 400 && wrong2.status === 400 && stillOk === real, `код жив: ${stillOk === real}`);
  // Верный код после неверных — работает
  const right = await api("/api/profile/delete/confirm", { method: "POST", body: JSON.stringify({ code: real, password }) });
  show("Верный код принимается после неверных", right.status === 200, `HTTP ${right.status}`);

  // Пересоздаём юзера (его удалили)
  cookie = "";
  await api("/api/auth/register", { method: "POST", body: JSON.stringify({ login, email, password }) });
  code = (await pool.query("SELECT value FROM kv_store WHERE key = $1", [`code:${email}`])).rows[0]?.value?.code;
  await api("/api/auth/verify", { method: "POST", body: JSON.stringify({ target: email, code }) });
  await api("/api/profile", { method: "PUT", body: JSON.stringify({ username: uname, displayName: "Мод Тест" }) });
  const uid2 = (await pool.query("SELECT id FROM users WHERE email = $1", [email])).rows[0?.id ?? "id"] ?? (await pool.query("SELECT id FROM users WHERE email = $1", [email])).rows[0]?.id;

  // --- Resend: кулдаун ---
  const r1 = await api("/api/profile/delete/resend", { method: "POST" });
  show("Resend #1 ок", r1.status === 200);
  const r2 = await api("/api/profile/delete/resend", { method: "POST" });
  show("Resend сразу второй — 429", r2.status === 429, JSON.stringify(r2.json));

  // --- Админ: заморозка/блокировка/роли ---
  // Обычный юзер не может мородировать
  const forb = await api("/api/admin/users", { method: "POST", body: JSON.stringify({ action: "set_status", userId: uid2, status: "frozen", reason: "попытка без прав" }) });
  show("Не-админ: заморозка запрещена", forb.status === 403);

  // Повышаем до админа вручную в БД, проверяем права админа
  await pool.query("UPDATE users SET role = 'admin' WHERE id = $1", [uid2]);
  cookie = "";
  await loginAs(login, password);

  // Создаём жертву для заморозки
  const email2 = `victim${ts}@test.dev`;
  cookie = "";
  await api("/api/auth/register", { method: "POST", body: JSON.stringify({ login: `victim${String(ts).slice(-6)}`, email: email2, password }) });
  const vcode = (await pool.query("SELECT value FROM kv_store WHERE key = $1", [`code:${email2}`])).rows[0]?.value?.code;
  await api("/api/auth/verify", { method: "POST", body: JSON.stringify({ target: email2, code: vcode }) });
  const vid = (await pool.query("SELECT id FROM users WHERE email = $1", [email2])).rows[0]?.id;

  // Админ замораживает
  cookie = "";
  await loginAs(login, password);
  const shortReason = await api("/api/admin/users", { method: "POST", body: JSON.stringify({ action: "set_status", userId: vid, status: "frozen", reason: "коротко" }) });
  show("Короткая причина отклоняется", shortReason.status === 400);
  const frozen = await api("/api/admin/users", { method: "POST", body: JSON.stringify({ action: "set_status", userId: vid, status: "frozen", reason: "Подозрительная активность в профиле" }) });
  show("Админ: заморозка с причиной", frozen.status === 200);

  // Замороженный не может создавать работы, но может тикеты
  cookie = "";
  await loginAs(`victim${String(ts).slice(-6)}`, password);
  const meFrozen = await api("/api/auth/me");
  show("Замороженный видит статус и причину", meFrozen.json?.user?.status === "frozen" && !!meFrozen.json?.user?.statusReason, meFrozen.json?.user?.statusReason);
  const workForbidden = await api("/api/works", { method: "POST", body: JSON.stringify({ type: "site", title: "Х", summary: "х", details: "х", links: [] }) });
  show("Замороженный не может создать работу", workForbidden.status === 401 || workForbidden.status === 403, `HTTP ${workForbidden.status}`);
  const tick = await api("/api/tickets", { method: "POST", body: JSON.stringify({ type: "appeal", message: "Считаю заморозку ошибкой, прошу проверить профиль ещё раз." }) });
  show("Замороженный может подать тикет", tick.status === 200 && !!tick.json?.ticket?.id);

  // Заблокировать может только creator
  cookie = "";
  await loginAs(login, password);
  const blockAsAdmin = await api("/api/admin/users", { method: "POST", body: JSON.stringify({ action: "set_status", userId: vid, status: "blocked", reason: "Мультиаккаунт и обход блокировки" }) });
  show("Обычный админ НЕ может блокировать", blockAsAdmin.status === 403);

  // Промокоды обычному админу недоступны
  const promoForbidden = await api("/api/admin/promo", { method: "POST", body: JSON.stringify({ code: "ADMIN-NOPE-1", days: 7 }) });
  show("Обычный админ не создаёт промокоды", promoForbidden.status === 403);

  // --- Creator: всё можно ---
  await pool.query("UPDATE users SET role = 'creator' WHERE login = 'merugan2010'");
  cookie = "";
  const cr = await loginAs("merugan2010", process.env.ADMIN_PASSWORD);
  if (cr.status !== 200) {
    console.log("⚠️ Нет пароля merugan2010 в ADMIN_PASSWORD — creator-сценарии пропущены");
  } else {
    const blocked = await api("/api/admin/users", { method: "POST", body: JSON.stringify({ action: "set_status", userId: vid, status: "blocked", reason: "Мультиаккаунт и обход блокировки" }) });
    show("Creator: блокировка", blocked.status === 200);
    const promo = await api("/api/admin/promo", { method: "POST", body: JSON.stringify({ code: `CRTEST${String(ts).slice(-5)}`, days: 7 }) });
    show("Creator: промокод создаётся", promo.status === 200);
    await pool.query("DELETE FROM promo_codes WHERE code = $1", [`CRTEST${String(ts).slice(-5)}`]);
    // Тикеты видны и обрабатываются
    const list = await api("/api/admin/tickets");
    show("Creator: список тикетов", list.status === 200 && list.json?.tickets?.length >= 1);
    const tid = list.json?.tickets?.[0]?.id;
    const resolved = await api(`/api/tickets/${tid}`, { method: "POST", body: JSON.stringify({ status: "resolved", reply: "Разобрались, блокировку сняли." }) });
    show("Creator: обработка тикета", resolved.status === 200);
    // Снятие блокировки
    const unfrozen = await api("/api/admin/users", { method: "POST", body: JSON.stringify({ action: "set_status", userId: vid, status: "active", reason: "" }) });
    show("Creator: разблокировка", unfrozen.status === 200);
    // Выдача админа
    const grant = await api("/api/admin/users", { method: "POST", body: JSON.stringify({ action: "set_role", userId: uid2, role: "admin" }) });
    show("Creator: выдаёт админа", grant.status === 200);
    const revoke = await api("/api/admin/users", { method: "POST", body: JSON.stringify({ action: "set_role", userId: uid2, role: "user" }) });
    show("Creator: снимает админа", revoke.status === 200);
  }

  // --- /explore публично ---
  const ex = await fetch(`${B}/api/explore?q=&type=`);
  show("/api/explore публично доступен", ex.status === 200);
  const exPage = await fetch(`${B}/explore`);
  show("Страница /explore открывается", exPage.status === 200);

  // --- Уборка ---
  await pool.query("DELETE FROM tickets WHERE user_id IN ($1, $2)", [uid2, vid]);
  await pool.query("DELETE FROM reviews WHERE author_id IN ($1, $2)", [uid2, vid]);
  await pool.query("DELETE FROM works WHERE user_id IN ($1, $2)", [uid2, vid]);
  await pool.query("DELETE FROM kv_store WHERE key LIKE 'session:%' AND (value->>'userId' = $1 OR value->>'userId' = $2)", [uid2, vid]);
  await pool.query("DELETE FROM users WHERE id IN ($1, $2)", [uid2, vid]);
  await pool.query("DELETE FROM kv_store WHERE key LIKE $1 OR key LIKE $2", [`%${email}%`, `%${email2}%`]);
  await pool.end();
  console.log(failed ? "\n❌ Есть падения" : "\n🎉 Все проверки прошли");
  process.exit(failed ? 1 : 0);
} catch (e) {
  console.error("Ошибка:", e.message);
  try { await pool.end(); } catch {}
  process.exit(1);
}
