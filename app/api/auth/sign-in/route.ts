import { NextResponse } from 'next/server';
import { db } from '@/lib/database/db';
import { users } from '@/lib/database/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || "change_this_in_prod";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    const result = await db.select().from(users).where(eq(users.email, email));
    if (result.length === 0) {
      return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
    }

    const user = result[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        hospitalId: user.hospitalId ?? null,  // <---- consistent casing
      },
    });

  } catch (error) {
    console.error("SIGN-IN ERROR:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
