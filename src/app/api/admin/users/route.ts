import { NextResponse } from "next/server";
import { getUsers, saveUser } from "@/lib/storage";
import { getCurrentUser } from "@/lib/current-user";
import { isPro } from "@/lib/users";

export async function GET() {
  const me = await getCurrentUser();
  if (me?.role !== "admin") {
    return NextResponse.json({ error: "Доступ только для администратора" }, { status: 403 });
  }
  const users = await getUsers();
  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      login: u.login,
      email: u.email,
      role: u.role,
      method: u.method,
      createdAt: u.createdAt,
      plan: u.plan ?? "free",
      isPro: isPro(u),
    })),
  });
}

/** Ручная выдача/отключение Pro (пока нет автоматической оплаты). */
export async function POST(request: Request) {
  const me = await getCurrentUser();
  if (me?.role !== "admin") {
    return NextResponse.json({ error: "Доступ только для администратора" }, { status: 403 });
  }

  let body: { userId?: string; pro?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const users = await getUsers();
  const target = users.find((u) => u.id === body.userId);
  if (!target) return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });

  const next = { ...target };
  if (body.pro) {
    next.plan = "pro";
    next.planExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 дней
  } else {
    next.plan = "free";
    next.planExpiresAt = null;
  }
  await saveUser(next);
  return NextResponse.json({ ok: true, plan: next.plan, planExpiresAt: next.planExpiresAt });
}
