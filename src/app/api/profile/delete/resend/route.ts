import { NextResponse } from "next/server";
import { getActiveUser } from "@/lib/current-user";
import { putCode, kvGet, kvSet } from "@/lib/storage";
import { generateCode, rateLimit, clientIp } from "@/lib/users";
import { sendVerificationEmail } from "@/lib/mailer";

/** Повторная отправка кода удаления аккаунта. Кулдаун 60 секунд. */
export async function POST(request: Request) {
  const user = await getActiveUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  if (!user.email) {
    return NextResponse.json({ error: "У аккаунта нет почты" }, { status: 400 });
  }

  // Rate-limit повторных отправок: 5 в 10 минут с одного IP
  const rl = rateLimit(`delresend:${clientIp(request)}`, 5, 10 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Слишком много запросов. Попробуйте через ${Math.ceil(rl.retryAfterSec / 60)} мин.` },
      { status: 429 }
    );
  }

  const key = `code:delete:${user.id}`;
  const entry = await kvGet<{ code: string; payload: Record<string, string>; expiresAt: number; resendAt?: number } | null>(key);
  if (!entry || Date.now() > entry.expiresAt) {
    // старого кода нет — просто выдаём новый
  } else if (entry.resendAt && Date.now() - entry.resendAt < 60_000) {
    const left = Math.ceil((60_000 - (Date.now() - entry.resendAt)) / 1000);
    return NextResponse.json({ error: `Повторная отправка будет доступна через ${left} с` }, { status: 429 });
  }

  const code = generateCode();
  await putCode(`delete:${user.id}`, code, { purpose: "delete-account", userId: user.id });
  await kvSet(key, { code, payload: { purpose: "delete-account", userId: user.id }, expiresAt: Date.now() + 10 * 60 * 1000, attempts: 0, resendAt: Date.now() });

  const mail = await sendVerificationEmail(user.email, code, "delete");
  return NextResponse.json({ ok: true, delivered: mail.delivered, devCode: mail.devCode, error: mail.error });
}
