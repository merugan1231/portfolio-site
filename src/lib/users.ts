import { createHash, randomBytes, randomInt } from "crypto";
import type { StoredUser } from "./storage";

export type Role = "admin" | "user";

export type User = StoredUser;

export function hashPassword(password: string): string {
  return "sha256:" + createHash("sha256").update(`pf-user::${password}`).digest("hex");
}

export function newId(prefix: string): string {
  return `${prefix}_${randomBytes(6).toString("hex")}`;
}

export function generateCode(): string {
  return String(randomInt(100000, 1000000));
}
