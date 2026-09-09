import { NextResponse } from "next/server";
import { findUserByLogin, findUserByEmail, findUserByUsername } from "@/lib/storage";
import { hashPassword } from "@/lib/users";
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

  // Вход по любому из трёх идентификаторов: логин, email или публичный юзернейм
  const user =
    (await findUserByLogin(login)) ??
    (login.includes("@") ? await findUserByEmail(login.toLowerCase()) : undefined) ??
    (await findUserByUsername(login));

  if (!user || user.passwordHash !== hashPassword(password)) {
    return NextResponse.json({ error: "Неверный логин или пароль" }, { status: 401 });
  }

  const session = await createSession(user.id);
  const res = NextResponse.json({ ok: true, role: user.role });
  res.cookies.set(SESSION_COOKIE, session.token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
