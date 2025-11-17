import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/database/db";
import { users, hospitals, sessions } from "@/lib/database/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session_token")?.value;

    if (!token) return NextResponse.json({ user: null }, { status: 401 });

    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.token, token))
      .limit(1);

    if (!session || new Date(session.expiresAt) < new Date()) {
      if (session) await db.delete(sessions).where(eq(sessions.token, token));
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const [user] = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        role: users.role,
        hospitalId: users.hospitalId,
        hospitalName: hospitals.name,
      })
      .from(users)
      .leftJoin(hospitals, eq(users.hospitalId, hospitals.id))
      .where(eq(users.id, session.userId))
      .limit(1);

    if (!user) return NextResponse.json({ user: null }, { status: 401 });

    return NextResponse.json({ user });
  } catch (err) {
    console.error("SESSION ERROR:", err);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
