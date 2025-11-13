import { NextResponse } from "next/server";
import { db } from "@/lib/database/db";
import { users, hospitals } from "@/lib/database/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

/**
 * POST /api/auth/signup
 * Creates a new user and auto-creates a hospital if it doesn't exist.
 */
export async function POST(req: Request) {
  try {
    const { email, password, firstName, lastName, facility, role } = await req.json();

    // 1️⃣ Basic validation
    if (!email || !password || !firstName || !lastName || !facility) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    // 2️⃣ Prevent duplicate users
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      return NextResponse.json({ message: "User already exists" }, { status: 400 });
    }

    // 3️⃣ Check for existing hospital (case-insensitive match)
    const existingHospital = await db.query.hospitals.findFirst({
      where: eq(hospitals.name, facility),
    });

    let hospitalId: string;

    if (!existingHospital) {
      // 4️⃣ Create a new hospital (minimal info for now)
      const [newHospital] = await db
        .insert(hospitals)
        .values({
          name: facility,
          status: "Active",
          createdBy: "", // temporarily empty, we’ll update after user creation
        })
        .returning();

      hospitalId = newHospital.id;
    } else {
      hospitalId = existingHospital.id;
    }

    // 5️⃣ Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 6️⃣ Create user record
    const [newUser] = await db
      .insert(users)
      .values({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: role?.toLowerCase() ?? "staff",
        hospitalId,
      })
      .returning();

    // 7️⃣ Update hospital.createdBy only if it’s empty or null
    if (!existingHospital?.createdBy) {
      await db
        .update(hospitals)
        .set({ createdBy: newUser.id })
        .where(eq(hospitals.id, hospitalId));
    }

    // 8️⃣ Respond cleanly (omit password)
    return NextResponse.json(
      {
        message: "Account created successfully",
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          role: newUser.role,
          hospitalId,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("SIGN-UP ERROR:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
