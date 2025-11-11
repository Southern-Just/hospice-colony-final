'use client';
import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Bed, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Ward, Bed as BedType } from '@/types';

type Props = {
  hospitalId: string;
  canEdit: boolean;
  onWardsChange?: (wards: Ward[]) => void;
};

export function HospitalModalBeds({ hospitalId, canEdit, onWardsChange }: Props) {
  const [wards, setWards] = useState<Ward[]>([]);
  const [beds, setBeds] = useState<BedType[]>([]);
  const [loading, setLoading] = useState(true);

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

      const wardsWithCounts = wardList.map(w => {
        const wardBeds = bedList.filter(b => b.wardId === w.id);
        const totalBeds = wardBeds.length;
        const availableBeds = wardBeds.filter(b => b.status === 'available').length;
        const occupiedBeds = wardBeds.filter(b => b.status === 'occupied').length;
        const maintenanceBeds = wardBeds.filter(b => b.status === 'maintenance').length;
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
      toast.success('Ward added');
    } catch (e: any) {
      toast.error(e.message || 'Failed to add ward');
    }
  };

  const updateWard = async (ward: Ward) => {
    try {
      const res = await fetch(`/api/hospitals/${hospitalId}/wards`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ward),
      });
      if (!res.ok) throw new Error('Failed to update ward');
      const updated = await res.json();
      setWards(prev => prev.map(w => (w.id === ward.id ? { ...w, ...updated } : w)));
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
      toast.success('Ward deleted');
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete ward');
    }
  };

  const addBed = async (wardId: string) => {
    try {
      const res = await fetch(`/api/hospitals/${hospitalId}/beds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wardId,
          bedNumber: `B-${Math.floor(Math.random() * 10000)}`,
          status: 'available',
          priority: 'normal',
          position: { x: 0, y: 0 },
        }),
      });
      if (!res.ok) throw new Error('Failed to create bed');
      const newBed = await res.json();
      setBeds(prev => [...prev, newBed]);
      toast.success('Bed added');

      const updatedWards = wards.map(w => {
        if (w.id === wardId) {
          const totalBeds = (w.totalBeds ?? 0) + 1;
          const availableBeds = (w.availableBeds ?? 0) + 1;
          return { ...w, totalBeds, availableBeds };
        }
        return w;
      });
      setWards(updatedWards);

      const targetWard = updatedWards.find(w => w.id === wardId);
      if (targetWard) await updateWard(targetWard);
    } catch (e: any) {
      toast.error(e.message || 'Failed to add bed');
    }
  };

  const deleteBed = async (bedId: string, wardId: string) => {
    try {
      const res = await fetch(`/api/hospitals/${hospitalId}/beds`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bedId }),
      });
      if (!res.ok) throw new Error('Failed to delete bed');
      setBeds(prev => prev.filter(b => b.id !== bedId));
      toast.success('Bed deleted');

      const updatedWards = wards.map(w => {
        if (w.id === wardId) {
          const totalBeds = Math.max((w.totalBeds ?? 1) - 1, 0);
          const availableBeds = Math.max((w.availableBeds ?? 1) - 1, 0);
          return { ...w, totalBeds, availableBeds };
        }
        return w;
      });
      setWards(updatedWards);

      const targetWard = updatedWards.find(w => w.id === wardId);
      if (targetWard) await updateWard(targetWard);
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete bed');
    }
  };

  const handleWardFieldChange = (wardId: string, field: keyof Ward, value: string | number) => {
    setWards(prev =>
      prev.map(w =>
        w.id === wardId
          ? { ...w, [field]: value }
          : w
      )
    );
  };

  if (loading)
    return <div className="p-6 text-center text-gray-500 italic">Loading ward and bed data...</div>;

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
              {canEdit && (
                <Button size="sm" variant="destructive" onClick={() => deleteWard(ward.id)} className="flex items-center">
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {['totalBeds', 'availableBeds', 'occupiedBeds', 'maintenanceBeds'].map(key => {
                const colorMap: Record<string, string> = {
                  totalBeds: '',
                  availableBeds: 'text-green-600',
                  occupiedBeds: 'text-red-600',
                  maintenanceBeds: 'text-yellow-600',
                };
                return (
                  <div key={key}>
                    <label className={`text-xs font-medium ${colorMap[key]}`}>
                      {key.replace(/([A-Z])/g, ' $1').toUpperCase()}
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={(ward as any)[key] ?? 0}
                      disabled
                      className={`mt-1 h-8 ${colorMap[key]}`}
                    />
                  </div>
                );
              })}
              <div className="col-span-full">
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
            </div>

            <div className="mt-3 text-sm text-gray-600">
              <div className="flex justify-between items-center mb-2">
                <h5 className="font-semibold text-gray-700">Beds</h5>
                {canEdit && (
                  <Button size="sm" onClick={() => addBed(ward.id)} className="bg-blue-500 hover:bg-blue-600 text-white">
                    <Plus className="h-4 w-4 mr-1" /> Add Bed
                  </Button>
                )}
              </div>

              <ul className="pl-4 space-y-1">
                {beds.filter(b => b.wardId === ward.id).map(bed => (
                  <li key={bed.id} className="flex justify-between items-center">
                    <span>
                      #{bed.bedNumber} ({bed.status})
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{bed.priority}</span>
                      {canEdit && (
                        <button onClick={() => deleteBed(bed.id, ward.id)} className="text-red-500 hover:text-red-700">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </li>
                ))}
                {beds.filter(b => b.wardId === ward.id).length === 0 && (
                  <li className="italic text-gray-400">No beds in this ward.</li>
                )}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
