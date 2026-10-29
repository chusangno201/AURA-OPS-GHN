import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { db } from "@/lib/db";
export const runtime = "nodejs";
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  if (
    p.get("hub.mode") === "subscribe" &&
    process.env.META_VERIFY_TOKEN &&
    p.get("hub.verify_token") === process.env.META_VERIFY_TOKEN
  )
    return new Response(p.get("hub.challenge") || "");
  return new Response("Forbidden", { status: 403 });
}
export async function POST(req: NextRequest) {
  const raw = await req.text(),
    received = req.headers.get("x-hub-signature-256") || "";
  if (!process.env.META_APP_SECRET)
    return new Response("Unconfigured", { status: 503 });
  const wanted =
    "sha256=" +
    crypto
      .createHmac("sha256", process.env.META_APP_SECRET)
      .update(raw)
      .digest("hex");
  const a = Buffer.from(received),
    b = Buffer.from(wanted);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b))
    return new Response("Invalid signature", { status: 401 });
  const body = JSON.parse(raw);
  if (body.object !== "page") return NextResponse.json({ ok: true });
  for (const entry of body.entry || []) {
    for (const event of entry.messaging || []) {
      if (!event.message?.mid || event.message.is_echo || !event.sender?.id)
        continue;
      await db.message.upsert({
        where: { mid: event.message.mid },
        create: {
          mid: event.message.mid,
          pageId: String(entry.id),
          senderId: String(event.sender.id),
          text: String(event.message.text || "[attachment]"),
        },
        update: {},
      });
    }
  }
  return NextResponse.json({ ok: true });
}
