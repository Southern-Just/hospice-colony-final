import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/database/db";
import { hospitals } from "@/lib/database/schema";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const hospital = await db.select().from(hospitals).where(hospitals.id.eq(params.id)).get();
    if (!hospital) return NextResponse.json({ error: "Hospital not found" }, { status: 404 });
    return NextResponse.json(hospital);
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const data = await req.json();
    // userHospitalId should come from auth/session middleware
    const userHospitalId = data.userHospitalId;
    if (userHospitalId !== params.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await db
      .update(hospitals)
      .set({
        name: data.name,
        location: data.location,
        phone: data.phone,
        city: data.city,
        state: data.state,
        address: data.address,
        email: data.email,
        website: data.website,
        specialties: data.specialties ?? [],
        notes: data.notes ?? "",
        status: data.status,
      })
      .where(hospitals.id.eq(params.id))
      .returning();

    return NextResponse.json(updated[0]);
  } catch {
    return NextResponse.json({ error: "Failed to update hospital" }, { status: 400 });
  }
}
