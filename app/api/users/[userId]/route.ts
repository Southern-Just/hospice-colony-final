import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/database/db";
import { users, hospitals } from "@/lib/database/schema";
import { eq } from "drizzle-orm";

export async function GET(_req: NextRequest, context: { params: Promise<{ userId: string }> }) {
  const { userId } = await context.params;
  if (!userId) {
    console.error("Missing userId param:", context.params);
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  try {
    const user = await db
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
      .where(eq(users.id, userId))
      .limit(1);

    if (!user.length)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    return NextResponse.json({ user: user[0] });
  } catch (error) {
    console.error("GET /api/users/[userId] error:", error);
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: { params: Promise<{ userId: string }> }) {
  const { userId } = await context.params;
  if (!userId) {
    console.error("Missing userId param:", context.params);
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { firstName, lastName } = body;

    if (!firstName?.trim() || !lastName?.trim()) {
      return NextResponse.json(
        { error: "First name and last name are required" },
        { status: 400 }
      );
    }

    const updated = await db
      .update(users)
      .set({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        role: users.role,
        hospitalId: users.hospitalId,
      });

    if (!updated.length)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

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
      .where(eq(users.id, userId))
      .limit(1);

    return NextResponse.json({ user });
  } catch (error) {
    console.error("PUT /api/users/[userId] error:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
