import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/database/db";
import { hospitals, wards, beds } from "@/lib/database/schema";
import { eq } from "drizzle-orm";

export async function GET(_req: NextRequest, context: { params: Promise<{ hospitalId: string }> }) {
  const { hospitalId } = await context.params;
  try {
    const hospital = await db.select().from(hospitals).where(eq(hospitals.id, hospitalId)).limit(1);
    if (!hospital.length) return NextResponse.json({ error: "Hospital not found" }, { status: 404 });
    const hospitalWards = await db.select().from(wards).where(eq(wards.hospitalId, hospitalId));
    const hospitalBeds = await db.select().from(beds).where(eq(beds.hospitalId, hospitalId));

    const totalBeds = hospitalBeds.length;
    const availableBeds = hospitalBeds.filter(b => b.status === "available").length;
    const occupiedBeds = hospitalBeds.filter(b => b.status === "occupied").length;
    const maintenanceBeds = hospitalBeds.filter(b => b.status === "maintenance").length;
    const specialties = [...new Set(hospitalWards.map(w => w.specialty).filter(Boolean))];

    return NextResponse.json({ hospital: { ...hospital[0], wards: hospitalWards, totalBeds, availableBeds, occupiedBeds, maintenanceBeds, specialties } });
  } catch {
    return NextResponse.json({ error: "Failed to fetch hospital" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, context: { params: Promise<{ hospitalId: string }> }) {
  const { hospitalId } = await context.params;
  try {
    const data = await req.json();
    const [updated] = await db.update(hospitals)
      .set({
        name: data.name,
        location: data.location,
        specialties: data.specialties ?? [],
        phone: data.phone,
        city: data.city,
        state: data.state,
        email: data.email,
        notes: data.notes,
        address: data.address,
        website: data.website,
        status: data.status ?? "active",
      })
      .where(eq(hospitals.id, hospitalId))
      .returning();
    if (!updated) return NextResponse.json({ error: "Hospital not found" }, { status: 404 });
    return NextResponse.json({ hospital: updated });
  } catch {
    return NextResponse.json({ error: "Failed to update hospital" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ hospitalId: string }> }) {
  const { hospitalId } = await context.params;
  try {
    const deleted = await db.delete(hospitals).where(eq(hospitals.id, hospitalId)).returning();
    if (!deleted.length) return NextResponse.json({ error: "Hospital not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete hospital" }, { status: 500 });
  }
}
