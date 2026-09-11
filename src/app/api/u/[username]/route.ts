import { NextResponse } from "next/server";
import { findUserByUsername } from "@/lib/storage";
import { getUserWorks, getWorkRating } from "@/lib/works";
import { getDemoProfile, getDemoWorksByUsername } from "@/lib/demo-works";

export async function GET(_request: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;

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
      works: getDemoWorksByUsername(demo.username).map((w) => ({
        id: w.id,
        type: w.type,
        typeCustom: w.typeCustom,
        title: w.title,
        summary: w.summary,
        rating: w.rating,
        links: [],
        demo: true,
      })),
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
