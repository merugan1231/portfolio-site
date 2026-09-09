import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { createTicket, listTicketsByUser } from "@/lib/storage";
import { STATUS_LABELS } from "@/lib/users";

/** Мои тикеты (виден статус и ответ администрации). */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  const tickets = await listTicketsByUser(user.id);
  return NextResponse.json({
    tickets,
    accountStatus: user.status ?? "active",
    statusLabel: STATUS_LABELS[(user.status ?? "active") as keyof typeof STATUS_LABELS] ?? "активен",
    statusReason: user.statusReason ?? "",
  });
}

/**
 * Создание тикета. Доступно ВСЕМ вошедшим, включая замороженных
 * и заблокированных — это их канал связи с администрацией.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  let body: { type?: string; subject?: string; message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const type = body.type === "other" ? "other" : "appeal";
  const subject = (body.subject ?? "").trim().slice(0, 120);
  const message = (body.message ?? "").trim();
  if (message.length < 20) {
    return NextResponse.json({ error: "Опишите ситуацию подробнее (минимум 20 символов)" }, { status: 400 });
  }
  if (message.length > 3000) {
    return NextResponse.json({ error: "Сообщение слишком длинное (максимум 3000 символов)" }, { status: 400 });
  }

  const ticket = await createTicket({
    userId: user.id,
    userLogin: user.login,
    type,
    subject: subject || (type === "appeal" ? "Оспаривание модерации" : "Обращение"),
    message,
  });
  return NextResponse.json({ ok: true, ticket });
}
