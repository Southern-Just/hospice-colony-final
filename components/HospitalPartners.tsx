"use client"

import { useState, useEffect } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import { HospitalIcon, MapPinIcon, PhoneIcon } from "lucide-react"
import { HospitalModal } from "./HospitalModal"
import { useAuth } from "@/components/contexts/AuthContext"
import TransferModal from "@/components/TransferModal"
import { Hospital, Ward, Bed } from "@/types"

function ShimmerCard() {
  return (
    <Card className="shadow-lg rounded-2xl p-6 animate-pulse">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-200 rounded-lg h-10 w-10" />
            <div>
              <div className="h-4 w-32 bg-gray-200 rounded mb-2" />
              <div className="h-3 w-20 bg-gray-200 rounded" />
            </div>
          </div>
          <div className="h-5 w-16 bg-gray-200 rounded" />
        </div>
      </CardHeader>

      <CardContent className="space-y-4 mt-4">
        <div className="grid grid-cols-4 gap-4 text-center">
          {[1,2,3,4].map(i => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-14 bg-gray-200 mx-auto rounded" />
              <div className="h-5 w-10 bg-gray-300 mx-auto rounded" />
            </div>
          ))}
        </div>

        <div>
          <div className="h-3 w-20 bg-gray-200 rounded mb-2" />
          <div className="flex flex-wrap gap-2">
            {[1,2,3].map(i => (
              <div key={i} className="h-6 w-16 bg-gray-200 rounded-full" />
            ))}
          </div>
        </div>
      </CardContent>

      <footer className="flex justify-between items-center mt-4 border-t pt-3">
        <div className="h-3 w-28 bg-gray-200 rounded" />
        <div className="flex gap-2">
          <div className="h-7 w-16 bg-gray-300 rounded-full" />
          <div className="h-7 w-16 bg-gray-300 rounded-full" />
        </div>
      </footer>
    </Card>
  )
}

export function HospitalPartners() {
  const { user } = useAuth()
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalHospital, setModalHospital] = useState<Hospital | null>(null)

  const [selectedWard, setSelectedWard] = useState<Record<string, string>>({})
  const [transferOpen, setTransferOpen] = useState(false)
  const [transferFromHospital, setTransferFromHospital] = useState<Hospital | null>(null)
  const [transferFromWards, setTransferFromWards] = useState<string[]>([])

  const userHospitalId = user?.hospitalId ?? ""
  const userRole = user?.role ?? ""

  const fetchHospitals = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/hospitals", { cache: "no-store" })
      const { hospitals } = await res.json()

      const enriched: Hospital[] = []

      for (const h of hospitals) {
        const wardsRes = await fetch(`/api/hospitals/${h.id}/wards`, { cache: "no-store" })
        const bedsRes = await fetch(`/api/hospitals/${h.id}/beds`, { cache: "no-store" })

        const wardData = await wardsRes.json()
        const bedData = await bedsRes.json()

        const wards: Ward[] = wardData.wards || []
        const beds: Bed[] = bedData.beds || []

        const total = beds.length
        const available = beds.filter(b => b.status === "available").length
        const occupied = beds.filter(b => b.status === "occupied").length
        const maintenance = beds.filter(b => b.status === "maintenance").length

        enriched.push({
          ...h,
          beds,   // ⭐ needed for ward filtering logic
          totalBeds: total,
          availableBeds: available,
          occupiedBeds: occupied,
          maintenanceBeds: maintenance,
          wards,
          specialties: Array.from(new Set(["General", ...wards.map(w => w.name)]))
        })
      }

      setHospitals(enriched)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateHospital = (updated: Hospital) => {
    setHospitals(prev => prev.map(h => (h.id === updated.id ? updated : h)))
    setModalHospital(null)
  }

  useEffect(() => {
    if (!user) return
    fetchHospitals()
  }, [user?.hospitalId])

  if (loading)
    return (
      <main className="min-h-screen bg-gray-50 p-6 space-y-8">
        <header className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Partner Hospitals</h1>
            <p className="text-gray-600 mt-1">Hospitals collaborating with Hospice::Colony</p>
          </div>
          <Button className="bg-blue-200  text-blue-600 rounded-lg px-4 py-2 hover:bg-blue-100">
            Hospice::Colony Algo. Aided Transfers
          </Button>
        </header>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <ShimmerCard key={i} />
          ))}
        </section>
      </main>
    )

  if (error)
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Button
          onClick={fetchHospitals}
          className="rounded-full bg-background shadow shadow-green-600 text-xl text-green-600"
        >
          Refresh
        </Button>
        <p className="text-[9px] text-red-500">{error}</p>
      </main>
    )

  return (
    <main className="min-h-screen bg-gray-50 p-6 space-y-8">
      <header className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Partner Hospitals</h1>
          <p className="text-gray-600 mt-1">Hospitals collaborating with Hospice::Colony</p>
        </div>
        <Button className="bg-blue-200 text-blue-600 hover:bg-blue-100 rounded-lg px-4 py-2">
          Hospice::Colony Algo. Aided Transfers
        </Button>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {hospitals.map(hospital => {
          /** ⭐ WARD FILTERING LOGIC ⭐ */

          const activeWard = selectedWard[hospital.id];
          let displayBeds = hospital.beds || [];

          if (activeWard && activeWard !== "General") {
            const wardObj = hospital.wards?.find(w => w.name === activeWard);
            if (wardObj) {
              displayBeds = displayBeds.filter(b => b.wardId === wardObj.id);
            }
          }

          const totalBeds = displayBeds.length;
          const availableBeds = displayBeds.filter(b => b.status === "available").length;
          const occupiedBeds = displayBeds.filter(b => b.status === "occupied").length;
          const maintenanceBeds = displayBeds.filter(b => b.status === "maintenance").length;

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
                        className="text-lg font-semibold cursor-pointer hover:text-gray-600"
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
                    className={`px-2 py-1 text-xs ${
                      hospital.status === "active"
                        ? "bg-background text-green-600"
                        : "bg-gray-400 text-white"
                    }`}
                  >
                    {hospital.status}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 mt-4">
                {/* ⭐ WARD-SPECIFIC or HOSPITAL TOTALS ⭐ */}
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-sm text-gray-500">Total Beds</p>
                    <p className="text-lg font-semibold text-gray-900">{totalBeds}</p>
                  </div>
                  <div>
<<<<<<< HEAD
                    <CardTitle
                      className="text-lg font-semibold cursor-pointer hover:text-gray-500"
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
                  className={`px-2 py-1 text-xs rounded-sm ${
                    hospital.status === "active"
                      ? "bg-gray-200"
                      : "bg-gray-600 text-white"
                  }`}
                >
                  {hospital.status}
                </Badge>
              </div>
            </CardHeader>
=======
                    <p className="text-sm text-gray-500">Available</p>
                    <p className="text-lg font-semibold text-green-600">{availableBeds}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Occupied</p>
                    <p className="text-lg font-semibold text-red-600">{occupiedBeds}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Maintenance</p>
                    <p className="text-lg font-semibold text-yellow-600">{maintenanceBeds}</p>
                  </div>
                </div>
>>>>>>> a3f2879f4bafecc2ffc43a3decb0a111dc88863d

                <div>
                  <p className="text-sm text-gray-500 mb-1">Specialties</p>
                  <div className="flex flex-wrap gap-2">
                    {hospital.specialties.map(s => (
                      <button
                        key={`${hospital.id}-${s}`}
                        className={`px-2 py-1 rounded-full text-xs ${
                          selectedWard[hospital.id] === s
                            ? "bg-blue-200 text-blue-700"
                            : "bg-gray-200 text-gray-700"
                        }`}
                        onClick={() =>
                          setSelectedWard(prev => ({
                            ...prev,
                            [hospital.id]: s
                          }))
                        }
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>

              <footer className="flex justify-between items-center mt-4 border-t pt-3 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <PhoneIcon className="h-3 w-3" /> {hospital.phone}
                </span>
                <div className="flex flex-row-reverse">
                  {userRole === "admin" && hospital.id === userHospitalId && (
                    <Button
                      className="px-1 py-0 bg-transparent text-blue-500 border-l border-yellow-500 rounded-xs hover:bg-transparent hover:text-blue-400"
                      onClick={() => {
                        const wardList = Array.isArray(hospital.wards) ? hospital.wards : [];
                        setTransferFromHospital(hospital);
                        setTransferFromWards(wardList.map(w => w.name));
                        setTransferOpen(true);
                      }}
                    >
                      Transfer
                    </Button>
                  )}

<<<<<<< HEAD
            <footer className="flex justify-between items-center mt-4 border-t pt-3 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <PhoneIcon className="h-3 w-3" /> {hospital.phone}
              </span>
              <div className="flex flex-row-reverse gap-2">
                {userRole === "admin" && hospital.id === userHospitalId && (
                  <Button
                    className="px-3 py-1 bg-blue-600 text-white text-xs rounded-full hover:bg-blue-500"
                    onClick={() => {
                      const wardList = Array.isArray(hospital.wards) ? hospital.wards : [];
                      setTransferFromHospital(hospital);
                      setTransferFromWards(wardList.map(w => w.name));
                      setTransferOpen(true);
                    }}
                  >
                    Transfer
=======
                  <Button className="px-1 py-1 underline-offset-2 bg-transparent text-green-500 hover:bg-transparent hover:text-green-400">
                    Optimize
>>>>>>> a3f2879f4bafecc2ffc43a3decb0a111dc88863d
                  </Button>
                </div>
              </footer>
            </Card>
          )
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

      {transferOpen && transferFromHospital && (
        <TransferModal
          open={transferOpen}
          onClose={() => setTransferOpen(false)}
          hospitals={hospitals}
          fromHospital={transferFromHospital}
          fromWards={transferFromWards}
          onSubmit={() => setTransferOpen(false)}
        />
      )}
    </main>
  )
}
