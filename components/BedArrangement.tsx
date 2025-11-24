'use client'

import React, { useEffect, useMemo, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { ZapIcon, FilterIcon, EditIcon, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/components/contexts/AuthContext"
import { runHeavyACO, UIBed, BedStatus } from "@/lib/aco/acoSimulator"
import { saveBedCache, loadBedCache } from "@/lib/aco/cache"
import { loadAcoHistory, saveAcoHistory } from "@/lib/aco/history"

type PositionObj = { x: number; y: number }
type ApiBed = { id: string; hospitalId: string; wardId: string | null; bedNumber: string; status: string; priority: string; position: PositionObj | null }
type Hospital = { id: string; name: string }
type Ward = { id: string; name: string }

const GRID_COLS = 8
const GRID_ROWS = 8
const GRID_SIZE = GRID_COLS * GRID_ROWS
const DOOR_ROW = GRID_ROWS - 1
const DOOR_RANGE_START = DOOR_ROW * GRID_COLS

const CELL_W = 64
const CELL_H = 32

const getBedColor = (s: BedStatus) =>
  s === "available" ? "bg-green-500" :
  s === "occupied" ? "bg-red-500" :
  s === "maintenance" ? "bg-yellow-500" :
  "bg-blue-500"

type ActiveCell =
  | { mode: "add"; position: number; tempNumber: string }
  | { mode: "edit"; position: number; bedId: string; tempNumber: string }
  | null

export default function BedArrangement() {
  const { user } = useAuth()

  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [selectedHospitalId, setSelectedHospitalId] = useState("")

  const [beds, setBeds] = useState<UIBed[]>([])
  const [bedsInEdit, setBedsInEdit] = useState<UIBed[]>([])
  const [deletedBedIds, setDeletedBedIds] = useState<string[]>([])

  const [isEditing, setIsEditing] = useState(false)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [initializing, setInitializing] = useState(true)

  const [wardsMap, setWardsMap] = useState<Record<string, string>>({})
  const [selectedWard, setSelectedWard] = useState("all")
  const [activeCell, setActiveCell] = useState<ActiveCell>(null)

  const [simulationCount, setSimulationCount] = useState(0)
  const [lastSimulationTime, setLastSimulationTime] = useState<string | null>(null)

  const userHospitalId = user?.hospitalId ?? ""
  const userRole = user?.role ?? ""

  useEffect(() => {
    if (!user) return
    async function load() {
      const res = await fetch("/api/hospitals")
      const j = await res.json()
      setHospitals(j.hospitals ?? [])
      const h = j.hospitals ?? []
      if (h.length) setSelectedHospitalId(userHospitalId || h[0].id)
    }
    load()
  }, [user])

  useEffect(() => {
    if (!selectedHospitalId) return
    const h = loadAcoHistory(selectedHospitalId)
    setSimulationCount(h.count)
    setLastSimulationTime(h.lastTimestamp)
  }, [selectedHospitalId])

  useEffect(() => {
    if (!selectedHospitalId) return

    async function load() {
      setInitializing(true)

      const cached = loadBedCache(selectedHospitalId)
      if (cached) {
        setBeds(cached)
        setInitializing(false)
        return
      }

      const bedRes = await fetch(`/api/hospitals/${selectedHospitalId}/beds`)
      const bedJson = await bedRes.json()
      const apiBeds: ApiBed[] = bedJson.beds ?? []

      const wardRes = await fetch(`/api/hospitals/${selectedHospitalId}/wards`)
      const wardJson = await wardRes.json()
      let map: Record<string, string> = {}

      for (const w of wardJson.wards ?? []) map[w.id] = w.name

      if (Object.keys(map).length === 0) {
        const createRes = await fetch(`/api/hospitals/${selectedHospitalId}/wards`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "unassigned" })
        })
        const createJson = await createRes.json()
        const newId = createJson?.ward?.id
        if (newId) map = { [newId]: "unassigned" }
      }

      setWardsMap(map)

      const mapped: UIBed[] = apiBeds.map(b => {
        const pos = b.position ?? { x: 0, y: 0 }
        const idx = pos.y * GRID_COLS + pos.x
        return {
          id: b.id,
          bedNumber: b.bedNumber,
          ward: map[b.wardId ?? ""] ?? Object.values(map)[0],
          status: b.status as BedStatus,
          priority: b.priority,
          hospitalId: b.hospitalId,
          positionIndex: idx
        }
      })

      const optimized = runHeavyACO({ hospitalId: selectedHospitalId, beds: mapped })
      setBeds(optimized.optimizedBeds)
      saveBedCache(selectedHospitalId, optimized.optimizedBeds)

      if ((optimized as any).meta) {
        const meta = (optimized as any).meta
        const time = new Date(meta.timestamp).toLocaleString()
        saveAcoHistory(selectedHospitalId, { count: simulationCount + 1, lastTimestamp: time })
        setSimulationCount(v => v + 1)
        setLastSimulationTime(time)
      }

      setInitializing(false)
    }

    load()
  }, [selectedHospitalId])

  const visibleBeds = useMemo(() => {
    const src = isEditing ? bedsInEdit : beds
    const byHospital = src.filter(b => b.hospitalId === selectedHospitalId)
    if (selectedWard === "all") return byHospital
    return byHospital.filter(b => b.ward === selectedWard)
  }, [beds, bedsInEdit, isEditing, selectedWard, selectedHospitalId])

  const wards = useMemo(() => ["all", ...Array.from(new Set(beds.map(b => b.ward)))], [beds])

  const statusCounts = useMemo(() => {
    const v = { available: 0, occupied: 0, maintenance: 0, reserved: 0 }
    beds.forEach(b => {
      if (b.hospitalId !== selectedHospitalId) return
      if (selectedWard !== "all" && b.ward !== selectedWard) return
      v[b.status]++
    })
    return v
  }, [beds, selectedHospitalId, selectedWard])

  const generateBedNumber = useCallback((extra: UIBed[] = []) => {
    const nums = [...beds, ...extra].map(b => parseInt(b.bedNumber.replace(/\D/g, ""), 10)).filter(n => !isNaN(n))
    return String((nums.length ? Math.max(...nums) : 0) + 1)
  }, [beds])

  const optimizeArrangement = useCallback(() => {
    if (isOptimizing) return
    setIsOptimizing(true)
    setTimeout(() => {
      try {
        const res = runHeavyACO({ hospitalId: selectedHospitalId, beds })
        setBeds(res.optimizedBeds)
        saveBedCache(selectedHospitalId, res.optimizedBeds)
        if ((res as any).meta) {
          const meta = (res as any).meta
          const time = new Date(meta.timestamp).toLocaleString()
          saveAcoHistory(selectedHospitalId, { count: simulationCount + 1, lastTimestamp: time })
          setSimulationCount(v => v + 1)
          setLastSimulationTime(time)
        }
      } finally {
        setIsOptimizing(false)
      }
    }, 80)
  }, [beds, selectedHospitalId, isOptimizing, simulationCount])

  const enterEditMode = () => {
    if (!user) return toast.error("User not loaded")
    if (userRole !== "admin") return toast.error("Permission Denied")
    if (selectedHospitalId !== userHospitalId) return toast.error("Wrong hospital")
    setBedsInEdit(beds.filter(b => b.hospitalId === selectedHospitalId))
    setDeletedBedIds([])
    setActiveCell(null)
    setIsEditing(true)
  }

  const handleCellClick = (i: number) => {
    if (!isEditing) return
    if (i >= DOOR_RANGE_START && i < DOOR_RANGE_START + GRID_COLS) return
    const bed = bedsInEdit.find(b => b.positionIndex === i)
    if (bed) setActiveCell({ mode: "edit", position: i, bedId: bed.id, tempNumber: bed.bedNumber })
    else setActiveCell({ mode: "add", position: i, tempNumber: "" })
  }

  const commitAdd = (status: BedStatus) => {
    if (!activeCell || activeCell.mode !== "add") return

    const number = activeCell.tempNumber || generateBedNumber(bedsInEdit)
    const ward = Object.values(wardsMap)[0] ?? "unassigned"

    const id = `tmp-${Date.now()}`
    const b: UIBed = {
      id,
      bedNumber: number,
      ward,
      status,
      priority: "normal",
      hospitalId: selectedHospitalId,
      positionIndex: activeCell.position
    }

    setBedsInEdit(v => [...v.filter(x => x.positionIndex !== activeCell.position), b])
    setActiveCell(null)
  }

  const commitEdit = (status: BedStatus | null = null) => {
    if (!activeCell || activeCell.mode !== "edit") return
    setBedsInEdit(v =>
      v.map(b =>
        b.id === activeCell.bedId
          ? { ...b, bedNumber: activeCell.tempNumber || b.bedNumber, status: status ?? b.status }
          : b
      )
    )
    if (status) setActiveCell(null)
  }

  const deleteBedNow = (id: string) => {
    setBedsInEdit(v => v.filter(b => b.id !== id))
    setDeletedBedIds(v => [...v, id])
    setActiveCell(null)
  }

  const saveLayoutChanges = async () => {
    const active = bedsInEdit.filter(b => !deletedBedIds.includes(b.id))
    setBeds(active)
    setIsEditing(false)
    setActiveCell(null)

    try {
      const wardIds = Object.keys(wardsMap)
      const createdMap: Record<string,string> = {}

      for (const b of active) {
        const pos = { x: b.positionIndex % GRID_COLS, y: Math.floor(b.positionIndex / GRID_COLS) }
        const wardId = wardIds.find(k => wardsMap[k] === b.ward) ?? wardIds[0]

        if (b.id.startsWith("tmp-")) {
          const res = await fetch(`/api/hospitals/${selectedHospitalId}/beds`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              hospitalId: selectedHospitalId,
              wardId,
              bedNumber: b.bedNumber,
              priority: b.priority,
              status: b.status,
              position: pos
            })
          })
          const j = await res.json()
          if (j?.bed?.id) createdMap[b.id] = j.bed.id
        } else {
          await fetch(`/api/hospitals/${selectedHospitalId}/beds`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: b.id,
              wardId,
              bedNumber: b.bedNumber,
              priority: b.priority,
              status: b.status,
              position: pos
            })
          })
        }
      }

      for (const id of deletedBedIds) {
        if (id.startsWith("tmp-")) continue
        await fetch(`/api/hospitals/${selectedHospitalId}/beds`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id })
        })
      }

      const fresh = await fetch(`/api/hospitals/${selectedHospitalId}/beds`).then(r => r.json())
      const apiBeds: ApiBed[] = fresh.beds ?? []

      const mapped: UIBed[] = apiBeds.map(b => {
        const pos = b.position ?? { x: 0, y: 0 }
        const index = pos.y * GRID_COLS + pos.x
        return {
          id: b.id,
          bedNumber: b.bedNumber,
          ward: wardsMap[b.wardId ?? ""] ?? Object.values(wardsMap)[0],
          status: b.status as BedStatus,
          priority: b.priority,
          hospitalId: b.hospitalId,
          positionIndex: index
        }
      })

      setBeds(mapped)
      saveBedCache(selectedHospitalId, mapped)
      optimizeArrangement()
    } catch {
      toast.error("Failed to save")
    }
  }

  return (
    <div className="space-y-6 relative">
      <style>{`
        .grid-cell { width:${CELL_W}px;height:${CELL_H}px; }
        .bed-popup{position:absolute;top:-6px;left:50%;transform:translate(-50%,-100%);background:white;border:1px solid #e5e7eb;border-radius:6px;padding:3px 5px;display:flex;gap:4px;z-index:40;}
        .bed-input{width:100%;font-size:11px;padding:2px 3px;border-radius:4px;border:1px solid #d1d5db;}
        .loader-overlay{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(7px);background:rgba(255,255,255,0.4);z-index:50;}
        .loader-card{background:rgba(255,255,255,0.92);padding:16px 20px;border-radius:14px;display:flex;align-items:center;gap:12px;box-shadow:0 10px 30px rgba(0,0,0,0.1);}
        .loader-t1{font-size:14px;font-weight:600;color:#0f172a;}
        .loader-t2{font-size:12px;color:#475569;}
      `}</style>

      <div className="flex items-start justify-between gap-6">

        <div className="w-64 space-y-4">
          <h2 className="text-xl font-bold">{isEditing ? "Beds to Place" : "Bed Overview"}</h2>

          {!isEditing && (
            <div className="text-sm space-y-1">
              <div className="font-semibold">Ran Simulations</div>
              <div>Total Runs: {simulationCount}</div>
              <div>Last Run: {lastSimulationTime ?? "—"}</div>
            </div>
          )}

          {!isEditing && (
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-green-500"/><span>Available</span></div><span>{statusCounts.available}</span>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-red-500"/><span>Occupied</span></div><span>{statusCounts.occupied}</span>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-yellow-500"/><span>Maintenance</span></div><span>{statusCounts.maintenance}</span>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-blue-500"/><span>Reserved</span></div><span>{statusCounts.reserved}</span>
            </div>
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-end gap-2 mb-2">

            <Select value={selectedHospitalId} onValueChange={v => { setSelectedHospitalId(v); setIsEditing(false); setActiveCell(null); }}>
              <SelectTrigger><SelectValue placeholder="Select hospital" /></SelectTrigger>
              <SelectContent>{hospitals.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}</SelectContent>
            </Select>

            <Select value={selectedWard} onValueChange={setSelectedWard} disabled={isEditing}>
              <SelectTrigger><FilterIcon className="w-4 h-4 mr-2"/><SelectValue /></SelectTrigger>
              <SelectContent>{wards.map(w => <SelectItem key={w} value={w}>{w === "all" ? "All Wards" : w}</SelectItem>)}</SelectContent>
            </Select>

            {!isEditing && (
              <Button disabled={isOptimizing} onClick={optimizeArrangement}>
                <ZapIcon className={`w-4 h-4 mr-2 ${isOptimizing ? "animate-pulse" : ""}`} />
                {isOptimizing ? "Optimizing..." : "Run Allocation"}
              </Button>
            )}

            {isEditing ? (
              <>
                <Button className="bg-green-600 hover:bg-green-700" onClick={saveLayoutChanges}>Save</Button>
                <Button variant="outline" onClick={() => { setIsEditing(false); setActiveCell(null); }}>Cancel</Button>
              </>
            ) : (
              <Button variant="outline" onClick={enterEditMode}><EditIcon className="w-4 h-4 mr-2"/>Edit</Button>
            )}
          </div>

          <Card>
            <CardHeader><CardTitle>{isEditing ? "Edit Layout" : "Ward Grid"}</CardTitle></CardHeader>
            <CardContent>

              <div className="relative w-full h-full">
                {initializing ? (
                  <div className="grid grid-cols-8 gap-x-4 gap-y-2">
                    {Array.from({ length: GRID_SIZE }).map((_,i) =>
                      <div key={i} className="grid-cell bg-gray-200 animate-pulse rounded border"/>
                    )}
                  </div>
                ) : (
                  <div className={`grid grid-cols-8 gap-x-4 gap-y-2 ${isEditing ? "border-4 border-dashed border-teal-300" : ""}`}>
                    {Array.from({ length: GRID_SIZE }).map((_,i) => {
                      const bed = visibleBeds.find(b => b.positionIndex === i)
                      const isDoor = i >= DOOR_RANGE_START && i < DOOR_RANGE_START + GRID_COLS
                      const isActive = activeCell && activeCell.position === i

                      if (isDoor) return (
                        <div key={i} className="grid-cell bg-blue-200 rounded border flex items-center justify-center text-[10px]">
                          Door
                        </div>
                      )

                      if (bed) {
                        const editing = activeCell?.mode === "edit" && activeCell.bedId === bed.id
                        return (
                          <div
                            key={bed.id}
                            className={`grid-cell rounded px-2 flex items-center text-xs font-medium ${getBedColor(bed.status)} ${isEditing ? "cursor-pointer border-2 border-green-600" : ""}`}
                            onClick={() => handleCellClick(i)}
                            style={{ position:"relative" }}
                          >
                            {editing ? (
                              <input
                                value={activeCell.tempNumber}
                                onChange={e => setActiveCell(p => p && p.mode==="edit" ? {...p, tempNumber:e.target.value} : p)}
                                className="bed-input"
                                onClick={e => e.stopPropagation()}
                              />
                            ) : (
                              <span className="truncate text-white">{bed.bedNumber}</span>
                            )}

                            {isEditing && isActive && activeCell.mode==="edit" && (
                              <div className="bed-popup" onClick={e => e.stopPropagation()}>
                                <button onClick={() => commitEdit("available")}>A</button>
                                <button onClick={() => commitEdit("occupied")}>O</button>
                                <button onClick={() => commitEdit("maintenance")}>M</button>
                                <button onClick={() => deleteBedNow(bed.id)}><Trash2 className="w-3 h-3 text-red-600"/></button>
                              </div>
                            )}
                          </div>
                        )
                      }

                      return (
                        <div
                          key={i}
                          className={`grid-cell rounded px-2 flex items-center justify-center bg-white text-xs border ${isEditing ? "cursor-pointer hover:bg-gray-100" : ""}`}
                          onClick={() => handleCellClick(i)}
                          style={{ position:"relative" }}
                        >
                          {isEditing && isActive && activeCell.mode==="add" ? (
                            <>
                              <input
                                className="bed-input"
                                placeholder="Bed #"
                                value={activeCell.tempNumber}
                                onChange={e => setActiveCell(p => p && p.mode==="add" ? {...p, tempNumber:e.target.value} : p)}
                                onClick={e => e.stopPropagation()}
                              />
                              <div className="bed-popup">
                                <button onClick={() => commitAdd("available")}>A</button>
                                <button onClick={() => commitAdd("occupied")}>O</button>
                                <button onClick={() => commitAdd("maintenance")}>M</button>
                              </div>
                            </>
                          ) : (
                            isEditing && <span className="text-gray-400 text-xl font-bold">+</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {isOptimizing && (
                  <div className="loader-overlay">
                    <div className="loader-card">
                      <svg className="animate-spin w-6 h-6" viewBox="0 0 24 24">
                        <circle className="opacity-30" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                      </svg>
                      <div>
                        <div className="loader-t1">Optimizing allocation…</div>
                        <div className="loader-t2">Running ant colony algorithm</div>
                      </div>
                    </div>
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
