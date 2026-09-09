import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null });
  const status = user.status ?? "active";
  return NextResponse.json({
    user: {
      id: user.id,
      login: user.login,
      role: user.role,
      email: user.email,
      displayName: user.displayName,
      username: user.username,
      avatarEmoji: user.avatarEmoji,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      roles: user.roles ?? [],
      plan: user.plan ?? "free",
      isPro: user.plan === "pro" && (!user.planExpiresAt || new Date(user.planExpiresAt).getTime() > Date.now()),
      needsProfile: !user.username || !(user.displayName ?? "").trim(),
      // Онбординг нужен только тем, у кого ещё не закреплён юзернейм
      needsUsername: !user.username,
      status,
      statusReason: user.statusReason ?? "",
      statusLabel: status === "frozen" ? "заморожен" : status === "blocked" ? "заблокирован" : "активен",
    },
  });
}
