import { NextResponse } from "next/server";
import { findUserByUsername, getUsers } from "@/lib/storage";
import { getUserWorks, getWorkRating } from "@/lib/works";
import { ensureDemoVolume, getDemoProfile, getDemoWorksByUsername, getDemoWorkRating } from "@/lib/demo-works";

export async function GET(_request: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;

  // Демо-слой должен быть инициализирован в ЭТОМ процессе — иначе
  // кэш демо-сообщества пуст и профили демо-авторов не открываются
  // (профиль отдаёт 404). Инициализируем теми же числами, что и витрины.
  const allUsers = await getUsers();
  ensureDemoVolume(allUsers.length, 0);

  // Демо-профили витрины (вне БД): создатель и демо-сообщество.
  // Настоящие пользователи всегда в приоритете и проверяются ниже.
  const demo = getDemoProfile(username);
  if (demo) {
    return NextResponse.json({
      profile: {
        id: demo.id,
        username: demo.username,
        displayName: demo.displayName,
        avatarEmoji: demo.avatarEmoji,
        avatarUrl: demo.avatarUrl,
        bio: demo.bio,
        bioDetails: demo.bioDetails,
        roles: demo.roles,
        plan: demo.plan,
        contacts: [],
        memberSince: demo.memberSince,
        creator: demo.creator ?? false,
      },
      works: await Promise.all(
        getDemoWorksByUsername(demo.username).map(async (w) => ({
          id: w.id,
          type: w.type,
          typeCustom: w.typeCustom,
          title: w.title,
          summary: w.summary,
          rating: await getDemoWorkRating(w.id),
          links: [],
          demo: true,
        }))
      ),
    });
  }

  const user = await findUserByUsername(username);
  if (!user) return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });

  const works = (await getUserWorks(user.id)).filter((w) => w.verifyStatus === "verified");
  const withRatings = await Promise.all(
    works.map(async (w) => ({ ...w, rating: await getWorkRating(w.id) }))
  );

  return NextResponse.json({
    profile: {
      id: user.publicId,
      username: user.username,
      displayName: user.displayName,
      avatarEmoji: user.avatarEmoji,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      bioDetails: user.bioDetails ?? {},
      roles: user.roles ?? [],
      plan: user.plan ?? "free",
      contacts: user.contacts ?? [],
      memberSince: user.createdAt,
      creator: user.role === "creator",
    },
    works: withRatings,
  });
}
