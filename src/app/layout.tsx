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

export const metadata: Metadata = {
  title: {
    default: "DevShelf — полка работ разработчиков и креаторов",
    template: "%s — DevShelf",
  },
  description:
    "DevShelf — сервис, где программисты, OSINT-специалисты, кейсисты, иллюстраторы и создатели ботов собирают портфолио из подтверждённых работ с подробным описанием процесса.",
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
