import { NextResponse } from "next/server";
import { getActiveUser, SESSION_COOKIE } from "@/lib/current-user";
import { takeCode, deleteUserCompletely } from "@/lib/storage";
import { hashPassword } from "@/lib/users";

/**
 * Шаг 2 удаления аккаунта: проверяем код с почты И пароль,
 * затем безвозвратно удаляем аккаунт, все его работы и отзывы.
 */
export async function POST(request: Request) {
  const user = await getActiveUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  let body: { code?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const code = (body.code ?? "").trim();
  const password = body.password ?? "";
  if (!/^\d{6}$/.test(code) || !password) {
    return NextResponse.json({ error: "Введите код из письма и пароль" }, { status: 400 });
  }

  // Пароль: у OAuth-аккаунтов его нет — тогда достаточно кода с почты
  const passwordOk = user.passwordHash.startsWith("sha256:")
    ? user.passwordHash === hashPassword(password)
    : true;
  if (!passwordOk) {
    return NextResponse.json({ error: "Неверный пароль" }, { status: 403 });
  }

  const payload = await takeCode(`delete:${user.id}`, code);
  if (!payload) {
    return NextResponse.json({ error: "Неверный или устаревший код" }, { status: 400 });
  }

  const { worksDeleted } = await deleteUserCompletely(user.id);

  const res = NextResponse.json({ ok: true, worksDeleted });
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
