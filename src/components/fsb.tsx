import React, { useState, useEffect } from 'react';
import { ShieldCheck, AlertCircle, HelpCircle, CheckCircle2, Clock } from 'lucide-react';
import { JobCard } from '../types';

interface FsbRecord {
  fsb_id: number;
  job_card_id: number;
  fsb_status: 'Settled' | 'Rejected' | 'Deviation';
}

export default function FsbManager() {
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [fsbRecords, setFsbRecords] = useState<FsbRecord[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<'Settled' | 'Rejected' | 'Deviation'>('Settled');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [jcRes, fsbRes] = await Promise.all([
        fetch('/api/job-cards'),
        fetch('/api/fsb')
      ]);
      const jcData = await jcRes.json();
      const fsbData = await fsbRes.json();
      setJobCards(Array.isArray(jcData) ? jcData : (jcData.jobCards || []));
      setFsbRecords(fsbData);
    } catch (e) {
      console.error('Failed to load FSB data:', e);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJobId) return;

    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/fsb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_card_id: selectedJobId,
          fsb_status: selectedStatus
        })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: 'FSB status updated successfully!' });
        fetchData();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update FSB status.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const getFsbStatusForJob = (jobId: number): 'Settled' | 'Rejected' | 'Deviation' | 'Pending' => {
    const record = fsbRecords.find(r => Number(r.job_card_id) === Number(jobId));
    return record ? record.fsb_status : 'Pending';
  };

  const getBadgeClass = (status: string) => {
    switch (status) {
      case 'Settled':
        return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
      case 'Rejected':
        return 'bg-rose-100 text-rose-800 border border-rose-200';
      case 'Deviation':
        return 'bg-amber-100 text-amber-800 border border-amber-200';
      default:
        return 'bg-slate-100 text-slate-600 border border-slate-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Settled':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'Rejected':
        return <AlertCircle className="w-4 h-4 text-rose-600" />;
      case 'Deviation':
        return <HelpCircle className="w-4 h-4 text-amber-600" />;
      default:
        return <Clock className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-8 h-8 text-indigo-600" />
            Field Service Bulletin (FSB) Status Control
          </h1>
          <p className="text-slate-500 mt-1">
            Manage, verify, and audit FSB claims and approval status for all vehicle job cards.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Panel */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6 h-fit">
          <h2 className="text-xl font-bold text-slate-800">Update Status</h2>
          
          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Select Active Job Card</label>
              <select
                className="w-full bg-slate-50 border border-slate-300 text-slate-950 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                value={selectedJobId || ''}
                onChange={(e) => {
                  const jId = Number(e.target.value);
                  setSelectedJobId(jId);
                  const currentStatus = getFsbStatusForJob(jId);
                  if (currentStatus !== 'Pending') {
                    setSelectedStatus(currentStatus);
                  } else {
                    setSelectedStatus('Settled');
                  }
                }}
                required
              >
                <option value="">-- Select Job Card --</option>
                {jobCards.map((jc) => (
                  <option key={jc.job_id} value={jc.job_id}>
                    {jc.job_card_no} - {jc.vrn} ({jc.vehicle_model})
                  </option>
                ))}
              </select>
            </div>

            {selectedJobId && (
              <div className="space-y-4">
                <label className="block text-sm font-semibold text-slate-700">FSB Settlement Status</label>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { value: 'Settled', desc: 'Claim accepted and settled by OEM', color: 'text-emerald-700 bg-emerald-50 border-emerald-300' },
                    { value: 'Rejected', desc: 'OEM rejected the bulletin claim', color: 'text-rose-700 bg-rose-50 border-rose-300' },
                    { value: 'Deviation', desc: 'Approved under special business deviation', color: 'text-amber-700 bg-amber-50 border-amber-300' }
                  ].map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex items-start p-4 rounded-xl border cursor-pointer hover:shadow-sm transition ${
                        selectedStatus === opt.value
                          ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600/10'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                      }`}
                    >
                      <input
                        type="radio"
                        name="fsb_status"
                        value={opt.value}
                        checked={selectedStatus === opt.value}
                        onChange={() => setSelectedStatus(opt.value as any)}
                        className="mt-1 mr-3 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300"
                      />
                      <div>
                        <span className="block font-bold text-slate-900">{opt.value}</span>
                        <span className="block text-xs text-slate-500 mt-0.5">{opt.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {message && (
              <div className={`p-4 rounded-xl border text-sm font-medium ${
                message.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}>
                {message.text}
              </div>
            )}

            <button
              type="submit"
              disabled={!selectedJobId || loading}
              className={`w-full p-4 rounded-xl text-white font-semibold transition ${
                !selectedJobId || loading
                  ? 'bg-slate-300 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98]'
              }`}
            >
              {loading ? 'Saving Status...' : 'Save FSB Status'}
            </button>
          </form>
        </div>

        {/* List Panel */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-800">Job Cards Status Overview</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                  <th className="p-4 pl-6">Job Card No</th>
                  <th className="p-4">VRN</th>
                  <th className="p-4">Vehicle Model</th>
                  <th className="p-4">FSB status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {jobCards.map((jc) => {
                  const status = getFsbStatusForJob(jc.job_id);
                  return (
                    <tr key={jc.job_id} className="hover:bg-slate-50/50 transition">
                      <td className="p-4 pl-6 font-semibold text-slate-900">{jc.job_card_no}</td>
                      <td className="p-4">{jc.vrn}</td>
                      <td className="p-4">{jc.vehicle_model}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${getBadgeClass(status)}`}>
                          {getStatusIcon(status)}
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {jobCards.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400">
                      No active job cards found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
