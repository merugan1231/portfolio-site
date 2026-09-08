import { createHash } from "crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "pf_admin";
const SALT = "portfolio-site-admin-v1";

export function makeToken(password: string): string {
  return createHash("sha256").update(`${password}::${SALT}`).digest("hex");
}

export function adminPassword(): string {
  return process.env.ADMIN_PASSWORD ?? "admin123";
}

/** Проверка сессии по cookie. Использовать только на сервере. */
export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  return !!token && token === makeToken(adminPassword());
}
