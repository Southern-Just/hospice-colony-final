'use client';

import { useState, useEffect } from "react";
import {
  LayoutDashboardIcon,
  HospitalIcon,
  BedIcon,
  BarChart3Icon,
  SettingsIcon,
  BellIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dashboard } from "@/components/Dashboard";
import  BedArrangement  from "@/components/BedArrangement";
import { HospitalPartners } from "@/components/HospitalPartners";
import { Analytics } from "@/components/Analytics";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const useCountUp = (endValue: number, duration = 1000) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const increment = endValue / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= endValue) {
        start = endValue;
        clearInterval(timer);
      }
      setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [endValue, duration]);
  return count;
};

const mockStats = {
  totalBeds: 120,
  availableBeds: 45,
  occupiedBeds: 75,
  partneredHospitals: 5,
  hospitals: [
    { id: 1, name: "City Hospital" },
    { id: 2, name: "Green Valley Hospital" },
    { id: 3, name: "Sunrise Medical Center" },
    { id: 4, name: "Riverdale Clinic" },
    { id: 5, name: "Lakeside Hospital" },
  ],
};

export default function HomePage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [stats, setStats] = useState({
    totalBeds: 0,
    availableBeds: 0,
    occupiedBeds: 0,
    partneredHospitals: 0,
  });
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [selectedHospital, setSelectedHospital] = useState<any>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setStats({
        totalBeds: mockStats.totalBeds,
        availableBeds: mockStats.availableBeds,
        occupiedBeds: mockStats.occupiedBeds,
        partneredHospitals: mockStats.partneredHospitals,
      });
      setHospitals(mockStats.hospitals);
      if (!selectedHospital) setSelectedHospital(mockStats.hospitals[0]);
    }, 300);
    return () => clearTimeout(timer);
  }, [selectedHospital]);

  const animatedTotalBeds = useCountUp(stats.totalBeds, 1200);
  const animatedAvailableBeds = useCountUp(stats.availableBeds, 1200);
  const animatedOccupiedBeds = useCountUp(stats.occupiedBeds, 1200);
  const animatedPartneredHospitals = useCountUp(stats.partneredHospitals, 1200);

  return (
    <div className="min-h-screen healthcare-home-bg">
      <header className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <HospitalIcon className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold">Hospice Colony</span>
              </div>
              <Badge variant="outline" className="hidden md:flex">
                sajoh - Swarm Algorithm 001
              </Badge>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="outline" size="sm">
                <BellIcon className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Alerts</span>
              </Button>
              <Button variant="outline" size="sm">
                <SettingsIcon className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Settings</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-none lg:inline-flex">
            <TabsTrigger value="dashboard"><LayoutDashboardIcon className="w-4 h-4" /> Dashboard</TabsTrigger>
            <TabsTrigger value="partners"><HospitalIcon className="w-4 h-4" /> Partners</TabsTrigger>
            <TabsTrigger value="beds"><BedIcon className="w-4 h-4" /> Bed Layout</TabsTrigger>
            <TabsTrigger value="analytics"><BarChart3Icon className="w-4 h-4" /> Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <div className="-mt-4">
              <Dashboard
                totalBeds={animatedTotalBeds}
                availableBeds={animatedAvailableBeds}
                occupiedBeds={animatedOccupiedBeds}
                partneredHospitals={animatedPartneredHospitals}
              />
            </div>
          </TabsContent>

          <TabsContent value="partners">
            <div className="-mt-4">
              <HospitalPartners />
            </div>
          </TabsContent>

          <TabsContent value="beds">
            <div className="-mt-4">
              {hospitals.length > 0 && (
                <Select
                  value={selectedHospital?.id?.toString() || ""}
                  onValueChange={(value) =>
                    setSelectedHospital(hospitals.find((h) => h.id.toString() === value) || null)
                  }
                >
                  <SelectTrigger><SelectValue placeholder="Select a hospital" /></SelectTrigger>
                  <SelectContent>
                    {hospitals.map((hospital) => (
                      <SelectItem key={hospital.id} value={hospital.id.toString()}>
                        {hospital.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <BedArrangement hospitalId={selectedHospital?.id || ""} />
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="-mt-4">
              <Analytics />
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <footer className="border-t bg-card mt-16">
        <div className="container mx-auto px-6 py-6 text-center text-sm text-muted-foreground">
          © 2025 Hospice Colony — Swarm-Based Bed Allocation System
        </div>
      </footer>
    </div>
  );
}
