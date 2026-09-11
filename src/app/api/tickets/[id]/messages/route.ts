import { NextResponse } from "next/server";
import { getCurrentUser, isAdminUser } from "@/lib/current-user";
import { listTicketMessages, addTicketMessage, listTicketsByUser, listAllTickets } from "@/lib/storage";
import { rateLimit } from "@/lib/users";

/** История переписки по тикету: автор — владелец тикета или админ. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const { id } = await params;
  const admin = await isAdminUser();
  let allowed = admin;
  if (!allowed) {
    const mine = await listTicketsByUser(me.id);
    allowed = mine.some((t) => t.id === id);
  }
  if (!allowed) return NextResponse.json({ error: "Тикет не найден" }, { status: 404 });

  const messages = await listTicketMessages(id);
  return NextResponse.json({ messages });
}

/**
 * Отправка сообщения в тикете:
 *  - от пользователя — доступно владельцу (включая замороженных/заблокированных — тикеты их канал связи);
 *  - от администрации — только админ/creator.
 * Пользовательский ответ вновь открывает решённый тикет.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const { id } = await params;
  const admin = await isAdminUser();

  let body: { body?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const text = (body.body ?? "").trim();
  if (text.length < 2) {
    return NextResponse.json({ error: "Сообщение слишком короткое" }, { status: 400 });
  }
  if (text.length > 3000) {
    return NextResponse.json({ error: "Сообщение слишком длинное (максимум 3000 символов)" }, { status: 400 });
  }

  if (admin) {
    const all = await listAllTickets();
    if (!all.some((t) => t.id === id)) {
      return NextResponse.json({ error: "Тикет не найден" }, { status: 404 });
    }
    // Rate-limit админу не нужен, но чтобы не улетать в поток — лёгкий лимит на админ-логин
    const rlA = rateLimit(`ticket-msg:admin:${me.login}`, 60, 60 * 1000);
    if (!rlA.ok) return NextResponse.json({ error: "Слишком много сообщений, подождите немного" }, { status: 429 });

    const msg = await addTicketMessage(id, "admin", me.login, text);
    return NextResponse.json({ ok: true, message: msg });
  }

  const mine = await listTicketsByUser(me.id);
  if (!mine.some((t) => t.id === id)) {
    return NextResponse.json({ error: "Тикет не найден" }, { status: 404 });
  }
  // Спам-защита: 20 сообщений в 5 минут на пользователя
  const rl = rateLimit(`ticket-msg:${me.id}`, 20, 5 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Слишком много сообщений. Подождите ${rl.retryAfterSec} с.` },
      { status: 429 }
    );
  }

  const msg = await addTicketMessage(id, "user", me.login, text);
  return NextResponse.json({ ok: true, message: msg });
}
