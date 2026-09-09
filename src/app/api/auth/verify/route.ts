import { NextResponse } from "next/server";
import { takeCode, saveUser, findUserByLogin, findUserByUsername } from "@/lib/storage";
import { newId, USERNAME_RE } from "@/lib/users";
import { createSession } from "@/lib/sessions";
import { SESSION_COOKIE } from "@/lib/current-user";

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

  const { login, username, displayName, email, password } = payload as {
    login: string; username?: string; displayName?: string; email: string; password: string;
  };
  if (await findUserByLogin(login)) {
    return NextResponse.json({ error: "Этот логин уже занят" }, { status: 409 });
  }
  const finalUsername = (username ?? "").trim();
  if (!USERNAME_RE.test(finalUsername) || (await findUserByUsername(finalUsername))) {
    return NextResponse.json({ error: "Юзернейм недоступен или некорректен" }, { status: 409 });
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
    displayName: (displayName ?? "").trim(),
    username: finalUsername,
    avatarEmoji: "🧑‍💻",
    avatarUrl: "",
    bio: "",
    contacts: [],
    profileUpdatedAt: new Date().toISOString(),
    plan: "free" as const,
    planExpiresAt: null,
    bioDetails: {},
  };
  await saveUser(user);

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
