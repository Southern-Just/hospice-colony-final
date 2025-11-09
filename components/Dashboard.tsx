'use client';

import { useState, useEffect } from 'react';
import { Loader, AlertCircle, RefreshCw } from "lucide-react";

type Hospital = {
  id: string;
  name: string;
  totalBeds: number;
  availableBeds: number;
  location?: string;
  specialties?: string[];
  status?: string;
  phone?: string;
  occupiedBeds?: number;
  maintenanceBeds?: number;
};

type DashboardData = {
  hospitals: Hospital[];
  summary: {
    totalHospitals: number;
    totalBeds: number;
    availableBeds: number;
    occupiedBeds: number;
  };
};

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
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [slide, setSlide] = useState(0);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/beds');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.status}`);
      }
      
      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setSlide(s => (s + 1) % beforeAfterImages.length), 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <main className="max-w-7xl mx-auto px-6 py-12 flex items-center justify-center min-h-96">
        <div className="text-center">
          <Loader className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="mt-4 text-gray-600">Loading hospital data...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-800 mb-2">Failed to load data</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="text-center text-gray-500">
          No data available
        </div>
      </main>
    );
  }

  const { hospitals, summary } = data;
  const totalBeds = summary.totalBeds;
  const availableBeds = summary.availableBeds;
  const occupiedBeds = summary.occupiedBeds;
  const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

  return (
    <main className="max-w-7xl mx-auto px-6 py-12 flex gap-10">
      <section className="flex-1 space-y-12">
        {/* Header Section */}
        <section className="bg-white bg-hospice rounded-2xl shadow p-8 text-center">
          <h2 className="text-3xl font-semibold text-gray-900 mb-4">Why Hospice::Colony?</h2>
          <p className="text-gray-700 leading-relaxed">
            Hospital bed shortages lead to critical service delays. Hospice::Colony enables real-time
            coordinated bed allocation across multiple hospitals to reduce wait times and improve care.
          </p>
        </section>

        {/* Stats Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="rounded-2xl bg-blue-900 text-white p-8 text-center shadow-lg">
            <div className="text-3xl font-bold">{totalBeds.toLocaleString()}</div>
            <p className="text-sm opacity-80 mt-2">Total Beds</p>
          </div>
          <div className="rounded-2xl bg-green-700 text-white p-8 text-center shadow-lg">
            <div className="text-3xl font-bold">{availableBeds.toLocaleString()}</div>
            <p className="text-sm opacity-80 mt-2">Available Beds</p>
          </div>
          <div className="rounded-2xl bg-red-700 text-white p-8 text-center shadow-lg">
            <div className="text-3xl font-bold">{occupiedBeds.toLocaleString()}</div>
            <p className="text-sm opacity-80 mt-2">{occupancyRate}% Occupied</p>
          </div>
          <div className="rounded-2xl bg-gray-800 text-white p-8 text-center shadow-lg">
            <div className="text-3xl font-bold">{summary.totalHospitals}</div>
            <p className="text-sm opacity-80 mt-2">Partner Facilities</p>
          </div>
        </section>

        {/* Before/After Carousel */}
        <section className="bg-white rounded-2xl shadow p-6">
          <h3 className="text-xl font-semibold mb-4">Optimization Results</h3>
          <div className="relative h-64 bg-gray-100 rounded-lg overflow-hidden">
            <div className="absolute inset-0 flex transition-transform duration-500 ease-in-out"
                 style={{ transform: `translateX(-${slide * 100}%)` }}>
              {beforeAfterImages.map((image, index) => (
                <div key={index} className="w-full flex-shrink-0 flex">
                  <div className="flex-1 p-4">
                    <div className="h-40 bg-gray-300 rounded mb-2 flex items-center justify-center">
                      <span className="text-gray-600">Before Image</span>
                    </div>
                    <h4 className="font-semibold">{image.title}</h4>
                    <p className="text-sm text-gray-600">{image.description}</p>
                  </div>
                  <div className="flex-1 p-4">
                    <div className="h-40 bg-gray-300 rounded mb-2 flex items-center justify-center">
                      <span className="text-gray-600">After Image</span>
                    </div>
                    <h4 className="font-semibold">Optimized Layout</h4>
                    <p className="text-sm text-gray-600">Improved efficiency and patient flow</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-center mt-4 space-x-2">
            {beforeAfterImages.map((_, index) => (
              <button
                key={index}
                onClick={() => setSlide(index)}
                className={`w-3 h-3 rounded-full ${
                  slide === index ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </section>
      </section>

      {/* Hospital List Sidebar */}
      <aside className="hidden lg:block w-80">
        <div className="sticky top-8 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Partner Facilities</h3>
            <button
              onClick={fetchDashboardData}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh data"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-3">
            {hospitals.map(hospital => {
              const freeBeds = hospital.availableBeds;
              const occupancyRate = hospital.totalBeds > 0 
                ? Math.round(((hospital.totalBeds - freeBeds) / hospital.totalBeds) * 100)
                : 0;
              
              return (
                <div key={hospital.id} className="bg-white rounded-lg p-4 shadow border border-gray-200">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-sm font-medium text-gray-900">{hospital.name}</p>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                      {hospital.status || 'active'}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded mt-2">
                    <div 
                      className={`h-full rounded transition-all duration-300 ${
                        occupancyRate > 80 ? 'bg-red-500' : 
                        occupancyRate > 60 ? 'bg-yellow-500' : 'bg-green-500'
                      }`} 
                      style={{ width: `${occupancyRate}%` }} 
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-600 mt-2">
                    <span>{freeBeds} available</span>
                    <span>{occupancyRate}% occupied</span>
                  </div>
                  {hospital.specialties && hospital.specialties.length > 0 && (
                    <div className="mt-2">
                      <span className="text-xs text-gray-500">
                        Specialties: {hospital.specialties.slice(0, 2).join(', ')}
                        {hospital.specialties.length > 2 && '...'}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </aside>
    </main>
  );
}