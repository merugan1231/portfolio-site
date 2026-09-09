import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/current-user";
import { getReview, updateWork, updateReview, getDisputedReviews, getPendingVerificationWorks, getWork } from "@/lib/works";

/** Модерация: оспоренные отзывы + работы, ждущие проверки авторства. */
export async function GET() {
  if (!(await isAdminUser())) return NextResponse.json({ error: "Доступ только для владельца сервиса" }, { status: 403 });
  const disputed = await getDisputedReviews();
  const worksPending = await getPendingVerificationWorks();
  const withWorks = await Promise.all(
    disputed.map(async (r) => {
      const work = await getWork(r.workId);
      return { review: r, workTitle: work?.title ?? r.workId, workId: work?.id ?? "" };
    })
  );
  return NextResponse.json({
    disputed: withWorks,
    worksPending: worksPending.map((w) => ({
      id: w.id,
      title: w.title,
      verifyToken: w.verifyToken,
      verifyUrl: w.verifyUrl,
      verifyNote: w.verifyNote,
      verifyStatus: w.verifyStatus,
    })),
  });
}

export async function POST(request: Request) {
  if (!(await isAdminUser())) return NextResponse.json({ error: "Доступ только для владельца сервиса" }, { status: 403 });

  let body: { reviewId?: string; action?: "restore" | "remove"; note?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const review = await getReview(String(body.reviewId ?? ""));
  if (!review) return NextResponse.json({ error: "Отзыв не найден" }, { status: 404 });

  if (body.action === "remove") {
    // Необоснованная оценка — отзыв удаляется навсегда
    await updateReview(review.id, { status: "removed", disputeReason: review.disputeReason });
  } else if (body.action === "restore") {
    // Оценка обоснована — возвращаем публикацию
    await updateReview(review.id, { status: "published" });
  } else {
    return NextResponse.json({ error: "Неизвестное действие" }, { status: 400 });
  }

  // Работа с подтверждённым верификейшеном тоже доступна для ручного решения
  return NextResponse.json({ ok: true });
}

/** Ручное подтверждение собственности работы (из админки). */
export async function PUT(request: Request) {
  if (!(await isAdminUser())) return NextResponse.json({ error: "Доступ только для владельца сервиса" }, { status: 403 });

  let body: { workId?: string; status?: "verified" | "unverified" };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }
  const workId = String(body.workId ?? "");
  const status = body.status;
  if (!workId || (status !== "verified" && status !== "unverified")) {
    return NextResponse.json({ error: "Нужны workId и status" }, { status: 400 });
  }
  const updated = await updateWork(workId, {
    verifyStatus: status,
    verifyNote: status === "verified" ? "Подтверждено владельцем сервиса вручную." : "Владелец сервиса отклонил подтверждение.",
  });
  if (!updated) return NextResponse.json({ error: "Работа не найдена" }, { status: 404 });
  return NextResponse.json({ ok: true, work: updated });
}
