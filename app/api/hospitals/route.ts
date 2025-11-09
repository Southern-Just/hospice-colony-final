// app/api/hospitals/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/db';
import { hospitals, beds } from '@/lib/database/schema';
import { sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Fetch hospitals
    const hospitalsData = await db.select({
      id: hospitals.id,
      name: hospitals.name,
      location: hospitals.location,
      phone: hospitals.phone,
      status: hospitals.status,
      specialties: hospitals.specialties,
    }).from(hospitals).where(sql`${hospitals.status} = 'active'`);

    // Fetch bed counts grouped by hospital
    const bedStats = await db.select({
      hospitalId: beds.hospitalId,
      totalBeds: sql<number>`COUNT(*)`,
      availableBeds: sql<number>`SUM(CASE WHEN ${beds.status} = 'available' THEN 1 ELSE 0 END)`,
      occupiedBeds: sql<number>`SUM(CASE WHEN ${beds.status} = 'occupied' THEN 1 ELSE 0 END)`,
      maintenanceBeds: sql<number>`SUM(CASE WHEN ${beds.status} = 'maintenance' THEN 1 ELSE 0 END)`,
    }).from(beds)
      .groupBy(beds.hospitalId);

    // Combine hospital data with bed stats
    const hospitalsWithBeds = hospitalsData.map(hospital => {
      const stats = bedStats.find(stat => stat.hospitalId === hospital.id);
      return {
        ...hospital,
        totalBeds: stats?.totalBeds ?? 0,
        availableBeds: stats?.availableBeds ?? 0,
        occupiedBeds: stats?.occupiedBeds ?? 0,
        maintenanceBeds: stats?.maintenanceBeds ?? 0,
      };
    });

    // Compute global summary
    const summary = {
      totalHospitals: hospitalsWithBeds.length,
      totalBeds: hospitalsWithBeds.reduce((sum, h) => sum + h.totalBeds, 0),
      availableBeds: hospitalsWithBeds.reduce((sum, h) => sum + h.availableBeds, 0),
      occupiedBeds: hospitalsWithBeds.reduce((sum, h) => sum + h.occupiedBeds, 0),
    };

    return NextResponse.json({ hospitals: hospitalsWithBeds, summary });
  } catch (error) {
    console.error('Error fetching hospitals:', error);
    return NextResponse.json({ error: 'Failed to fetch hospitals' }, { status: 500 });
  }
}
