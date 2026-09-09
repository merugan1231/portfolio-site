import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { dbEnabled, dbCreatePromoCode, dbListPromoCodes, dbGetPromoCode } from "@/lib/db";

/** Список промокодов (последние 100) — только для админа. */
export async function GET() {
  const me = await getCurrentUser();
  if (me?.role !== "admin") {
    return NextResponse.json({ error: "Доступ только для администратора" }, { status: 403 });
  }
  if (!dbEnabled()) {
    return NextResponse.json({ promoCodes: [] });
  }
  const promoCodes = await dbListPromoCodes();
  return NextResponse.json({ promoCodes });
}

/** Создание промокода: код и срок подписки в днях выбирает админ. */
export async function POST(request: Request) {
  const me = await getCurrentUser();
  if (me?.role !== "admin") {
    return NextResponse.json({ error: "Доступ только для администратора" }, { status: 403 });
  }
  if (!dbEnabled()) {
    return NextResponse.json({ error: "Промокоды работают только на сервере с базой" }, { status: 503 });
  }

  let body: { code?: string; days?: number | string; note?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const code = (body.code ?? "").trim().toUpperCase();
  const days = Math.floor(Number(body.days));
  const note = String(body.note ?? "").trim().slice(0, 200);

  if (!/^[A-Za-z0-9-]{4,32}$/.test(code)) {
    return NextResponse.json({ error: "Код: от 4 до 32 символов — буквы, цифры и дефис" }, { status: 400 });
  }
  if (!Number.isFinite(days) || days < 1 || days > 3650) {
    return NextResponse.json({ error: "Срок: от 1 до 3650 дней" }, { status: 400 });
  }

  const existing = await dbGetPromoCode(code);
  if (existing) {
    return NextResponse.json({ error: "Такой промокод уже существует" }, { status: 409 });
  }

  await dbCreatePromoCode({ code, days, createdBy: me.login, createdAt: new Date().toISOString(), usedBy: null, usedAt: null, note });
  return NextResponse.json({ ok: true, code, days });
}
