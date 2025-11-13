import { NextResponse } from "next/server";
import { db } from "@/lib/database/db";
import { users, hospitals } from "@/lib/database/schema";
import { eq } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const hospitalId = searchParams.get("hospitalId");

    if (hospitalId) {
      const data = await db
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
        .where(eq(users.hospitalId, hospitalId));
      return NextResponse.json({ users: data });
    }

    const all = await db
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

    return NextResponse.json({ users: all });
  } catch (error) {
    console.error("GET /api/users error:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}
