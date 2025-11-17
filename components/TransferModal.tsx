"use client"

import { useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Hospital } from "@/types"

export default function TransferModal({ open, onClose, hospitals, fromHospital, fromWards, onSubmit }) {
  const [count, setCount] = useState(1)
  const [fromWard, setFromWard] = useState("")
  const [toHospital, setToHospital] = useState("")
  const [toWard, setToWard] = useState("")

  const filteredHospitals = hospitals.filter(h => h.id !== fromHospital.id)
  const selectedHospital = filteredHospitals.find(h => h.id === toHospital)
  const toWards = selectedHospital ? selectedHospital.wards.map(w => w.name) : []

  const facilitiesWithCapacity = filteredHospitals.filter(h => h.availableBeds > 0)

  return open ? (
    <div className="fixed inset-0 bg-background1/40 flex items-center justify-center z-50 p-2">
      <Card className="w-full max-w-sm p-2 py-4 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Transfer Patients</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2">
            <span className="text-sm">Number of Patients</span>
            <Input type="number" min={1} value={count} onChange={e => setCount(Number(e.target.value))} />
          </div>
        <div className="flex justify-center gap-8">
            <div className="flex flex-col gap-2">
                <span className="text-sm">From Ward</span>
                <Select onValueChange={setFromWard} value={fromWard}>
                <SelectTrigger>
                    <SelectValue placeholder="Select ward" />
                </SelectTrigger>
                <SelectContent>
                    {fromWards.map(w => (
                    <SelectItem key={w} value={w}>{w}</SelectItem>
                    ))}
                </SelectContent>
                </Select>
            </div>

            <div className="flex flex-col gap-2">
                <span className="text-sm">To Facility</span>
                <Select onValueChange={setToHospital} value={toHospital}>
                <SelectTrigger>
                    <SelectValue placeholder="Select facility" />
                </SelectTrigger>
                <SelectContent>
                    {filteredHospitals.map(h => (
                    <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                    ))}
                </SelectContent>
                </Select>
            </div>
          </div>

          {toHospital && (
            <div className="flex flex-col gap-2">
              <span className="text-sm">To Ward</span>
              <Select onValueChange={setToWard} value={toWard}>
                <SelectTrigger>
                  <SelectValue placeholder="Select ward" />
                </SelectTrigger>
                <SelectContent>
                  {toWards.map(w => (
                    <SelectItem key={w} value={w}>{w}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {facilitiesWithCapacity.length > 0 && (
            <div className="text-sm">
              Suggested Facilities
              <ul className="list-disc ml-4 mt-1">
                {facilitiesWithCapacity.map(h => (
                  <li key={h.id}>{h.name} ({h.availableBeds} beds)</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={() => onSubmit({ count, fromWard, toHospital, toWard })}>Transfer</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  ) : null
}
