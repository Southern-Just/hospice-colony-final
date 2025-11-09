'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { HospitalIcon, MapPinIcon, BedIcon, PhoneIcon } from 'lucide-react';

const mockHospitals = [
  {
    id: '1',
    name: 'City General Hospital',
    location: '123 Main St, Metropolis',
    phone: '+1 555-1234',
    status: 'Active',
    totalBeds: 120,
    availableBeds: 35,
    specialties: ['Cardiology', 'Neurology'],
  },
  {
    id: '2',
    name: 'River Valley Clinic',
    location: '45 River Rd, Springfield',
    phone: '+1 555-5678',
    status: 'Active',
    totalBeds: 80,
    availableBeds: 20,
    specialties: ['Pediatrics', 'Orthopedics'],
  },
  {
    id: '3',
    name: 'Sunrise Medical Center',
    location: '78 Sunrise Blvd, Gotham',
    phone: '+1 555-8765',
    status: 'Inactive',
    totalBeds: 100,
    availableBeds: 50,
    specialties: ['General Surgery', 'Oncology'],
  },
];

export function HospitalPartners() {
  const [selectedWard, setSelectedWard] = useState<Record<string, string>>({});

  return (
    <main className="min-h-screen bg-gray-50 p-6 space-y-8">
      <header className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Partner Hospitals</h1>
          <p className="text-gray-600 mt-1">
            Hospitals collaborating with Hospice::Colony
          </p>
        </div>
        <Button className="bg-blue-100 text-blue-500 hover:bg-blue-200 text-blue-500  rounded-lg px-4 py-2">
          Hospice::Colony Algo. Aided Transfers
        </Button>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {mockHospitals.map((hospital) => {
          const ward = selectedWard[hospital.id] ?? 'General';
          const availableBedsCount = hospital.availableBeds;
          const occupiedBeds = hospital.totalBeds - availableBedsCount;

          return (
            <Card key={hospital.id} className="shadow-lg rounded-2xl p-6 flex flex-col justify-between">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <HospitalIcon className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-semibold">{hospital.name}</CardTitle>
                      <p className="text-sm flex items-center gap-1 text-gray-500">
                        <MapPinIcon className="h-3 w-3" /> {hospital.location}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={hospital.status === 'Active' ? 'default' : 'secondary'}
                    className="px-2 py-1 text-xs"
                  >
                    {hospital.status}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 mt-4">
                <div className="grid grid-cols-3 gap-4 text-center">
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
                </div>

                <div>
                  <p className="text-sm text-gray-500 mb-1">Specialties</p>
                  <div className="flex flex-wrap gap-2">
                    {['General', ...(hospital.specialties ?? [])].map((specialty) => (
                      <button
                        key={`${hospital.id}-${specialty}`}
                        className={`px-2 py-1 rounded-full text-xs ${
                          selectedWard[hospital.id] === specialty
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700'
                        }`}
                        onClick={() =>
                          setSelectedWard((prev) => ({ ...prev, [hospital.id]: specialty }))
                        }
                      >
                        {specialty.replace(/_/g, ' ')}
                      </button>
                    ))}
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
    </main>
  );
}
