import { NextResponse } from "next/server";
import { getActiveUser } from "@/lib/current-user";
import { putCode } from "@/lib/storage";
import { generateCode } from "@/lib/users";
import { sendVerificationEmail } from "@/lib/mailer";

/** Шаг 1 удаления аккаунта: отправляем код подтверждения на почту пользователя. */
export async function POST() {
  const user = await getActiveUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  if (!user.email) {
    return NextResponse.json({ error: "У аккаунта нет почты — обратитесь к владельцу сервиса" }, { status: 400 });
  }

  const code = generateCode();
  await putCode(`delete:${user.id}`, code, { purpose: "delete-account", userId: user.id });
  const mail = await sendVerificationEmail(user.email, code, "delete");

  if (mail.delivered) {
    return NextResponse.json({ ok: true, delivered: true });
  }
  // Почта не ушла (демо-режим или сбой) — код вернётся на экран как резервный путь
  return NextResponse.json({ ok: true, delivered: false, devCode: mail.devCode, error: mail.error });
}
