import { NextResponse } from "next/server";
import { providerConfig, siteUrl } from "@/lib/oauth";
import { randomBytes } from "crypto";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const cfg = providerConfig(provider);
  if (!cfg || !cfg.clientId || !cfg.clientSecret) {
    return NextResponse.redirect(`${siteUrl()}/register?error=${encodeURIComponent("Провайдер пока не настроен")}`);
  }

  const state = randomBytes(16).toString("hex");
  const redirectUri = `${siteUrl()}${cfg.redirectPath}`;
  const url = new URL(cfg.authUrl);
  url.searchParams.set("client_id", cfg.clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", cfg.scope);
  url.searchParams.set("state", state);

  const res = NextResponse.redirect(url.toString());
  res.cookies.set("oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
