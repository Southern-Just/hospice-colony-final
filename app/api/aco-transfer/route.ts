import { NextResponse } from "next/server"
import { getTransferSuggestions, applySuggestedTransfer } from "@/lib/aco/transferAdvisor"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const hid = url.searchParams.get("s") || ""
  const res = await getTransferSuggestions(hid)
  return NextResponse.json(res)
}

export async function POST(req: Request) {
  const body = await req.json()
  const { fromHospitalId, toHospitalId, count } = body
  const res = await applySuggestedTransfer(fromHospitalId, toHospitalId, count)
  return NextResponse.json(res)
}
