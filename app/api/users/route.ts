import { NextResponse } from "next/server";
import { db } from "@/lib/database/db";
import { users, hospitals } from "@/lib/database/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  try {
    const allUsers = await db
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
      .leftJoin(hospitals, eq(users.hospitalId, hospitals.id));

    return NextResponse.json({ users: allUsers });
  } catch (error) {
    console.error("GET /api/users error:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { firstName, lastName, email, password, role, facility } = body;

    let hospitalId = null;
    if (facility) {
      const existingHospital = await db
        .select()
        .from(hospitals)
        .where(eq(hospitals.name, facility))
        .limit(1);

      if (existingHospital.length > 0) {
        hospitalId = existingHospital[0].id;
      } else {
        const newHospital = await db
          .insert(hospitals)
          .values({ id: uuidv4(), name: facility })
          .returning();
        hospitalId = newHospital[0].id;
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await db
      .insert(users)
      .values({
        id: uuidv4(),
        firstName,
        lastName,
        email,
        password: hashedPassword,
        role,
        hospitalId,
      })
      .returning();

    return NextResponse.json({ user: newUser[0] });
  } catch (error) {
    console.error("POST /api/users error:", error);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
