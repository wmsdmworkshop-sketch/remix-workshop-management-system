import React, { useState, useEffect } from "react";
import { RefreshCw, Play, Clock, AlertTriangle, CheckCircle, Layers, Shield, Filter } from "lucide-react";

export interface SyncQueueItem {
  id: string;
  systemId: string;
  entityType: string;
  sourceRecordId: string;
  payload: any;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  retryCount: number;
  maxRetries: number;
  nextRunAt: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

export default function SyncQueueViewer() {
  const [queue, setQueue] = useState<SyncQueueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterSystem, setFilterSystem] = useState<string>("ALL");
  const [retrying, setRetrying] = useState(false);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/platform/sync/queue");
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setQueue(json.data);
        }
      }
    } catch (e) {
      console.warn("Failed to fetch sync queue", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleRetryAll = async () => {
    setRetrying(true);
    try {
      const res = await fetch("/api/platform/sync/retry", { method: "POST" });
      if (res.ok) {
        await fetchQueue();
      }
    } catch (e) {
      console.warn("Failed to retry queue items", e);
    } finally {
      setRetrying(false);
    }
  };

  const filtered = queue.filter(q => filterSystem === "ALL" || q.systemId.toUpperCase() === filterSystem.toUpperCase());

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-5 shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Synchronization Queue Manager</h3>
            <p className="text-xs text-zinc-400">Inspect pending and deferred entity sync payloads</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={filterSystem}
            onChange={(e) => setFilterSystem(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
          >
            <option value="ALL">All Systems</option>
            <option value="TMSA">TMSA</option>
            <option value="DMS">DMS</option>
            <option value="FLEETEDGE">FleetEdge</option>
          </select>

          <button
            onClick={handleRetryAll}
            disabled={retrying}
            className="flex items-center gap-2 px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs rounded-lg transition-colors shadow"
          >
            <Play className={`w-3.5 h-3.5 ${retrying ? "animate-spin" : ""}`} />
            Trigger Sync Retry
          </button>
        </div>
      </div>

      <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-300">
            <thead className="bg-zinc-950/60 text-xs font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-800">
              <tr>
                <th className="px-5 py-3.5">Queue ID</th>
                <th className="px-5 py-3.5">System</th>
                <th className="px-5 py-3.5">Entity Type</th>
                <th className="px-5 py-3.5">Source Record ID</th>
                <th className="px-5 py-3.5">Priority</th>
                <th className="px-5 py-3.5">Retry Status</th>
                <th className="px-5 py-3.5 text-right">Created At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-mono text-xs">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="px-5 py-4 font-bold text-white">{item.id}</td>
                  <td className="px-5 py-4">
                    <span className="px-2 py-0.5 rounded bg-zinc-800 text-orange-400 border border-zinc-700">
                      {item.systemId}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-zinc-200">{item.entityType}</td>
                  <td className="px-5 py-4 text-zinc-300">{item.sourceRecordId}</td>
                  <td className="px-5 py-4">
                    <span className={`px-2 py-0.5 rounded font-bold ${
                      item.priority === 'CRITICAL' || item.priority === 'HIGH'
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : 'bg-zinc-800 text-zinc-300'
                    }`}>
                      {item.priority}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-amber-400 font-bold">{item.retryCount} / {item.maxRetries}</span>
                    {item.lastError && (
                      <div className="text-[10px] text-rose-400 font-sans mt-0.5 truncate max-w-xs">{item.lastError}</div>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right text-zinc-400">
                    {new Date(item.createdAt).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-zinc-500 font-sans">
                    No pending items in synchronization queue.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
