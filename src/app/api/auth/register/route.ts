import { NextResponse } from "next/server";
import { findUserByLogin, findUserByEmail, putCode } from "@/lib/storage";
import { hashPassword, generateCode, rateLimit, clientIp } from "@/lib/users";
import { sendVerificationEmail } from "@/lib/mailer";

/**
 * Шаг 1 регистрации: логин + email + пароль.
 * Юзернейм и имя пользователь выбирает сразу после — в отдельном окне онбординга
 * (юзернейм закрепляется один раз, поэтому его нельзя брать из почты).
 */
export async function POST(request: Request) {
  let body: { login?: string; email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const login = (body.login ?? "").trim();
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";

  if (!/^[a-zA-Z0-9_]{3,24}$/.test(login)) {
    return NextResponse.json({ error: "Логин: 3–24 символа, латиница, цифры и _" }, { status: 400 });
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "Введите корректный email" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Пароль минимум 8 символов" }, { status: 400 });
  }
  // Пароль не должен совпадать с логином/email и содержать их внутри
  const loginLower = login.toLowerCase();
  const emailLocal = email.split("@")[0].toLowerCase();
  const passLower = password.toLowerCase();
  if (passLower === loginLower || passLower === emailLocal) {
    return NextResponse.json({ error: "Пароль не должен совпадать с логином или email" }, { status: 400 });
  }

  // Rate-limit: 5 регистраций в час с одного IP (спам-защита почтового лимита)
  const rl = rateLimit(`register:${clientIp(request)}`, 5, 60 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Слишком много регистраций. Попробуйте через ${Math.ceil(rl.retryAfterSec / 60)} мин.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  if (await findUserByLogin(login)) {
    return NextResponse.json({ error: "Этот логин уже занят" }, { status: 409 });
  }
  if (await findUserByEmail(email)) {
    return NextResponse.json({ error: "На этот email уже есть аккаунт" }, { status: 409 });
  }

  const code = generateCode();
  await putCode(email, code, { login, email, password: hashPassword(password) });

  const mail = await sendVerificationEmail(email, code, "register");
  return NextResponse.json({
    ok: true,
    delivered: mail.delivered,
    devCode: mail.devCode,
    error: mail.error,
  });
}
