import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { getReview, getWork, updateReview } from "@/lib/works";

/** Владелец работы оспаривает отзыв -> статус disputed, смотрит админ (владелец сервиса). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  let body: { disputeReason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const review = await getReview(id);
  if (!review) return NextResponse.json({ error: "Отзыв не найден" }, { status: 404 });
  if (review.status !== "published") {
    return NextResponse.json({ error: "Этот отзыв уже не опубликован" }, { status: 400 });
  }

  const work = await getWork(review.workId);
  if (!work) return NextResponse.json({ error: "Работа не найдена" }, { status: 404 });
  if (work.userId !== user.id) {
    return NextResponse.json({ error: "Оспорить отзыв может только автор работы" }, { status: 403 });
  }

  const reason = String(body.disputeReason ?? "").trim();
  if (reason.length < 20) {
    return NextResponse.json({ error: "Опишите причину спора — минимум 20 символов" }, { status: 400 });
  }

  const updated = await updateReview(id, { status: "disputed", disputeReason: reason });
  return NextResponse.json({ ok: true, review: updated });
}
