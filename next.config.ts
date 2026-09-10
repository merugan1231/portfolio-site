import type { NextConfig } from "next";

/**
 * Security-заголовки:
 * - X-Frame-Options DENY / frame-ancestors — защита от кликджекинга
 * - X-Content-Type-Options — запрет MIME-sniffing
 * - Referrer-Policy — не сливаем URL-ы наружу
 * - Permissions-Policy — отключаем ненужные браузерные API
 * - HSTS — принудительный HTTPS на проде
 */
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
