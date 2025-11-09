'use client';

import { useState, useEffect } from 'react';
import { Loader } from "lucide-react";

type Hospital = {
  id: string;
  name: string;
  totalBeds: number;
  availableBeds: number;
};

const MOCK_HOSPITALS: Hospital[] = [
  { id: "1", name: "General Hospital", totalBeds: 40, availableBeds: 18 },
  { id: "2", name: "Community Medical", totalBeds: 22, availableBeds: 6 },
  { id: "3", name: "City Care Center", totalBeds: 30, availableBeds: 12 },
  { id: "4", name: "Northside Clinic", totalBeds: 15, availableBeds: 5 }
];

const beforeAfterImages = [
  {
    before: 'https://images.unsplash.com/photo-1711343777918-6d395c16e37f?auto=format&q=80&w=1080',
    after: 'https://images.unsplash.com/photo-1676286168358-9b4ce60384d4?auto=format&q=80&w=1080',
    title: 'Emergency Ward Optimization',
    description: 'Reduced wait times by 45% through coordinated bed allocation'
  },
  {
    before: 'https://images.unsplash.com/photo-1588451732612-a1a1809500c1?auto=format&q=80&w=1080',
    after: 'https://images.unsplash.com/photo-1720180246349-584d40758674?auto=format&q=80&w=1080',
    title: 'ICU Resource Sharing',
    description: 'Improved critical care access across 5 partner hospitals'
  }
];

export function Dashboard() {
  const [hospitals, setHospitals] = useState<Hospital[]>(MOCK_HOSPITALS);
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setSlide(s => (s + 1) % beforeAfterImages.length), 5000);
    return () => clearInterval(interval);
  }, []);

  const totalBeds = hospitals.reduce((s, h) => s + h.totalBeds, 0);
  const availableBeds = hospitals.reduce((s, h) => s + h.availableBeds, 0);
  const occupiedBeds = totalBeds - availableBeds;
  const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

  return (
    <main className="max-w-7xl mx-auto px-6 py-12 flex gap-10">

      <section className="flex-1 space-y-12">
        <section className="bg-white rounded-2xl shadow p-8 text-center">
          <h2 className="text-3xl font-semibold text-gray-900 mb-4">Why Hospice::Colony?</h2>
          <p className="text-gray-700 leading-relaxed">
            Hospital bed shortages lead to critical service delays. Hospice::Colony enables real-time
            coordinated bed allocation across multiple hospitals to reduce wait times and improve care.
          </p>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="rounded-2xl bg-blue-900 text-white p-6 text-center text-4xl font-semibold shadow-lg">
            {totalBeds}
            <p className="text-sm opacity-80 mt-2">Total Beds</p>
          </div>
          <div className="rounded-2xl bg-green-700 text-white p-6 text-center text-4xl font-semibold shadow-lg">
            {availableBeds}
            <p className="text-sm opacity-80 mt-2">Available Beds</p>
          </div>
          <div className="rounded-2xl bg-red-700 text-white p-6 text-center text-4xl font-semibold shadow-lg">
            {occupiedBeds}
            <p className="text-sm opacity-80 mt-2">{occupancyRate}% Occupied</p>
          </div>
          <div className="rounded-2xl bg-gray-800 text-white p-6 text-center text-4xl font-semibold shadow-lg">
            {hospitals.length}
            <p className="text-sm opacity-80 mt-2">Partner Facilities</p>
          </div>
        </section>
{/* 
        <section className="bg-white rounded-2xl shadow p-8">
          <h2 className="text-center text-3xl font-semibold mb-6 text-gray-900">Real-World Impact</h2>

          <div className="relative h-80 rounded-xl overflow-hidden">
            {beforeAfterImages.map((img, index) => (
              <figure
                key={index}
                className={`absolute inset-0 transition-opacity duration-700 ${slide === index ? 'opacity-100' : 'opacity-0'}`}
              >
                <div className="grid grid-cols-2 gap-4 h-full">
                  <img src={img.before} className="object-cover w-full h-full rounded-lg" />
                  <img src={img.after} className="object-cover w-full h-full rounded-lg" />
                </div>
                <figcaption className="absolute bottom-4 inset-x-0 text-center text-white">
                  <h3 className="font-semibold text-xl">{img.title}</h3>
                  <p className="text-sm opacity-90">{img.description}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </section> */}
      </section>

      <aside className="hidden lg:block w-64">
        <div className="sticky top-8 space-y-3">
          <h3 className="p-2 font-medium self-center justify-center mx-auto w-full w-full text-gray-900">
            Partner Facilities
          </h3>
          <div className="space-y-3">
            {hospitals.map(h => {
              const free = h.availableBeds;
              const rate = Math.round(((h.totalBeds - free) / h.totalBeds) * 100);
              return (
                <div key={h.id} className="bg-white rounded-lg p-3 shadow border border-gray-200">
                  <p className="text-sm font-medium">{h.name}</p>
                  <div className="h-2 bg-gray-200 rounded mt-2">
                    <div className="h-full bg-blue-600 rounded" style={{ width: `${rate}%` }} />
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{free} free beds</p>
                </div>
              );
            })}
          </div>
        </div>
      </aside>
    </main>
  );
}
