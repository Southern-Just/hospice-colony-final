"use client"
import { useState, useEffect } from "react"
import { Button } from "./ui/button"
import { toast } from "sonner"

export default function AlgoTransferModal({ open, onClose, hospitalId }: any) {
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState([])

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch("/api/aco-transfer?s=" + hospitalId)
      .then(r => r.json())
      .then(j => setSuggestions(j.suggestions || []))
      .finally(() => setLoading(false))
  }, [open])

  const applyTransfer = async (toHospitalId: string, count: number) => {
    toast.promise(
      fetch("/api/aco-transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromHospitalId: hospitalId, toHospitalId, count })
      })
        .then(r => r.json())
        .then(() => onClose()),
      {
        loading: "Transferring…",
        success: "Transfer complete",
        error: "Transfer failed"
      }
    )
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white p-6 rounded-xl w-full max-w-md space-y-4">
        <h2 className="text-xl font-semibold">Hospice::Colony Transfer Suggestions</h2>
        {loading && <p>Loading…</p>}
        {!loading && suggestions.length === 0 && <p>No suggestions available</p>}
        {!loading && suggestions.map((s: any) => (
          <button
            key={s.hospitalId}
            className="w-full text-left p-3 border rounded-lg hover:bg-gray-100"
            onClick={() => applyTransfer(s.hospitalId, 1)}
          >
            <p className="font-medium">{s.hospitalName}</p>
            <p className="text-sm text-gray-600">{s.free} free beds</p>
          </button>
        ))}
        <Button className="w-full" onClick={onClose}>Close</Button>
      </div>
    </div>
  )
}
