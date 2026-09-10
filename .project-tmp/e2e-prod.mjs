import { Pool } from "pg";
import { readFileSync } from "fs";

// .env.local: берём DATABASE_URL
const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const dbUrl = env.match(/^DATABASE_URL="?(.+?)"?$/m)?.[1];
if (!dbUrl) { console.error("Нет DATABASE_URL"); process.exit(1); }
const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

const B = "https://merugan.is-a.dev";
const ts = Date.now();
const email = `e2e${ts}@test.dev`;
const login = `e2e${String(ts).slice(-6)}`;
const password = "E2ePass123!";
let cookie = "";

function show(name, ok, extra = "") {
  console.log(`${ok ? "✅" : "❌"} ${name}${extra ? " — " + extra : ""}`);
  if (!ok) failed = true;
}
let failed = false;

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
  return { status: res.status, json, headers: res.headers };
}

try {
  // ---------- 1. Регистрация ----------
  const reg = await api("/api/auth/register", { method: "POST", body: JSON.stringify({ login, email, password }) });
  show("Регистрация (код отправлен на почту)", reg.status === 200 || reg.status === 201, `HTTP ${reg.status} ${JSON.stringify(reg.json)}`);

  // ---------- 2. Код из БД (письмо уходит, нам нужен только код) ----------
  const kv = await pool.query("SELECT value FROM kv_store WHERE key = $1", [`code:${email}`]);
  const code = kv.rows[0]?.value?.code;
  show("Код подтверждения появился в БД", !!code, code ?? "не найден");

  // ---------- 3. Подтверждение ----------
  const ver = await api("/api/auth/verify", { method: "POST", body: JSON.stringify({ target: email, code }) });
  show("Подтверждение кода + сессия", ver.status === 200 && ver.json?.ok === true, `HTTP ${ver.status} ${JSON.stringify(ver.json).slice(0, 120)}`);

  // ---------- 4. Онбординг: закрепление юзернейма ----------
  const uname = `e2eprobe${String(ts).slice(-5)}`.slice(0, 19) + "x"; // с буквы и на букву
  const prof = await api("/api/profile", {
    method: "PUT",
    body: JSON.stringify({ username: uname, name: "E2E Проба", bio: "Тестовый профиль" }),
  });
  show("Онбординг: юзернейм закреплён", prof.status === 200 && prof.json?.ok === true, `HTTP ${prof.status} ${JSON.stringify(prof.json).slice(0, 150)}`);

  // ---------- 5. Публичный профиль ----------
  const pub = await api(`/api/u/${uname}`);
  show("Публичный профиль отдаётся по юзернейму", pub.status === 200 && pub.json?.profile?.username === uname, `HTTP ${pub.status}`);

  // ---------- 6. Кабинет ----------
  const me = await api("/api/auth/me");
  show("Кабинет: /api/auth/me отдаёт пользователя", me.status === 200 && me.json?.user?.username === uname, `HTTP ${me.status} ${JSON.stringify(me.json).slice(0, 120)}`);

  // ---------- 7. Создание работы ----------
  const work = await api("/api/works", {
    method: "POST",
    body: JSON.stringify({
      title: "E2E проба продакшена",
      type: "site",
      summary: "Автоматическая проверка продакшена на новом домене DevShelf",
      details: "Создано автоматическим E2E-скриптом для проверки полного цикла регистрации, онбординга, кабинета и работ на продакшене после переезда на merugan.is-a.dev.",
      stack: "node, fetch",
      links: [{ label: "GitHub", url: "https://example.com/e2e" }],
    }),
  });
  const workId = work.json?.work?.id;
  show("Создание работы", work.status === 200 && !!workId, `HTTP ${work.status} id=${workId ?? "?"}`);

  // ---------- 8. Публичный список ----------
  const wl = await api("/api/works");
  show("Публичный список работ", wl.status === 200 && Array.isArray(wl.json?.works) && wl.json.works.some((w) => w.id === workId), `HTTP ${wl.status}`);

  // ---------- 9. Удаление аккаунта: запрос кода ----------
  const del = await api("/api/profile/delete", { method: "POST" });
  show("Удаление: код на почту отправлен", del.status === 200, `HTTP ${del.status} ${JSON.stringify(del.json).slice(0, 120)}`);

  // ---------- 10. Удаление аккаунта: подтверждение (код лежит под ключом delete:<userId>) ----------
  const uid = (await pool.query("SELECT id FROM users WHERE email = $1", [email])).rows[0]?.id;
  const dcode = uid
    ? (await pool.query("SELECT value FROM kv_store WHERE key = $1", [`code:delete:${uid}`])).rows[0]?.value?.code
    : null;
  const dconf = await api("/api/profile/delete/confirm", { method: "POST", body: JSON.stringify({ code: dcode, password }) });
  show("Удаление: аккаунт стёрт (работы, отзывы, сессии)", dconf.status === 200, `HTTP ${dconf.status} ${JSON.stringify(dconf.json).slice(0, 120)}`);

  // ---------- 11. После удаления ----------
  const after = await api("/api/auth/me");
  show("После удаления сессия мертва", after.json?.user == null, `HTTP ${after.status} ${JSON.stringify(after.json)}`);

  // ---------- Уборка ----------
  await pool.query("DELETE FROM kv_store WHERE key LIKE $1", [`%${email}%`]);
  await pool.end();
  console.log(failed ? "\n❌ Есть падения" : "\n🎉 Все проверки прошли");
  process.exit(failed ? 1 : 0);
} catch (e) {
  console.error("Ошибка:", e.message);
  await pool.end();
  process.exit(1);
}
