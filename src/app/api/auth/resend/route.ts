import { NextResponse } from "next/server";
import { kvGet, kvSet, putCode } from "@/lib/storage";
import { generateCode } from "@/lib/users";
import { sendVerificationEmail } from "@/lib/mailer";

/**
 * Повторная отправка кода регистрации.
 * Работает только если регистрация уже начата (в kv лежит заготовка payload
 * с полем resendAt). Кулдаун 60 секунд, новый код заменяет старый.
 */
export async function POST(request: Request) {
  let body: { target?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const target = (body.target ?? "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(target)) {
    return NextResponse.json({ error: "Некорректный email" }, { status: 400 });
  }

  const entry = await kvGet<{ code: string; payload: Record<string, string>; expiresAt: number; resendAt?: number } | null>(`code:${target}`);
  if (!entry || Date.now() > entry.expiresAt || !entry.payload?.login) {
    return NextResponse.json({ error: "Начните регистрацию заново — сессия кода истекла" }, { status: 404 });
  }
  if (entry.resendAt && Date.now() - entry.resendAt < 60_000) {
    const left = Math.ceil((60_000 - (Date.now() - entry.resendAt)) / 1000);
    return NextResponse.json({ error: `Повторная отправка будет доступна через ${left} с` }, { status: 429 });
  }

  const code = generateCode();
  const payload = entry.payload;
  await putCode(target, code, payload);
  // сохраняем отметку времени повторной отправки (putCode её стёр)
  await kvSet(`code:${target}`, { code, payload, expiresAt: Date.now() + 10 * 60 * 1000, attempts: 0, resendAt: Date.now() });

  const mail = await sendVerificationEmail(target, code, "register");
  return NextResponse.json({ ok: true, delivered: mail.delivered, devCode: mail.devCode, error: mail.error });
}
