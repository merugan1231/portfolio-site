import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { saveUser, findUserByUsername } from "@/lib/storage";
import { USERNAME_RE, canChangeProfile, profileCooldownLeft } from "@/lib/users";

type Contact = { label: string; value: string };

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const cooldownLeft = profileCooldownLeft(user);
  return NextResponse.json({
    profile: {
      login: user.login,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      avatarEmoji: user.avatarEmoji,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      contacts: user.contacts ?? [],
      canChangeName: canChangeProfile(user),
      cooldownHours: Math.ceil(cooldownLeft / 3600000),
      memberSince: user.createdAt, // приватно: только для владельца аккаунта
    },
  });
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  let body: {
    username?: string;
    displayName?: string;
    avatarEmoji?: string;
    avatarUrl?: string;
    bio?: string;
    contacts?: Contact[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const nameLocked = !canChangeProfile(user);
  const next = { ...user };

  // Имя и юзернейм — раз в сутки
  if (body.username !== undefined && body.username !== user.username) {
    if (nameLocked) {
      return NextResponse.json(
        { error: `Юзернейм можно менять раз в сутки. Следующая смена через ~${Math.ceil(profileCooldownLeft(user) / 3600000)} ч.` },
        { status: 429 }
      );
    }
    const username = body.username.trim();
    if (!USERNAME_RE.test(username)) {
      return NextResponse.json({ error: "Юзернейм: 3–24 символа, латиница, цифры и _" }, { status: 400 });
    }
    const taken = await findUserByUsername(username);
    if (taken && taken.id !== user.id) {
      return NextResponse.json({ error: "Этот юзернейм уже занят" }, { status: 409 });
    }
    next.username = username;
  }

  if (body.displayName !== undefined && body.displayName !== user.displayName) {
    if (nameLocked) {
      return NextResponse.json(
        { error: `Имя можно менять раз в сутки. Следующая смена через ~${Math.ceil(profileCooldownLeft(user) / 3600000)} ч.` },
        { status: 429 }
      );
    }
    const displayName = body.displayName.trim();
    if (displayName.length < 2 || displayName.length > 40) {
      return NextResponse.json({ error: "Имя: от 2 до 40 символов" }, { status: 400 });
    }
    next.displayName = displayName;
  }

  // Остальное — свободно
  if (body.avatarEmoji !== undefined) next.avatarEmoji = String(body.avatarEmoji).slice(0, 8);
  if (body.avatarUrl !== undefined) {
    const url = String(body.avatarUrl).trim();
    if (url && !/^https:\/\/\S+$/.test(url)) {
      return NextResponse.json({ error: "Ссылка на аватар должна начинаться с https://" }, { status: 400 });
    }
    next.avatarUrl = url.slice(0, 500);
  }
  if (body.bio !== undefined) next.bio = String(body.bio).slice(0, 500);

  if (body.contacts !== undefined) {
    if (!Array.isArray(body.contacts) || body.contacts.length > 5) {
      return NextResponse.json({ error: "Контактов не больше 5" }, { status: 400 });
    }
    const contacts: Contact[] = [];
    for (const c of body.contacts) {
      const label = String(c?.label ?? "").trim().slice(0, 30);
      const value = String(c?.value ?? "").trim().slice(0, 200);
      if (!label || !value) continue;
      contacts.push({ label, value });
    }
    next.contacts = contacts;
  }

  // Ставим отметку времени только если реально менялись имя/юз
  const nameChanged = next.username !== user.username || next.displayName !== user.displayName;
  if (nameChanged) next.profileUpdatedAt = new Date().toISOString();

  await saveUser(next);
  return NextResponse.json({ ok: true });
}
