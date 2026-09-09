import { NextResponse } from "next/server";
import { getActiveUser } from "@/lib/current-user";
import { getWork, updateWork, getUserWorks, autoVerify, getWorkReviews, getWorkRating } from "@/lib/works";

/** Публичный просмотр работы: данные + отзывы + рейтинг (без verify-токена). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const work = await getWork(id);
  if (!work) return NextResponse.json({ error: "Работа не найдена" }, { status: 404 });

  const viewer = await getActiveUser();
  const [reviews, rating] = await Promise.all([getWorkReviews(id), getWorkRating(id)]);
  const { verifyToken, ...publicWork } = work;
  void verifyToken;
  return NextResponse.json({ work: publicWork, reviews, rating, viewerIsOwner: viewer?.id === work.userId });
}

async function getOwnedWork(id: string) {
  const user = await getActiveUser();
  if (!user) return { error: "Не авторизован", status: 401 as const };
  const work = await getWork(id);
  if (!work) return { error: "Работа не найдена", status: 404 as const };
  if (work.userId !== user.id) return { error: "Это не ваша работа", status: 403 as const };
  return { work, user };
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owned = await getOwnedWork(id);
  if ("error" in owned) return NextResponse.json({ error: owned.error }, { status: owned.status });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (body.verifyUrl !== undefined) {
    const verifyUrl = String(body.verifyUrl).trim();
    if (verifyUrl && !/^https?:\/\/\S+$/.test(verifyUrl)) {
      return NextResponse.json({ error: "Ссылка должна начинаться с http(s)://" }, { status: 400 });
    }
    patch.verifyUrl = verifyUrl;
    // Новая ссылка -> повторная автопроверка
    const result = await autoVerify(owned.work.verifyToken, verifyUrl);
    patch.verifyStatus = result.status;
    patch.verifyNote = result.note;
  }

  const updated = await updateWork(id, patch);
  return NextResponse.json({ ok: true, work: updated });
}
