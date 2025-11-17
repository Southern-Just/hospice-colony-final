import { db } from "@/lib/database/db";
import { hospitals } from "@/lib/database/schema";
import { NextResponse } from "next/server";

export async function GET() {
  const data = await db.select().from(hospitals);
  return NextResponse.json({ hospitals: data });
}

export async function POST(req: Request) {
  const body = await req.json();

  const created = await db
    .insert(hospitals)
    .values({
      name: body.name,
      location: body.location,
      address: body.address,
      city: body.city,
      state: body.state,
      phone: body.phone,
      email: body.email,
      website: body.website,
      specialties: body.specialties || [],
      geoCoordinates: body.geoCoordinates || null,
      capacity: body.capacity || null,
      status: body.status || "active",
      notes: body.notes || null,
      createdBy: body.createdBy || null
    })
    .returning();

  return NextResponse.json({ hospital: created[0] });
}
