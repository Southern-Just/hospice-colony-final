"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { Hospital, Ward } from "@/types";

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
  const [toHospital, setToHospital] = useState(fromHospital.id);
  const [toWard, setToWard] = useState("");
  const [isWorking, setIsWorking] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      document.body.style.overflow = "hidden";
    } else {
      setMounted(false);
      document.body.style.overflow = "";
    }
    return () => (document.body.style.overflow = "");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setCount(1);
    setFromWard(fromWards[0] ?? "");
    setToHospital(fromHospital.id);
  }, [open, fromHospital.id, fromWards]);

  const hospitalMap = useMemo(() => {
    const m: Record<string, Hospital> = {};
    for (const h of hospitals) m[h.id] = h;
    return m;
  }, [hospitals]);

  const destinationHospitals = useMemo(() => {
    const same = hospitalMap[fromHospital.id];
    const others = hospitals.filter((h) => h.id !== fromHospital.id);
    return [same, ...others];
  }, [hospitals, fromHospital.id, hospitalMap]);

  const targetWards = useMemo(() => {
    const h = hospitalMap[toHospital];
    if (!h) return [];

    return (h.wards ?? [])
      .filter((w) => w.name !== "General")
      .filter((w) => !(toHospital === fromHospital.id && w.name === fromWard))
      .filter((w) => (h.beds ?? []).filter((b) => b.wardId === w.id && b.status === "available").length > 0);
  }, [toHospital, fromWard, hospitalMap, fromHospital.id]);

  useEffect(() => {
    if (!toHospital || targetWards.length === 0) {
      setToWard("");
      return;
    }
    setToWard(targetWards[0].name);
  }, [toHospital, targetWards]);

  const facilitySuggestions = useMemo(() => {
    return hospitals.map((h) => {
      const wardStats = (h.wards ?? [])
        .filter((w) => w.name !== "General")
        .map((w) => ({
          id: w.id,
          name: w.name,
          free:
            (h.beds ?? []).filter(
              (b) => b.wardId === w.id && b.status === "available"
            ).length ?? 0,
        }))
        .filter((w) => w.free > 0);

      const totalAvailable = wardStats.reduce((s, w) => s + w.free, 0);

      return { ...h, wardStats, totalAvailable };
    });
  }, [hospitals]);

  const fetchBeds = async (hid: string) => {
    const res = await fetch(`/api/hospitals/${hid}/beds`, { cache: "no-store" });
    if (!res.ok) return [];
    const { beds } = await res.json();
    return beds ?? [];
  };

  const fetchHospitalFresh = async (hid: string) => {
    const res = await fetch(`/api/hospitals/${hid}`, { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    return json.hospital ?? json;
  };

  const updateTotals = async (hid: string, available: number, occupied: number) => {
    await fetch(`/api/hospitals/${hid}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ availableBeds: available, occupiedBeds: occupied }),
    });
  };

 const handleTransfer = async () => {
  if (isWorking) return;

  if (!fromWard || !toHospital || !toWard) {
    toast.error("Complete all fields");
    return;
  }

  if (toHospital === fromHospital.id && toWard === fromWard) {
    toast.error("Cannot transfer to the same ward");
    return;
  }

  if (count < 1) {
    toast.error("Count must be at least 1");
    return;
  }

  setIsWorking(true);

  try {
    const fromWardObj = fromHospital.wards.find((w) => w.name === fromWard);
    if (!fromWardObj) throw new Error("Source ward not found");

    const destHospital = hospitalMap[toHospital];
    if (!destHospital) throw new Error("Destination hospital not found");

    const toWardObj = destHospital.wards.find((w) => w.name === toWard);
    if (!toWardObj) throw new Error("Destination ward not found");

    const [allFromBeds, allToBeds] = await Promise.all([
      fetchBeds(fromHospital.id),
      fetchBeds(destHospital.id),
    ]);

    const occupiedFrom = allFromBeds.filter(
      (b) => b.wardId === fromWardObj.id && b.status === "occupied"
    );
    if (occupiedFrom.length < count) {
      toast.error(`Only ${occupiedFrom.length} patients available from ${fromWard}`);
      return;
    }

    const wardAvailable = allToBeds.filter(
      (b) => b.wardId === toWardObj.id && b.status === "available"
    );
    const wardFreeCount = wardAvailable.length;

    const hospitalFreeCount = allToBeds.filter((b) => b.status === "available").length;

    if (hospitalFreeCount < count) {
      toast.error("Exceeded maximum transfers to this hospital");
      return;
    }

    if (wardFreeCount < count) {
      toast.error("Exceeded maximum transfers to this ward");
      return;
    }

    const transfers: TransferItem[] = [];

    for (let i = 0; i < count; i++) {
      const from = occupiedFrom[i];
      const to = wardAvailable[i];

      await fetch(`/api/hospitals/${fromHospital.id}/beds`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...from, status: "available" }),
      });

      await fetch(`/api/hospitals/${destHospital.id}/beds`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...to, status: "occupied" }),
      });

      transfers.push({
        fromBed: from.bedNumber,
        toBed: to.bedNumber,
        toHospitalName: destHospital.name,
      });
    }

    const freshFrom = (await fetchHospitalFresh(fromHospital.id)) ?? fromHospital;
    const freshTo = (await fetchHospitalFresh(destHospital.id)) ?? destHospital;

    await updateTotals(
      fromHospital.id,
      (freshFrom.availableBeds ?? 0) + count,
      (freshFrom.occupiedBeds ?? 0) - count
    );

    await updateTotals(
      destHospital.id,
      (freshTo.availableBeds ?? 0) - count,
      (freshTo.occupiedBeds ?? 0) + count
    );

    onSubmit({
      count,
      fromWard,
      toHospital,
      toWard,
      transfers,
    });

    toast.success("Transfer completed");
    onClose();
  } catch (err) {
    toast.error("Transfer failed");
  } finally {
    setIsWorking(false);
  }
};


  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div
        className={`w-full max-w-md bg-white rounded-xl shadow-2xl p-6 transform transition-all duration-300 ${
          mounted ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
        }`}
      >
        <h2 className="mb-6 text-xl font-semibold tracking-tight">Transfer Patients</h2>

<<<<<<< HEAD
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
=======
        <div className="space-y-5">
          <div className="flex gap-4">
            <label className="block text-gray-700 text-sm py-2">Number of transfers</label>
            <input
              type="number"
              min={1}
              value={count}
              onChange={(e) => setCount(Math.max(1, Number(e.target.value)))}
              disabled={isWorking}
              className="w-50 px-3 py-2 bg-white border border-gray-300 outline-0 rounded-md text-sm"
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-1.5 text-sm">From Ward</label>
            <div className="flex gap-2">
              <div className="px-3 py-2.5 bg-gray-100 border border-gray-300 rounded-md w-1/2 text-sm truncate">
                {fromHospital.name}
              </div>

              <select
                value={fromWard}
                onChange={(e) => setFromWard(e.target.value)}
                disabled={isWorking}
                className="w-1/2 px-3 py-2.5 border border-gray-300 rounded-md text-sm"
              >
                {fromHospital.wards
                  .filter((w) => w.name !== "General")
                  .map((w) => (
                    <option key={w.id} value={w.name}>
                      {w.name}
                    </option>
                  ))}
              </select>
>>>>>>> a3f2879f4bafecc2ffc43a3decb0a111dc88863d
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 mb-1.5 text-sm">To Facility</label>
              <select
                value={toHospital}
                onChange={(e) => setToHospital(e.target.value)}
                disabled={isWorking}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm"
              >
                {destinationHospitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} {h.id === fromHospital.id ? "(My Hospital)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-700 mb-1.5 text-sm">To Ward</label>
              <select
                value={toWard}
                onChange={(e) => setToWard(e.target.value)}
                disabled={isWorking}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm"
              >
                {targetWards.map((w) => (
                  <option key={w.id} value={w.name}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="text-gray-700 mb-2 text-sm font-medium">Suggestions</div>
            <div className="bg-gray-50 rounded-md p-3 border border-gray-200 space-y-2">
              {facilitySuggestions.map((h) => (
                <button
                  key={h.id}
                  onClick={() => {
                    setToHospital(h.id);
                    if (h.wardStats.length > 0) setToWard(h.wardStats[0].name);
                  }}
                  className="w-full text-left px-3 py-2.5 rounded hover:bg-gray-200 text-sm"
                >
                  <div className="font-medium text-gray-800">{h.name}</div>

                  <div className="text-xs text-gray-600 overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-gray-400">
                    {h.totalAvailable} available
                    {h.wardStats.map((w) => (
                      <span key={w.id} className="ml-2">
                        | {w.free} {w.name}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              disabled={isWorking}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-md text-sm"
            >
              Cancel
            </button>

            <button
              onClick={handleTransfer}
              disabled={isWorking}
              className="flex-1 px-4 py-2.5 bg-green-500 text-white rounded-md text-md"
            >
              {isWorking ? "Transferring..." : "Transfer"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
