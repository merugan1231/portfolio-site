import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { createUsernameRequest, listUsernameRequestsByUser, findUserByUsername, saveUser } from "@/lib/storage";
import { USERNAME_RE } from "@/lib/users";

type UsernameRequest = {
  id: string;
  requestedUsername: string;
  status: "open" | "approved" | "dismissed";
  adminReply: string;
  handledBy: string;
  createdAt: string;
};

/** Мои запросы на смену юзернейма (со статусом и ответом администрации). */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  const requests = await listUsernameRequestsByUser(user.id);
  return NextResponse.json({
    requests: requests.map((r) => ({
      id: r.id,
      requestedUsername: r.requestedUsername,
      status: r.status,
      adminReply: r.adminReply,
      handledBy: r.handledBy,
      createdAt: r.createdAt,
    })),
  });
}

/**
 * Создание запроса на смену юзернейма. Юзернейм закрепляется один раз,
 * но пользователь может попросить смену — её рассматривает администрация.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  if (user.status === "frozen" || user.status === "blocked") {
    return NextResponse.json({ error: "Аккаунт ограничен — запросы недоступны" }, { status: 403 });
  }

  let body: { username?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const requested = (body.username ?? "").trim();
  if (!USERNAME_RE.test(requested)) {
    return NextResponse.json({ error: `Юзернейм не подходит: ${USERNAME_RE}` }, { status: 400 });
  }
  if (requested.toLowerCase() === (user.username ?? "").toLowerCase()) {
    return NextResponse.json({ error: "Это ваш текущий юзернейм" }, { status: 400 });
  }
  const existing = await findUserByUsername(requested);
  if (existing && existing.id !== user.id) {
    return NextResponse.json({ error: "Этот юзернейм уже занят" }, { status: 400 });
  }
  const mine = await listUsernameRequestsByUser(user.id);
  const open = mine.find((r) => r.status === "open");
  if (open) {
    return NextResponse.json({ error: "У вас уже есть запрос на рассмотрении — дождитесь ответа" }, { status: 400 });
  }

  const req = await createUsernameRequest({
    id: `ur_${Math.random().toString(16).slice(2, 10)}`,
    userId: user.id,
    userLogin: user.login,
    currentUsername: user.username ?? "",
    requestedUsername: requested,
  });
  void saveUser; // (storage экспортирует saveUser — используется при одобрении в админ-API)
  return NextResponse.json({ ok: true, request: req });
}

export type { UsernameRequest };
