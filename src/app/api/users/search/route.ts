import { NextResponse } from "next/server";
import { searchUsersByUsername } from "@/lib/storage";
import { USER_ROLE_IDS } from "@/lib/users";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const q = params.get("q") ?? "";
  const roleParam = params.get("role") ?? "";
  const role = USER_ROLE_IDS.includes(roleParam as never) ? roleParam : undefined;
  const users = await searchUsersByUsername(q, 20, role);
  return NextResponse.json({
    users: users.map((u) => ({
      username: u.username,
      displayName: u.displayName,
      avatarEmoji: u.avatarEmoji,
      avatarUrl: u.avatarUrl,
      bio: u.bio,
      roles: u.roles ?? [],
      plan: u.plan ?? "free",
    })),
  });
}
