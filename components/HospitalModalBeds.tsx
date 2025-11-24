// HospitalModalBeds.tsx
"use client";

import React, { useEffect, useImperativeHandle, useState, forwardRef } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Bed, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

type BedRecord = {
  id: string;
  wardId: string | null;
  bedNumber: number;
  status: "available" | "occupied" | "maintenance";
};

type WardRecord = {
  id: string;
  name: string;
  specialty: string;
  notes: string;
  totalBeds: number;
  availableBeds: number;
  occupiedBeds: number;
  maintenanceBeds: number;
  _tmp?: boolean;
  _deleted?: boolean;
};

type Props = {
  hospitalId: string;
  canEdit: boolean;
  onWardsChange?: (wards: WardRecord[]) => void;
};

export type HospitalBedsHandle = {
  saveChanges: () => Promise<void>;
  reload: () => Promise<void>;
  getCurrentState: () => { wards: WardRecord[]; beds: BedRecord[] };
};

export const HospitalModalBeds = forwardRef<HospitalBedsHandle, Props>(function HospitalModalBeds(
  { hospitalId, canEdit, onWardsChange },
  ref
) {
  const [wards, setWards] = useState<WardRecord[]>([]);
  const [beds, setBeds] = useState<BedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [openBeds, setOpenBeds] = useState<Record<string, boolean>>({});
  const [deletedWardIds, setDeletedWardIds] = useState<string[]>([]);

  const ensureUnassignedAndAssignOrphans = async (wardList: WardRecord[], bedList: BedRecord[]) => {
    const orphanBeds = bedList.filter(b => !b.wardId);
    if (orphanBeds.length === 0) return { wardList, bedList };
    let unassigned = wardList.find(w => String(w.name).toLowerCase() === "unassigned" || w.specialty === "unassigned");
    if (!unassigned) {
      const res = await fetch(`/api/hospitals/${hospitalId}/wards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Unassigned", specialty: "unassigned", notes: "" })
      });
      const json = await res.json();
      const newWard = json?.ward ?? (json?.wards && json.wards[0]) ?? null;
      if (newWard && newWard.id) {
        unassigned = {
          id: newWard.id,
          name: newWard.name ?? "Unassigned",
          specialty: newWard.specialty ?? "unassigned",
          notes: newWard.notes ?? "",
          totalBeds: 0,
          availableBeds: 0,
          occupiedBeds: 0,
          maintenanceBeds: 0
        };
        wardList = [unassigned, ...wardList];
      }
    }
    if (!unassigned) return { wardList, bedList };
    const updates = orphanBeds.map(b => ({ ...b, wardId: unassigned!.id }));
    await Promise.all(updates.map(u =>
      fetch(`/api/hospitals/${hospitalId}/beds`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: u.id, wardId: u.wardId, bedNumber: u.bedNumber, status: u.status })
      })
    ));
    const newBeds = bedList.map(b => {
      const u = updates.find(x => x.id === b.id);
      return u ? u : b;
    });
    return { wardList, bedList: newBeds };
  };

  const load = async () => {
    try {
      setLoading(true);
      const [wRes, bRes] = await Promise.all([
        fetch(`/api/hospitals/${hospitalId}/wards`, { cache: "no-store" }),
        fetch(`/api/hospitals/${hospitalId}/beds`, { cache: "no-store" })
      ]);
      const wJson = await wRes.json().catch(() => ({ wards: [] }));
      const bJson = await bRes.json().catch(() => ({ beds: [] }));
      let wardList = Array.isArray(wJson?.wards) ? wJson.wards : [];
      const bedList = Array.isArray(bJson?.beds) ? bJson.beds : [];
      wardList = wardList.map((w: any) => ({
        id: w.id,
        name: w.name ?? "",
        specialty: w.specialty ?? "",
        notes: w.notes ?? "",
        totalBeds: 0,
        availableBeds: 0,
        occupiedBeds: 0,
        maintenanceBeds: 0
      }));
      const merged = wardList.map((w: WardRecord) => {
        const wb = bedList.filter((b: BedRecord) => String(b.wardId) === String(w.id));
        return {
          ...w,
          totalBeds: wb.length,
          availableBeds: wb.filter((b: BedRecord) => b.status === "available").length,
          occupiedBeds: wb.filter((b: BedRecord) => b.status === "occupied").length,
          maintenanceBeds: wb.filter((b: BedRecord) => b.status === "maintenance").length
        };
      });
      const ensured = await ensureUnassignedAndAssignOrphans(merged, bedList);
      setWards(ensured.wardList);
      setBeds(ensured.bedList);
      onWardsChange?.(ensured.wardList);
    } catch {
      toast.error("Failed loading wards/beds");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hospitalId) load();
  }, [hospitalId]);

  useImperativeHandle(ref, () => ({
    saveChanges: async () => {
      try {
        setLoading(true);
        const currentWards = [...wards];
        const currentBeds = [...beds];
        const deletedW = deletedWardIds.slice();
        for (const id of deletedW) {
          if (String(id).startsWith("tmp-")) continue;
          await fetch(`/api/hospitals/${hospitalId}/wards`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ wardId: id })
          });
        }
        const createdMap: Record<string, string> = {};
        for (const w of currentWards) {
          if ((w as any)._deleted) continue;
          if ((w as any)._tmp) {
            const res = await fetch(`/api/hospitals/${hospitalId}/wards`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: w.name, specialty: w.specialty, notes: w.notes })
            });
            const j = await res.json();
            const nw = j?.ward ?? (j?.wards && j.wards[0]) ?? null;
            if (nw && nw.id) {
              createdMap[w.id] = nw.id;
              w.id = nw.id;
            }
          } else {
            await fetch(`/api/hospitals/${hospitalId}/wards`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: w.id, name: w.name, specialty: w.specialty, notes: w.notes })
            });
          }
        }
        const finalWards = currentWards.filter(w => !(w as any)._deleted).map(w => {
          if ((w as any)._tmp && createdMap[w.id]) {
            return { ...w, id: createdMap[w.id] };
          }
          return w;
        });
        const wardIdSet = new Set(finalWards.map(w => w.id));
        const orphanBeds = currentBeds.filter(b => !b.wardId || !wardIdSet.has(String(b.wardId)));
        let unassigned = finalWards.find(w => String(w.name).toLowerCase() === "unassigned" || w.specialty === "unassigned");
        if (orphanBeds.length && !unassigned) {
          const res = await fetch(`/api/hospitals/${hospitalId}/wards`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "Unassigned", specialty: "unassigned", notes: "" })
          });
          const json = await res.json();
          const newWard = json?.ward ?? (json?.wards && json.wards[0]) ?? null;
          if (newWard && newWard.id) {
            unassigned = {
              id: newWard.id,
              name: newWard.name ?? "Unassigned",
              specialty: newWard.specialty ?? "unassigned",
              notes: newWard.notes ?? "",
              totalBeds: 0,
              availableBeds: 0,
              occupiedBeds: 0,
              maintenanceBeds: 0
            };
            finalWards.unshift(unassigned);
          }
        }
        for (const b of orphanBeds) {
          const targetWardId = unassigned ? unassigned.id : finalWards[0]?.id;
          if (!targetWardId) continue;
          await fetch(`/api/hospitals/${hospitalId}/beds`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: b.id, wardId: targetWardId, bedNumber: b.bedNumber, status: b.status })
          });
          b.wardId = targetWardId;
        }
        for (const w of finalWards) {
          const existingBeds = currentBeds.filter(b => String(b.wardId) === String(w.id));
          const desired: { status: string; bedNumber: number }[] = [];
          for (let i = 0; i < (w.availableBeds || 0); i++) desired.push({ status: "available", bedNumber: desired.length + 1 });
          for (let i = 0; i < (w.occupiedBeds || 0); i++) desired.push({ status: "occupied", bedNumber: desired.length + 1 });
          for (let i = 0; i < (w.maintenanceBeds || 0); i++) desired.push({ status: "maintenance", bedNumber: desired.length + 1 });
          while (desired.length < (w.totalBeds || 0)) desired.push({ status: "available", bedNumber: desired.length + 1 });
          const deletes = existingBeds.filter(e => !desired.some(d => d.bedNumber === e.bedNumber));
          const creates = desired.filter(d => !existingBeds.some(e => e.bedNumber === d.bedNumber));
          const updates = desired.filter(d => {
            const ex = existingBeds.find(e => e.bedNumber === d.bedNumber);
            return ex && ex.status !== d.status;
          });
          for (const d of deletes) {
            if (!d.id) continue;
            await fetch(`/api/hospitals/${hospitalId}/beds`, {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ bedId: d.id })
            });
          }
          if (creates.length) {
            await fetch(`/api/hospitals/${hospitalId}/beds`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(creates.map(d => ({ wardId: w.id, bedNumber: d.bedNumber, status: d.status })))
            });
          }
          for (const u of updates) {
            const ex = existingBeds.find(e => e.bedNumber === u.bedNumber);
            if (!ex) continue;
            await fetch(`/api/hospitals/${hospitalId}/beds`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: ex.id, wardId: w.id, bedNumber: u.bedNumber, status: u.status })
            });
          }
        }
        await load();
        toast.success("Wards and beds saved");
      } catch {
        toast.error("Failed saving wards and beds");
      } finally {
        setLoading(false);
      }
    },
    reload: async () => {
      await load();
    },
    getCurrentState: () => ({ wards, beds })
  }));

  const addWard = () => {
    const id = `tmp-${Date.now()}`;
    const w: WardRecord = {
      id,
      name: "New Ward",
      specialty: "New Ward",
      notes: "",
      totalBeds: 0,
      availableBeds: 0,
      occupiedBeds: 0,
      maintenanceBeds: 0,
      _tmp: true
    };
    setWards(prev => [w, ...prev]);
    onWardsChange?.([w, ...wards]);
  };

  const markDeleteWard = (wardId: string) => {
    setWards(prev =>
      prev.map(w => (w.id === wardId ? { ...w, _deleted: true } : w))
    );
    setDeletedWardIds(prev => [...prev, wardId]);
    setWards(prev => prev.filter(w => w.id !== wardId));
    onWardsChange?.(wards.filter(w => w.id !== wardId));
  };

  const editField = (wardId: string, key: keyof WardRecord, val: string) => {
    const num = Math.max(0, Number(val) || 0);
    setWards(prev =>
      prev.map(w => {
        if (w.id !== wardId) return w;
        const updated: WardRecord = { ...w, [key]: key === "name" || key === "specialty" || key === "notes" ? (val as any) : num };
        updated.totalBeds = (updated.availableBeds || 0) + (updated.occupiedBeds || 0) + (updated.maintenanceBeds || 0);
        return updated;
      })
    );
  };

  if (loading) return <div className="p-6 text-center text-gray-500 italic">Loading...</div>;

  return (
    <section className="p-4 rounded-lg bg-white mt-4">
      <div className="flex justify-between mb-4">
        <h3 className="text-xl font-semibold text-blue-600">Wards & Beds</h3>
        {canEdit && (
          <Button onClick={addWard} className="bg-blue-600 text-white">
            <Plus className="h-4 w-4 mr-1" />
            Add Ward
          </Button>
        )}
      </div>

      <div className="space-y-4 max-h-[60vh] overflow-y-auto">
        {wards.map(ward => (
          <div key={ward.id} className="p-3 rounded-lg bg-gray-50">
            <div className="flex justify-between">
              <div className="flex items-center">
                <Bed className="h-5 w-5 mr-2" />
                <Input
                  value={ward.name}
                  disabled={!canEdit}
                  onChange={e => setWards(prev => prev.map(w => (w.id === ward.id ? { ...w, name: e.target.value } : w)))}
                  className="h-8 p-0 bg-transparent font-bold border-none"
                />
              </div>

              {canEdit && (
                <Button size="sm" variant="destructive" onClick={() => markDeleteWard(ward.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="grid grid-cols-4 gap-2 mt-3 text-sm">
              <div>
                <label className="text-xs font-medium">TOTAL</label>
                <Input value={ward.totalBeds} disabled className="mt-1 h-8" />
              </div>

              <div>
                <label className="text-xs font-medium">AVAILABLE</label>
                <Input
                  type="number"
                  value={ward.availableBeds}
                  disabled={!canEdit}
                  onChange={e => editField(ward.id, "availableBeds", e.target.value)}
                  className="mt-1 h-8"
                />
              </div>

              <div>
                <label className="text-xs font-medium">OCCUPIED</label>
                <Input
                  type="number"
                  value={ward.occupiedBeds}
                  disabled={!canEdit}
                  onChange={e => editField(ward.id, "occupiedBeds", e.target.value)}
                  className="mt-1 h-8"
                />
              </div>

              <div>
                <label className="text-xs font-medium">MAINTENANCE</label>
                <Input
                  type="number"
                  value={ward.maintenanceBeds}
                  disabled={!canEdit}
                  onChange={e => editField(ward.id, "maintenanceBeds", e.target.value)}
                  className="mt-1 h-8"
                />
              </div>
            </div>

            <Textarea
              value={ward.notes}
              disabled={!canEdit}
              onChange={e => setWards(prev => prev.map(w => (w.id === ward.id ? { ...w, notes: e.target.value } : w)))}
              rows={1}
              className="mt-2"
            />

            <button
              onClick={() => setOpenBeds(prev => ({ ...prev, [ward.id]: !prev[ward.id] }))}
              className="flex items-center gap-2 text-blue-600 font-semibold mt-2"
            >
              {openBeds[ward.id] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              Beds
            </button>

            {openBeds[ward.id] && (
              <ul className="mt-2 space-y-1">
                {beds.filter(b => String(b.wardId) === String(ward.id)).map(b => (
                  <li key={b.id} className="p-2 bg-white rounded border">
                    #{b.bedNumber} — {b.status}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>
  );
});
