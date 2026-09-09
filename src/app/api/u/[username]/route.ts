import { NextResponse } from "next/server";
import { findUserByUsername } from "@/lib/storage";
import { getUserWorks, getWorkRating, getWorkReviews } from "@/lib/works";

export async function GET(_request: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const user = await findUserByUsername(username);
  if (!user) return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });

  const works = (await getUserWorks(user.id)).filter((w) => w.verifyStatus === "verified");
  const withRatings = await Promise.all(
    works.map(async (w) => ({ ...w, rating: await getWorkRating(w.id) }))
  );

  return NextResponse.json({
    profile: {
      username: user.username,
      displayName: user.displayName,
      avatarEmoji: user.avatarEmoji,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      bioDetails: user.bioDetails ?? {},
      plan: user.plan ?? "free",
      contacts: user.contacts ?? [],
      memberSince: user.createdAt,
    },
    works: withRatings,
  });
}
