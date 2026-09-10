import { NextResponse } from "next/server";
import { getCurrentUser, isAdminUser } from "@/lib/current-user";
import { listPaymentReceipts, getPaymentReceipt, updatePaymentReceipt, getUsers, saveUser } from "@/lib/storage";
import { isPro } from "@/lib/users";

/** Все заявки на Pro — только админ/creator. */
export async function GET() {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: "Доступ только для администрации" }, { status: 403 });
  }
  const receipts = await listPaymentReceipts();
  return NextResponse.json({ receipts });
}

/**
 * Решение по заявке: approve — выдать Pro на months месяцев (от текущего срока, если активен),
 * reject — отклонить с причиной. Причина обязательна при отклонении.
 */
export async function POST(request: Request) {
  const me = await getCurrentUser();
  if (!(await isAdminUser()) || !me) {
    return NextResponse.json({ error: "Доступ только для администрации" }, { status: 403 });
  }

  let body: { id?: string; action?: "approve" | "reject"; reply?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const receipt = body.id ? await getPaymentReceipt(body.id) : null;
  if (!receipt) return NextResponse.json({ error: "Заявка не найдена" }, { status: 404 });
  if (receipt.status !== "pending") {
    return NextResponse.json({ error: "По этой заявке уже вынесено решение" }, { status: 400 });
  }

  const reply = (body.reply ?? "").trim().slice(0, 500);

  if (body.action === "reject") {
    if (reply.length < 5) {
      return NextResponse.json({ error: "Укажите причину отклонения (минимум 5 символов)" }, { status: 400 });
    }
    const updated = await updatePaymentReceipt(receipt.id, "rejected", reply, me.login);
    return NextResponse.json({ ok: true, receipt: updated });
  }

  // Одобрение: выдаем Pro пользователю на months месяцев
  const users = await getUsers();
  const target = users.find((u) => u.id === receipt.userId);
  if (!target) return NextResponse.json({ error: "Пользователь заявки не найден" }, { status: 404 });

  const next = { ...target };
  const base = isPro(target) && target.planExpiresAt ? new Date(target.planExpiresAt).getTime() : Date.now();
  next.plan = "pro";
  next.planExpiresAt = new Date(base + receipt.months * 30 * 24 * 60 * 60 * 1000).toISOString();
  await saveUser(next);

  const updated = await updatePaymentReceipt(receipt.id, "approved", reply || `Pro активирован на ${receipt.months} мес.`, me.login);
  return NextResponse.json({ ok: true, receipt: updated, planExpiresAt: next.planExpiresAt });
}
