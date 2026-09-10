import { NextResponse } from "next/server";
import { takeCode, saveUser, findUserByLogin } from "@/lib/storage";
import { newId } from "@/lib/users";
import { createSession } from "@/lib/sessions";
import { SESSION_COOKIE } from "@/lib/current-user";

/**
 * Шаг 2 регистрации: подтверждение кода из письма.
 * Аккаунт создаётся без юзернейма и имени — их пользователь выберет
 * в окне онбординга сразу после (юзернейм — один раз и навсегда).
 */
export async function POST(request: Request) {
  let body: { target?: string; code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const target = (body.target ?? "").trim().toLowerCase();
  const code = (body.code ?? "").trim();
  if (!target || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "Введите 6-значный код из письма" }, { status: 400 });
  }

  const payload = await takeCode(target, code);
  if (!payload) {
    return NextResponse.json({ error: "Неверный или устаревший код" }, { status: 400 });
  }

  const { login, email, password } = payload as { login: string; email: string; password: string };
  if (await findUserByLogin(login)) {
    return NextResponse.json({ error: "Этот логин уже занят" }, { status: 409 });
  }

  const user = {
    id: newId("u"),
    login,
    email,
    phone: "",
    passwordHash: password,
    role: "user" as const,
    method: "email",
    createdAt: new Date().toISOString(),
    displayName: "",
    username: null,
    avatarEmoji: "🧑‍💻",
    avatarUrl: "",
    bio: "",
    contacts: [],
    profileUpdatedAt: null,
    plan: "free" as const,
    planExpiresAt: null,
    bioDetails: {},
    roles: [],
    status: "active" as const,
    statusReason: "",
    statusAt: null,
  };
  await saveUser(user);

  const session = await createSession(user.id);
  // Сразу ведём в онбординг: выбор юзернейма (один раз) и имени
  const res = NextResponse.json({ ok: true, role: user.role, redirect: "/onboarding" });
  res.cookies.set(SESSION_COOKIE, session.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
