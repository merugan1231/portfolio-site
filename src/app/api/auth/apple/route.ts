import { NextResponse } from "next/server";
import { siteUrl } from "@/lib/oauth";

export async function GET() {
  return NextResponse.redirect(
    `${siteUrl()}/register?error=${encodeURIComponent("Вход через Apple появится совсем скоро — пока используйте Google, Яндекс или email")}`
  );
}
