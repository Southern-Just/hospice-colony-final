'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { HospitalIcon, MapPinIcon, PhoneIcon } from 'lucide-react';
import { HospitalModal } from './HospitalModal';
import { useAuth } from '@/components/contexts/AuthContext';
import { Hospital } from '@/types';

export function HospitalPartners() {
  const { user } = useAuth();
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [selectedWard, setSelectedWard] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalHospital, setModalHospital] = useState<Hospital | null>(null);

  const userHospitalId = user?.hospitalId ?? '';
  const userRole = user?.role ?? '';

  const fetchHospitals = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/hospitals');
      if (!res.ok) throw new Error(`Failed to fetch hospitals: ${res.status}`);
      const data = await res.json();
      const hospitalsData = (data.hospitals ?? []).map((h: any) => ({
        ...h,
        totalBeds: h.totalBeds ?? h.total_beds ?? 0,
        availableBeds: h.availableBeds ?? h.available_beds ?? 0,
        occupiedBeds: h.occupiedBeds ?? h.occupied_beds ?? 0,
        maintenanceBeds: h.maintenanceBeds ?? h.maintenance_beds ?? 0,
        specialties: h.specialties ?? [],
        wards: h.wards ?? [],
      }));
      setHospitals(hospitalsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching hospitals');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateHospital = (updatedData: Partial<Hospital>) => {
    setHospitals(prev =>
      prev.map(h => (h.id === updatedData.id ? { ...h, ...updatedData } : h))
    );
    setModalHospital(null);
  };

  useEffect(() => {
    if (!user) return;
    fetchHospitals();
  }, [user?.hospitalId]);

  if (loading)
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading hospitals...</p>
      </main>
    );

  if (error)
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-red-600">{error}</p>
        <Button onClick={fetchHospitals}>Retry</Button>
      </main>
    );

  return (
    <main className="min-h-screen bg-gray-50 p-6 space-y-8">
      <header className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Partner Hospitals</h1>
          <p className="text-gray-600 mt-1">Hospitals collaborating with Hospice::Colony</p>
        </div>
        <Button className="bg-blue-600 text-white cursor-pointer hover:bg-blue-700 rounded-lg px-4 py-2">
          Hospice::Colony Algo. Aided Transfers
        </Button>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {hospitals.map(hospital => {
          const availableBedsCount = hospital.availableBeds;
          const occupiedBeds =
            hospital.totalBeds - availableBedsCount - (hospital.maintenanceBeds ?? 0);

          return (
            <Card key={hospital.id} className="shadow-lg rounded-2xl p-6 flex flex-col justify-between">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <HospitalIcon className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle
                        className="text-lg font-semibold cursor-pointer hover:underline"
                        onClick={() => setModalHospital(hospital)}
                      >
                        {hospital.name}
                      </CardTitle>
                      {hospital.location && (
                        <p className="text-sm flex items-center gap-1 text-gray-500">
                          <MapPinIcon className="h-3 w-3" /> {hospital.location}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant={hospital.status === 'active' ? 'default' : 'secondary'}
                    className={`px-2 py-1 text-xs ${
                      hospital.status === 'Active'
                        ? 'bg-green-500 hover:bg-green-600'
                        : 'bg-gray-400 hover:bg-gray-500 text-white'
                    }`}
                  >
                    {hospital.status}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 mt-4">
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-sm text-gray-500">Total Beds</p>
                    <p className="text-lg font-semibold text-gray-900">{hospital.totalBeds}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Available</p>
                    <p className="text-lg font-semibold text-green-600">{availableBedsCount}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Occupied</p>
                    <p className="text-lg font-semibold text-red-600">{occupiedBeds}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Maintenance</p>
                    <p className="text-lg font-semibold text-yellow-600">
                      {hospital.maintenanceBeds ?? 0}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-500 mb-1">Specialties</p>
                  <div className="flex flex-wrap gap-2">
                    {Array.from(new Set(['General', ...(hospital.specialties ?? [])])).map(
                      specialty => (
                        <button
                          key={`${hospital.id}-${specialty}`}
                          className={`px-2 py-1 rounded-full text-xs transition-colors ${
                            selectedWard[hospital.id] === specialty
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                          onClick={() =>
                            setSelectedWard(prev => ({ ...prev, [hospital.id]: specialty }))
                          }
                        >
                          {specialty.replace(/_/g, ' ')}
                        </button>
                      )
                    )}
                  </div>
                </div>
              </CardContent>

              <footer className="flex justify-between items-center mt-4 border-t pt-3 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <PhoneIcon className="h-3 w-3" /> {hospital.phone}
                </span>
                <div className="flex gap-2">
                  <Button className="px-3 py-1 bg-blue-600 text-white text-xs rounded-full hover:bg-blue-500">
                    Admission
                  </Button>
                  <Button className="px-3 py-1 bg-green-600 text-white text-xs rounded-full hover:bg-green-500">
                    Optimize
                  </Button>
                </div>
              </footer>
            </Card>
          );
        })}
      </section>

      {modalHospital && user && (
        <HospitalModal
          hospital={modalHospital}
          currentUser={user}
          userHospitalId={userHospitalId}
          userRole={userRole}
          onClose={() => setModalHospital(null)}
          onUpdate={handleUpdateHospital}
        />
      )}
    </main>
  );
}
