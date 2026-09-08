import { NextResponse } from "next/server";
import { getPortfolio, savePortfolio } from "@/lib/storage";
import { isPortfolio, type Portfolio } from "@/lib/portfolio";
import { getCurrentUser } from "@/lib/current-user";

export async function GET() {
  return NextResponse.json(await getPortfolio());
}

export async function POST(request: Request) {
  const me = await getCurrentUser();
  if (me?.role !== "admin") {
    return NextResponse.json({ error: "Требуется вход администратора" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }
  if (!isPortfolio(body)) {
    return NextResponse.json({ error: "Данные не прошли валидацию" }, { status: 400 });
  }

  await savePortfolio(body as Portfolio);
  return NextResponse.json({ ok: true });
}
