'use client';
import { useState, useEffect } from 'react';
import { Loader, RefreshCw } from 'lucide-react';
import { Hospital, Ward } from '@/types';

export function Dashboard() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [sidebarLoading, setSidebarLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [displayTotalBeds, setDisplayTotalBeds] = useState(0);
  const [displayAvailableBeds, setDisplayAvailableBeds] = useState(0);
  const [displayOccupiedBeds, setDisplayOccupiedBeds] = useState(0);
  const [displayTotalHospitals, setDisplayTotalHospitals] = useState(0);


  const normalizeHospital = (h: any) => {
    const totalBeds = Number(h.totalBeds ?? 0);
    const availableBeds = Number(h.availableBeds ?? 0);
    const occupiedBeds = totalBeds - availableBeds;

    let specialties: string[] = [];
    if (Array.isArray(h.specialties)) specialties = h.specialties;
    else if (typeof h.specialties === 'string') {
      try { specialties = JSON.parse(h.specialties); }
      catch { specialties = [h.specialties]; }
    } else if (h.specialties) specialties = [String(h.specialties)];

    const wards: Ward[] = Array.isArray(h.wards)
      ? h.wards.map((w: any) => ({
          ...w,
          totalBeds: Number(w.totalBeds ?? 0),
          availableBeds: Number(w.availableBeds ?? 0),
          maintenanceBeds: Number(w.maintenanceBeds ?? 0),
        }))
      : [];

    return { ...h, totalBeds, availableBeds, occupiedBeds, specialties, wards };
  };

  const fetchDashboardData = async (opts?: { refresh?: boolean }) => {
    try {
      if (opts?.refresh) setSidebarLoading(true);
      else {
        setInitialLoading(true);
        setError(null);
      }
      const res = await fetch('/api/hospitals');
      if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
      const json = await res.json();
      setHospitals((json.hospitals ?? []).map(normalizeHospital));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading data');
    } finally {
      if (opts?.refresh) setSidebarLoading(false);
      else setInitialLoading(false);
    }
  };

  useEffect(() => { fetchDashboardData(); }, []);


  const totalHospitals = hospitals.length;
  const totalBeds = hospitals.reduce((sum, h) => sum + (h.totalBeds || 0), 0);
  const availableBeds = hospitals.reduce((sum, h) => sum + (h.availableBeds || 0), 0);
  const occupiedBeds = hospitals.reduce((sum, h) => sum + (h.occupiedBeds || 0), 0);
  const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

  useEffect(() => {
    if (!initialLoading && hospitals.length) {
      const frames = 30;
      let step = 0;
      const animate = () => {
        step++;
        setDisplayTotalBeds(Math.round((step / frames) * totalBeds));
        setDisplayAvailableBeds(Math.round((step / frames) * availableBeds));
        setDisplayOccupiedBeds(Math.round((step / frames) * occupiedBeds));
        setDisplayTotalHospitals(Math.round((step / frames) * totalHospitals));
        if (step < frames) requestAnimationFrame(animate);
      };
      animate();
    }
  }, [initialLoading, hospitals, totalBeds, availableBeds, occupiedBeds, totalHospitals]);

  const userHospital = hospitals[0] ?? { wards: [] };

  return (
    <main className="max-w-7xl mx-auto px-6 py-12 flex gap-10 relative">
      <style>{`
        .shimmer { position: relative; overflow: hidden; background: #f3f4f6; border-radius: 0.5rem; }
        .shimmer::after { content: ""; position: absolute; top: 0; left: -150%; width: 150%; height: 100%;
          background: linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.7), rgba(255,255,255,0));
          animation: shimmer 1.2s infinite; }
        @keyframes shimmer { 100% { transform: translateX(200%); } }
        .fade-in { animation: fadeIn 300ms ease both; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {initialLoading && (
        <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-20">
          <Loader className="h-10 w-10 animate-spin text-blue-600" />
        </div>
      )}

      <section className="flex-1 space-y-12">
        {/* Hero Section */}
        <section className="relative h-50 rounded-2xl shadow overflow-hidden">
          <div
            className="absolute inset-0 flex transition-transform duration-500 ease-in-out"
          >
            <div className="w-full flex-shrink-0 flex flex-col items-center justify-center p-8 text-center bg-hospice bg-cover bg-center">
              <h2 className="text-3xl font-semibold text-gray-900 mb-4">Why Hospice::Colony?</h2>
              <p className="text-gray-700 leading-relaxed max-w-xl">
                Hospital bed shortages lead to critical delays. Hospice::Colony enables coordinated bed sharing across hospitals.
              </p>
            </div>

          </div>

        </section>

        {/* Stats */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          <div className="rounded-2xl bg-blue-900 text-white p-8 text-center shadow-lg fade-in">
            <div className="text-3xl font-bold">{displayTotalBeds}</div>
            <p className="text-sm opacity-80 mt-2">Total Beds</p>
          </div>
          <div className="rounded-2xl bg-green-700 text-white p-8 text-center shadow-lg fade-in">
            <div className="text-3xl font-bold">{displayAvailableBeds}</div>
            <p className="text-sm opacity-80 mt-2">Available Beds</p>
          </div>
          <div className="rounded-2xl bg-red-700 text-white p-8 text-center shadow-lg fade-in">
            <div className="text-3xl font-bold">{displayOccupiedBeds}</div>
            <p className="text-sm opacity-80 mt-2">{occupancyRate}% Occupied</p>
          </div>
          <div className="rounded-2xl bg-gray-800 text-white p-8 text-center shadow-lg fade-in">
            <div className="text-3xl font-bold">{displayTotalHospitals}</div>
            <p className="text-sm opacity-80 mt-2">Partner Facilities</p>
          </div>
        </section>

        {/* Wards Section */}
        <section className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {userHospital.wards?.length ? (
            userHospital.wards.map(w => (
              <div key={w.id} className="bg-white rounded-lg p-4 shadow border border-gray-200 text-center hover:shadow-md transition-all">
                <div className="font-semibold text-gray-800">{w.name}</div>
                <div className="mt-2 text-xl font-bold">{w.totalBeds} Beds</div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>{w.availableBeds} Avail</span>
                  <span>{w.maintenanceBeds} Maint</span>
                  <span>{w.totalBeds} Total</span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-400 italic col-span-full">No wards data available</p>
          )}
        </section>
      </section>

      {/* Sidebar */}
      <aside className="hidden lg:block w-80">
        <div className="sticky top-8 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Partner Facilities</h3>
            <button
              onClick={() => fetchDashboardData({ refresh: true })}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${sidebarLoading ? 'animate-spin text-blue-500' : ''}`} />
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
                const free = h.availableBeds || 0;
                const total = h.totalBeds || 0;
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
                          rate > 80 ? 'bg-red-500' : rate > 60 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${rate}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-xs text-gray-600 mt-2">
                      <span>{free} available</span>
                      <span>{rate}% occupied</span>
                    </div>

                    {specialties.length > 0 && (
                      <div className="mt-3 flex justify-center gap-1 flex-wrap">
                        {specialties.slice(0, 5).map((s, idx) => (
                          <div
                            key={idx}
                            className="w-3 h-3 rounded-full bg-blue-500 opacity-80 hover:opacity-100"
                            title={s}
                          />
                        ))}
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
