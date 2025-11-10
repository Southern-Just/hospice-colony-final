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
import { RefreshCwIcon, ZapIcon, FilterIcon, EditIcon } from "lucide-react";
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

type UserContext = {
    id: string;
    hospitalId: string;
    role: "admin" | "staff" | "viewer";
}

const MOCK_USER: UserContext = {
    id: "user-1",
    hospitalId: "1",
    role: "admin"
}

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
  
// Helper to generate a unique temporary ID for new beds
let nextTempBedId = 50;

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

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [bedsInEdit, setBedsInEdit] = useState<UIBed[]>([]);
  const [bedStatusPrompt, setBedStatusPrompt] = useState<{ position: number, id: string } | null>(null);
  const user = MOCK_USER;

  const visibleBeds = useMemo(() => {
    const targetBeds = isEditing ? bedsInEdit : beds;
    const byHospital = targetBeds.filter(b => selectedHospitalId ? b.hospitalId === selectedHospitalId : true);
    return selectedWard === "all" ? byHospital : byHospital.filter(b => b.ward === selectedWard);
  }, [beds, selectedWard, selectedHospitalId, isEditing, bedsInEdit]);
  
  const wards = useMemo(() => ["all", ...Array.from(new Set(beds.map(b => b.ward)))], [beds]);

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

  const enterEditMode = () => {
    if (user.role !== "admin") {
        toast.error("Permission Denied", { description: "Only administrators can edit the ward layout." });
        return;
    }
    if (user.hospitalId !== selectedHospitalId) {
        toast.error("Hospital Affiliation Required", { description: "You can only edit the layout for your affiliated hospital." });
        return;
    }

    const bedsForHospital = beds.filter(b => b.hospitalId === selectedHospitalId);
    
    setBedsInEdit(bedsForHospital.map(b => ({ ...b, position: -1 })));
    setSelectedWard("all");
    setIsEditing(true);
    toast.info("Editing Layout", { description: "Click on the grid to place beds." });
  };

  const handleStatusSelection = (position: number, id: string, status: BedStatus) => {
    const newBed = bedsInEdit.find(b => b.id === id);
    if (!newBed) return;

    // A. Update the specific bed in the bedsInEdit array
    setBedsInEdit(prev => prev.map(b => b.id === id ? { ...b, position, status } : b));
    
    // B. Clear the status prompt
    setBedStatusPrompt(null);
    toast.success(`Bed ${newBed.bedNumber} placed as ${status}`);
  }

  const handleGridClick = (position: number) => {
    if (!isEditing) return;
    
    if (position >= DOOR_RANGE_START && position < DOOR_RANGE_START + GRID_COLS) {
        toast.warning("Invalid Position", { description: "Cannot place a bed in the door area." });
        return;
    }

    const existingBed = bedsInEdit.find(b => b.position === position);
    
    if (existingBed) {
        // Bed found -> remove it from the grid (position: -1)
        setBedsInEdit(prev => prev.map(b => b.id === existingBed.id ? { ...b, position: -1 } : b));
        setBedStatusPrompt(null);
        toast.info(`Bed ${existingBed.bedNumber} removed from position ${position}`);
    } else {
        // No bed found -> find the next unplaced bed
        const unplacedBed = bedsInEdit.find(b => b.position === -1);
        
        if (unplacedBed) {
            // Found an unplaced bed -> Open the status selection prompt
            setBedStatusPrompt({ position, id: unplacedBed.id });
        } else {
            toast.warning("All Beds Placed", { description: "You have placed all available beds for this hospital." });
        }
    }
  };

  const saveLayoutChanges = () => {
    const placedBeds = bedsInEdit.filter(b => b.position !== -1);
    
    const bedsFromOtherHospitals = beds.filter(b => b.hospitalId !== selectedHospitalId);

    setBeds([...bedsFromOtherHospitals, ...placedBeds]);

    setIsEditing(false);
    setBedStatusPrompt(null);
    
    toast.success("Layout Saved", { description: `Bed arrangement updated for ${hospitals.find(h => h.id === selectedHospitalId)?.name || 'Hospital'}.` });
  };

  const getCellCoordinates = (pos: number) => {
    const col = pos % GRID_COLS;
    const row = Math.floor(pos / GRID_COLS);
    // Grid cell size is 64x64 (w-14 h-10 plus padding/gap) - approximate for prompt placement
    return {
        left: col * 64,
        top: row * 64,
    }
  }

  return (
    <div className="space-y-6 relative">
      <style>{`
        .path-line { stroke: black; stroke-width: 1.6px; fill: none; opacity: 0.9; stroke-dasharray: 120; stroke-dashoffset: 120; animation: drawpath 1.2s ease-out forwards, fadepath 1.6s ease-out forwards; }
        @keyframes drawpath { to { stroke-dashoffset: 0; } }
        @keyframes fadepath { to { opacity: 0; } }
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
                        {bedsInEdit.filter(b => b.position === -1).map(b => (
                            <span key={b.id} className="px-2 py-1 bg-gray-200 rounded text-xs border border-gray-400 font-medium">{b.bedNumber}</span>
                        ))}
                        {bedsInEdit.filter(b => b.position === -1).length === 0 && <span className="text-sm text-green-600 font-medium">All beds placed!</span>}
                    </div>
                    <div className="mt-4 text-sm text-gray-500">
                        {bedsInEdit.filter(b => b.position !== -1).length} / {bedsInEdit.length} beds placed.
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
              <Select value={selectedHospitalId} onValueChange={setSelectedHospitalId} disabled={isEditing}>
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
                <Button onClick={saveLayoutChanges} className="bg-green-600 hover:bg-green-700">
                    Save Changes
                </Button>
            ) : (
                <Button variant="outline" onClick={enterEditMode}>
                    <EditIcon className="h-4 w-4 mr-2" />Edit Layout
                </Button>
            )}
          </div>

          <Card>
            <CardHeader><CardTitle>{isEditing ? `Edit Layout for ${hospitals.find(h => h.id === selectedHospitalId)?.name}` : "Ward Grid"}</CardTitle></CardHeader>
            <CardContent>
              <div className="relative">
                {/* Path SVG - Now unconditionally visible, but paths only exist in non-editing mode */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
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

                {/* Bed Status Prompt */}
                {bedStatusPrompt && (
                    <div 
                        className="absolute z-20 p-2 bg-white border border-blue-500 rounded shadow-lg transform translate-x-[-50%] translate-y-[-100%] max-w-48" 
                        style={getCellCoordinates(bedStatusPrompt.position)}
                    >
                        <p className="text-xs font-semibold mb-1">Set Bed Status:</p>
                        <div className="flex gap-1">
                            {Object.keys({available: 0, occupied: 0, maintenance: 0, reserved: 0}).map(status => (
                                <Button 
                                    key={status} 
                                    variant="outline" 
                                    size="sm"
                                    className={`h-6 text-[10px] px-1 ${getBedColor(status as BedStatus).replace('-500', '-300')}`}
                                    onClick={() => handleStatusSelection(bedStatusPrompt.position, bedStatusPrompt.id, status as BedStatus)}
                                >
                                    {status.charAt(0).toUpperCase()}
                                </Button>
                            ))}
                        </div>
                    </div>
                )}


                {/* Grid */}
                <div className={`grid grid-cols-8 gap-4 p-4 ${isEditing ? 'border-4 border-dashed border-teal-300' : ''}`}>
                  {Array.from({ length: GRID_SIZE }).map((_, i) => {
                    const bed = visibleBeds.find(b => b.position === i);
                    
                    if (i >= DOOR_RANGE_START && i < DOOR_RANGE_START + GRID_COLS) {
                      return <div key={`door-${i}`} className="w-14 h-10 rounded bg-blue-200 border flex items-center justify-center text-[10px] text-black">Door</div>;
                    }
                    
                    const cellClasses = `w-14 h-10 rounded text-xs flex items-center justify-start px-2 text-white transition-all relative ${isEditing ? 'edit-cell' : ''}`;
                    
                    if (bed) {
                        return (
                            <div 
                                key={bed.id} 
                                className={`${cellClasses} ${getBedColor(bed.status)} ${isEditing ? 'border-4 border-green-600' : ''}`}
                                onClick={() => handleGridClick(i)}
                            >
                                <span className="truncate">{bed.bedNumber}</span>
                            </div>
                        );
                    } else {
                        return (
                            <div 
                                key={`empty-${i}`} 
                                className={`${cellClasses} bg-white border ${isEditing ? 'border-gray-400 hover:bg-gray-100' : ''}`}
                                onClick={() => handleGridClick(i)}
                            >
                                {isEditing && <span className="text-gray-500 text-2xl font-extrabold">+</span>}
                            </div>
                        );
                    }
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