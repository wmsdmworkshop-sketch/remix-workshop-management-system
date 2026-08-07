import React, { useState, useEffect } from "react";
import { Search, FileText, CheckCircle2, AlertTriangle, XCircle, Code, Eye, RefreshCw } from "lucide-react";

export interface ExternalApiAuditLog {
  id: string;
  systemId: string;
  apiName: string;
  userId?: string;
  userName?: string;
  branchId?: string;
  branchName?: string;
  moduleId?: string;
  moduleName?: string;
  correlationId: string;
  requestTime: string;
  responseTime?: string;
  durationMs?: number;
  statusCode?: number;
  status: 'SUCCESS' | 'ERROR' | 'TIMEOUT' | 'CIRCUIT_OPEN';
  requestPayload?: any;
  responsePayload?: any;
  errorMessage?: string;
  createdAt: string;
}

export default function ApiLogsViewer() {
  const [logs, setLogs] = useState<ExternalApiAuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterSystem, setFilterSystem] = useState("ALL");
  const [selectedLog, setSelectedLog] = useState<ExternalApiAuditLog | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const url = filterSystem === "ALL" ? "/api/platform/logs" : `/api/platform/logs?systemId=${filterSystem}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setLogs(json.data);
        }
      }
    } catch (e) {
      console.warn("Failed to fetch API logs", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [filterSystem]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-5 shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">External Interactions Audit Log</h3>
            <p className="text-xs text-zinc-400">Immutable trace log capturing all gateway API requests & responses</p>
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
            onClick={fetchLogs}
            disabled={loading}
            className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors border border-zinc-700"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-zinc-900/90 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-300">
              <thead className="bg-zinc-950/60 text-xs font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th className="px-5 py-3.5">API & System</th>
                  <th className="px-5 py-3.5">User / Branch / Module</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Duration</th>
                  <th className="px-5 py-3.5 text-right">Correlation ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-mono text-xs">
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className={`cursor-pointer transition-colors ${
                      selectedLog?.id === log.id ? "bg-orange-500/10" : "hover:bg-zinc-800/30"
                    }`}
                  >
                    <td className="px-5 py-4">
                      <div className="font-bold text-white flex items-center gap-2 font-sans">
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-800 text-orange-400 border border-zinc-700">
                          {log.systemId}
                        </span>
                        {log.apiName}
                      </div>
                      <div className="text-[11px] text-zinc-400 font-mono mt-0.5">{new Date(log.requestTime).toLocaleTimeString()}</div>
                    </td>
                    <td className="px-5 py-4 font-sans text-xs">
                      <div className="font-semibold text-zinc-200">{log.userName || "System Gateway"}</div>
                      <div className="text-[11px] text-zinc-400">{log.branchName || "Pune Main"} • {log.moduleName || "Platform"}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                        log.status === "SUCCESS"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      }`}>
                        {log.status} ({log.statusCode || 200})
                      </span>
                    </td>
                    <td className="px-5 py-4 font-bold text-white">{log.durationMs || 0} ms</td>
                    <td className="px-5 py-4 text-right text-zinc-400 truncate max-w-xs">{log.correlationId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Log Drawer */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-5 shadow-xl space-y-4">
          <h4 className="text-sm font-bold text-white flex items-center gap-2 border-b border-zinc-800 pb-3">
            <Code className="w-4 h-4 text-orange-500" /> Log Trace Detail
          </h4>

          {selectedLog ? (
            <div className="space-y-3 text-xs font-mono">
              <div>
                <span className="text-zinc-500 block uppercase font-sans font-bold">Correlation ID</span>
                <span className="text-orange-400 font-bold">{selectedLog.correlationId}</span>
              </div>

              <div>
                <span className="text-zinc-500 block uppercase font-sans font-bold">Request Payload</span>
                <pre className="bg-zinc-950 p-3 rounded border border-zinc-800 text-zinc-300 overflow-x-auto max-h-40">
                  {JSON.stringify(selectedLog.requestPayload || {}, null, 2)}
                </pre>
              </div>

              <div>
                <span className="text-zinc-500 block uppercase font-sans font-bold">Response Payload</span>
                <pre className="bg-zinc-950 p-3 rounded border border-zinc-800 text-emerald-400 overflow-x-auto max-h-40">
                  {JSON.stringify(selectedLog.responsePayload || selectedLog.errorMessage || {}, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <div className="text-xs text-zinc-500 text-center py-12">
              Select any log entry from the list to view payload trace.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
