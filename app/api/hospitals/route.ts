import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/database/db";
import { hospitals, beds, wards } from "@/lib/database/schema";
import { eq, sql } from "drizzle-orm";

export async function GET() {
  try {
    const hospitalList = await db
      .select()
      .from(hospitals)
      .where(sql`${hospitals.status} = 'active'`);

    const bedStats = await db
      .select({
        hospitalId: beds.hospitalId,
        totalBeds: sql<number>`COUNT(*)`,
        availableBeds: sql<number>`SUM(CASE WHEN ${beds.status} = 'available' THEN 1 ELSE 0 END)`,
        occupiedBeds: sql<number>`SUM(CASE WHEN ${beds.status} = 'occupied' THEN 1 ELSE 0 END)`,
        maintenanceBeds: sql<number>`SUM(CASE WHEN ${beds.status} = 'maintenance' THEN 1 ELSE 0 END)`
      })
      .from(beds)
      .groupBy(beds.hospitalId);

    const result = hospitalList.map(h => {
      const stats = bedStats.find(b => b.hospitalId === h.id);
      return {
        ...h,
        totalBeds: stats?.totalBeds ?? 0,
        availableBeds: stats?.availableBeds ?? 0,
        occupiedBeds: stats?.occupiedBeds ?? 0,
        maintenanceBeds: stats?.maintenanceBeds ?? 0,
      };
    });

    return NextResponse.json({ hospitals: result });
  } catch (err) {
    console.error("GET /hospitals error:", err);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const inserted = await db.insert(hospitals).values({
      name: data.name,
      location: data.location,
      phone: data.phone,
      city: data.city,
      state: data.state,
      address: data.address,
      email: data.email,
      website: data.website,
      specialties: data.specialties ?? [],
      status: "active",
    }).returning();

    return NextResponse.json(inserted[0]);
  } catch (err) {
    console.error("POST /hospitals error:", err);
    return NextResponse.json({ error: "Failed to create hospital" }, { status: 400 });
  }
}
