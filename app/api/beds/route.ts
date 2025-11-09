import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/db';
import { beds, hospitals } from '@/lib/database/schema';
import { eq, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Aggregate bed stats per hospital (cast to integer!)
    const bedStats = await db
      .select({
        hospitalId: beds.hospitalId,
        totalBeds: sql<number>`COUNT(*)::int`,
        availableBeds: sql<number>`SUM(CASE WHEN ${beds.status} = 'available' THEN 1 ELSE 0 END)::int`,
        occupiedBeds: sql<number>`SUM(CASE WHEN ${beds.status} = 'occupied' THEN 1 ELSE 0 END)::int`,
        maintenanceBeds: sql<number>`SUM(CASE WHEN ${beds.status} = 'maintenance' THEN 1 ELSE 0 END)::int`,
      })
      .from(beds)
      .groupBy(beds.hospitalId);

    // Fetch active hospitals
    const hospitalsData = await db
      .select({
        id: hospitals.id,
        name: hospitals.name,
        location: hospitals.location,
        specialties: hospitals.specialties,
        status: hospitals.status,
        phone: hospitals.phone,
      })
      .from(hospitals)
      .where(eq(hospitals.status, 'active'));

    // Merge hospitals with bed stats
    const hospitalsWithStats = hospitalsData.map(hospital => {
      const stats = bedStats.find(stat => stat.hospitalId === hospital.id);
      return {
        ...hospital,
        totalBeds: stats?.totalBeds ?? 0,
        availableBeds: stats?.availableBeds ?? 0,
        occupiedBeds: stats?.occupiedBeds ?? 0,
        maintenanceBeds: stats?.maintenanceBeds ?? 0,
      };
    });

    // Build overall summary
    const summary = {
      totalHospitals: hospitalsWithStats.length,
      totalBeds: hospitalsWithStats.reduce((sum, h) => sum + h.totalBeds, 0),
      availableBeds: hospitalsWithStats.reduce((sum, h) => sum + h.availableBeds, 0),
      occupiedBeds: hospitalsWithStats.reduce((sum, h) => sum + h.occupiedBeds, 0),
    };

    return NextResponse.json({ hospitals: hospitalsWithStats, summary });
  } catch (error) {
    console.error('Error fetching beds/dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch beds/dashboard data' },
      { status: 500 }
    );
  }
}
