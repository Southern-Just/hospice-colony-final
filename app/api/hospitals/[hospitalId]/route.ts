import { NextResponse } from "next/server";
import { db } from "@/lib/database/db";
import { hospitals } from "@/lib/database/schema";
import { eq } from "drizzle-orm";

/**
 * GET a single hospital
 */
export async function GET(
  req: Request,
  context: { params: Promise<{ hospitalId: string }> }
) {
  const { hospitalId } = await context.params;

  const [hospital] = await db
    .select()
    .from(hospitals)
    .where(eq(hospitals.id, hospitalId));

  if (!hospital) {
    return NextResponse.json({ message: "Hospital not found" }, { status: 404 });
  }

  return NextResponse.json({ hospital });
}

/**
 * UPDATE hospital
 */
export async function PUT(
  req: Request,
  context: { params: Promise<{ hospitalId: string }> }
) {
  const { hospitalId } = await context.params;
  const body = await req.json();

  const [updated] = await db
    .update(hospitals)
    .set({
      name: body.name ?? null,
      location: body.location ?? null,
      specialties: body.specialties ?? null,
      phone: body.phone ?? null,
      city: body.city ?? null,
      state: body.state ?? null,
      email: body.email ?? null,
      notes: body.notes ?? null,
      address: body.address ?? null,
      website: body.website ?? null,
      status: body.status ?? null,
      updatedAt: new Date(),
    })
    .where(eq(hospitals.id, hospitalId))
    .returning();

  return NextResponse.json({ hospital: updated });
}

/**
 * DELETE hospital
 */
export async function DELETE(
  req: Request,
  context: { params: Promise<{ hospitalId: string }> }
) {
  const { hospitalId } = await context.params;

  await db.delete(hospitals).where(eq(hospitals.id, hospitalId));

  return NextResponse.json({ success: true });
}
