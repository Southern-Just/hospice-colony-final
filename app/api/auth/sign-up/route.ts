import { NextResponse } from "next/server";
import { db } from "@/lib/database/db";
import { users, hospitals, sessions } from "@/lib/database/schema";
import { eq, ilike } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const { email, password, firstName, lastName, facility, facilityId, role } = await req.json();

    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
    if (existing) return NextResponse.json({ message: "User already exists" }, { status: 400 });

    let hospitalId = facilityId ?? null;

    if (hospitalId) {
      const adminExists = await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.hospitalId, hospitalId) && eq(users.role, "admin"),
      });

      if (role?.toLowerCase() === "admin" && adminExists) {
        return NextResponse.json({ message: "This facility already has an admin." }, { status: 400 });
      }
    } else if (facility) {
      const exists = await db.query.hospitals.findFirst({
        where: ilike(hospitals.name, facility),
      });

      if (exists) {
        hospitalId = exists.id;
      } else {
        const [newHospital] = await db
          .insert(hospitals)
          .values({
            name: facility,
            status: "active",
            createdBy: null,
          })
          .returning();
        hospitalId = newHospital.id;
      }
    }

    const hashed = await bcrypt.hash(password, 10);

    const [newUser] = await db
      .insert(users)
      .values({
        email,
        password: hashed,
        firstName,
        lastName,
        role: (role || "staff").toLowerCase(),
        hospitalId,
      })
      .returning();

    const token = crypto.randomBytes(48).toString("hex");

    await db.insert(sessions).values({
      userId: newUser.id,
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

    return NextResponse.json({ user: newUser }, { status: 201 });
  } catch (err) {
    console.error("SIGN-UP ERROR:", err);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
