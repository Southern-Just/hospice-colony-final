'use client'

import React, { useEffect, useMemo, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { RefreshCwIcon, ZapIcon, FilterIcon, EditIcon, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/components/contexts/AuthContext"
import { runHeavyACO, UIBed, BedStatus } from "@/lib/aco/acoSimulator"
import { saveBedCache, loadBedCache } from "@/lib/aco/cache"
import { loadAcoHistory, saveAcoHistory } from "@/lib/aco/history"   // ← NEW

type PositionObj = { x: number; y: number }
type ApiBed = { id: string; hospitalId: string; wardId: string | null; bedNumber: string; status: string; priority: string; position: PositionObj | null }
type Hospital = { id: string; name: string; location: string; totalBeds: number; availableBeds: number; specialties: string[]; status: string; phone: string }
type Ward = { id: string; name: string }

const GRID_COLS = 8
const GRID_ROWS = 8
const GRID_SIZE = GRID_COLS * GRID_ROWS
const DOOR_ROW = GRID_ROWS - 1
const DOOR_RANGE_START = DOOR_ROW * GRID_COLS

// NEW SMALLER CELL HEIGHT
const CELL_W = 64
const CELL_H = 32

const getBedColor = (status: BedStatus) =>
  status === "available" ? "bg-green-500" :
  status === "occupied" ? "bg-red-500" :
  status === "maintenance" ? "bg-yellow-500" :
  "bg-blue-500"

type ActiveCell =
  | { mode: 'add'; position: number; tempNumber: string }
  | { mode: 'edit'; position: number; bedId: string; tempNumber: string }
  | null

export default function BedArrangement(): JSX.Element {
  const { user } = useAuth()
  const userHospitalId = user?.hospitalId ?? ""
  const userRole = user?.role ?? ""

  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>("")
  const [beds, setBeds] = useState<UIBed[]>([])
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [bedsInEdit, setBedsInEdit] = useState<UIBed[]>([])
  const [deletedBedIds, setDeletedBedIds] = useState<string[]>([])
  const [selectedWard, setSelectedWard] = useState("all")
  const [wardsMap, setWardsMap] = useState<Record<string, string>>({})
  const [initializing, setInitializing] = useState(true)
  const [activeCell, setActiveCell] = useState<ActiveCell>(null)

  // NEW — persistent run history 
  const [simulationCount, setSimulationCount] = useState(0)
  const [lastSimulationTime, setLastSimulationTime] = useState<string | null>(null)

  // Load hospitals
  useEffect(() => {
    if (!user) return
    async function fetchInitial() {
      try {
        const hres = await fetch('/api/hospitals')
        const json = await hres.json()
        const list: Hospital[] = json?.hospitals ?? []
        setHospitals(list)
        if (list.length) setSelectedHospitalId(userHospitalId || list[0].id)
      } catch {
        toast.error("Failed to load hospitals")
      }
    }
    fetchInitial()
  }, [user, userHospitalId])

  // Load persistent simulation history for selected hospital
  useEffect(() => {
    if (!selectedHospitalId) return
    const h = loadAcoHistory(selectedHospitalId)
    setSimulationCount(h.count)
    setLastSimulationTime(h.lastTimestamp)
  }, [selectedHospitalId])

  // Load beds + run initial ACO
  useEffect(() => {
    if (!selectedHospitalId) return
    async function loadData() {
      setInitializing(true)
      const cached = loadBedCache(selectedHospitalId)
      if (cached) {
        setBeds(cached)
        setInitializing(false)
        return
      }
      try {
        const bres = await fetch(`/api/hospitals/${selectedHospitalId}/beds`)
        const bjson = await bres.json()
        const apiBeds: ApiBed[] = bjson?.beds ?? []
        const mapped: UIBed[] = apiBeds.map(b => {
          const pos = b.position ?? { x: 0, y: 0 }
          const index = pos.y * GRID_COLS + pos.x
          return {
            id: b.id,
            bedNumber: b.bedNumber,
            ward: b.wardId ?? "ward",
            status: b.status as BedStatus,
            positionIndex: Math.max(0, Math.min(GRID_SIZE - 1, index)),
            priority: b.priority ?? "normal",
            hospitalId: b.hospitalId
          }
        })

        const wres = await fetch(`/api/hospitals/${selectedHospitalId}/wards`)
        const wjson = await wres.json()
        const apiWards: Ward[] = wjson?.wards ?? []
        const map: Record<string, string> = {}
        for (const w of apiWards) map[w.id] = w.name
        setWardsMap(map)
        const renamed = mapped.map(b => ({ ...b, ward: map[b.ward] ?? b.ward }))

        const optimized = runHeavyACO({ hospitalId: selectedHospitalId, beds: renamed })
        setBeds(optimized.optimizedBeds)
        saveBedCache(selectedHospitalId, optimized.optimizedBeds)

        if ((optimized as any).meta) {
          const meta = (optimized as any).meta
          const newCount = simulationCount + 1
          const newTime = new Date(meta.timestamp).toLocaleString()

          setSimulationCount(newCount)
          setLastSimulationTime(newTime)

          saveAcoHistory(selectedHospitalId, {
            count: newCount,
            lastTimestamp: newTime
          })
        }

      } catch {
        toast.error("Failed to load beds")
      } finally {
        setInitializing(false)
      }
    }
    loadData()
  }, [selectedHospitalId])

  const visibleBeds = useMemo(() => {
    const base = isEditing ? bedsInEdit : beds
    const byHospital = base.filter(b => b.hospitalId === selectedHospitalId)
    return selectedWard === "all" ? byHospital : byHospital.filter(b => b.ward === selectedWard)
  }, [beds, bedsInEdit, isEditing, selectedWard, selectedHospitalId])

  const wards = useMemo(() => ["all", ...Array.from(new Set(beds.map(b => b.ward)))], [beds])

  const statusCounts = useMemo(() => {
    const base = { available: 0, occupied: 0, maintenance: 0, reserved: 0 }
    beds.forEach(b => {
      if (b.hospitalId !== selectedHospitalId) return
      if (selectedWard !== "all" && b.ward !== selectedWard) return
      base[b.status]++
    })
    return base
  }, [beds, selectedHospitalId, selectedWard])

  const generateBedNumber = useCallback((extra: UIBed[] = []) => {
    const all = [...beds, ...extra]
    const nums = all.map(b => parseInt(String(b.bedNumber).replace(/\D/g, ""), 10)).filter(n => !Number.isNaN(n))
    const max = nums.length ? Math.max(...nums) : 0
    return String(max + 1)
  }, [beds])

  const optimizeAfterSave = useCallback((newBeds: UIBed[]) => {
    setIsOptimizing(true)
    try {
      const res = runHeavyACO({ hospitalId: selectedHospitalId, beds: newBeds })
      setBeds(res.optimizedBeds)
      saveBedCache(selectedHospitalId, res.optimizedBeds)

      if ((res as any).meta) {
        const meta = (res as any).meta
        const newCount = simulationCount + 1
        const newTime = new Date(meta.timestamp).toLocaleString()

        setSimulationCount(newCount)
        setLastSimulationTime(newTime)

        saveAcoHistory(selectedHospitalId, {
          count: newCount,
          lastTimestamp: newTime
        })
      }

      toast.success("ACO optimization complete")
    } catch {
      toast.error("ACO optimization failed")
    } finally {
      setIsOptimizing(false)
    }
  }, [selectedHospitalId, simulationCount])

  const optimizeArrangement = useCallback(() => {
    if (isOptimizing) return
    setIsOptimizing(true)
    try {
      const res = runHeavyACO({ hospitalId: selectedHospitalId, beds })
      setBeds(res.optimizedBeds)
      saveBedCache(selectedHospitalId, res.optimizedBeds)

      if ((res as any).meta) {
        const meta = (res as any).meta
        const newCount = simulationCount + 1
        const newTime = new Date(meta.timestamp).toLocaleString()

        setSimulationCount(newCount)
        setLastSimulationTime(newTime)

        saveAcoHistory(selectedHospitalId, {
          count: newCount,
          lastTimestamp: newTime
        })
      }

      toast.success("ACO optimization complete")
    } catch {
      toast.error("ACO optimization failed")
    } finally {
      setIsOptimizing(false)
    }
  }, [beds, selectedHospitalId, isOptimizing, simulationCount])

  const enterEditMode = () => {
    if (!user) { toast.error("User not loaded"); return }
    if (userRole !== "admin") { toast.error("Permission Denied"); return }
    if (userHospitalId !== selectedHospitalId) { toast.error("Hospital Affiliation Required"); return }
    const bedsForHospital = beds.filter(b => b.hospitalId === selectedHospitalId)
    setBedsInEdit(bedsForHospital)
    setActiveCell(null)
    setDeletedBedIds([])
    setIsEditing(true)
  }

  const handleCellClick = (position: number) => {
    if (!isEditing) return
    if (position >= DOOR_RANGE_START && position < DOOR_RANGE_START + GRID_COLS) return
    const bed = bedsInEdit.find(b => b.positionIndex === position)
    if (bed) {
      setActiveCell({ mode: "edit", position, bedId: bed.id, tempNumber: bed.bedNumber })
    } else {
      setActiveCell({ mode: "add", position, tempNumber: "" })
    }
  }

  const commitAdd = (status: BedStatus) => {
    if (!activeCell || activeCell.mode !== "add") return
    const number = activeCell.tempNumber.trim() || generateBedNumber(bedsInEdit)
    const newId = `tmp-${Date.now()}`
    const ward = selectedWard === "all" ? (Object.values(wardsMap)[0] ?? "ward") : selectedWard
    const nb: UIBed = {
      id: newId,
      bedNumber: number,
      ward,
      status,
      positionIndex: activeCell.position,
      priority: "normal",
      hospitalId: selectedHospitalId
    }
    setBedsInEdit(prev => [...prev.filter(b => b.positionIndex !== activeCell.position), nb])
    setActiveCell(null)
  }

  const commitEdit = (status: BedStatus | null = null) => {
    if (!activeCell || activeCell.mode !== "edit") return
    setBedsInEdit(prev =>
      prev.map(b =>
        b.id === activeCell.bedId
          ? { ...b, bedNumber: activeCell.tempNumber.trim() || b.bedNumber, status: status ?? b.status }
          : b
      )
    )
    if (status) setActiveCell(null)
  }

  const deleteBedNow = (id: string) => {
    setBedsInEdit(prev => prev.filter(b => b.id !== id))
    setDeletedBedIds(prev => [...prev, id])
    setActiveCell(null)
  }

  const saveLayoutChanges = async () => {
    const newLocal = bedsInEdit.filter(b => !deletedBedIds.includes(b.id))
    setBeds(newLocal)
    setIsEditing(false)
    setActiveCell(null)
    saveBedCache(selectedHospitalId, newLocal)
    try {
      await Promise.all(
        newLocal.map(async b => {
          const posObj = { x: b.positionIndex % GRID_COLS, y: Math.floor(b.positionIndex / GRID_COLS) }
          await fetch(`/api/hospitals/${selectedHospitalId}/beds`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: b.id,
              wardId: Object.keys(wardsMap).find(k => wardsMap[k] === b.ward) ?? b.ward,
              status: b.status,
              priority: b.priority,
              bedNumber: b.bedNumber,
              position: posObj
            })
          })
        })
      )
      await Promise.all(
        deletedBedIds.map(async id =>
          fetch(`/api/hospitals/${selectedHospitalId}/beds`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id })
          })
        )
      )
      optimizeAfterSave(newLocal)
    } catch {
      toast.error("Failed to save layout")
    }
  }

  return (
    <div className="space-y-6 relative">
      <style>{`
        .grid-cell { width: ${CELL_W}px; height: ${CELL_H}px; }
        .bed-popup { position:absolute; top:-6px; left:50%; transform:translate(-50%, -100%); background:white; border:1px solid #e5e7eb; border-radius:6px; padding:3px 5px; display:flex; gap:4px; box-shadow:0 4px 14px rgba(0,0,0,0.08); z-index:40; }
        .bed-popup button { font-size:10px; padding:2px 5px; border-radius:999px; }
        .bed-input { width:100%; font-size:11px; padding:2px 3px; border-radius:4px; border:1px solid #d1d5db; background:white; color:#111; }

        .animate-shimmer { animation: shimmer 1.1s ease-in-out infinite; }
        @keyframes shimmer {
          0%,100% { opacity:1; transform:scale(1); }
          50% { opacity:0.6; transform:scale(1.05); }
        }
      `}</style>

      <div className="flex items-start justify-between gap-6">

        {/* LEFT PANEL */}
        <div className="mx-auto w-64 ml-2 space-y-4">
          <h2 className="text-xl font-bold">{isEditing ? "Beds to Place" : "Bed Overview"}</h2>

          {/* NEW — Simulation History */}
          {!isEditing && (
            <div className="mt-3 space-y-1 text-sm">
              <div className="font-semibold">Ran Simulations</div>
              <div>Total Runs: {simulationCount}</div>
              <div>Last Run: {lastSimulationTime ?? "—"}</div>
            </div>
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
        </div>

        {/* RIGHT PANEL */}
        <div className="flex-1">

          {/* TOP CONTROLS */}
          <div className="flex items-center justify-end gap-2 mb-2">
            <div className="w-26 ">
              <Select value={selectedHospitalId} onValueChange={id => { setSelectedHospitalId(id); setIsEditing(false); setActiveCell(null) }} disabled={isEditing}>
                <SelectTrigger><SelectValue placeholder="Select hospital" /></SelectTrigger>
                <SelectContent>{hospitals.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="w-46">
              <Select value={selectedWard} onValueChange={setSelectedWard} disabled={isEditing}>
                <SelectTrigger><FilterIcon className="h-4 w-4 mr-2"/><SelectValue /></SelectTrigger>
                <SelectContent>{wards.map(w => <SelectItem key={w} value={w}>{w === "all" ? "All Wards" : w}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {!isEditing && (
                <Button onClick={optimizeArrangement} disabled={isOptimizing}>
                  <ZapIcon
                    className={`h-4 w-4 mr-2 transition-all ${
                      isOptimizing ? "animate-shimmer text-yellow-500" : ""
                    }`}
                  />
                  {isOptimizing ? "Optimizing..." : "Run Allocation"}
                </Button>

            )}

            {isEditing ? (
              <div className="flex gap-2">
                <Button onClick={saveLayoutChanges} className="bg-green-600 hover:bg-green-700">Save</Button>
                <Button variant="outline" onClick={() => { setIsEditing(false); setActiveCell(null) }}>Cancel</Button>
              </div>
            ) : (
              <Button variant="outline" onClick={enterEditMode}><EditIcon className="h-4 w-4 mr-2" />Edit</Button>
            )}
          </div>

          {/* GRID */}
          <Card>
            <CardHeader><CardTitle>{isEditing ? "Edit Layout" : "Ward Grid"}</CardTitle></CardHeader>
            <CardContent>
              <div className="relative w-full h-full">
                {/* When loading: only grid changes, page stays static */}
                {initializing ? (
                  <div className="grid grid-cols-8 gap-x-4 gap-y-2 px-4 py-2">
                    {Array.from({ length: GRID_SIZE }).map((_, i) => (
                      <div
                        key={i}
                        className="grid-cell rounded bg-gray-200 animate-pulse border"
                      />
                    ))}
                  </div>
                ) : (
                  <div className={`grid grid-cols-8 gap-x-4 gap-y-2 px-4 py-2 ${isEditing ? 'border-4 border-dashed border-teal-300' : ''}`}>

                    {Array.from({ length: GRID_SIZE }).map((_, i) => {
                      const bed = visibleBeds.find(b => b.positionIndex === i)
                      const isDoor = i >= DOOR_RANGE_START && i < DOOR_RANGE_START + GRID_COLS

                      if (isDoor) {
                        return (
                          <div key={`door-${i}`} className="grid-cell rounded bg-blue-200 border flex items-center justify-center text-[10px] text-black">
                            Door
                          </div>
                        )
                      }

                      const isActive = activeCell && activeCell.position === i

                      if (bed) {
                        const editing = activeCell?.mode === "edit" && activeCell.bedId === bed.id

                        return (
                          <div
                            key={bed.id}
                            className={`grid-cell rounded px-2 flex items-center justify-start text-xs font-medium ${getBedColor(bed.status)} ${isEditing ? "cursor-pointer border-2 border-green-600" : ""}`}
                            style={{ position: "relative" }}
                            onClick={() => handleCellClick(i)}
                          >
                            {editing ? (
                              <input
                                className="bed-input"
                                value={activeCell.tempNumber}
                                onChange={e => setActiveCell(prev => prev && prev.mode === "edit" ? { ...prev, tempNumber: e.target.value } : prev)}
                                onClick={e => e.stopPropagation()}
                              />
                            ) : (
                              <span className="truncate text-white">{bed.bedNumber}</span>
                            )}

                            {isEditing && isActive && activeCell.mode === "edit" && (
                              <div className="bed-popup" onClick={e => e.stopPropagation()}>
                                <button className="available" onClick={() => commitEdit("available")}>A</button>
                                <button className="occupied" onClick={() => commitEdit("occupied")}>O</button>
                                <button className="maintenance" onClick={() => commitEdit("maintenance")}>M</button>
                                <button onClick={() => deleteBedNow(bed.id)}>
                                  <Trash2 className="h-3 w-3 text-red-600" />
                                </button>
                              </div>
                            )}
                          </div>
                        )
                      }

                      return (
                        <div
                          key={`empty-${i}`}
                          className={`grid-cell rounded px-2 flex items-center justify-center text-xs bg-white border ${isEditing ? "cursor-pointer hover:bg-gray-100" : ""}`}
                          style={{ position: "relative" }}
                          onClick={() => handleCellClick(i)}
                        >
                          {isEditing && isActive && activeCell.mode === "add" ? (
                            <>
                              <input
                                className="bed-input"
                                placeholder="Bed #"
                                value={activeCell.tempNumber}
                                onChange={e => setActiveCell(prev => prev && prev.mode === "add" ? { ...prev, tempNumber: e.target.value } : prev)}
                                onClick={e => e.stopPropagation()}
                              />
                              <div className="bed-popup" onClick={e => e.stopPropagation()}>
                                <button className="available" onClick={() => commitAdd("available")}>A</button>
                                <button className="occupied" onClick={() => commitAdd("occupied")}>O</button>
                                <button className="maintenance" onClick={() => commitAdd("maintenance")}>M</button>
                              </div>
                            </>
                          ) : (
                            isEditing && <span className="text-gray-400 text-xl font-extrabold">+</span>
                          )}
                        </div>
                      )
                    })}

                  </div>
                )}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  )
}
