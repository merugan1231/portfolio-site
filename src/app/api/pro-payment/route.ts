import { NextResponse } from "next/server";
import { getActiveUser } from "@/lib/current-user";
import { createPaymentReceipt, listPaymentReceiptsByUser } from "@/lib/storage";
import { rateLimit, clientIp } from "@/lib/users";

/** Мои заявки на Pro (со статусом и ответом администрации). */
export async function GET() {
  const user = await getActiveUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  const receipts = await listPaymentReceiptsByUser(user.id);
  return NextResponse.json({ receipts });
}

/**
 * Отправка чека об оплате Pro.
 * Заявка попадает в админку, где её проверяют (скрин перевода) и выдают Pro.
 */
export async function POST(request: Request) {
  const user = await getActiveUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  // Rate-limit: 3 заявки в час с одного IP (спам-защита)
  const rl = rateLimit(`receipt:${clientIp(request)}`, 3, 60 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json({ error: `Слишком много заявок. Попробуйте через ${Math.ceil(rl.retryAfterSec / 60)} мин.` }, { status: 429 });
  }

  let body: { months?: number; payerName?: string; receiptUrl?: string; comment?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const months = Math.floor(Number(body.months ?? 1));
  if (!Number.isFinite(months) || months < 1 || months > 12) {
    return NextResponse.json({ error: "Месяцев: от 1 до 12" }, { status: 400 });
  }
  const payerName = String(body.payerName ?? "").trim().slice(0, 100);
  if (payerName.length < 2) {
    return NextResponse.json({ error: "Укажите имя плательщика (как в переводе)" }, { status: 400 });
  }
  const receiptUrl = String(body.receiptUrl ?? "").trim();
  if (!/^https?:\/\/\S+$/.test(receiptUrl)) {
    return NextResponse.json({ error: "Ссылка на скрин чека должна начинаться с http(s)://" }, { status: 400 });
  }
  const comment = String(body.comment ?? "").trim().slice(0, 500);

  const receipt = await createPaymentReceipt({
    id: `pay_${Math.random().toString(16).slice(2, 10)}`,
    userId: user.id,
    userLogin: user.login,
    amount: 499 * months,
    months,
    payerName,
    receiptUrl,
    comment,
  });
  return NextResponse.json({ ok: true, receipt });
}
