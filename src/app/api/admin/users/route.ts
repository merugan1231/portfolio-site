import { NextResponse } from "next/server";
import { getUsers, saveUser } from "@/lib/storage";
import { getCurrentUser } from "@/lib/current-user";
import { isPro, isCreator, isStaff, STATUS_LABELS } from "@/lib/users";

export async function GET() {
  const me = await getCurrentUser();
  if (!isStaff(me)) {
    return NextResponse.json({ error: "Доступ только для администрации" }, { status: 403 });
  }
  const users = await getUsers();
  return NextResponse.json({
    me: { role: me!.role, login: me!.login },
    users: users.map((u) => ({
      id: u.id,
      login: u.login,
      email: u.email,
      role: u.role,
      method: u.method,
      createdAt: u.createdAt,
      plan: u.plan ?? "free",
      isPro: isPro(u),
      status: u.status ?? "active",
      statusReason: u.statusReason ?? "",
      statusAt: u.statusAt ?? null,
      username: u.username,
    })),
  });
}

/**
 * Действия администрации:
 * - set_role: только creator (выдать/снять админа)
 * - set_status: заморозка (admin+creator) и блокировка (только creator), причина обязательна
 * - unset_status: разморозка/разблокировка
 */
export async function POST(request: Request) {
  const me = await getCurrentUser();
  if (!isStaff(me)) {
    return NextResponse.json({ error: "Доступ только для администрации" }, { status: 403 });
  }

  let body: { action?: string; userId?: string; role?: string; status?: string; reason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const users = await getUsers();
  const target = users.find((u) => u.id === body.userId);
  if (!target) return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });

  // Нельзя применять действия к самому себе и к creator
  if (target.id === me!.id) return NextResponse.json({ error: "Нельзя применять действия к себе" }, { status: 400 });
  if (isCreator(target)) return NextResponse.json({ error: "Действия к создателю сервиса неприменимы" }, { status: 403 });

  const next = { ...target };

  if (body.action === "set_role") {
    if (!isCreator(me)) return NextResponse.json({ error: "Только создатель сервиса управляет админами" }, { status: 403 });
    next.role = body.role === "admin" ? "admin" : "user";
    await saveUser(next);
    return NextResponse.json({ ok: true, role: next.role });
  }

  if (body.action === "set_status") {
    const status = body.status;
    if (status !== "frozen" && status !== "blocked" && status !== "active") {
      return NextResponse.json({ error: "Некорректный статус" }, { status: 400 });
    }
    if (status === "blocked" && !isCreator(me)) {
      return NextResponse.json({ error: "Блокировать аккаунты может только создатель сервиса" }, { status: 403 });
    }
    if (status === "active") {
      next.status = "active";
      next.statusReason = "";
      next.statusAt = null;
    } else {
      const reason = (body.reason ?? "").trim();
      if (reason.length < 10) {
        return NextResponse.json({ error: "Укажите причину (минимум 10 символов) — пользователь увидит её" }, { status: 400 });
      }
      next.status = status;
      next.statusReason = reason.slice(0, 500);
      next.statusAt = new Date().toISOString();
    }
    await saveUser(next);
    return NextResponse.json({ ok: true, status: next.status, label: STATUS_LABELS[next.status] });
  }

  return NextResponse.json({ error: "Неизвестное действие" }, { status: 400 });
}
