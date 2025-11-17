'use client';
import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Bed, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

export function HospitalModalBeds({ hospitalId, canEdit, onWardsChange }) {
  const [wards, setWards] = useState([]);
  const [beds, setBeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openBeds, setOpenBeds] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const [wRes, bRes] = await Promise.all([
        fetch(`/api/hospitals/${hospitalId}/wards`, { cache: 'no-store' }),
        fetch(`/api/hospitals/${hospitalId}/beds`, { cache: 'no-store' })
      ]);
      const wJson = wRes.ok ? await wRes.json() : { wards: [] };
      const bJson = bRes.ok ? await bRes.json() : { beds: [] };
      let wardList = Array.isArray(wJson.wards) ? wJson.wards : [];
      const bedList = Array.isArray(bJson.beds) ? bJson.beds : [];

      if (!wardList.some(x => String((x.name || '')).toLowerCase() === 'general')) {
        const res = await fetch(`/api/hospitals/${hospitalId}/wards`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'General', specialty: 'General' })
        });
        if (res.ok) {
          const created = await res.json();
          wardList = Array.isArray(created) ? created : [created, ...wardList];
          if (!Array.isArray(created)) wardList.unshift(created);
        }
      }

      const merged = wardList.map(w => {
        const id = w.id ?? w.id ?? Math.random().toString(36).slice(2);
        const safeName = typeof w.name === 'string' ? w.name : '';
        const wb = bedList.filter(b => String(b.wardId) === String(w.id));
        return {
          ...w,
          id,
          name: safeName,
          totalBeds: Number(wb.length || w.totalBeds || 0),
          availableBeds: Number(wb.filter(b => b.status === 'available').length || w.availableBeds || 0),
          occupiedBeds: Number(wb.filter(b => b.status === 'occupied').length || w.occupiedBeds || 0),
          maintenanceBeds: Number(wb.filter(b => b.status === 'maintenance').length || w.maintenanceBeds || 0)
        };
      });

      setWards(merged);
      setBeds(bedList);
      onWardsChange?.(merged);
    } catch (e) {
      toast.error('Failed loading wards/beds');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hospitalId) return;
    load();
  }, [hospitalId]);

  const syncBeds = async (wardId, total, available, occupied, maintenance) => {
    const existing = beds.filter(b => String(b.wardId) === String(wardId)).map(b => ({ ...b, bedNumber: Number(b.bedNumber) }));
    const need = [];
    for (let i = 0; i < available; i++) need.push({ status: 'available' });
    for (let i = 0; i < occupied; i++) need.push({ status: 'occupied' });
    for (let i = 0; i < maintenance; i++) need.push({ status: 'maintenance' });
    while (need.length < total) need.push({ status: 'available' });
    while (need.length > total) need.pop();
    const normalized = need.map((n, i) => ({ bedNumber: i + 1, status: n.status }));
    const toDelete = existing.filter(e => !normalized.some(n => n.bedNumber === Number(e.bedNumber)));
    const toUpsert = normalized.map(n => {
      const existingBed = existing.find(e => Number(e.bedNumber) === Number(n.bedNumber));
      return { existing: existingBed, data: n };
    });

    for (const d of toDelete) {
      try {
        await fetch(`/api/hospitals/${hospitalId}/beds`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bedId: d.id })
        });
      } catch {}
    }

    const createBatch = [];
    for (const u of toUpsert) {
      if (!u.existing) {
        createBatch.push({
          wardId,
          bedNumber: String(u.data.bedNumber),
          status: u.data.status
        });
      } else {
        try {
          await fetch(`/api/hospitals/${hospitalId}/beds`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: u.existing.id,
              wardId,
              bedNumber: String(u.data.bedNumber),
              status: u.data.status
            })
          });
        } catch {}
      }
    }

    if (createBatch.length) {
      try {
        await fetch(`/api/hospitals/${hospitalId}/beds`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(createBatch)
        });
      } catch {}
    }

    await load();
  };

  const editCounts = (wardId, field, value) => {
    const num = Math.max(0, parseInt(String(value || '0'), 10));
    setWards(prev =>
      prev.map(w => {
        if (String(w.id) !== String(wardId)) return w;
        const copy = { ...w };
        if (field === 'totalBeds') {
          copy.totalBeds = num;
          const fixed = Number(copy.occupiedBeds || 0) + Number(copy.maintenanceBeds || 0);
          copy.availableBeds = Math.max(0, copy.totalBeds - fixed);
        } else {
          copy[field] = num;
          copy.totalBeds = Number(copy.availableBeds || 0) + Number(copy.occupiedBeds || 0) + Number(copy.maintenanceBeds || 0);
        }
        return copy;
      })
    );
  };

  const commitCounts = wardId => {
    const ward = wards.find(w => String(w.id) === String(wardId));
    if (!ward) return;
    syncBeds(ward.id, Number(ward.totalBeds || 0), Number(ward.availableBeds || 0), Number(ward.occupiedBeds || 0), Number(ward.maintenanceBeds || 0));
  };

  const addWard = async () => {
    try {
      await fetch(`/api/hospitals/${hospitalId}/wards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Ward', specialty: 'New Ward' })
      });
      await load();
    } catch {
      toast.error('Failed to add ward');
    }
  };

  const updateWard = async wardId => {
    const ward = wards.find(w => String(w.id) === String(wardId));
    if (!ward) return;
    try {
      await fetch(`/api/hospitals/${hospitalId}/wards`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: ward.id, name: ward.name || '', specialty: ward.specialty || '', notes: ward.notes || '' })
      });
      await load();
    } catch {
      toast.error('Failed to update ward');
    }
  };

  const deleteWard = async id => {
    try {
      await fetch(`/api/hospitals/${hospitalId}/wards`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wardId: id })
      });
      await load();
    } catch {
      toast.error('Failed to delete ward');
    }
  };

  const toggleBeds = id => {
    setOpenBeds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading)
    return (
      <div className="p-6 text-center text-gray-500 italic">
        Loading ward and bed data...
      </div>
    );

  return (
    <section className="p-4 border rounded-lg bg-white mt-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-blue-600">Wards & Beds Management</h3>
        {canEdit && (
          <Button onClick={addWard} className="bg-blue-600 text-white">
            <Plus className="h-4 w-4 mr-1" /> Add Ward
          </Button>
        )}
      </div>

      <div className="space-y-4 max-h-[60vh] overflow-y-auto">
        {wards.length === 0 && <div className="text-center italic text-gray-400">No wards available.</div>}

        {wards.map((ward, idx) => (
          <div key={ward.id ?? `ward-${idx}`} className="p-3 border rounded-lg bg-gray-50">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center">
                <Bed className="h-5 w-5 mr-2 text-red-500" />
                <Input
                  type="text"
                  value={ward.name ?? ''}
                  disabled={!canEdit}
                  onChange={e =>
                    setWards(prev =>
                      prev.map(w => (String(w.id) === String(ward.id) ? { ...w, name: e.target.value, specialty: e.target.value } : w))
                    )
                  }
                  onBlur={() => updateWard(ward.id)}
                  className="h-8 p-0 border-none bg-transparent font-bold"
                />
              </div>

              {canEdit && String((ward.name || '').toLowerCase()) !== 'general' && (
                <Button size="sm" variant="destructive" onClick={() => deleteWard(ward.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
              <div>
                <label className="text-xs font-medium">TOTAL BEDS</label>
                <Input
                  type="number"
                  value={String(ward.totalBeds ?? 0)}
                  disabled={!canEdit}
                  onChange={e => editCounts(ward.id, 'totalBeds', e.target.value)}
                  onBlur={() => commitCounts(ward.id)}
                  className="mt-1 h-8"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-green-600">AVAILABLE</label>
                <Input
                  type="number"
                  value={String(ward.availableBeds ?? 0)}
                  disabled={!canEdit}
                  onChange={e => editCounts(ward.id, 'availableBeds', e.target.value)}
                  onBlur={() => commitCounts(ward.id)}
                  className="mt-1 h-8"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-red-600">OCCUPIED</label>
                <Input
                  type="number"
                  value={String(ward.occupiedBeds ?? 0)}
                  disabled={!canEdit}
                  onChange={e => editCounts(ward.id, 'occupiedBeds', e.target.value)}
                  onBlur={() => commitCounts(ward.id)}
                  className="mt-1 h-8"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-yellow-600">MAINTENANCE</label>
                <Input
                  type="number"
                  value={String(ward.maintenanceBeds ?? 0)}
                  disabled={!canEdit}
                  onChange={e => editCounts(ward.id, 'maintenanceBeds', e.target.value)}
                  onBlur={() => commitCounts(ward.id)}
                  className="mt-1 h-8"
                />
              </div>
            </div>

            <Textarea
              value={ward.notes ?? ''}
              disabled={!canEdit}
              onChange={e => setWards(prev => prev.map(w => (String(w.id) === String(ward.id) ? { ...w, notes: e.target.value } : w)))}
              onBlur={() => updateWard(ward.id)}
              rows={1}
              className="mb-2"
            />

            <button
              onClick={() => toggleBeds(ward.id)}
              className="flex items-center gap-2 text-blue-600 font-semibold"
            >
              {openBeds[ward.id] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              View Beds
            </button>

            {openBeds[ward.id] && (
              <ul className="pl-4 mt-2 space-y-1">
                {beds.filter(b => String(b.wardId) === String(ward.id)).map(bed => (
                  <li key={bed.id} className="flex justify-between items-center p-2 bg-white border rounded">
                    #{bed.bedNumber} — {bed.status}
                  </li>
                ))}
                {beds.filter(b => String(b.wardId) === String(ward.id)).length === 0 && (
                  <li className="italic text-gray-400">No beds in this ward.</li>
                )}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
