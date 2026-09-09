import { NextResponse } from "next/server";
import { searchUsersByUsername } from "@/lib/storage";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q") ?? "";
  const users = await searchUsersByUsername(q, 10);
  return NextResponse.json({
    users: users.map((u) => ({
      username: u.username,
      displayName: u.displayName,
      avatarEmoji: u.avatarEmoji,
      avatarUrl: u.avatarUrl,
      bio: u.bio,
    })),
  });
}
