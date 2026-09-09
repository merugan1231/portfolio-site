import { cookies } from "next/headers";
import { getSession } from "./sessions";
import { getUsers, type StoredUser } from "./storage";
import { isCreator, isStaff } from "./users";

export const SESSION_COOKIE = "pf_session";

export async function getCurrentUser(): Promise<StoredUser | null> {
  const store = await cookies();
  const session = await getSession(store.get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const users = await getUsers();
  return users.find((u) => u.id === session.userId) ?? null;
}

/**
 * Пользователь, чей аккаунт в норме (не заморожен и не заблокирован).
 * Замороженный может войти, чтобы подать тикет — но не пользоваться сервисом.
 */
export async function getActiveUser(): Promise<StoredUser | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  if (user.status === "frozen" || user.status === "blocked") return null;
  return user;
}

export async function isAdminUser(): Promise<boolean> {
  const user = await getCurrentUser();
  return isStaff(user);
}

export { isCreator, isStaff };
