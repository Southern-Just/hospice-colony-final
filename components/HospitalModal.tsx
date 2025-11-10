'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { X as CloseIcon, Bed, Building2, Loader2 } from 'lucide-react';
import { useAuth } from '@/components/contexts/AuthContext';
import { toast } from 'sonner';

// --- TYPE DEFINITIONS ---
type Ward = {
  id: string;
  name: string;
  totalBeds: number;
  availableBeds: number;
  occupiedBeds: number;
  maintenanceBeds?: number;
  notes?: string;
};

type Hospital = {
  id: string;
  name: string;
  location?: string;
  phone?: string;
  status?: string;
  specialties?: string[];
  totalBeds: number;
  availableBeds: number;
  occupiedBeds: number;
  maintenanceBeds?: number;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  website?: string;
  notes?: string;
  wards?: Ward[];
};

type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  hospitalId: string;
};

type Props = {
  hospital: Hospital | null;
  onClose: () => void;
  // onUpdate now expects the newly fetched Hospital object
  onUpdate?: (data: Hospital) => void; 
};

export function HospitalModal({ hospital, onClose, onUpdate }: Props) {
  const { user: currentUser } = useAuth();
  const [form, setForm] = useState<Hospital>(hospital || {} as Hospital);
  const [saving, setSaving] = useState(false);
  const [hospitalUsers, setHospitalUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const canEdit = useMemo(() => {
    if (!currentUser || !hospital) return false;
    if (currentUser.role === 'super_admin') return true;
    if (currentUser.role === 'admin' && hospital.id === currentUser.hospitalId) return true;
    return false;
  }, [currentUser, hospital]);

  // Set initial form data
  useEffect(() => {
    if (hospital) setForm(hospital);
  }, [hospital]);

  // Fetch all users associated with this hospital
  const fetchUsers = useCallback(async () => {
    if (!hospital?.id) return;
    setLoadingUsers(true);
    try {
      const res = await fetch(`/api/users?hospitalId=${hospital.id}`);
      
      if (!res.ok) {
        throw new Error("Failed to load hospital personnel list.");
      }
      
      const data = await res.json();
      setHospitalUsers(data.users ?? []);
    } catch (error: any) {
      toast.error(error.message || "Error loading hospital personnel.");
      setHospitalUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }, [hospital]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);


  if (!hospital || !currentUser) return null;

  const handleChange = (field: keyof Hospital, value: string | number | string[]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleWardChange = (wardId: string, field: keyof Ward, value: string | number) => {
    setForm((prev) => ({
      ...prev,
      wards: prev.wards?.map((ward) => {
        if (ward.id === wardId) {
          let updatedWard = { ...ward, [field]: value };
          const newNumericValue = Number(value);

          // Logic to recalculate available beds based on changes to other bed types
          if (field === 'totalBeds') {
            const newTotal = newNumericValue;
            updatedWard.totalBeds = newTotal;
            updatedWard.availableBeds = Math.max(0, newTotal - updatedWard.occupiedBeds - (updatedWard.maintenanceBeds ?? 0));
          } else if (field === 'occupiedBeds' || field === 'maintenanceBeds') {
            const newOccupied = field === 'occupiedBeds' ? newNumericValue : updatedWard.occupiedBeds;
            const newMaintenance = field === 'maintenanceBeds' ? newNumericValue : updatedWard.maintenanceBeds ?? 0;
            
            updatedWard.occupiedBeds = newOccupied;
            updatedWard.maintenanceBeds = newMaintenance;
            
            updatedWard.availableBeds = Math.max(0, updatedWard.totalBeds - newOccupied - newMaintenance);
          } else if (field === 'notes' || field === 'name') {
             // For string fields, just update
             (updatedWard as any)[field] = value;
          }
          return updatedWard;
        }
        return ward;
      }),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);

    try {
      // Aggregate bed counts from wards for the hospital-level summary fields
      const totalBeds = form.wards?.reduce((sum, w) => sum + w.totalBeds, 0) ?? 0;
      const availableBeds = form.wards?.reduce((sum, w) => sum + w.availableBeds, 0) ?? 0;
      const occupiedBeds = form.wards?.reduce((sum, w) => sum + w.occupiedBeds, 0) ?? 0;
      const maintenanceBeds = form.wards?.reduce((sum, w) => sum + (w.maintenanceBeds ?? 0), 0) ?? 0;
      
      const finalUpdateData: Partial<Hospital> = { 
        ...form, 
        totalBeds, 
        availableBeds, 
        occupiedBeds, 
        maintenanceBeds 
      };

      const res = await fetch(`/api/hospitals/${form.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalUpdateData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to save hospital data. Check console for details.');
      }
      
      const updatedResponse = await res.json();
      
      // Assuming the API returns { hospital: {...} }
      if (onUpdate && updatedResponse.hospital) {
        onUpdate(updatedResponse.hospital);
      }
      
      toast.success("Hospital details updated successfully!");
      onClose();
      
    } catch (e: any) {
      setSaveError(e.message);
      toast.error(e.message || "An unknown error occurred during saving.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white w-full max-w-4xl rounded-xl shadow-2xl p-6 relative overflow-y-auto max-h-[95vh] transition-all transform duration-300">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full text-gray-600 hover:bg-red-100 hover:text-red-600 transition-colors" aria-label="Close">
          <CloseIcon className="h-6 w-6" />
        </button>

        <header className="flex items-center space-x-3 mb-6 border-b pb-3">
          <Building2 className="h-8 w-8 text-blue-600" />
          <h2 className="text-3xl font-extrabold text-gray-800">{hospital.name}</h2>
          <span className={`text-sm font-medium px-3 py-1 rounded-full ${canEdit ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
            {canEdit ? 'Editable' : 'Read-Only'}
          </span>
        </header>
        
        {saveError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            **Save Error:** {saveError}
          </div>
        )}

        <h3 className="text-xl font-semibold text-blue-600 mb-3">General Information</h3>
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 border rounded-lg bg-gray-50">
          {['phone', 'email', 'website', 'city', 'state', 'location', 'address', 'notes'].map((field: keyof Hospital) => {
            const isTextarea = field === 'address' || field === 'notes';
            const Component = isTextarea ? Textarea : Input;
            return (
              <div key={field} className={isTextarea ? 'col-span-full' : ''}>
                <label className="text-sm font-medium text-gray-600">{field.charAt(0).toUpperCase() + field.slice(1)}</label>
                <Component
                  value={form[field] ?? ''}
                  disabled={!canEdit}
                  onChange={(e) => handleChange(field, e.target.value)}
                  className="mt-1"
                  rows={isTextarea ? (field === 'notes' ? 3 : 2) : undefined}
                  type={field === 'email' ? 'email' : field === 'website' ? 'url' : 'text'}
                />
              </div>
            );
          })}
        </section>

        <h3 className="text-xl font-semibold text-blue-600 mb-3">Ward & Bed Management</h3>
        <section className="mb-6 p-4 border rounded-lg bg-white">
          <div className="space-y-4 max-h-80 overflow-y-auto">
            {(form.wards || []).length === 0 && <p className="text-center text-gray-500 italic">No wards defined yet.</p>}
            {(form.wards || []).map((ward) => (
              <div key={ward.id} className="p-4 border border-gray-200 rounded-lg shadow-sm bg-gray-50">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-lg font-bold text-gray-800 flex items-center">
                    <Bed className="h-5 w-5 mr-2 text-red-500" />
                    <Input 
                      type="text" 
                      value={ward.name} 
                      disabled={!canEdit} 
                      onChange={(e) => handleWardChange(ward.id, 'name', e.target.value)} 
                      className="h-8 p-0 border-none bg-transparent font-bold focus-visible:ring-0 focus-visible:shadow-none" 
                    />
                  </h4>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  {['totalBeds', 'availableBeds', 'occupiedBeds', 'maintenanceBeds'].map((key) => {
                    const colorMap: Record<string, string> = { totalBeds: '', availableBeds: 'text-green-600', occupiedBeds: 'text-red-600', maintenanceBeds: 'text-yellow-600' };
                    const isEditable = canEdit && key !== 'availableBeds';
                    return (
                      <div key={key}>
                        <label className={`text-xs font-medium ${colorMap[key]}`}>{key.replace(/([A-Z])/g, ' $1').toUpperCase()}</label>
                        <Input
                          type="number"
                          min="0"
                          value={ward[key as keyof Ward] ?? 0}
                          disabled={!isEditable}
                          onChange={(e) => handleWardChange(ward.id, key as keyof Ward, Number(e.target.value))}
                          className={`mt-1 h-8 ${key === 'availableBeds' ? 'bg-green-50 text-green-700 font-bold' : key === 'occupiedBeds' ? 'bg-red-50 text-red-700' : key === 'maintenanceBeds' ? 'bg-yellow-50 text-yellow-700' : ''} ${!isEditable ? 'cursor-not-allowed opacity-70' : ''}`}
                        />
                      </div>
                    );
                  })}
                  <div className="col-span-full">
                    <label className="text-xs font-medium text-gray-500">Ward Notes</label>
                    <Textarea value={ward.notes ?? ''} disabled={!canEdit} onChange={(e) => handleWardChange(ward.id, 'notes', e.target.value)} className="mt-1" rows={1} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <h3 className="text-xl font-semibold text-blue-600 mb-3">Hospital Personnel</h3>
        <section className="mb-6 p-4 border rounded-lg bg-gray-50">
          <ul className="border rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto bg-white">
            {loadingUsers ? (
              <li className="flex justify-center items-center py-4">
                <Loader2 className="h-5 w-5 animate-spin mr-2 text-blue-500" />
                <span className="text-center text-gray-500 italic">Loading users...</span>
              </li>
            ) : hospitalUsers.length > 0 ? (
              hospitalUsers.map((u) => (
                <li key={u.id} className="flex justify-between items-center text-sm p-1 border-b last:border-b-0">
                  <span className="truncate mr-2">{u.firstName} {u.lastName} (<span className="text-gray-500 text-xs italic">{u.email}</span>)</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${u.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{u.role.toUpperCase()}</span>
                </li>
              ))
            ) : (
              <li className="text-center italic text-gray-500 py-4">No staff members found for this hospital.</li>
            )}
          </ul>
        </section>

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-xs text-gray-500">
            Viewing details for hospital ID: {hospital.id.substring(0, 8)}...
          </div>
          <div className="flex space-x-3">
            {canEdit && (
              <Button onClick={handleSave} disabled={saving} className="bg-green-600 hover:bg-green-700 transition-colors">
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            )}
            <Button variant="outline" onClick={onClose}>Close View</Button>
          </div>
        </div>
      </div>
    </div>
  );
}