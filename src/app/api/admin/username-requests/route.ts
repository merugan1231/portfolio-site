import { NextResponse } from "next/server";
import { getCurrentUser, isAdminUser } from "@/lib/current-user";
import { listUsernameRequests, updateUsernameRequest, findUserByUsername, findUserById, saveUser } from "@/lib/storage";
import { USERNAME_RE } from "@/lib/users";

/** Все запросы на смену юзернейма — только админ/creator. */
export async function GET() {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: "Доступ только для администрации" }, { status: 403 });
  }
  const requests = await listUsernameRequests();
  return NextResponse.json({ requests });
}

/**
 * Решение по запросу: одобрить (сменить юзернейм) или отклонить.
 * Одобрение атомарно проверяет, что юзернейм всё ещё свободен.
 */
export async function POST(request: Request) {
  const me = await getCurrentUser();
  if (!(await isAdminUser()) || !me) {
    return NextResponse.json({ error: "Доступ только для администрации" }, { status: 403 });
  }

  let body: { id?: string; action?: "approve" | "dismiss"; reply?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const { findUsernameRequest } = await import("@/lib/storage");
  const req = body.id ? await findUsernameRequest(body.id) : null;
  if (!req) return NextResponse.json({ error: "Запрос не найден" }, { status: 404 });
  if (req.status !== "open") {
    return NextResponse.json({ error: "По этому запросу уже вынесено решение" }, { status: 400 });
  }

  const reply = (body.reply ?? "").trim().slice(0, 500);

  if (body.action === "dismiss") {
    const updated = await updateUsernameRequest(req.id, "dismissed", reply, me.login);
    return NextResponse.json({ ok: true, request: updated });
  }

  // Одобрение: проверяем формат и занятость целевого юзернейма
  const requested = req.requestedUsername;
  if (!USERNAME_RE.test(requested)) {
    return NextResponse.json({ error: "Юзернейм в запросе не проходит валидацию" }, { status: 400 });
  }
  const taken = await findUserByUsername(requested);
  if (taken && taken.id !== req.userId) {
    await updateUsernameRequest(req.id, "dismissed", `Юзернейм @${requested} уже занят другим аккаунтом.`, me.login);
    return NextResponse.json({ error: `Юзернейм @${requested} уже занят — запрос отклонён` }, { status: 400 });
  }
  const owner = await findUserById(req.userId);
  if (!owner) return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });

  owner.username = requested;
  await saveUser(owner);
  const updated = await updateUsernameRequest(req.id, "approved", reply || `Юзернейм изменён на @${requested}.`, me.login);
  return NextResponse.json({ ok: true, request: updated });
}
