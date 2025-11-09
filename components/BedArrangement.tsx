'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "./ui/card";
import { Button } from "./ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { RefreshCwIcon, ZapIcon, FilterIcon } from "lucide-react";
import { toast } from "sonner";

type BedStatus = "available" | "occupied" | "maintenance" | "reserved";
type UIBed = {
  id: string;
  bedNumber: string;
  ward: string;
  status: BedStatus;
  position: number;
  priority: string;
  hospitalId: string;
};
type Hospital = {
  id: string;
  name: string;
  location: string;
  totalBeds: number;
  availableBeds: number;
  specialties: string[];
  status: string;
  phone: string;
};

const MOCK_HOSPITALS: Hospital[] = [
  { id: "1", name: "General Hospital", location: "City Center", totalBeds: 40, availableBeds: 18, specialties: ["ICU", "ER"], status: "active", phone: "555-1111" },
  { id: "2", name: "Community Medical", location: "North Side", totalBeds: 22, availableBeds: 6, specialties: ["Surgery"], status: "active", phone: "555-2222" },
  { id: "3", name: "Sunrise Clinic", location: "West Wing", totalBeds: 16, availableBeds: 4, specialties: ["Maternity"], status: "active", phone: "555-3333" }
];

const GRID_COLS = 8;
const GRID_ROWS = 8;
const GRID_SIZE = GRID_COLS * GRID_ROWS;
const DOOR_ROW = GRID_ROWS - 1;
const DOOR_RANGE_START = DOOR_ROW * GRID_COLS;

const MOCK_BEDS: UIBed[] = Array.from({ length: 48 }).map((_, i) => ({
  id: String(i + 1),
  bedNumber: `B-${i + 1}`,
  ward: i < 16 ? "ICU" : i < 32 ? "General" : "Maternity",
  status: i % 6 === 0 ? "occupied" : i % 9 === 0 ? "maintenance" : "available",
  position: i,
  priority: "low",
  hospitalId: i < 16 ? "1" : i < 32 ? "2" : "3",
}));

const getBedColor = (status: BedStatus) =>
  status === "available" ? "bg-green-500" :
  status === "occupied" ? "bg-red-500" :
  status === "maintenance" ? "bg-yellow-500" :
  "bg-blue-500";

export default function BedArrangement() {
  const [hospitals] = useState<Hospital[]>(MOCK_HOSPITALS);
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>("1");
  const [beds, setBeds] = useState<UIBed[]>(MOCK_BEDS);
  const bedsRef = useRef<UIBed[]>([]);
  useEffect(() => { bedsRef.current = beds; }, [beds]);
  const [selectedWard, setSelectedWard] = useState<string>("all");
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const [paths, setPaths] = useState<{ id: string; from: number; to: number }[]>([]);
  const pheromones = useRef<number[]>(Array(GRID_SIZE).fill(1));
  const alpha = 1;
  const beta = 2;
  const evaporation = 0.85;

  const wards = useMemo(() => ["all", ...Array.from(new Set(beds.map(b => b.ward)))], [beds]);

  const visibleBeds = useMemo(() => {
    const byHospital = beds.filter(b => selectedHospitalId ? b.hospitalId === selectedHospitalId : true);
    return selectedWard === "all" ? byHospital : byHospital.filter(b => b.ward === selectedWard);
  }, [beds, selectedWard, selectedHospitalId]);

  const statusCounts = useMemo(() => {
    const base = { available: 0, occupied: 0, maintenance: 0, reserved: 0 } as Record<BedStatus, number>;
    for (const b of visibleBeds) base[b.status]++;
    return base;
  }, [visibleBeds]);

  const hospitalsInWard = useMemo(() => {
    const ids = Array.from(new Set(visibleBeds.map(b => b.hospitalId)));
    return hospitals.filter(h => ids.includes(h.id));
  }, [visibleBeds, hospitals]);

  const availableAtBottom = useMemo(() => visibleBeds.filter(b => b.status === "available"), [visibleBeds]);

  const computeProbabilities = (bed: UIBed) => {
    const probs: number[] = [];
    for (let i = 0; i < GRID_SIZE; i++) {
      if (i >= DOOR_RANGE_START && i < DOOR_RANGE_START + GRID_COLS) {
        probs.push(0.001);
        continue;
      }
      const pher = Math.pow(pheromones.current[i], alpha);
      const row = Math.floor(i / GRID_COLS);
      const col = i % GRID_COLS;
      const brow = Math.floor(bed.position / GRID_COLS);
      const bcol = bed.position % GRID_COLS;
      const dist = Math.hypot(col - bcol, row - brow);
      const heuristic = Math.pow(1 / (1 + dist), beta);
      probs.push(pher * heuristic);
    }
    return probs;
  };

  const normalize = (arr: number[]) => {
    const s = arr.reduce((a, b) => a + b, 0);
    return s === 0 ? arr.map(() => 1 / arr.length) : arr.map(v => v / s);
  };

  const selectIndexByProb = (probs: number[]) => {
    const r = Math.random();
    let c = 0;
    for (let i = 0; i < probs.length; i++) {
      c += probs[i];
      if (r <= c) return i;
    }
    return probs.length - 1;
  };

  const optimizeArrangement = useCallback(() => {
    setIsOptimizing(true);
    pheromones.current = pheromones.current.map(p => Math.max(p * evaporation, 0.01));
    const targetBeds = bedsRef.current.map(b => ({ ...b }));
    const candidateMoves = targetBeds.map(b => {
      const probs = computeProbabilities(b);
      const norm = normalize(probs);
      const chosen = selectIndexByProb(norm);
      return { id: b.id, from: b.position, to: chosen };
    });
    for (const move of candidateMoves) pheromones.current[move.to] += 1;
    const occupancyBias = (pos: number) => targetBeds.some(tb => tb.position === pos) ? 0.6 : 1;
    const newBeds = targetBeds.map(tb => {
      const move = candidateMoves.find(m => m.id === tb.id)!;
      const willOccupy = Math.random() < occupancyBias(move.to);
      return { ...tb, position: move.to, status: willOccupy ? "occupied" : "available" };
    });
    const filteredBeds = newBeds.map(nb => {
      if (nb.position >= DOOR_RANGE_START && nb.position < DOOR_RANGE_START + GRID_COLS) {
        const freePos = (() => {
          for (let i = 0; i < GRID_SIZE; i++) {
            if (i >= DOOR_RANGE_START && i < DOOR_RANGE_START + GRID_COLS) continue;
            if (!newBeds.some(b => b.position === i)) return i;
          }
          return nb.position;
        })();
        return { ...nb, position: freePos };
      }
      return nb;
    });
    setBeds(filteredBeds);
    setPaths(candidateMoves.map(m => ({ id: m.id, from: m.from, to: m.to })));
    setTimeout(() => setPaths([]), 2000);
    setIsOptimizing(false);
    toast.success("Best allocation simulated");
  }, []);

  useEffect(() => { bedsRef.current = beds; }, [beds]);

  return (
    <div className="space-y-6 relative">
      <style>{`
        .path-line { stroke: black; stroke-width: 1.6px; fill: none; opacity: 0.9; stroke-dasharray: 120; stroke-dashoffset: 120; animation: drawpath 1.2s ease-out forwards, fadepath 1.6s ease-out forwards; }
        @keyframes drawpath { to { stroke-dashoffset: 0; } }
        @keyframes fadepath { to { opacity: 0; } }
      `}</style>

      <div className="flex items-start justify-between gap-6">
        {/* Left Column */}
        <div className="mx-auto w-64 ml-2 space-y-4">
          <h2 className="text-xl font-bold">Bed Overview</h2>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded ${getBedColor("available")}`} />
              <div className="text-sm">Available</div>
            </div>
            <div className="text-sm font-medium">{statusCounts.available}</div>

            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded ${getBedColor("occupied")}`} />
              <div className="text-sm">Occupied</div>
            </div>
            <div className="text-sm font-medium">{statusCounts.occupied}</div>

            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded ${getBedColor("maintenance")}`} />
              <div className="text-sm">Maintenance</div>
            </div>
            <div className="text-sm font-medium">{statusCounts.maintenance}</div>

            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded ${getBedColor("reserved")}`} />
              <div className="text-sm">Reserved</div>
            </div>
            <div className="text-sm font-medium">{statusCounts.reserved}</div>
          </div>



          {/* Available Beds Below Simulated Beds */}
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
        </div>

        {/* Right Column */}
        <div className="flex-1">
          <div className="flex items-center justify-end gap-2 mb-4">
            <div className="w-56">
              <Select value={selectedHospitalId} onValueChange={setSelectedHospitalId}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select hospital" /></SelectTrigger>
                <SelectContent>{hospitals.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="w-40">
              <Select value={selectedWard} onValueChange={setSelectedWard}>
                <SelectTrigger className="w-full"><FilterIcon className="h-4 w-4 mr-2"/><SelectValue /></SelectTrigger>
                <SelectContent>{wards.map(w => <SelectItem key={w} value={w}>{w === "all" ? "All Wards" : w}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button onClick={optimizeArrangement} disabled={isOptimizing || beds.length === 0}>
              {isOptimizing ? <RefreshCwIcon className="h-4 w-4 mr-2 animate-spin" /> : <ZapIcon className="h-4 w-4 mr-2" />}Run Allocation
            </Button>
          </div>

          <Card>
            <CardHeader><CardTitle>Ward Grid</CardTitle></CardHeader>
            <CardContent>
              <div className="relative">
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  {paths.map(p => {
                    const fx = (p.from % GRID_COLS) * 64 + 32;
                    const fy = Math.floor(p.from / GRID_COLS) * 64 + 32;
                    const tx = (p.to % GRID_COLS) * 64 + 32;
                    const ty = Math.floor(p.to / GRID_COLS) * 64 + 32;
                    const cx = (fx + tx) / 2;
                    const cy = Math.min(fy, ty) - 40;
                    return <path key={p.id} d={`M ${fx} ${fy} Q ${cx} ${cy} ${tx} ${ty}`} className="path-line" />;
                  })}
                </svg>
                <div className="grid grid-cols-8 gap-4 p-4">
                  {Array.from({ length: GRID_SIZE }).map((_, i) => {
                    const bed = visibleBeds.find(b => b.position === i);
                    if (i >= DOOR_RANGE_START && i < DOOR_RANGE_START + GRID_COLS)
                      return <div key={`door-${i}`} className="w-14 h-10 rounded bg-blue-200 border flex items-center justify-center text-[10px] text-black">Door</div>;
                    if (!bed) return <div key={`empty-${i}`} className="w-14 h-10 bg-white border rounded" />;
                    return <div key={bed.id} className={`w-14 h-10 rounded text-xs flex items-center justify-start px-2 text-white ${getBedColor(bed.status)} transition-all`}><span className="truncate">{bed.bedNumber}</span></div>;
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
