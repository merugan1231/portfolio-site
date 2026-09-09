import { NextResponse } from "next/server";
import { getActiveUser } from "@/lib/current-user";
import { getWork, getWorkReviews, createReview, getWorkRating } from "@/lib/works";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const work = await getWork(id);
  if (!work) return NextResponse.json({ error: "Работа не найдена" }, { status: 404 });

  const [reviews, rating] = await Promise.all([getWorkReviews(id), getWorkRating(id)]);
  return NextResponse.json({ reviews, rating });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getActiveUser();
  if (!user) return NextResponse.json({ error: "Войдите, чтобы оставить отзыв" }, { status: 401 });

  const work = await getWork(id);
  if (!work) return NextResponse.json({ error: "Работа не найдена" }, { status: 404 });
  if (work.userId === user.id) {
    return NextResponse.json({ error: "Нельзя оценивать свою работу" }, { status: 403 });
  }

  let body: { stars?: number; text?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const stars = Number(body.stars);
  const text = String(body.text ?? "").trim();
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    return NextResponse.json({ error: "Оценка: целое число от 1 до 5 звёзд" }, { status: 400 });
  }
  // Ниже 4 звёзд — обязательное обоснование от 30 символов
  if (stars < 4 && text.length < 30) {
    return NextResponse.json(
      { error: "При оценке ниже 4 звёзд объясните, что именно не так — минимум 30 символов" },
      { status: 400 }
    );
  }
  if (text.length > 2000) {
    return NextResponse.json({ error: "Текст отзыва: максимум 2000 символов" }, { status: 400 });
  }

  const existing = await getWorkReviews(id, true);
  if (existing.some((r) => r.authorId === user.id)) {
    return NextResponse.json({ error: "Вы уже оценивали эту работу" }, { status: 409 });
  }

  const review = await createReview({ workId: id, authorId: user.id, stars, text });
  const rating = await getWorkRating(id);
  return NextResponse.json({ ok: true, review, rating });
}
