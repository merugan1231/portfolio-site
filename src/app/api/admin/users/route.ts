import { NextResponse } from "next/server";
import { getUsers } from "@/lib/storage";
import { getCurrentUser } from "@/lib/current-user";

export async function GET() {
  const me = await getCurrentUser();
  if (me?.role !== "admin") {
    return NextResponse.json({ error: "Доступ только для администратора" }, { status: 403 });
  }
  const users = await getUsers();
  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      login: u.login,
      email: u.email,
      role: u.role,
      method: u.method,
      createdAt: u.createdAt,
    })),
  });
}
