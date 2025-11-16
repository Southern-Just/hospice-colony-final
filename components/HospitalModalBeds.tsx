'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Bed, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import type { Ward, Bed as BedType } from '@/types';

type Props = {
  hospitalId: string;
  canEdit: boolean;
  onWardsChange?: (wards: Ward[]) => void;
};

export function HospitalModalBeds({ hospitalId, canEdit, onWardsChange }: Props) {
  const router = useRouter();
  const [wards, setWards] = useState<Ward[]>([]);
  const [beds, setBeds] = useState<BedType[]>([]);
  const [loading, setLoading] = useState(true);
  const [openBeds, setOpenBeds] = useState<Record<string, boolean>>({});

  const fetchWardsAndBeds = async () => {
    try {
      setLoading(true);
      const [wardsRes, bedsRes] = await Promise.all([
        fetch(`/api/hospitals/${hospitalId}/wards`),
        fetch(`/api/hospitals/${hospitalId}/beds`),
      ]);
      if (!wardsRes.ok || !bedsRes.ok) throw new Error('Failed to load data');
      const wardData = await wardsRes.json();
      const bedData = await bedsRes.json();
      const wardList = Array.isArray(wardData.wards) ? wardData.wards : [];
      const bedList = Array.isArray(bedData.beds) ? bedData.beds : [];

      const wardsWithCounts = wardList.map((w: any) => {
        const wardBeds = bedList.filter((b: any) => b.wardId === w.id);
        const totalBeds = w.totalBeds ?? wardBeds.length;
        const availableBeds = w.availableBeds ?? wardBeds.filter((b: any) => b.status === 'available').length;
        const occupiedBeds = w.occupiedBeds ?? wardBeds.filter((b: any) => b.status === 'occupied').length;
        const maintenanceBeds = w.maintenanceBeds ?? wardBeds.filter((b: any) => b.status === 'maintenance').length;
        return { ...w, totalBeds, availableBeds, occupiedBeds, maintenanceBeds };
      });

      setWards(wardsWithCounts);
      setBeds(bedList);
      if (onWardsChange) onWardsChange(wardsWithCounts);
    } catch (e: any) {
      toast.error(e.message || 'Error loading data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWardsAndBeds();
  }, [hospitalId]);

  const addWard = async () => {
    try {
      const res = await fetch(`/api/hospitals/${hospitalId}/wards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Ward', specialty: '' }),
      });
      if (!res.ok) throw new Error('Failed to create ward');
      const newWard = await res.json();
      const newWardWithCounts = { ...newWard, totalBeds: 0, availableBeds: 0, occupiedBeds: 0, maintenanceBeds: 0 };
      setWards(prev => [...prev, newWardWithCounts]);
      if (onWardsChange) onWardsChange([...wards, newWardWithCounts]);
      toast.success('Ward added');
    } catch (e: any) {
      toast.error(e.message || 'Failed to add ward');
    }
  };

  const updateWard = async (ward: Ward) => {
    try {
      const body = {
        id: ward.id,
        name: ward.name,
        notes: ward.notes ?? '',
        totalBeds: ward.totalBeds ?? 0,
        availableBeds: ward.availableBeds ?? 0,
        occupiedBeds: ward.occupiedBeds ?? 0,
        maintenanceBeds: ward.maintenanceBeds ?? 0,
        specialty: (ward as any).specialty ?? '',
      };
      const res = await fetch(`/api/hospitals/${hospitalId}/wards`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to update ward');
      const updated = await res.json();
      setWards(prev => prev.map(w => (w.id === ward.id ? { ...w, ...updated } : w)));
      if (onWardsChange) onWardsChange(wards.map(w => (w.id === ward.id ? { ...w, ...updated } : w)));
      toast.success('Ward updated');
    } catch (e: any) {
      toast.error(e.message || 'Failed to update ward');
    }
  };

  const deleteWard = async (wardId: string) => {
    try {
      const res = await fetch(`/api/hospitals/${hospitalId}/wards`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wardId }),
      });
      if (!res.ok) throw new Error('Failed to delete ward');
      setWards(prev => prev.filter(w => w.id !== wardId));
      setBeds(prev => prev.filter(b => b.wardId !== wardId));
      if (onWardsChange) onWardsChange(wards.filter(w => w.id !== wardId));
      toast.success('Ward deleted');
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete ward');
    }
  };

  const handleWardFieldChange = (
    wardId: string,
    field: 'name' | 'notes' | 'totalBeds' | 'availableBeds' | 'occupiedBeds' | 'maintenanceBeds',
    value: string
  ) => {
    setWards(prev =>
      prev.map(w => {
        if (w.id !== wardId) return w;
        const copy: any = { ...w };
        if (field === 'name' || field === 'notes') {
          copy[field] = value;
          return copy;
        }
        const parsed = Math.max(0, parseInt(value === '' ? '0' : value, 10));
        if (field === 'totalBeds') {
          copy.totalBeds = parsed;
          const otherSum = (copy.occupiedBeds ?? 0) + (copy.maintenanceBeds ?? 0);
          copy.availableBeds = Math.max(0, copy.totalBeds - otherSum);
          return copy;
        }
        copy[field] = parsed;
        copy.totalBeds = (copy.availableBeds ?? 0) + (copy.occupiedBeds ?? 0) + (copy.maintenanceBeds ?? 0);
        return copy;
      })
    );
  };

  const toggleBeds = (wardId: string) => {
    setOpenBeds(prev => ({ ...prev, [wardId]: !prev[wardId] }));
  };

  if (loading) return <div className="p-6 text-center text-gray-500 italic">Loading ward and bed data...</div>;

  return (
    <section className="p-4 border rounded-lg bg-white mt-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-blue-600">Wards & Beds Management</h3>
        {canEdit && (
          <Button onClick={addWard} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="h-4 w-4 mr-1" /> Add Ward
          </Button>
        )}
      </div>

      <div className="space-y-4 max-h-[60vh] overflow-y-auto">
        {wards.length === 0 && <p className="text-center text-gray-400 italic">No wards available.</p>}

        {wards.map(ward => (
          <div key={ward.id} className="p-3 border border-gray-200 rounded-lg bg-gray-50">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center">
                <Bed className="h-5 w-5 mr-2 text-red-500" />
                <Input
                  type="text"
                  value={ward.name ?? ''}
                  disabled={!canEdit}
                  onChange={e => handleWardFieldChange(ward.id, 'name', e.target.value)}
                  onBlur={() => canEdit && updateWard(ward)}
                  className="h-8 p-0 border-none bg-transparent font-bold focus-visible:ring-0 focus-visible:shadow-none"
                />
              </div>
              <div className="flex items-center gap-2">
                {canEdit && (
                  <Button size="sm" variant="destructive" onClick={() => deleteWard(ward.id)} className="flex items-center">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                <Button size="sm" onClick={() => router.push(`/hospitals/${hospitalId}/wards/${ward.id}/beds`)} className="bg-gray-100 hover:bg-gray-200">
                  Manage Beds →
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
              <div>
                <label className="text-xs font-medium">TOTAL BEDS</label>
                <Input
                  type="number"
                  min={0}
                  value={(ward.totalBeds ?? 0).toString()}
                  disabled={!canEdit}
                  onChange={e => handleWardFieldChange(ward.id, 'totalBeds', e.target.value)}
                  onBlur={() => canEdit && updateWard(ward)}
                  className="mt-1 h-8"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-green-600">AVAILABLE</label>
                <Input
                  type="number"
                  min={0}
                  value={(ward.availableBeds ?? 0).toString()}
                  disabled={!canEdit}
                  onChange={e => handleWardFieldChange(ward.id, 'availableBeds', e.target.value)}
                  onBlur={() => canEdit && updateWard(ward)}
                  className="mt-1 h-8"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-red-600">OCCUPIED</label>
                <Input
                  type="number"
                  min={0}
                  value={(ward.occupiedBeds ?? 0).toString()}
                  disabled={!canEdit}
                  onChange={e => handleWardFieldChange(ward.id, 'occupiedBeds', e.target.value)}
                  onBlur={() => canEdit && updateWard(ward)}
                  className="mt-1 h-8"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-yellow-600">MAINTENANCE</label>
                <Input
                  type="number"
                  min={0}
                  value={(ward.maintenanceBeds ?? 0).toString()}
                  disabled={!canEdit}
                  onChange={e => handleWardFieldChange(ward.id, 'maintenanceBeds', e.target.value)}
                  onBlur={() => canEdit && updateWard(ward)}
                  className="mt-1 h-8"
                />
              </div>
            </div>

            <div className="col-span-full mb-2">
              <label className="text-xs font-medium text-gray-500">Ward Notes</label>
              <Textarea
                value={ward.notes ?? ''}
                disabled={!canEdit}
                onChange={e => handleWardFieldChange(ward.id, 'notes', e.target.value)}
                onBlur={() => canEdit && updateWard(ward)}
                className="mt-1"
                rows={1}
              />
            </div>

            <div className="mt-3 text-sm text-gray-600">
              <button
                onClick={() => toggleBeds(ward.id)}
                className="flex items-center gap-2 text-blue-600 text-sm font-semibold"
              >
                {openBeds[ward.id] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                View Beds
              </button>

              {openBeds[ward.id] && (
                <ul className="pl-4 mt-2 space-y-1">
                  {beds.filter(b => b.wardId === ward.id).map(bed => (
                    <li key={bed.id} className="flex justify-between items-center">
                      <span>
                        #{bed.bedNumber} ({bed.status})
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">{bed.priority}</span>
                      </div>
                    </li>
                  ))}
                  {beds.filter(b => b.wardId === ward.id).length === 0 && (
                    <li className="italic text-gray-400">No beds in this ward.</li>
                  )}
                </ul>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
