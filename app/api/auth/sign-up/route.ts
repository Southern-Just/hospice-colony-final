import { NextResponse } from 'next/server';
import { db } from '@/lib/database/db';
import { users, hospitals } from '@/lib/database/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

export async function POST(req: Request) {
  try {
    const { email, password, firstName, lastName, facility, role } = await req.json();

    if (!email || !password || !firstName || !lastName || !facility) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    const existing = await db.select().from(users).where(eq(users.email, email));
    if (existing.length > 0) {
      return NextResponse.json({ message: "User already exists" }, { status: 400 });
    }

    // Create or fetch hospital
    let hospital = await db.select().from(hospitals).where(eq(hospitals.name, facility));
    let hospitalId;

    if (hospital.length === 0) {
      const [newHospital] = await db.insert(hospitals).values({
        name: facility,
        totalBeds: 0,
        availableBeds: 0,
      }).returning();
      hospitalId = newHospital.id;
    } else {
      hospitalId = hospital[0].id;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [newUser] = await db.insert(users).values({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role: role ?? 'staff',
      hospitalId,
    }).returning();

    return NextResponse.json({
      message: "Account created successfully",
      user: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: newUser.role,
        hospitalId,
      }
    });

  } catch (error) {
    console.error("SIGN-UP ERROR:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
