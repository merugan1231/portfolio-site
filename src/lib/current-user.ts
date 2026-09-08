import { cookies } from "next/headers";
import { getSession } from "./sessions";
import { getUsers, type StoredUser } from "./storage";

export const SESSION_COOKIE = "pf_session";

export async function getCurrentUser(): Promise<StoredUser | null> {
  const store = await cookies();
  const session = await getSession(store.get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const users = await getUsers();
  return users.find((u) => u.id === session.userId) ?? null;
}

export async function isAdminUser(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === "admin";
}
