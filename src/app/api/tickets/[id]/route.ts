import { NextResponse } from "next/server";
import { isAdminUser, getCurrentUser } from "@/lib/current-user";
import { resolveTicket } from "@/lib/storage";

/** Обработка тикета: только админ/creator. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!(await isAdminUser()) || !me) {
    return NextResponse.json({ error: "Доступ только для администрации" }, { status: 403 });
  }

  const { id } = await params;
  let body: { status?: string; reply?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const status = body.status === "dismissed" ? "dismissed" : "resolved";
  const reply = (body.reply ?? "").trim().slice(0, 2000);

  const ticket = await resolveTicket(id, status, reply, me.login);
  if (!ticket) return NextResponse.json({ error: "Тикет не найден" }, { status: 404 });
  return NextResponse.json({ ok: true, ticket });
}
