import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { isCreator } from "@/lib/users";
import { dbEnabled, dbCreatePromoCode, dbListPromoCodes, dbGetPromoCode } from "@/lib/db";

/** Список промокодов (последние 100) — только для creator. */
export async function GET() {
  const me = await getCurrentUser();
  if (!isCreator(me)) {
    return NextResponse.json({ error: "Промокоды управляет только создатель сервиса" }, { status: 403 });
  }
  if (!dbEnabled()) {
    return NextResponse.json({ promoCodes: [] });
  }
  const promoCodes = await dbListPromoCodes();
  return NextResponse.json({ promoCodes });
}

/** Создание промокода: код и срок подписки в днях выбирает создатель. */
export async function POST(request: Request) {
  const me = await getCurrentUser();
  if (!isCreator(me)) {
    return NextResponse.json({ error: "Промокоды управляет только создатель сервиса" }, { status: 403 });
  }
  if (!dbEnabled()) {
    return NextResponse.json({ error: "Промокоды работают только на сервере с базой" }, { status: 503 });
  }

  let body: { code?: string; days?: number | string; note?: string; maxUses?: number | string; validDays?: number | string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const code = (body.code ?? "").trim().toUpperCase();
  const days = Math.floor(Number(body.days));
  const note = String(body.note ?? "").trim().slice(0, 200);
  // Активации: 0 = без ограничений; иначе 1..10000
  const maxUsesRaw = Math.floor(Number(body.maxUses ?? 1));
  const maxUses = Number.isFinite(maxUsesRaw) ? Math.max(0, Math.min(10000, maxUsesRaw)) : 1;
  // Срок действия самого кода: 0/пусто = бессрочно; иначе 1..3650 дней с момента создания
  const validDaysRaw = Math.floor(Number(body.validDays ?? 0));
  const validDays = Number.isFinite(validDaysRaw) ? Math.max(0, Math.min(3650, validDaysRaw)) : 0;

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

  const validUntil = validDays > 0 ? new Date(Date.now() + validDays * 24 * 60 * 60 * 1000).toISOString() : null;
  await dbCreatePromoCode({ code, days, createdBy: me!.login, createdAt: new Date().toISOString(), usedBy: null, usedAt: null, note, maxUses, uses: 0, validUntil });
  return NextResponse.json({ ok: true, code, days, maxUses, validUntil });
}
