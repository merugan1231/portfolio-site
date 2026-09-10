import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import RevealOnScroll from "@/components/RevealOnScroll";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://merugan.is-a.dev";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "DevShelf — полка работ разработчиков и креаторов",
    template: "%s — DevShelf",
  },
  description:
    "DevShelf — сервис, где программисты, OSINT-специалисты, кейсисты, иллюстраторы и создатели ботов собирают портфолио из подтверждённых работ с подробным описанием процесса.",
  applicationName: "DevShelf",
  keywords: [
    "DevShelf", "портфолио", "разработчик", "OSINT", "дизайн", "программирование",
    "подтверждение авторства", "работы", "кейс", "телеграм-бот", "веб-разработка",
  ],
  authors: [{ name: "DevShelf" }],
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: "DevShelf",
    title: "DevShelf — полка работ разработчиков и креаторов",
    description:
      "Собирайте портфолио из подтверждённых работ: процесс, команда, стек и результат. Программисты, OSINT-специалисты, дизайнеры и креаторы — всё на одной полке.",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "DevShelf — полка работ разработчиков и креаторов",
    description: "Портфолио из подтверждённых работ: процесс, команда, стек и результат.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="ru"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <Navbar />
        <main className="flex flex-1 flex-col">{children}</main>
        <Footer />
        <RevealOnScroll />
      </body>
    </html>
  );
}
