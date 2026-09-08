import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { destroySession } from "@/lib/sessions";
import { SESSION_COOKIE } from "@/lib/current-user";

export async function POST() {
  const store = await cookies();
  await destroySession(store.get(SESSION_COOKIE)?.value);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
