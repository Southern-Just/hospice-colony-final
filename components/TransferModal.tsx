"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { toast } from "sonner";
import type { Hospital, Ward, Bed } from "@/types";

type TransferItem = {
  fromBed: string | number;
  toBed: string | number;
  toHospitalName: string;
};

type TransferResult = {
  count: number;
  fromWard: string;
  toHospital: string;
  toWard: string;
  transfers: TransferItem[];
};

export default function TransferModal(props: {
  open: boolean;
  onClose: () => void;
  hospitals: Hospital[];
  fromHospital: Hospital;
  fromWards: string[];
  onSubmit: (result: TransferResult) => void;
}) {
  const { open, onClose, hospitals, fromHospital, fromWards, onSubmit } = props;

  const [count, setCount] = useState(1);
  const [fromWard, setFromWard] = useState(fromWards[0] ?? "");
  const [toHospital, setToHospital] = useState("");
  const [toWard, setToWard] = useState("");
  const [isWorking, setIsWorking] = useState(false);

  useEffect(() => {
    setFromWard(fromWards[0] ?? "");
    setToHospital("");
    setToWard("");
    setCount(1);
  }, [fromHospital.id, fromWards, open]);

  const hospitalMap = useMemo(() => {
    const m: Record<string, Hospital> = {};
    for (const h of hospitals) m[h.id] = h;
    return m;
  }, [hospitals]);

  const selectedHospital = toHospital ? hospitalMap[toHospital] : null;

  useEffect(() => {
    if (!toHospital) {
      const h = hospitalMap[fromHospital.id];
      if (!h) return;
      const m = h.wards?.find((w) => w.name.toLowerCase() === fromWard.toLowerCase());
      setToWard(m ? m.name : h.wards?.[0]?.name ?? "");
      return;
    }
    const h = hospitalMap[toHospital];
    if (!h) return;
    const m = h.wards?.find((w) => w.name.toLowerCase() === fromWard.toLowerCase());
    setToWard(m ? m.name : h.wards?.[0]?.name ?? "");
  }, [toHospital, fromWard, hospitalMap, fromHospital.id]);

  const targetWards = useMemo(() => {
    const list = selectedHospital?.wards ?? hospitalMap[fromHospital.id]?.wards ?? [];
    if (!selectedHospital || selectedHospital.id === fromHospital.id) {
      return list.filter((w) => w.name !== fromWard);
    }
    return list;
  }, [selectedHospital, fromHospital.id, fromWard, hospitalMap]);

  const facilitiesWithCapacity = useMemo(
    () => hospitals.filter((h) => (h.availableBeds ?? 0) > 0),
    [hospitals]
  );

  const fetchBedsForHospital = async (hid: string) => {
    const res = await fetch(`/api/hospitals/${hid}/beds`, { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json();
    return json.beds ?? [];
  };

  const fetchHospital = async (hid: string) => {
    const res = await fetch(`/api/hospitals/${hid}`, { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    return json.hospital ?? json;
  };

  const updateHospitalTotals = async (hid: string, available: number, occupied: number) => {
    await fetch(`/api/hospitals/${hid}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ availableBeds: available, occupiedBeds: occupied }),
    });
  };

  const handleTransfer = async () => {
    if (isWorking) return;
    if (!fromWard || !toWard || !toHospital) {
      toast.error("Complete all fields");
      return;
    }
    if (count < 1) {
      toast.error("Count must be at least 1");
      return;
    }

    setIsWorking(true);

    try {
      const fromWardObj = fromHospital.wards.find((w) => w.name === fromWard);
      if (!fromWardObj) {
        toast.error("Source ward not found");
        setIsWorking(false);
        return;
      }

      const toHospitalObj = hospitalMap[toHospital];
      if (!toHospitalObj) {
        toast.error("Target hospital not found");
        setIsWorking(false);
        return;
      }

      const toWardObj = toHospitalObj.wards.find((w) => w.name === toWard);
      if (!toWardObj) {
        toast.error("Target ward not found");
        setIsWorking(false);
        return;
      }

      const [allFromBeds, allToBeds] = await Promise.all([
        fetchBedsForHospital(fromHospital.id),
        fetchBedsForHospital(toHospitalObj.id),
      ]);

      const occupiedFrom = allFromBeds.filter(
        (b) => b.wardId === fromWardObj.id && b.status === "occupied"
      );

      if (occupiedFrom.length < count) {
        toast.error(`Only ${occupiedFrom.length} patients available to transfer`);
        setIsWorking(false);
        return;
      }

      const availableTo = allToBeds.filter(
        (b) => b.wardId === toWardObj.id && b.status === "available"
      );

      if (availableTo.length < count) {
        toast.error(`Only ${availableTo.length} free beds in ${toWard}`);
        setIsWorking(false);
        return;
      }

      const transfers: TransferItem[] = [];

      for (let i = 0; i < count; i++) {
        const from = occupiedFrom[i];
        const to = availableTo[i];

        await fetch(`/api/hospitals/${fromHospital.id}/beds`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: from.id,
            wardId: from.wardId,
            bedNumber: from.bedNumber,
            status: "available",
          }),
        });

        await fetch(`/api/hospitals/${toHospitalObj.id}/beds`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: to.id,
            wardId: to.wardId,
            bedNumber: to.bedNumber,
            status: "occupied",
          }),
        });

        transfers.push({
          fromBed: from.bedNumber,
          toBed: to.bedNumber,
          toHospitalName: toHospitalObj.name,
        });

        toast.success(
          `Patient ${from.bedNumber} → ${to.bedNumber} at ${toHospitalObj.name}`
        );
      }

      const freshFrom = (await fetchHospital(fromHospital.id)) ?? fromHospital;
      const freshTo = (await fetchHospital(toHospitalObj.id)) ?? toHospitalObj;

      await updateHospitalTotals(
        fromHospital.id,
        (freshFrom.availableBeds ?? 0) + count,
        (freshFrom.occupiedBeds ?? 0) - count
      );

      await updateHospitalTotals(
        toHospitalObj.id,
        (freshTo.availableBeds ?? 0) - count,
        (freshTo.occupiedBeds ?? 0) + count
      );

      onSubmit({
        count,
        fromWard,
        toHospital: toHospitalObj.id,
        toWard,
        transfers,
      });

      onClose();
    } catch {
      toast.error("Transfer failed");
    } finally {
      setIsWorking(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <Card className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
        <CardHeader className="px-6 py-4 bg-gradient-to-r from-sky-50 to-white">
          <CardTitle className="text-lg font-semibold">Transfer Patients</CardTitle>
        </CardHeader>

        <CardContent className="px-6 pb-6 pt-4 space-y-4">
          <div className="grid gap-4">
            <div className="flex flex-col items-center gap-4">
              <div className="w-full text-sm text-gray-600">Number of Patients to transfer</div>
              <Input
                type="number"
                min={1}
                value={count}
                onChange={(e) => setCount(Math.max(1, Number(e.target.value)))}
                className="max-w-[120px]"
                disabled={isWorking}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 flex">
                <div className="text-sm text-gray-600">From Ward ( where the bed is)</div>
                <Select value={fromWard} onValueChange={setFromWard}>
                  <SelectTrigger />
                  <SelectContent>
                    {fromWards.map((w) => (
                      <SelectItem key={w} value={w}>
                        {w}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 flex gap-2 w-full">
                <div className="text-sm text-gray-600">To Facility</div>
                <Select value={toHospital} onValueChange={setToHospital}>
                  <SelectTrigger />
                  <SelectContent>
                    {hospitals.map((h) => (
                      <SelectItem key={h.id} value={h.id}>
                        {h.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2 flex w-full">
              <div className="text-sm text-gray-600">To Ward</div>
              <div className=""><Select value={toWard} onValueChange={setToWard}>
                <SelectTrigger />
                <SelectContent>
                  {targetWards.length ? (
                    targetWards.map((w: Ward) => (
                      <SelectItem key={w.id} value={w.name}>
                        {w.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="">No wards</SelectItem>
                  )}
                </SelectContent>
              </Select></div>
            </div>

            <div className="text-sm">
              <div className="font-medium text-gray-700">Suggestions</div>
              <div className="text-xs text-gray-500 mt-2">
                {facilitiesWithCapacity.length ? (
                  <ul className="list-disc ml-5">
                    {facilitiesWithCapacity.map((h) => (
                      <li key={h.id}>{h.name} — {h.availableBeds ?? 0}</li>
                    ))}
                  </ul>
                ) : (
                  <span>No available facilities</span>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={onClose} disabled={isWorking}>
                Cancel
              </Button>
              <Button onClick={handleTransfer} disabled={isWorking}>
                {isWorking ? "Transferring..." : "Transfer"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
