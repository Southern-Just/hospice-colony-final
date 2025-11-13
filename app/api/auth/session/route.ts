import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/database/db";
import { users, hospitals } from "@/lib/database/schema";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing or invalid token" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const secret = process.env.JWT_SECRET || "change_this_in_prod";

    let decoded: any;
    try {
      decoded = jwt.verify(token, secret);
    } catch {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    const userId = decoded?.userId;
    if (!userId) {
      return NextResponse.json({ error: "Invalid token payload" }, { status: 400 });
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
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("SESSION ERROR:", error);
    return NextResponse.json({ error: "Failed to verify session" }, { status: 500 });
  }
}
