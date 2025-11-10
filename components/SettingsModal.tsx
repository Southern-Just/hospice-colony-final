'use client';

import { useState, useEffect, useCallback, useMemo } from "react";
import { X as CloseIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/contexts/AuthContext";
import { toast } from "sonner";

type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  hospitalId?: string | null;
  hospitalName?: string | null;
};

type Props = {
  onClose: () => void;
};

export function SettingsModal({ onClose }: Props) {
  const { user: currentUser, logout } = useAuth();
  const [userData, setUserData] = useState<Omit<User, 'id' | 'role' | 'hospitalId' | 'hospitalName'> & { id: string } | null>(null);
  const [initialData, setInitialData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/users/${id}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to fetch user");
      }
      const data = await res.json();
      if (!data.user) {
        throw new Error("Invalid response format: 'user' object missing.");
      }
      const fetchedUser = data.user as User;
      setUserData({
        id: fetchedUser.id,
        firstName: fetchedUser.firstName,
        lastName: fetchedUser.lastName,
        email: fetchedUser.email,
      });
      setInitialData(fetchedUser);
    } catch (e: any) {
      setError(e.message || "An unknown error occurred while fetching user data.");
      if (currentUser) {
        setInitialData(currentUser);
        setUserData({
          id: currentUser.id,
          firstName: currentUser.firstName,
          lastName: currentUser.lastName,
          email: currentUser.email,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser?.id) {
      fetchUser(currentUser.id);
    }
  }, [currentUser, fetchUser]);

  const handleChange = (field: keyof User, value: string) => {
    setUserData((prev) => prev ? { ...prev, [field]: value } : null);
  };

  const handleSave = async () => {
    if (!userData) return;
    setSaving(true);
    setError(null);

    const updateData = {
      firstName: userData.firstName,
      lastName: userData.lastName,
    };

    try {
      const res = await fetch(`/api/users/${userData.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to save user");
      }

      const updated = await res.json();
      const updatedUser = updated.user as User;
      setUserData({
        id: updatedUser.id,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
      });
      setInitialData(updatedUser);
      toast.success("Profile updated successfully!");
    } catch (e: any) {
      setError(e.message || "An unknown error occurred during saving.");
      toast.error(e.message || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  const isDataChanged = useMemo(() => {
    if (!userData || !initialData) return false;
    return (
      userData.firstName !== initialData.firstName ||
      userData.lastName !== initialData.lastName
    );
  }, [userData, initialData]);

  if (!currentUser) return null;

  const displayName = initialData?.firstName || currentUser.firstName || "User";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white w-full max-w-md rounded-xl shadow-2xl p-6 relative overflow-y-auto max-h-[90vh]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-gray-600 hover:bg-red-100 hover:text-red-600 transition-colors"
          aria-label="Close"
        >
          <CloseIcon className="h-6 w-6" />
        </button>

        <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-2">{displayName}'s Profile</h2>

        {loading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-500 mr-2" />
            <p className="text-gray-500">Loading profile...</p>
          </div>
        ) : userData && initialData ? (
          <div className="space-y-4">
            {error && (
                <div className="p-3 bg-red-50 text-red-600 border border-red-200 rounded text-sm">
                    **Error:** {error}
                </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-600 block mb-1">First Name</label>
              <Input value={userData.firstName} onChange={(e) => handleChange("firstName", e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 block mb-1">Last Name</label>
              <Input value={userData.lastName} onChange={(e) => handleChange("lastName", e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 block mb-1">Email</label>
              <Input type="email" value={userData.email} disabled className="bg-gray-100 cursor-not-allowed" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 block mb-1">Role</label>
              <Input value={initialData.role} disabled className="bg-gray-100 cursor-not-allowed" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 block mb-1">Affiliated Hospital</label>
              <Input value={initialData.hospitalName ?? "Not affiliated with a hospital"} disabled className="bg-gray-100 cursor-not-allowed" />
            </div>

            <div className="flex justify-between items-center pt-4 border-t mt-6">
              <Button variant="destructive" onClick={logout}>Logout</Button>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={onClose}>Close</Button>
                <Button onClick={handleSave} disabled={saving || !isDataChanged}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">Profile data not available</p>
        )}
      </div>
    </div>
  );
}