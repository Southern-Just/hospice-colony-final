import { NextResponse } from "next/server";
import { db } from "@/lib/database/db";
import { users, hospitals, sessions } from "@/lib/database/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) return NextResponse.json({ message: "Email and password required" }, { status: 400 });

    const result = await db
      .select({
        id: users.id,
        email: users.email,
        password: users.password,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        hospitalId: users.hospitalId,
        hospitalName: hospitals.name,
      })
      .from(users)
      .leftJoin(hospitals, eq(users.hospitalId, hospitals.id))
      .where(eq(users.email, email))
      .limit(1);

    const user = result[0];
    if (!user) return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });

    const token = crypto.randomBytes(48).toString("hex");

    await db.insert(sessions).values({
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
    });

    const cookieStore = await cookies();
    cookieStore.set("session_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        hospitalId: user.hospitalId ?? null,
        hospitalName: user.hospitalName ?? null,
      },
    });
  } catch (err) {
    console.error("SIGN-IN ERROR:", err);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
