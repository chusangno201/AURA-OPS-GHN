import { NextRequest, NextResponse } from "next/server";
import { authenticated } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  if (!(await authenticated())) {
    return NextResponse.redirect(new URL("/login", req.url), 303);
  }

  const form = await req.formData();
  const id = String(form.get("messageId") || "").trim();

  if (!id || id.length > 128) {
    return NextResponse.json(
      { error: "ID tin nhắn không hợp lệ" },
      { status: 400 }
    );
  }

  await db.message.deleteMany({
    where: { id }
  });

  return NextResponse.redirect(new URL("/", req.url), 303);
}
