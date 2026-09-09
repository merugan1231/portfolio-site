import { NextResponse } from "next/server";
import { getAllVerifiedWorks, getWorkAuthors, getWorkRating, WORK_TYPES } from "@/lib/works";

/** Все подтверждённые работы: ?q=поиск&type=фильтр. Доступно всем. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const q = (params.get("q") ?? "").slice(0, 100);
  const type = (params.get("type") ?? "").slice(0, 20);

  const works = await getAllVerifiedWorks(q, type);
  const withExtras = await Promise.all(
    works.map(async (w) => {
      const rating = await getWorkRating(w.id);
      return {
        id: w.id,
        type: w.type,
        typeCustom: w.typeCustom,
        title: w.title,
        summary: w.summary,
        stack: w.stack,
        createdAt: w.createdAt,
        rating,
      };
    })
  );
  const authors = await getWorkAuthors(works.map((w) => w.userId));
  return NextResponse.json({ works: withExtras, authors, types: WORK_TYPES });
}
