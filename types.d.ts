// types.d.ts

export interface Bed {
  id: number;
  hospitalId: number;
  wardId: number | null;
  status: string;
  bedNumber: string;
  priority: string;
};
export interface Ward {
  id: string;
  name: string;
  totalBeds: number;
  availableBeds: number;
  occupiedBeds: number;
  maintenanceBeds?: number;
  notes?: string;
}

export interface Hospital {
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
  wards?: Ward[];
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  website?: string;
  notes?: string;
  createdBy?: string;
 };
export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  hospitalId: string;
}
