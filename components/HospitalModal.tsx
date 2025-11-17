'use client';
import { useState, useEffect, useMemo } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { X as CloseIcon, Building2, Loader2 } from 'lucide-react';
import { useAuth } from '@/components/contexts/AuthContext';
import { toast } from 'sonner';
import { HospitalModalBeds } from './HospitalModalBeds';

export function HospitalModal({ hospital, onClose, onUpdate }) {
  const { user: currentUser } = useAuth();
  const [form, setForm] = useState(hospital || {});
  const [saving, setSaving] = useState(false);
  const [hospitalUsers, setHospitalUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    if (hospital) setForm(hospital);
  }, [hospital]);

  const canEdit = useMemo(() => {
    if (!currentUser || !hospital) return false;
    if (currentUser.role === 'super_admin') return true;
    if (currentUser.role === 'admin' && currentUser.hospitalId === hospital.id)
      return true;
    return false;
  }, [currentUser, hospital]);

  useEffect(() => {
    if (!hospital?.id) return;
    (async () => {
      try {
        setLoadingUsers(true);
        const res = await fetch(`/api/users?hospitalId=${hospital.id}`, {
          cache: 'no-store'
        });
        if (!res.ok) throw new Error('Failed to load users');
        const data = await res.json();
        setHospitalUsers(Array.isArray(data.users) ? data.users : []);
      } catch (e) {
        toast.error(e.message || 'Error loading users');
      } finally {
        setLoadingUsers(false);
      }
    })();
  }, [hospital?.id]);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleWardsChange = wards => {
    setForm(prev => ({ ...prev, wards }));
  };

  const handleSave = async () => {
    if (!form?.id) {
      toast.error('Hospital ID missing');
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      const res = await fetch(`/api/hospitals/${form.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      if (!res.ok) throw new Error('Failed to update hospital');

      const data = await res.json();
      const updated = data.hospital ?? data;

      onUpdate?.(updated);
      toast.success('Hospital details updated');
      onClose();
    } catch (e) {
      setSaveError(e.message || 'Failed to update hospital');
      toast.error(e.message || 'Failed to update hospital');
    } finally {
      setSaving(false);
    }
  };

  if (!hospital || !currentUser) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white w-full max-w-4xl rounded-xl shadow-2xl p-6 relative overflow-y-auto max-h-[90vh]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-gray-600 hover:bg-red-100 hover:text-red-600"
        >
          <CloseIcon className="h-6 w-6" />
        </button>

        <header className="flex items-center space-x-3 mb-6 border-b pb-3">
          <Building2 className="h-8 w-8 text-blue-600" />
          <h2 className="text-2xl font-extrabold text-gray-800 truncate">
            {hospital.name}
          </h2>
          <span
            className={`text-sm font-medium px-3 py-1 rounded-full ${
              canEdit
                ? 'bg-green-100 text-green-700'
                : 'bg-yellow-100 text-yellow-700'
            }`}
          >
            {canEdit ? 'Editable' : 'Read-Only'}
          </span>
        </header>

        {saveError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {saveError}
          </div>
        )}

        <h3 className="text-xl font-semibold text-blue-600 mb-3">
          General Information
        </h3>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 border rounded-lg bg-gray-50">
          {[
            'phone',
            'email',
            'website',
            'city',
            'state',
            'location',
            'address',
            'notes'
          ].map(field => {
            const isText = field === 'address' || field === 'notes';
            const C = isText ? Textarea : Input;
            return (
              <div key={field} className={isText ? 'col-span-full' : ''}>
                <label className="text-sm font-medium text-gray-600">
                  {field.charAt(0).toUpperCase() + field.slice(1)}
                </label>
                <C
                  value={form[field] || ''}
                  disabled={!canEdit}
                  onChange={e => handleChange(field, e.target.value)}
                  className="mt-1"
                  rows={isText ? 3 : undefined}
                />
              </div>
            );
          })}
        </section>

        <HospitalModalBeds
          hospitalId={hospital.id}
          canEdit={canEdit}
          onWardsChange={handleWardsChange}
        />

        <h3 className="text-xl font-semibold text-blue-600 mb-3 mt-6">
          Hospital Personnel
        </h3>

        <section className="mb-6 p-4 border rounded-lg bg-gray-50">
          <ul className="border rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto bg-white">
            {loadingUsers ? (
              <li className="flex justify-center items-center py-4">
                <Loader2 className="h-5 w-5 animate-spin mr-2 text-blue-500" />
                <span className="text-gray-500 italic">Loading users...</span>
              </li>
            ) : hospitalUsers.length ? (
              hospitalUsers.map(user => (
                <li
                  key={user.id}
                  className="flex justify-between items-center text-sm p-1 border-b last:border-b-0"
                >
                  <span className="truncate mr-2">
                    {user.firstName} {user.lastName}
                  </span>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      user.role === 'admin'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {user.role.toUpperCase()}
                  </span>
                </li>
              ))
            ) : (
              <li className="text-center italic text-gray-500 py-4">
                No staff members found for this hospital.
              </li>
            )}
          </ul>
        </section>

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-xs text-gray-500">
            Viewing hospital ID: {hospital.id.substring(0, 8)}...
          </div>

          <div className="flex space-x-3">
            {canEdit && (
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-green-600 hover:bg-green-700"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            )}
            <Button variant="outline" onClick={onClose}>
              Close View
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
