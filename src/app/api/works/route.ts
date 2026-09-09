import { NextResponse } from "next/server";
import { getActiveUser } from "@/lib/current-user";
import { createWork, updateWork, getUserWorks, getWork, getWorkRating, getWorkReviews, autoVerify, newVerifyToken, WORK_TYPES, type WorkType, type WorkLink } from "@/lib/works";
import { FREE_WORK_LIMIT, isPro } from "@/lib/users";

const VALID_TYPES = new Set(WORK_TYPES.map((t) => t.id));
const MAX_LINKS = 3;

function cleanLinks(raw: unknown): WorkLink[] {
  if (!Array.isArray(raw)) return [];
  const links: WorkLink[] = [];
  for (const l of raw.slice(0, MAX_LINKS)) {
    const label = String(l?.label ?? "").trim().slice(0, 60);
    const url = String(l?.url ?? "").trim();
    if (!label || !/^https?:\/\/\S+$/.test(url)) continue;
    links.push({ label, url: url.slice(0, 500) });
  }
  return links;
}

export async function GET() {
  const user = await getActiveUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const works = await getUserWorks(user.id);
  const withRatings = await Promise.all(
    works.map(async (w) => ({ ...w, rating: await getWorkRating(w.id) }))
  );
  return NextResponse.json({ works: withRatings, types: WORK_TYPES });
}

export async function POST(request: Request) {
  const user = await getActiveUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const type = String(body.type ?? "") as WorkType;
  const typeCustom = String(body.typeCustom ?? "").trim().slice(0, 60);
  const title = String(body.title ?? "").trim();
  const summary = String(body.summary ?? "").trim();
  const details = String(body.details ?? "").trim();
  const team = String(body.team ?? "").trim();
  const stack = String(body.stack ?? "").trim();
  const budget = String(body.budget ?? "").trim();
  const potential = String(body.potential ?? "").trim();
  const links = cleanLinks(body.links);
  const verifyUrl = String(body.verifyUrl ?? "").trim();

  if (!VALID_TYPES.has(type)) return NextResponse.json({ error: "Выберите тип работы" }, { status: 400 });
  if (type === "custom" && typeCustom.length < 2) {
    return NextResponse.json({ error: "Укажите свой вариант типа (минимум 2 символа)" }, { status: 400 });
  }
  if (title.length < 3 || title.length > 100) return NextResponse.json({ error: "Название: от 3 до 100 символов" }, { status: 400 });
  if (summary.length < 20 || summary.length > 400) return NextResponse.json({ error: "Краткое описание: от 20 до 400 символов" }, { status: 400 });
  if (details.length < 50) return NextResponse.json({ error: "Подробное описание: минимум 50 символов — расскажите, как делали работу" }, { status: 400 });
  if (details.length > 8000) return NextResponse.json({ error: "Подробное описание: максимум 8000 символов" }, { status: 400 });
  if (stack.length > 300) return NextResponse.json({ error: "Инструменты: максимум 300 символов" }, { status: 400 });
  if (links.length === 0) return NextResponse.json({ error: "Добавьте хотя бы одну ссылку на работу" }, { status: 400 });
  if (verifyUrl && !/^https?:\/\/\S+$/.test(verifyUrl)) {
    return NextResponse.json({ error: "Ссылка для подтверждения должна начинаться с http(s)://" }, { status: 400 });
  }

  // Лимит работ: 5 на бесплатном тарифе, безлимит на Pro
  if (!isPro(user)) {
    const existing = await getUserWorks(user.id);
    if (existing.length >= FREE_WORK_LIMIT) {
      return NextResponse.json(
        { error: `На бесплатном тарифе можно опубликовать до ${FREE_WORK_LIMIT} работ. Оформите Pro за 499 ₽/мес — без ограничений.`, code: "limit_reached" },
        { status: 403 }
      );
    }
  }

  const token = newVerifyToken();
  const work = await createWork({
    userId: user.id,
    type,
    typeCustom,
    title,
    summary,
    details,
    team: team.slice(0, 300),
    stack,
    budget: budget.slice(0, 300),
    potential: potential.slice(0, 500),
    links,
    verifyUrl,
    verifyToken: token,
  });

  // Если указана ссылка для подтверждения — сразу пробуем автопроверку
  if (verifyUrl) {
    const result = await autoVerify(token, verifyUrl);
    await updateWork(work.id, { verifyStatus: result.status, verifyNote: result.note });
  }

  const fresh = await getWork(work.id);
  return NextResponse.json({ ok: true, work: fresh });
}
