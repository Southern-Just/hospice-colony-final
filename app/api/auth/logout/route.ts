import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/database/db";
import { sessions } from "@/lib/database/schema";
import { eq } from "drizzle-orm";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session_token")?.value;

    if (token) {
      await db.delete(sessions).where(eq(sessions.token, token));
      cookieStore.delete("session_token");
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("LOGOUT ERROR:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
