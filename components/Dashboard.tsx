'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader, RefreshCw } from 'lucide-react'
import { Hospital, Bed, Ward } from '@/types'

interface DashboardProps {
  totalBeds: number
  availableBeds: number
  occupiedBeds: number
  partneredHospitals: number
}

export function Dashboard({
  totalBeds,
  availableBeds,
  occupiedBeds,
  partneredHospitals
}: DashboardProps) {
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [sidebarLoading, setSidebarLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [displayTotalBeds, setDisplayTotalBeds] = useState(totalBeds)
  const [displayAvailableBeds, setDisplayAvailableBeds] = useState(availableBeds)
  const [displayOccupiedBeds, setDisplayOccupiedBeds] = useState(occupiedBeds)
  const [displayTotalHospitals, setDisplayTotalHospitals] = useState(partneredHospitals)

  const [detectedUser, setDetectedUser] = useState<any>(null)
  const [userHospitalId, setUserHospitalId] = useState<string>('')

  const loadCookie = (key: string) => {
    if (typeof document === 'undefined') return null
    const match = document.cookie.split('; ').find(r => r.startsWith(key + '='))
    if (!match) return null
    try {
      return JSON.parse(decodeURIComponent(match.split('=')[1]))
    } catch {
      return null
    }
  }

  const saveCookie = (key: string, value: any) => {
    if (typeof document === 'undefined') return
    document.cookie = `${key}=${encodeURIComponent(JSON.stringify(value))}; path=/; max-age=900`
  }

  const readUserFromStorage = () => {
    if (typeof document === 'undefined') return null
    try {
      const ls = localStorage.getItem('authUser')
      if (ls) return JSON.parse(ls)
    } catch {}
    try {
      return loadCookie('authUser')
    } catch {}
    return null
  }

  const normalizeHospital = (h: any) => {
    const rawSpecs = Array.isArray(h.specialties)
      ? h.specialties
      : typeof h.specialties === 'string'
      ? (() => {
          try {
            return JSON.parse(h.specialties)
          } catch {
            return [h.specialties]
          }
        })()
      : h.specialties
      ? [String(h.specialties)]
      : []

    const specialties = Array.from(new Set(['General', ...rawSpecs]))
    const beds: Bed[] = Array.isArray(h.beds) ? h.beds : []
    const wards: Ward[] = Array.isArray(h.wards) ? h.wards : []

    const wardMap: Record<string, Ward> = {}

    wards.forEach(w => {
      wardMap[w.id] = {
        ...w,
        totalBeds: 0,
        availableBeds: 0,
        maintenanceBeds: 0
      }
    })

    beds.forEach(b => {
      const w = wardMap[b.wardId]
      if (w) {
        w.totalBeds += 1
        if (b.status === 'available') w.availableBeds += 1
        if (b.status === 'maintenance') w.maintenanceBeds += 1
      }
    })

    return {
      ...h,
      beds,
      wards: Object.values(wardMap),
      totalBeds: beds.length,
      availableBeds: beds.filter(b => b.status === 'available').length,
      occupiedBeds: beds.filter(b => b.status === 'occupied').length,
      specialties
    }
  }

  const fetchUserIfNeeded = useCallback(async () => {
    const fromStorage = readUserFromStorage()
    if (fromStorage && fromStorage.hospitalId) {
      setDetectedUser(fromStorage)
      setUserHospitalId(String(fromStorage.hospitalId))
      return
    }
    try {
      const res = await fetch('/api/users/me')
      if (!res.ok) return
      const j = await res.json()
      const userObj = j.user ?? j
      setDetectedUser(userObj)
      if (userObj.hospitalId) setUserHospitalId(String(userObj.hospitalId))
    } catch {}
  }, [])

  const fetchDashboardData = useCallback(
    async (opts?: { refresh?: boolean }) => {
      try {
        if (opts?.refresh) setSidebarLoading(true)
        else {
          setInitialLoading(true)
          setError(null)
        }

        const cached = !opts?.refresh ? loadCookie('dashboard_hospitals') : null

        if (cached && Array.isArray(cached)) {
          setHospitals(cached)
          setInitialLoading(false)
          if (!opts?.refresh) return
        }

        const res = await fetch('/api/hospitals')
        if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`)
        const json = await res.json()

        const hospitalsData = await Promise.all(
          (json.hospitals ?? []).map(async (h: any) => {
            const [bedsRes, wardsRes] = await Promise.all([
              fetch(`/api/hospitals/${h.id}/beds`),
              fetch(`/api/hospitals/${h.id}/wards`)
            ])

            const bedsJson = bedsRes.ok ? await bedsRes.json() : { beds: [] }
            const wardsJson = wardsRes.ok ? await wardsRes.json() : { wards: [] }

            return normalizeHospital({
              ...h,
              beds: bedsJson.beds ?? [],
              wards: wardsJson.wards ?? []
            })
          })
        )

        setHospitals(hospitalsData)
        saveCookie('dashboard_hospitals', hospitalsData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading data')
      } finally {
        if (opts?.refresh) setSidebarLoading(false)
        else setInitialLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    fetchUserIfNeeded().then(() => fetchDashboardData())
  }, [fetchUserIfNeeded, fetchDashboardData])

  useEffect(() => {
    const interval = setInterval(() => {
      const latest = readUserFromStorage()
      if (latest && latest.hospitalId && String(latest.hospitalId) !== userHospitalId) {
        setDetectedUser(latest)
        setUserHospitalId(String(latest.hospitalId))
      }
    }, 1500)
    return () => clearInterval(interval)
  }, [userHospitalId])

  const totalHospitals = hospitals.length
  const computedTotalBeds = hospitals.reduce((s, h) => s + (h.totalBeds || 0), 0)
  const computedAvailableBeds = hospitals.reduce((s, h) => s + (h.availableBeds || 0), 0)
  const computedOccupiedBeds = hospitals.reduce((s, h) => s + (h.occupiedBeds || 0), 0)
  const occupancyRate = computedTotalBeds > 0 ? Math.round((computedOccupiedBeds / computedTotalBeds) * 100) : 0

  useEffect(() => {
    if (!initialLoading && hospitals.length) {
      const frames = 30
      let step = 0
      const animate = () => {
        step++
        setDisplayTotalBeds(Math.round((step / frames) * computedTotalBeds))
        setDisplayAvailableBeds(Math.round((step / frames) * computedAvailableBeds))
        setDisplayOccupiedBeds(Math.round((step / frames) * computedOccupiedBeds))
        setDisplayTotalHospitals(Math.round((step / frames) * totalHospitals))
        if (step < frames) requestAnimationFrame(animate)
      }
      animate()
    }
  }, [initialLoading, hospitals, computedTotalBeds, computedAvailableBeds, computedOccupiedBeds, totalHospitals])

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
        .hide-scroll::-webkit-scrollbar { display: none; }
        .hide-scroll { scrollbar-width: none; }
      `}</style>

      {initialLoading && (
        <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-20">
          <Loader className="h-10 w-10 animate-spin text-blue-600" />
        </div>
      )}

      <section className="flex-1 space-y-12">
        <section className="relative h-50 rounded-2xl shadow overflow-hidden">
          <div className="absolute inset-0 flex transition-transform duration-500 ease-in-out">
            <div className="w-full flex-shrink-0 flex flex-col items-center justify-center p-8 text-center bg-hospice bg-cover bg-center">
              <h2 className="text-3xl font-semibold text-gray-900 mb-4">Why Hospice::Colony?</h2>
              <p className="text-gray-700 leading-relaxed max-w-xl">
                Hospital bed shortages lead to critical delays. Hospice::Colony enables coordinated bed sharing across hospitals.
              </p>
            </div>
          </div>
        </section>

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

        <section className="mt-6"></section>
      </section>

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

          <div
            className="space-y-3 overflow-y-auto hide-scroll pr-1"
            style={{ maxHeight: 'calc(100vh - 220px)' }}
          >
            {initialLoading || sidebarLoading ? (
              <>
                <div className="h-24 shimmer rounded-lg" />
                <div className="h-24 shimmer rounded-lg" />
                <div className="h-24 shimmer rounded-lg" />
                <div className="h-24 shimmer rounded-lg" />
                <div className="h-24 shimmer rounded-lg" />
              </>
            ) : (
              hospitals.map(h => {
                const free = h.availableBeds || 0
                const total = h.totalBeds || 0
                const rate = total > 0 ? Math.round(((total - free) / total) * 100) : 0
                const specialties = Array.isArray(h.specialties) ? h.specialties : []

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
                )
              })
            )}
          </div>
        </div>
      </aside>
    </main>
  )
}
