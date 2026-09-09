import { NextResponse } from "next/server";
import { getActiveUser } from "@/lib/current-user";
import { getUsers, saveUser } from "@/lib/storage";
import { isPro } from "@/lib/users";
import { dbEnabled, dbGetPromoCode, dbRedeemPromoCode } from "@/lib/db";

/**
 * Активация промокода на подписку Pro.
 * Код одноразовый, срок задаётся при создании в админке.
 * Если у пользователя Pro уже активен — дни прибавляются к сроку.
 */
export async function POST(request: Request) {
  const user = await getActiveUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  let body: { code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const code = (body.code ?? "").trim();
  if (!/^[A-Za-z0-9-]{4,32}$/.test(code)) {
    return NextResponse.json({ error: "Введите промокод (буквы, цифры, дефис)" }, { status: 400 });
  }

  if (!dbEnabled()) {
    return NextResponse.json({ error: "Промокоды работают только на сервере с базой" }, { status: 503 });
  }

  const existing = await dbGetPromoCode(code);
  if (!existing) {
    return NextResponse.json({ error: "Промокод не найден" }, { status: 404 });
  }
  if (existing.usedBy) {
    return NextResponse.json({ error: "Этот промокод уже активирован" }, { status: 409 });
  }

  // Помечаем код использованным атомарно — повторная активация невозможна
  const days = await dbRedeemPromoCode(code, user.id);
  if (!days || days < 1) {
    return NextResponse.json({ error: "Промокод уже активирован" }, { status: 409 });
  }

  // Продлеваем Pro: если активен — от текущего срока, если нет — от сейчас
  const users = await getUsers();
  const target = users.find((u) => u.id === user.id);
  if (!target) return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });

  const next = { ...target };
  const base = isPro(target) && target.planExpiresAt ? new Date(target.planExpiresAt).getTime() : Date.now();
  next.plan = "pro";
  next.planExpiresAt = new Date(base + days * 24 * 60 * 60 * 1000).toISOString();
  await saveUser(next);

  return NextResponse.json({
    ok: true,
    plan: next.plan,
    planExpiresAt: next.planExpiresAt,
    addedDays: days,
  });
}
