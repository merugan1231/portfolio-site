import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { providerConfig, siteUrl } from "@/lib/oauth";
import { getUsers, saveUser } from "@/lib/storage";
import { hashPassword, newId } from "@/lib/users";
import { createSession } from "@/lib/sessions";
import { SESSION_COOKIE } from "@/lib/current-user";
import { cookies } from "next/headers";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const cfg = providerConfig(provider);
  const fail = (msg: string) =>
    NextResponse.redirect(`${siteUrl()}/register?error=${encodeURIComponent(msg)}`);

  if (!cfg || !cfg.clientId || !cfg.clientSecret) return fail("Провайдер не настроен");

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const store = await cookies();
  if (!code || !state || state !== store.get("oauth_state")?.value) {
    return fail("Ошибка проверки безопасности, попробуйте снова");
  }
  store.delete("oauth_state");

  const tokenRes = await fetch(cfg.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      redirect_uri: `${siteUrl()}${cfg.redirectPath}`,
    }),
  });
  if (!tokenRes.ok) {
    const errText = await tokenRes.text().catch(() => "");
    console.error(`OAuth token exchange failed for ${provider}: ${tokenRes.status} ${errText}`);
    // Показываем код ошибки провайдера (не секрет), чтобы можно было быстро диагностировать
    const short = errText.slice(0, 120);
    return fail(`Не удалось войти через провайдера (${tokenRes.status}: ${short})`);
  }
  const tokenJson = (await tokenRes.json()) as { access_token?: string };
  if (!tokenJson.access_token) return fail("Провайдер не вернул токен");

  const profile = await cfg.fetchProfile(tokenJson.access_token);
  if (!profile?.email) return fail("Провайдер не отдал email — войдите другим способом");

  const email = profile.email.toLowerCase();
  let user = (await getUsers()).find((u) => u.email === email);
  if (!user) {
    // Служебный логин генерируем сами (по почте), но юзернейм НЕ подставляем:
    // пользователь выберет его сам в онбординге — он закрепляется один раз.
    const base = "dev" + randomBytes(3).toString("hex");
    let login = base;
    let n = 1;
    while ((await getUsers()).some((u) => u.login.toLowerCase() === login.toLowerCase())) {
      login = `${base}${n++}`;
    }
    user = {
      id: newId("u"),
      login,
      email,
      phone: "",
      passwordHash: hashPassword(newId("oauth")),
      role: "user",
      method: provider,
      createdAt: new Date().toISOString(),
      displayName: (profile.name ?? "").trim().slice(0, 40),
      username: null,
      avatarEmoji: "🧑‍💻",
      avatarUrl: "",
      bio: "",
      contacts: [],
      profileUpdatedAt: null,
      plan: "free",
      planExpiresAt: null,
      bioDetails: {},
    };
    await saveUser(user);
  }

  const session = await createSession(user.id);
  // После входа через Google предлагаем подтвердить/изменить юзернейм и имя (онбординг)
  const res = NextResponse.redirect(`${siteUrl()}/onboarding`);
  res.cookies.set(SESSION_COOKIE, session.token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
