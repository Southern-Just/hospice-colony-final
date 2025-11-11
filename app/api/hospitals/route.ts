import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/database/db";
import { hospitals, wards, beds } from "@/lib/database/schema";

export async function GET() {
  try {
    const allHospitals = await db.select().from(hospitals);
    const allWards = await db.select().from(wards);
    const allBeds = await db.select().from(beds);

    const result = allHospitals.map(h => {
      const hospitalWards = allWards.filter(w => w.hospitalId === h.id);
      const hospitalBeds = allBeds.filter(b => b.hospitalId === h.id);
      const totalBeds = hospitalBeds.length;
      const availableBeds = hospitalBeds.filter(b => b.status === "available").length;
      const occupiedBeds = hospitalBeds.filter(b => b.status === "occupied").length;
      const maintenanceBeds = hospitalBeds.filter(b => b.status === "maintenance").length;
      const specialties = [...new Set(hospitalWards.map(w => w.specialty).filter(Boolean))];
      return { ...h, wards: hospitalWards, totalBeds, availableBeds, occupiedBeds, maintenanceBeds, specialties };
    });

    return NextResponse.json({ hospitals: result });
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch hospitals" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const inserted = await db.insert(hospitals).values({
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
      createdBy: data.createdBy ?? null,
    }).returning();
    return NextResponse.json({ hospital: inserted[0] });
  } catch (err) {
    return NextResponse.json({ error: "Failed to create hospital" }, { status: 400 });
  }
}
