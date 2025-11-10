'use client';

import { useState, useEffect } from 'react';
import { Loader, AlertCircle, RefreshCw } from 'lucide-react';

type Hospital = {
  id: string;
  name: string;
  totalBeds: number;
  availableBeds: number;
  occupiedBeds?: number;
  maintenanceBeds?: number;
  location?: string;
  specialties?: string[] | any;
  status?: string;
  phone?: string;
};

export function Dashboard() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [sidebarLoading, setSidebarLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slide, setSlide] = useState(0);

  const beforeAfterImages = [
    {
      before: '',
      after: '',
      title: 'Emergency Ward Optimization',
      description: 'Reduced wait times by 45% through coordinated bed allocation'
    },
    {
      before: '',
      after: '',
      title: 'ICU Resource Sharing',
      description: 'Improved critical care access across partner hospitals'
    }
  ];

  const normalizeHospital = (h: any) => {
    const totalBeds = Number(h.totalBeds ?? 0);
    const availableBeds = Number(h.availableBeds ?? 0);
    const occupiedBeds = totalBeds - availableBeds;
    let specialties: string[] = [];
    if (Array.isArray(h.specialties)) specialties = h.specialties;
    else if (typeof h.specialties === 'string') {
      try { specialties = JSON.parse(h.specialties); } catch { specialties = [h.specialties]; }
    } else if (h.specialties) specialties = [String(h.specialties)];
    return {
      ...h,
      totalBeds,
      availableBeds,
      occupiedBeds,
      specialties
    };
  };

  const fetchDashboardData = async (opts?: { refresh?: boolean }) => {
    try {
      if (opts?.refresh) {
        setSidebarLoading(true);
      } else {
        setInitialLoading(true);
        setError(null);
      }
      const res = await fetch('/api/hospitals');
      if (!res.ok) throw new Error(`Failed to fetch data: ${res.status}`);
      const json = await res.json();
      const list = (json.hospitals ?? []).map(normalizeHospital);
      setHospitals(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      if (opts?.refresh) {
        setSidebarLoading(false);
      } else {
        setInitialLoading(false);
      }
    }
  };

  useEffect(() => { fetchDashboardData(); }, []);
  useEffect(() => {
    const interval = setInterval(() => setSlide(s => (s + 1) % beforeAfterImages.length), 5000);
    return () => clearInterval(interval);
  }, []);

  const totalHospitals = hospitals.length;
  const totalBeds = hospitals.reduce((sum, h) => sum + (Number(h.totalBeds) || 0), 0);
  const availableBeds = hospitals.reduce((sum, h) => sum + (Number(h.availableBeds) || 0), 0);
  const occupiedBeds = hospitals.reduce((sum, h) => sum + (Number(h.occupiedBeds) || 0), 0);
  const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

  if (initialLoading) {
    return (
      <main className="max-w-7xl mx-auto px-6 py-12 flex items-center justify-center min-h-96">
        <div className="text-center">
          <Loader className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="mt-4 text-gray-600">Loading hospital data...</p>
        </div>
      </main>
    );
  }

  if (error && hospitals.length === 0) {
    return (
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-800 mb-2">Failed to load data</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => fetchDashboardData()}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-6 py-12 flex gap-10">
      <style>{`
        .shimmer { position: relative; overflow: hidden; background: #f3f4f6; border-radius: 0.5rem; }
        .shimmer::after { content: ""; position: absolute; top: 0; left: -150%; width: 150%; height: 100%;
          background: linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.7), rgba(255,255,255,0));
          animation: shimmer 1.2s infinite; }
        @keyframes shimmer { 100% { transform: translateX(200%); } }
        .fade-in { animation: fadeIn 300ms ease both; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <section className="flex-1 space-y-12">

        <section className="bg-white bg-hospice rounded-2xl shadow p-8 text-center">
          <h2 className="text-3xl font-semibold text-gray-900 mb-4">Why Hospice::Colony?</h2>
          <p className="text-gray-700 leading-relaxed">
            Hospital bed shortages lead to critical service delays. Hospice::Colony enables real-time
            coordinated bed allocation across multiple hospitals to reduce wait times and improve care.
          </p>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="rounded-2xl bg-blue-900 text-white p-8 text-center shadow-lg fade-in">
            <div className="text-3xl font-bold">{totalBeds.toLocaleString()}</div>
            <p className="text-sm opacity-80 mt-2">Total Beds</p>
          </div>
          <div className="rounded-2xl bg-green-700 text-white p-8 text-center shadow-lg fade-in">
            <div className="text-3xl font-bold">{availableBeds.toLocaleString()}</div>
            <p className="text-sm opacity-80 mt-2">Available Beds</p>
          </div>
          <div className="rounded-2xl bg-red-700 text-white p-8 text-center shadow-lg fade-in">
            <div className="text-3xl font-bold">{occupiedBeds.toLocaleString()}</div>
            <p className="text-sm opacity-80 mt-2">{occupancyRate}% Occupied</p>
          </div>
          <div className="rounded-2xl bg-gray-800 text-white p-8 text-center shadow-lg fade-in">
            <div className="text-3xl font-bold">{totalHospitals}</div>
            <p className="text-sm opacity-80 mt-2">Partner Facilities</p>
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow p-6">
          <h3 className="text-xl font-semibold mb-4">Optimization Results</h3>
          <div className="relative h-64 bg-gray-100 rounded-lg overflow-hidden">
            <div className="absolute inset-0 flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${slide * 100}%)` }}>
              {beforeAfterImages.map((image, index) => (
                <div key={index} className="w-full flex-shrink-0 flex">
                  <div className="flex-1 p-4">
                    <div className="h-40 bg-gray-300 rounded mb-2 flex items-center justify-center" />
                    <h4 className="font-semibold">{image.title}</h4>
                    <p className="text-sm text-gray-600">{image.description}</p>
                  </div>
                  <div className="flex-1 p-4">
                    <div className="h-40 bg-gray-300 rounded mb-2 flex items-center justify-center" />
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
                className={`w-3 h-3 rounded-full ${slide === index ? 'bg-blue-600' : 'bg-gray-300'}`}
              />
            ))}
          </div>
        </section>
      </section>

      <aside className="hidden lg:block w-80">
        <div className="sticky top-8 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Partner Facilities</h3>
            <button
              onClick={() => fetchDashboardData({ refresh: true })}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh data"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3">
            {sidebarLoading ? (
              <>
                <div className="h-24 shimmer" />
                <div className="h-24 shimmer" />
                <div className="h-24 shimmer" />
              </>
            ) : (
              hospitals.map(h => {
                const free = Number(h.availableBeds || 0);
                const total = Number(h.totalBeds || 0);
                const rate = total > 0 ? Math.round(((total - free) / total) * 100) : 0;
                const specialties = Array.isArray(h.specialties) ? h.specialties : [];
                return (
                  <div key={h.id} className="bg-white rounded-lg p-4 shadow border border-gray-200 fade-in">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-sm font-medium text-gray-900">{h.name}</p>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                        {h.status || 'active'}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded mt-2">
                      <div
                        className={`h-full rounded transition-all duration-300 ${
                          rate > 80 ? 'bg-red-500' :
                          rate > 60 ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}
                        style={{ width: `${rate}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-600 mt-2">
                      <span>{free} available</span>
                      <span>{rate}% occupied</span>
                    </div>
                    {specialties.length > 0 && (
                      <div className="mt-2">
                        <span className="text-xs text-gray-500">
                          Specialties: {specialties.slice(0, 2).join(', ')}
                          {specialties.length > 2 && '...'}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </aside>
    </main>
  );
}
