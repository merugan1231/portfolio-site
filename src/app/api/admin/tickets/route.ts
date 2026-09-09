import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/current-user";
import { listAllTickets } from "@/lib/storage";

/** Все тикеты пользователей — для вкладки «Тикеты» в админке. */
export async function GET() {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: "Доступ только для администрации" }, { status: 403 });
  }
  const tickets = await listAllTickets();
  return NextResponse.json({ tickets });
}
