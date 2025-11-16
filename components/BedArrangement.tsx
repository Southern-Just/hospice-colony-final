'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card"
import { Button } from "./ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { RefreshCwIcon, ZapIcon, FilterIcon, EditIcon } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/components/contexts/AuthContext"

type BedStatus = "available" | "occupied" | "maintenance" | "reserved"
type PositionObj = { x: number; y: number }
type UIBed = { id: string; bedNumber: string; ward: string; status: BedStatus; positionIndex: number; priority: string; hospitalId: string }
type ApiBed = { id: string; hospitalId: string; wardId: string | null; bedNumber: string; status: string; priority: string; position: PositionObj | null }
type Hospital = { id: string; name: string; location: string; totalBeds: number; availableBeds: number; specialties: string[]; status: string; phone: string }
type Ward = { id: string; name: string }

const GRID_COLS = 8
const GRID_ROWS = 8
const CELL_W = 64
const CELL_H = 64
const GRID_SIZE = GRID_COLS * GRID_ROWS
const DOOR_ROW = GRID_ROWS - 1
const DOOR_RANGE_START = DOOR_ROW * GRID_COLS

const getBedColor = (status: BedStatus) =>
  status === "available" ? "bg-green-500" :
  status === "occupied" ? "bg-red-500" :
  status === "maintenance" ? "bg-yellow-500" :
  "bg-blue-500"

export default function BedArrangement() {
  const { user } = useAuth()
  const userHospitalId = user?.hospitalId ?? ""
  const userRole = user?.role ?? ""

  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>("")
  const [beds, setBeds] = useState<UIBed[]>([])
  const bedsRef = useRef<UIBed[]>([])
  useEffect(() => { bedsRef.current = beds }, [beds])

  const [oldBeds, setOldBeds] = useState<UIBed[]>([])
  const [selectedWard, setSelectedWard] = useState<string>("all")
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false)
  const pheromones = useRef<number[]>(Array(GRID_SIZE).fill(1))
  const alpha = 1
  const beta = 2
  const evaporation = 0.85

  const [isEditing, setIsEditing] = useState<boolean>(false)
  const [bedsInEdit, setBedsInEdit] = useState<UIBed[]>([])
  const [bedStatusPrompt, setBedStatusPrompt] = useState<{ position: number, id: string } | null>(null)
  const [wardsMap, setWardsMap] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!user) return
    async function fetchInitial() {
      try {
        const hres = await fetch('/api/hospitals')
        const { hospitals: hList = [] } = await hres.json()
        setHospitals(hList)
        if (hList.length) setSelectedHospitalId(userHospitalId || hList[0].id)
      } catch {
        toast.error("Failed to load hospitals")
      }
    }
    fetchInitial()
  }, [user])

  useEffect(() => {
    if (!selectedHospitalId) return
    async function fetchBedsAndWards() {
      try {
        const bres = await fetch(`/api/hospitals/${selectedHospitalId}/beds`)
        const { beds: apiBeds = [] } = await bres.json()
        const mapped: UIBed[] = apiBeds.map(b => {
          const pos = b.position ?? { x: 0, y: 0 }
          const index = pos.y * GRID_COLS + pos.x
          return { id: b.id, bedNumber: b.bedNumber, ward: b.wardId ?? "ward", status: (b.status as BedStatus) ?? "available", positionIndex: Math.max(0, Math.min(GRID_SIZE - 1, index)), priority: b.priority ?? "normal", hospitalId: b.hospitalId }
        })
        setBeds(mapped)
        const wres = await fetch(`/api/hospitals/${selectedHospitalId}/wards`)
        const { wards: apiWards = [] } = await wres.json()
        const map: Record<string, string> = {}
        for (const w of apiWards) map[w.id] = w.name
        setWardsMap(map)
        setBeds(mapped.map(b => ({ ...b, ward: map[b.ward] ?? b.ward })))
      } catch {
        toast.error("Failed to load beds")
      }
    }
    fetchBedsAndWards()
  }, [selectedHospitalId])

  const visibleBeds = useMemo(() => {
    const targetBeds = isEditing ? bedsInEdit : beds
    const byHospital = targetBeds.filter(b => selectedHospitalId ? b.hospitalId === selectedHospitalId : true)
    return selectedWard === "all" ? byHospital : byHospital.filter(b => b.ward === selectedWard)
  }, [beds, selectedWard, selectedHospitalId, isEditing, bedsInEdit])

  const wards = useMemo(() => ["all", ...Array.from(new Set(beds.map(b => b.ward)))], [beds])

  const statusCounts = useMemo(() => {
    const base = { available: 0, occupied: 0, maintenance: 0, reserved: 0 } as Record<BedStatus, number>
    for (const b of visibleBeds) base[b.status]++
    return base
  }, [visibleBeds])

  const hospitalsInWard = useMemo(() => {
    const ids = Array.from(new Set(visibleBeds.map(b => b.hospitalId)))
    return hospitals.filter(h => ids.includes(h.id))
  }, [visibleBeds, hospitals])

  const availableAtBottom = useMemo(() => visibleBeds.filter(b => b.status === "available"), [visibleBeds])

  const computeProbabilities = (bed: UIBed) => {
    const probs: number[] = []
    for (let i = 0; i < GRID_SIZE; i++) {
      if (i >= DOOR_RANGE_START && i < DOOR_RANGE_START + GRID_COLS) {
        probs.push(0.001)
        continue
      }
      const pher = Math.pow(pheromones.current[i], alpha)
      const row = Math.floor(i / GRID_COLS)
      const col = i % GRID_COLS
      const brow = Math.floor(bed.positionIndex / GRID_COLS)
      const bcol = bed.positionIndex % GRID_COLS
      const dist = Math.hypot(col - bcol, row - brow)
      const heuristic = Math.pow(1 / (1 + dist), beta)
      probs.push(pher * heuristic)
    }
    return probs
  }

  const normalize = (arr: number[]) => {
    const s = arr.reduce((a, b) => a + b, 0)
    return s === 0 ? arr.map(() => 1 / arr.length) : arr.map(v => v / s)
  }

  const selectIndexByProb = (probs: number[]) => {
    const r = Math.random()
    let c = 0
    for (let i = 0; i < probs.length; i++) {
      c += probs[i]
      if (r <= c) return i
    }
    return probs.length - 1
  }

  const optimizeArrangement = useCallback(() => {
    setOldBeds(bedsRef.current.map(b => ({ ...b })))
    setIsOptimizing(true)
    pheromones.current = pheromones.current.map(p => Math.max(p * evaporation, 0.01))
    const targetBeds = bedsRef.current.map(b => ({ ...b }))
    const candidateMoves = targetBeds.map(b => {
      const probs = computeProbabilities(b)
      const norm = normalize(probs)
      const chosen = selectIndexByProb(norm)
      return { id: b.id, to: chosen }
    })
    const newBeds = targetBeds.map(tb => {
      const move = candidateMoves.find(m => m.id === tb.id)
      if (!move) return tb
      const newStatus = Math.random() < 0.5 ? "occupied" : "available"
      return { ...tb, positionIndex: move.to, status: newStatus }
    })
    setTimeout(() => {
      setBeds(newBeds)
      setTimeout(() => {
        setIsOptimizing(false)
        setOldBeds([])
      }, 900)
    }, 300)
    toast.success("Best allocation simulated")
  }, [])

  const enterEditMode = () => {
    if (!user) { toast.error("User not loaded"); return }
    if (userRole !== "admin") { toast.error("Permission Denied"); return }
    if (userHospitalId !== selectedHospitalId) { toast.error("Hospital Affiliation Required"); return }
    const bedsForHospital = beds.filter(b => b.hospitalId === selectedHospitalId)
    setBedsInEdit(bedsForHospital.map(b => ({ ...b, positionIndex: b.positionIndex ?? -1 })))
    setSelectedWard("all")
    setIsEditing(true)
    toast.info("Editing Layout")
  }

  const handleStatusSelection = (position: number, id: string, status: BedStatus) => {
    const newBed = bedsInEdit.find(b => b.id === id)
    if (!newBed) return
    setBedsInEdit(prev => prev.map(b => b.id === id ? { ...b, positionIndex: position, status } : b))
    setBedStatusPrompt(null)
    toast.success(`Bed ${newBed.bedNumber} placed as ${status}`)
  }

  const handleGridClick = (position: number) => {
    if (!isEditing) return
    if (position >= DOOR_RANGE_START && position < DOOR_RANGE_START + GRID_COLS) { toast.warning("Invalid Position"); return }
    const existingBed = bedsInEdit.find(b => b.positionIndex === position)
    if (existingBed) {
      setBedsInEdit(prev => prev.map(b => b.id === existingBed.id ? { ...b, positionIndex: -1 } : b))
      setBedStatusPrompt(null)
      toast.info(`Bed ${existingBed.bedNumber} removed from position ${position}`)
    } else {
      const unplacedBed = bedsInEdit.find(b => b.positionIndex === -1)
      if (unplacedBed) setBedStatusPrompt({ position, id: unplacedBed.id })
      else toast.warning("All Beds Placed")
    }
  }

  const saveLayoutChanges = async () => {
    const placedBeds = bedsInEdit.filter(b => b.positionIndex !== -1)
    const bedsFromOtherHospitals = beds.filter(b => b.hospitalId !== selectedHospitalId)
    const newLocal = [...bedsFromOtherHospitals, ...placedBeds]
    setBeds(newLocal)
    setIsEditing(false)
    setBedStatusPrompt(null)
    toast.success("Saving layout")
    try {
      await Promise.all(placedBeds.map(async b => {
        const posObj = { x: b.positionIndex % GRID_COLS, y: Math.floor(b.positionIndex / GRID_COLS) }
        await fetch(`/api/hospitals/${selectedHospitalId}/beds`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: b.id, wardId: Object.keys(wardsMap).find(k => wardsMap[k] === b.ward) ?? b.ward, status: b.status, priority: b.priority, bedNumber: b.bedNumber, position: posObj })
        })
      }))
      toast.success("Layout Saved")
    } catch {
      toast.error("Failed to save layout")
    }
  }

  const getCellCoordinates = (pos: number) => {
    const col = pos % GRID_COLS
    const row = Math.floor(pos / GRID_COLS)
    return { left: col * CELL_W, top: row * CELL_H }
  }

  return (
    <div className="space-y-6 relative">
      <style>{`
        .curve-path { stroke: rgba(0,0,0,.9); fill: none; stroke-linecap: round; stroke-linejoin: round; animation: curvePulse 1.6s ease-in-out infinite; }
        .curve-dot { fill: #111; opacity: .95; }
        @keyframes curvePulse { 0% { stroke-width: 1; stroke-opacity: .15 } 50% { stroke-width: 3; stroke-opacity: .9 } 100% { stroke-width: 1; stroke-opacity: .15 } }
        @keyframes moveAlong { 0% { offset-distance: 0% } 100% { offset-distance: 100% } }
        .moving-dot { offset-path: path(''); animation: moveAlong 1s linear forwards; }
        .edit-cell { cursor: pointer; transition: background-color 0.1s; }
        .edit-cell:hover { background-color: #e0f2f1; }
      `}</style>

      <div className="flex items-start justify-between gap-6">
        <div className="mx-auto w-64 ml-2 space-y-4">
          <h2 className="text-xl font-bold">{isEditing ? "Beds to Place" : "Bed Overview"}</h2>

          {isEditing && (
            <Card>
              <CardHeader><CardTitle>Unplaced Beds</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {bedsInEdit.filter(b => b.positionIndex === -1).map(b => (
                    <span key={b.id} className="px-2 py-1 bg-gray-200 rounded text-xs border border-gray-400 font-medium">{b.bedNumber}</span>
                  ))}
                  {bedsInEdit.filter(b => b.positionIndex === -1).length === 0 && <span className="text-sm text-green-600 font-medium">All beds placed!</span>}
                </div>
                <div className="mt-4 text-sm text-gray-500">
                  {bedsInEdit.filter(b => b.positionIndex !== -1).length} / {bedsInEdit.length} beds placed.
                </div>
              </CardContent>
            </Card>
          )}

          {!isEditing && (
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center space-x-2"><div className={`w-3 h-3 rounded ${getBedColor("available")}`} /><div className="text-sm">Available</div></div>
              <div className="text-sm font-medium">{statusCounts.available}</div>
              <div className="flex items-center space-x-2"><div className={`w-3 h-3 rounded ${getBedColor("occupied")}`} /><div className="text-sm">Occupied</div></div>
              <div className="text-sm font-medium">{statusCounts.occupied}</div>
              <div className="flex items-center space-x-2"><div className={`w-3 h-3 rounded ${getBedColor("maintenance")}`} /><div className="text-sm">Maintenance</div></div>
              <div className="text-sm font-medium">{statusCounts.maintenance}</div>
              <div className="flex items-center space-x-2"><div className={`w-3 h-3 rounded ${getBedColor("reserved")}`} /><div className="text-sm">Reserved</div></div>
              <div className="text-sm font-medium">{statusCounts.reserved}</div>
            </div>
          )}

          {!isEditing && (
            <div className="mt-18 -ml-2">
              <Card>
                <CardHeader>
                  <CardTitle>Available Beds After Allocation</CardTitle>
                  <CardDescription>Grouped by hospital</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {hospitalsInWard.map(h => (
                      <div key={h.id}>
                        <div className="font-semibold">{h.name}</div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {availableAtBottom.filter(b => b.hospitalId === h.id).map(b => (
                            <span key={b.id} className="px-2 py-1 bg-green-100 rounded text-xs">{b.bedNumber}</span>
                          ))}
                          {availableAtBottom.filter(b => b.hospitalId === h.id).length === 0 && <span className="text-xs text-gray-500">No available beds</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-end gap-2 mb-4">
            <div className="w-56">
              <Select value={selectedHospitalId} onValueChange={id => { setSelectedHospitalId(id); setIsEditing(false) }} disabled={isEditing}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select hospital" /></SelectTrigger>
                <SelectContent>{hospitals.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="w-40">
              <Select value={selectedWard} onValueChange={setSelectedWard} disabled={isEditing}>
                <SelectTrigger className="w-full"><FilterIcon className="h-4 w-4 mr-2"/><SelectValue /></SelectTrigger>
                <SelectContent>{wards.map(w => <SelectItem key={w} value={w}>{w === "all" ? "All Wards" : w}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {!isEditing && (
              <Button onClick={optimizeArrangement} disabled={isOptimizing || beds.length === 0}>
                {isOptimizing ? <RefreshCwIcon className="h-4 w-4 mr-2 animate-spin" /> : <ZapIcon className="h-4 w-4 mr-2" />}Run Allocation
              </Button>
            )}

            {isEditing ? (
              <Button onClick={saveLayoutChanges} className="bg-green-600 hover:bg-green-700">Save Changes</Button>
            ) : (
              <Button variant="outline" onClick={enterEditMode}><EditIcon className="h-4 w-4 mr-2" />Edit Layout</Button>
            )}
          </div>

          <Card>
            <CardHeader><CardTitle>{isEditing ? `Edit Layout for ${hospitals.find(h => h.id === selectedHospitalId)?.name}` : "Ward Grid"}</CardTitle></CardHeader>
            <CardContent>
              <div className="relative w-full h-full">
                {isOptimizing && oldBeds.length > 0 && (
                  <svg className="absolute inset-0 z-20 pointer-events-none" width="100%" height={GRID_ROWS * CELL_H}>
                    {visibleBeds.map(b => {
                      const old = oldBeds.find(o => o.id === b.id)
                      if (!old || old.positionIndex === b.positionIndex) return null
                      const p1 = getCellCoordinates(old.positionIndex)
                      const p2 = getCellCoordinates(b.positionIndex)
                      const c1x = p1.left + CELL_W * 0.5
                      const c1y = p1.top + CELL_H * 0.5 - 40
                      const c2x = p2.left + CELL_W * 0.5
                      const c2y = p2.top + CELL_H * 0.5 - 40
                      const d = `M ${p1.left + CELL_W * 0.5} ${p1.top + CELL_H * 0.5} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.left + CELL_W * 0.5} ${p2.top + CELL_H * 0.5}`
                      const pathId = `path-${b.id}`
                      return (
                        <g key={b.id}>
                          <path id={pathId} d={d} className="curve-path" />
                          <circle className="curve-dot">
                            <animateMotion dur="1s" repeatCount="1" fill="freeze">
                              <mpath href={`#${pathId}`} />
                            </animateMotion>
                          </circle>
                        </g>
                      )
                    })}
                  </svg>
                )}

                <div className={`grid grid-cols-8 gap-4 p-4 ${isEditing ? 'border-4 border-dashed border-teal-300' : ''}`}>
                  {Array.from({ length: GRID_SIZE }).map((_, i) => {
                    const bed = visibleBeds.find(b => b.positionIndex === i)
                    if (i >= DOOR_RANGE_START && i < DOOR_RANGE_START + GRID_COLS) {
                      return <div key={`door-${i}`} className="w-14 h-10 rounded bg-blue-200 border flex items-center justify-center text-[10px] text-black">Door</div>
                    }
                    const cellClasses = `w-14 h-10 rounded text-xs flex items-center justify-start px-2 text-white transition-all relative ${isEditing ? 'edit-cell' : ''}`
                    if (bed) {
                      return (
                        <div key={bed.id} className={`${cellClasses} ${getBedColor(bed.status)} ${isEditing ? 'border-4 border-green-600' : ''}`} onClick={() => handleGridClick(i)}>
                          <span className="truncate">{bed.bedNumber}</span>
                        </div>
                      )
                    } else {
                      return (
                        <div key={`empty-${i}`} className={`${cellClasses} bg-white border ${isEditing ? 'border-gray-400 hover:bg-gray-100' : ''}`} onClick={() => handleGridClick(i)}>
                          {isEditing && <span className="text-gray-500 text-2xl font-extrabold">+</span>}
                        </div>
                      )
                    }
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
