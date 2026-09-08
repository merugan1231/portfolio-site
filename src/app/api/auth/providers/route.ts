import { NextResponse } from "next/server";
import { enabledProviders } from "@/lib/oauth";

export async function GET() {
  return NextResponse.json({
    providers: enabledProviders().map((p) => ({ id: p.id, label: p.label, short: p.short })),
  });
}
