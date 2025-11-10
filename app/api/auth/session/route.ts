import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/db'; // your Drizzle ORM instance
import { hospitals, users } from '@/lib/schema'; // your tables
import { getServerSession } from 'next-auth'; // or Clerk auth if using Clerk

type SessionResponse = {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    hospitalId: string;
  } | null;
  hospital?: any; // optional full hospital data
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<SessionResponse>) {
  try {
    // Get logged-in user from your auth system
    const session = await getServerSession(req, res); // adjust if using Clerk
    if (!session?.user?.id) {
      return res.status(200).json({ user: null });
    }

    // Fetch user from DB to get role and hospitalId
    const user = await db.query.users.findFirst({
      where: (u) => u.id.equals(session.user.id),
    });

    if (!user) {
      return res.status(200).json({ user: null });
    }

    const userData = {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      role: user.role,
      hospitalId: user.hospital_id,
    };

    // Optionally fetch full hospital info for the user
    let hospitalData = undefined;
    if (user.hospital_id) {
      const hospital = await db.query.hospitals.findFirst({
        where: (h) => h.id.equals(user.hospital_id),
      });

      if (hospital) {
        hospitalData = {
          ...hospital,
          wards: hospital.wards || [],
          specialties: hospital.specialties || [],
        };
      }
    }

    return res.status(200).json({
      user: userData,
      hospital: hospitalData,
    });
  } catch (err) {
    console.error('Session fetch error:', err);
    return res.status(500).json({ user: null });
  }
}
