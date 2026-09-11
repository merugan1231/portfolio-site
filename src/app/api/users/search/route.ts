import { NextResponse } from "next/server";
import { searchUsersByUsername, getUsers } from "@/lib/storage";
import { USER_ROLE_IDS } from "@/lib/users";
import { ensureDemoVolume, searchDemoProfiles, type DemoProfile } from "@/lib/demo-works";

/** Точный поиск по публичному ID (в т.ч. «1» — создатель). */
async function findByPublicId(id: string) {
  if (!id.trim()) return undefined;
  const users = await getUsers();
  const real = users.find((u) => u.publicId && u.publicId.toLowerCase() === id.trim().toLowerCase());
  return real;
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const q = params.get("q") ?? "";
  const roleParam = params.get("role") ?? "";
  const role = USER_ROLE_IDS.includes(roleParam as never) ? roleParam : undefined;

  // Витрина демо-сообщества: инициализируется числами из БД (идемпотентно)
  const allUsers = await getUsers();
  ensureDemoVolume(allUsers.length, 0);

  // Реальные пользователи: если запрос похож на точный ID — ищем и по нему
  const realByRaw = await findByPublicId(q);
  let real = await searchUsersByUsername(q, 20, role);
  if (realByRaw && !real.some((u) => u.id === realByRaw.id)) {
    real = [realByRaw, ...real].slice(0, 20);
  }

  // Демо-профили добавляются только когда нефильтрованный поиск по роли.
  // Если реальный пользователь с таким же публичным ID уже есть (например,
  // создатель с ID «1») — демо-дубль не показываем.
  const realPublicIds = new Set(allUsers.map((u) => u.publicId).filter(Boolean) as string[]);
  const demo: DemoProfile[] = role
    ? []
    : searchDemoProfiles(q, 8).filter((d) => !realPublicIds.has(d.id));

  return NextResponse.json({
    users: [
      ...real.map((u) => ({
        id: u.publicId,
        username: u.username,
        displayName: u.displayName,
        avatarEmoji: u.avatarEmoji,
        avatarUrl: u.avatarUrl,
        bio: u.bio,
        roles: u.roles ?? [],
        plan: u.plan ?? "free",
        creator: u.role === "creator",
        demo: false,
      })),
      ...demo.map((d) => ({
        id: d.id,
        username: d.username,
        displayName: d.displayName,
        avatarEmoji: d.avatarEmoji,
        avatarUrl: d.avatarUrl,
        bio: d.bio,
        roles: d.roles,
        plan: d.plan,
        creator: d.creator ?? false,
        demo: true,
      })),
    ],
  });
}
