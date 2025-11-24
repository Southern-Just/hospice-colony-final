"use client";

import { useEffect, useMemo, useState } from "react";
import { SearchIcon, UserIcon } from "lucide-react";
import { loadAcoHistory } from "@/lib/aco/history";

type RunRecord = {
  id: string;
  hospitalId?: string;
  initiator?: string;
  timestamp: string;
  durationMs?: number;
  score?: number;
  status?: "completed" | "failed" | "running";
  details?: string;
};

function tryParseDate(s?: string) {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export function Analytics() {
  const [loading, setLoading] = useState(true);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [query, setQuery] = useState("");
  const [filterHospital, setFilterHospital] = useState("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadAll() {
      try {
        setLoading(true);
        setError(null);

        const hres = await fetch("/api/hospitals");
        const hj = await hres.json();
        const hs = hj?.hospitals ?? [];
        if (!mounted) return;
        setHospitals(hs);

        const collected: RunRecord[] = [];

        for (const h of hs) {
          const id = h.id;
          let remoteRuns: any[] | null = null;

          const tryPaths = [
            `/api/hospitals/${id}/aco-runs`,
            `/api/hospitals/${id}/aco_runs`,
            `/api/hospitals/${id}/runs`,
            `/api/aco/runs?hospitalId=${id}`,
            `/api/aco/history?hospitalId=${id}`
          ];

          for (const p of tryPaths) {
            try {
              const r = await fetch(p, { cache: "no-store" });
              if (!r.ok) continue;
              const j = await r.json();
              if (Array.isArray(j?.runs)) remoteRuns = j.runs;
              else if (Array.isArray(j)) remoteRuns = j;
              else if (Array.isArray(j?.history)) remoteRuns = j.history;
              if (remoteRuns) break;
            } catch {
              continue;
            }
          }

          if (remoteRuns && remoteRuns.length) {
            for (const rr of remoteRuns) {
              collected.push({
                id: String(rr.id ?? rr.runId ?? `${id}-${Math.random()}`),
                hospitalId: id,
                initiator: rr.initiator ?? rr.user ?? rr.triggeredBy ?? "system",
                timestamp: rr.timestamp ?? rr.createdAt ?? new Date().toISOString(),
                durationMs: rr.durationMs ?? rr.duration,
                score: typeof rr.score === "number" ? rr.score : rr.scoreValue,
                status: rr.status ?? (rr.error ? "failed" : "completed"),
                details: rr.details ?? ""
              });
            }
            continue;
          }

          const local = loadAcoHistory(id);
          if (local && (local.count || local.lastTimestamp)) {
            const c = local.count || 0;
            const t = local.lastTimestamp ? tryParseDate(local.lastTimestamp) : new Date();
            if (c > 0) {
              collected.push({
                id: `local-${id}-last`,
                hospitalId: id,
                initiator: "local-cache",
                timestamp: t ? t.toISOString() : new Date().toISOString(),
                details: `Local history: ${c} run(s)`,
                status: "completed"
              });
            }
          }
        }

        collected.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        if (!mounted) return;
        setRuns(collected);
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.message ?? "Failed to load analytics");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadAll();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    return runs.filter(r => {
      if (filterHospital !== "all" && r.hospitalId !== filterHospital) return false;
      if (
        query &&
        !`${r.id} ${r.initiator} ${r.details} ${r.hospitalId}`
          .toLowerCase()
          .includes(query.toLowerCase())
      )
        return false;
      return true;
    });
  }, [runs, filterHospital, query]);

  const totalRuns = runs.length;
  const avgScore =
    runs.reduce((s, r) => s + (r.score ?? 0), 0) /
    Math.max(1, runs.filter(r => typeof r.score === "number").length);
  const lastRun = runs[0]?.timestamp ?? null;
  const recentRuns = runs.filter(r => {
    const d = tryParseDate(r.timestamp);
    if (!d) return false;
    return Date.now() - d.getTime() < 1000 * 60 * 60 * 24 * 7;
  }).length;
  const healthPercent = Math.max(0, Math.min(100, Math.round(avgScore || 0)));
  const avgDurationMs = Math.round(
    runs.reduce((s, r) => s + (r.durationMs ?? 0), 0) / Math.max(1, runs.length)
  );

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-xl font-bold">Simulation Console</h2>
        <p className="text-gray-600">ACO simulation runs, model scoring, system-wide optimization history</p>
      </div>



      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 border rounded-lg p-6 bg-white shadow-sm">
          <h3 className="text-lg font-semibold">Simulation Timeline</h3>
          <p className="text-gray-500 text-sm mb-4">Chronological run history</p>

          <div className="flex gap-3 mb-4">
            <div className="relative w-full">
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full border rounded px-3 py-2"
                placeholder="Search..."
              />
              <SearchIcon className="absolute right-2 top-2 h-4 w-4 text-gray-400" />
            </div>

            <select
              value={filterHospital}
              onChange={e => setFilterHospital(e.target.value)}
              className="border rounded px-2 py-2 text-sm"
            >
              <option value="all">All Facilities</option>
              {hospitals.map(h => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-auto border rounded">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 text-left">Run ID</th>
                  <th className="p-2 text-left">Hospital</th>
                  <th className="p-2 text-left">Initiator</th>
                  <th className="p-2 text-left">Score</th>
                  <th className="p-2 text-left">Duration</th>
                  <th className="p-2 text-left">Timestamp</th>
                  <th className="p-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const d = tryParseDate(r.timestamp);
                  return (
                    <tr key={r.id} className="border-b">
                      <td className="p-2 font-mono text-xs max-w-[160px] truncate">{r.id}</td>
                      <td className="p-2">{r.hospitalId ?? "network"}</td>
                      <td className="p-2 flex items-center gap-2">
                        <UserIcon className="h-4 w-4 text-gray-500" />
                        {r.initiator ?? "system"}
                      </td>
                      <td className="p-2">
                        {typeof r.score === "number" ? `${Math.round(r.score)}%` : "—"}
                      </td>
                      <td className="p-2">
                        {r.durationMs ? `${Math.round((r.durationMs || 0) / 1000)}s` : "—"}
                      </td>
                      <td className="p-2">{d ? d.toLocaleString() : r.timestamp}</td>
                      <td className="p-2">{r.status}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center p-4 text-gray-500 text-sm">No simulation runs found</div>
            )}
          </div>
        </div>

        <div className="border rounded-lg p-6 bg-white shadow-sm">
          <h3 className="text-lg font-semibold">Run Health Breakdown</h3>
          <p className="text-gray-500 text-sm mb-4">Distribution of outcomes</p>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Successful (≥ 75%)</span>
                <span>{runs.filter(r => (r.score ?? 0) >= 75).length}</span>
              </div>
              <progress
                value={
                  (runs.filter(r => (r.score ?? 0) >= 75).length / Math.max(1, runs.length)) *
                  100
                }
                max={100}
                className="w-full h-3 mt-2"
              ></progress>
            </div>

            <div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Moderate (50–74%)</span>
                <span>{runs.filter(r => (r.score ?? 0) >= 50 && (r.score ?? 0) < 75).length}</span>
              </div>
              <progress
                value={
                  (runs.filter(r => (r.score ?? 0) >= 50 && (r.score ?? 0) < 75).length /
                    Math.max(1, runs.length)) *
                  100
                }
                max={100}
                className="w-full h-3 mt-2"
              ></progress>
            </div>

            <div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Unstable (&lt;50% or failed)</span>
                <span>{runs.filter(r => (r.score ?? 0) < 50 || r.status === "failed").length}</span>
              </div>
              <progress
                value={
                  (runs.filter(r => (r.score ?? 0) < 50 || r.status === "failed").length /
                    Math.max(1, runs.length)) *
                  100
                }
                max={100}
                className="w-full h-3 mt-2"
              ></progress>
            </div>
          </div>
        </div>
      </section>
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <div className="rounded-xl p-6 bg-white shadow transition-all hover:shadow-md">
          <h3 className="text-lg font-semibold">Total Simulations</h3>
          <p className="text-gray-500 text-sm mb-4">All recorded optimization runs</p>
          <div className="text-4xl font-bold">{totalRuns}</div>
        </div>

        <div className="rounded-xl p-6 bg-white shadow transition-all hover:shadow-md">
          <h3 className="text-lg font-semibold">Model Health</h3>
          <p className="text-gray-500 text-sm mb-4">Average scoring</p>
          <div className="flex items-center gap-4">
            <span className="text-4xl font-bold">
              {Number.isFinite(avgScore) ? `${Math.round(avgScore)}%` : "—"}
            </span>
            <progress value={healthPercent} max={100} className="w-full h-3"></progress>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Last run: {lastRun ? new Date(lastRun).toLocaleString() : "—"}
          </p>
        </div>

        <div className="rounded-xl p-6 bg-white shadow transition-all hover:shadow-md">
          <h3 className="text-lg font-semibold">Performance</h3>
          <p className="text-gray-500 text-sm mb-4">Speed and activity</p>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Average Duration</span>
              <span>{avgDurationMs ? `${Math.round(avgDurationMs / 1000)}s` : "—"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Runs This Week</span>
              <span>{recentRuns}</span>
            </div>
          </div>
        </div>

      </section>
    </div>
  );
}
