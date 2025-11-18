'use client';
import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Bed, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

type BedRecord = {
  id: string;
  wardId: string;
  bedNumber: number;
  status: 'available' | 'occupied' | 'maintenance';
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
};

type Props = {
  hospitalId: string;
  canEdit: boolean;
  onWardsChange?: (wards: WardRecord[]) => void;
};

export function HospitalModalBeds({ hospitalId, canEdit, onWardsChange }: Props) {
  const [wards, setWards] = useState<WardRecord[]>([]);
  const [beds, setBeds] = useState<BedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [openBeds, setOpenBeds] = useState<Record<string, boolean>>({});

  const load = async () => {
    setLoading(true);
    try {
      const wRes = await fetch(`/api/hospitals/${hospitalId}/wards`, { cache: 'no-store' });
      const bRes = await fetch(`/api/hospitals/${hospitalId}/beds`, { cache: 'no-store' });

      const wJson = await wRes.json();
      const bJson = await bRes.json();

      let wardList = Array.isArray(wJson.wards) ? wJson.wards : [];
      const bedList = Array.isArray(bJson.beds) ? bJson.beds : [];

      if (!wardList.some(w => w.name?.toLowerCase() === 'general')) {
        const create = await fetch(`/api/hospitals/${hospitalId}/wards`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'General', specialty: 'General' })
        });
        if (create.ok) {
          const newOne = await create.json();
          wardList = Array.isArray(newOne) ? newOne : [newOne, ...wardList];
        }
      }

      const merged = wardList.map((w: any) => {
        const wb = bedList.filter((b: any) => String(b.wardId) === String(w.id));

        return {
          ...w,
          totalBeds: wb.length,
          availableBeds: wb.filter((b: any) => b.status === 'available').length,
          occupiedBeds: wb.filter((b: any) => b.status === 'occupied').length,
          maintenanceBeds: wb.filter((b: any) => b.status === 'maintenance').length
        };
      });

      setWards(merged);
      setBeds(bedList);
      onWardsChange?.(merged);
    } catch {
      toast.error('Failed loading wards/beds');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (hospitalId) load();
  }, [hospitalId]);

  const commitBeds = async (ward: WardRecord) => {
    const existing = beds.filter(b => b.wardId === ward.id);

    const desired: { bedNumber: number; status: string }[] = [];
    for (let i = 0; i < ward.availableBeds; i++) desired.push({ status: 'available', bedNumber: desired.length + 1 });
    for (let i = 0; i < ward.occupiedBeds; i++) desired.push({ status: 'occupied', bedNumber: desired.length + 1 });
    for (let i = 0; i < ward.maintenanceBeds; i++) desired.push({ status: 'maintenance', bedNumber: desired.length + 1 });

    while (desired.length < ward.totalBeds)
      desired.push({ status: 'available', bedNumber: desired.length + 1 });

    const deleteList = existing.filter(e => !desired.some(d => d.bedNumber === e.bedNumber));
    const createList = desired.filter(d => !existing.some(e => e.bedNumber === d.bedNumber));
    const updateList = desired.filter(d => {
      const ex = existing.find(e => e.bedNumber === d.bedNumber);
      return ex && ex.status !== d.status;
    });

    for (const d of deleteList) {
      await fetch(`/api/hospitals/${hospitalId}/beds`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bedId: d.id })
      });
    }

    if (createList.length) {
      await fetch(`/api/hospitals/${hospitalId}/beds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          createList.map(d => ({ wardId: ward.id, bedNumber: d.bedNumber, status: d.status }))
        )
      });
    }

    for (const u of updateList) {
      const ex = existing.find(e => e.bedNumber === u.bedNumber);
      if (!ex) continue;
      await fetch(`/api/hospitals/${hospitalId}/beds`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: ex.id, wardId: ward.id, bedNumber: u.bedNumber, status: u.status })
      });
    }
  };

  const updateWardDB = async (ward: WardRecord) => {
    await fetch(`/api/hospitals/${hospitalId}/wards`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ward)
    });
  };

  const editField = (wardId: string, field: keyof WardRecord, val: string) => {
    const num = Math.max(0, Number(val) || 0);
    setWards(prev =>
      prev.map(w => {
        if (w.id !== wardId) return w;
        const updated = { ...w, [field]: num };
        updated.totalBeds =
          updated.availableBeds + updated.occupiedBeds + updated.maintenanceBeds;
        return updated;
      })
    );
  };

  const saveCounts = async (wardId: string) => {
    const ward = wards.find(w => w.id === wardId);
    if (!ward) return;
    await commitBeds(ward);
    await updateWardDB(ward);
    load();
  };

  const addWard = async () => {
    await fetch(`/api/hospitals/${hospitalId}/wards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Ward', specialty: 'New Ward' })
    });
    load();
  };

  const deleteWard = async (wardId: string) => {
    await fetch(`/api/hospitals/${hospitalId}/wards`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wardId })
    });
    load();
  };

  if (loading)
    return <div className="p-6 text-center text-gray-500 italic">Loading...</div>;

  return (
    <section className="p-4 border rounded-lg bg-white mt-4">
      <div className="flex justify-between mb-4">
        <h3 className="text-xl font-semibold text-blue-600">Wards & Beds</h3>
        {canEdit && (
          <Button onClick={addWard} className="bg-blue-600 text-white">
            <Plus className="h-4 w-4 mr-1" /> Add Ward
          </Button>
        )}
      </div>

      <div className="space-y-4 max-h-[60vh] overflow-y-auto">
        {wards.map(ward => (
          <div key={ward.id} className="p-3 border rounded-lg bg-gray-50">
            <div className="flex justify-between">
              <div className="flex items-center">
                <Bed className="h-5 w-5 mr-2 text-red-500" />
                <Input
                  value={ward.name}
                  disabled={!canEdit}
                  onChange={e =>
                    setWards(prev =>
                      prev.map(w =>
                        w.id === ward.id ? { ...w, name: e.target.value } : w
                      )
                    )
                  }
                  onBlur={() => updateWardDB(ward)}
                  className="h-8 p-0 border-none bg-transparent font-bold"
                />
              </div>

              {canEdit && ward.name.toLowerCase() !== 'general' && (
                <Button size="sm" variant="destructive" onClick={() => deleteWard(ward.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="grid grid-cols-4 gap-2 mt-3 text-sm">
              <div>
                <label className="text-xs font-medium">TOTAL</label>
                <Input value={ward.totalBeds} disabled className="mt-1 h-8" />
              </div>

              {[
                ['availableBeds', 'AVAILABLE', 'text-green-600'],
                ['occupiedBeds', 'OCCUPIED', 'text-red-600'],
                ['maintenanceBeds', 'MAINTENANCE', 'text-yellow-600']
              ].map(([key, label, color]) => (
                <div key={key}>
                  <label className={`text-xs font-medium ${color}`}>{label}</label>
                  <Input
                    type="number"
                    value={(ward as any)[key]}
                    disabled={!canEdit}
                    onChange={e => editField(ward.id, key as any, e.target.value)}
                    onBlur={() => saveCounts(ward.id)}
                    className="mt-1 h-8"
                  />
                </div>
              ))}
            </div>

            <Textarea
              value={ward.notes}
              disabled={!canEdit}
              onChange={e =>
                setWards(prev =>
                  prev.map(w => (w.id === ward.id ? { ...w, notes: e.target.value } : w))
                )
              }
              onBlur={() => updateWardDB(ward)}
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
                {beds.filter(b => b.wardId === ward.id).map(b => (
                  <li key={b.id} className="p-2 border bg-white rounded">
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
}
