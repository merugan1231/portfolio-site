export type ProviderId = "google" | "yandex" | "apple";

export type ProviderConfig = {
  id: ProviderId;
  clientId?: string;
  clientSecret?: string;
  authUrl: string;
  tokenUrl: string;
  scope: string;
  redirectPath: string;
  label: string;
  short: string;
  color: string;
  fetchProfile: (accessToken: string) => Promise<{ email: string; name?: string } | null>;
};

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

function googleFetch(accessToken: string) {
  return fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
    .then((r) => r.json())
    .then((j) => (j.email ? { email: j.email, name: j.name } : null));
}

function yandexFetch(accessToken: string) {
  return fetch("https://login.yandex.ru/info?format=json", {
    headers: { Authorization: `OAuth ${accessToken}` },
  })
    .then((r) => r.json())
    .then((j) => {
      const email = j.default_email ?? j.emails?.[0];
      return email ? { email, name: j.real_name } : null;
    });
}

export function providerConfig(id: string): ProviderConfig | null {
  switch (id) {
    case "google":
      return {
        id: "google",
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
        tokenUrl: "https://oauth2.googleapis.com/token",
        scope: "openid email profile",
        redirectPath: "/api/auth/oauth/google/callback",
        label: "Продолжить с Google",
        short: "Google",
        color: "hover:!border-white/40",
        fetchProfile: googleFetch,
      };
    case "yandex":
      return {
        id: "yandex",
        clientId: process.env.YANDEX_CLIENT_ID,
        clientSecret: process.env.YANDEX_CLIENT_SECRET,
        authUrl: "https://oauth.yandex.ru/authorize",
        tokenUrl: "https://oauth.yandex.ru/token",
        scope: "login:email login:info",
        redirectPath: "/api/auth/oauth/yandex/callback",
        label: "Продолжить с Яндексом",
        short: "Яндекс",
        color: "hover:!border-red-400/60",
        fetchProfile: yandexFetch,
      };
    default:
      return null;
  }
}

export function enabledProviders(): ProviderConfig[] {
  // Яндекс отключён по решению пользователя (решено оставить только Google)
  return (["google"] as ProviderId[])
    .map((id) => providerConfig(id))
    .filter((c): c is ProviderConfig => !!c);
}
