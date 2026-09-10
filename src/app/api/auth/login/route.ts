import { NextResponse } from "next/server";
import { findUserByLogin, findUserByEmail, findUserByUsername } from "@/lib/storage";
import { hashPassword, rateLimit, clientIp } from "@/lib/users";
import { createSession } from "@/lib/sessions";
import { SESSION_COOKIE } from "@/lib/current-user";

export async function POST(request: Request) {
  let body: { login?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const login = (body.login ?? "").trim();
  const password = body.password ?? "";
  if (!login || !password) {
    return NextResponse.json({ error: "Заполните логин/email/юзернейм и пароль" }, { status: 400 });
  }

  // Rate-limit: 20 попыток входа в 5 минут на IP (защита от перебора),
  // плюс 8 попыток на конкретную пару IP+логин (атака на один аккаунт)
  const ip = clientIp(request);
  const rlIp = rateLimit(`login:ip:${ip}`, 20, 5 * 60 * 1000);
  if (!rlIp.ok) {
    return NextResponse.json(
      { error: `Слишком много попыток входа. Подождите ${rlIp.retryAfterSec} сек.` },
      { status: 429, headers: { "Retry-After": String(rlIp.retryAfterSec) } }
    );
  }
  const rl = rateLimit(`login:acct:${ip}:${login.toLowerCase()}`, 8, 5 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Слишком много попыток входа в этот аккаунт. Подождите ${rl.retryAfterSec} сек.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  // Вход по любому из трёх идентификаторов: логин, email или публичный юзернейм
  const user =
    (await findUserByLogin(login)) ??
    (login.includes("@") ? await findUserByEmail(login.toLowerCase()) : undefined) ??
    (await findUserByUsername(login));

  if (!user || user.passwordHash !== hashPassword(password)) {
    return NextResponse.json({ error: "Неверный логин или пароль" }, { status: 401 });
  }

  const session = await createSession(user.id);
  // Без юзернейма сначала отправляем в онбординг (юз задают один раз)
  const res = NextResponse.json({
    ok: true,
    role: user.role,
    redirect: !user.username ? "/onboarding" : user.role === "admin" ? "/admin" : "/",
  });
  res.cookies.set(SESSION_COOKIE, session.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
