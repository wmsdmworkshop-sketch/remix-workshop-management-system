import React from 'react';

export default function TruckInfoCard({ job, className = '' }: { job: any, className?: string }) {
  if (!job) return null;

  return (
    <div className={`relative w-full max-w-lg mx-auto ${className}`}>
      {/* Truck Vector SVG */}
      <svg viewBox="0 0 800 400" className="w-full drop-shadow-xl" xmlns="http://www.w3.org/2000/svg">
        {/* Cab */}
        <path d="M 600 150 L 700 150 C 720 150, 740 170, 750 200 L 780 280 C 785 290, 790 310, 780 320 L 600 320 Z" fill="#1e293b" />
        <rect x="620" y="160" width="80" height="70" rx="10" fill="#94a3b8" />
        <rect x="630" y="170" width="60" height="50" rx="5" fill="#f8fafc" opacity="0.6" />
        
        {/* Wheels */}
        <circle cx="150" cy="340" r="40" fill="#0f172a" stroke="#64748b" strokeWidth="6" />
        <circle cx="150" cy="340" r="20" fill="#475569" />
        <circle cx="680" cy="340" r="40" fill="#0f172a" stroke="#64748b" strokeWidth="6" />
        <circle cx="680" cy="340" r="20" fill="#475569" />
        
        {/* Cargo Body (where info goes) */}
        <rect x="20" y="50" width="560" height="270" rx="15" fill="#334155" stroke="#475569" strokeWidth="4" />
        
        {/* Stripe */}
        <rect x="20" y="180" width="560" height="20" fill="#ef4444" />
      </svg>
      
      {/* Information Overlay */}
      <div className="absolute inset-0 left-[5%] top-[15%] w-[65%] h-[60%] flex flex-col justify-center text-white p-4">
        <h3 className="text-xl sm:text-2xl font-black text-rose-400 uppercase tracking-widest mb-2 truncate">
          {job.vrn || "Unknown Vehicle"}
        </h3>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:text-sm">
          <div className="flex flex-col">
            <span className="text-slate-400 font-bold uppercase text-[10px]">Job Card</span>
            <span className="font-mono font-medium truncate">{job.job_card_no}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-slate-400 font-bold uppercase text-[10px]">Status</span>
            <span className="font-bold text-emerald-400 truncate">{job.status}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-slate-400 font-bold uppercase text-[10px]">Customer</span>
            <span className="font-medium truncate">{job.customer_name || 'N/A'}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-slate-400 font-bold uppercase text-[10px]">Technician</span>
            <span className="font-medium text-amber-400 truncate">{job.technician_name || 'Unassigned'}</span>
          </div>
        </div>
        {job.service_advisor && (
          <div className="mt-3 text-xs flex justify-between items-center border-t border-slate-600/50 pt-2">
            <span className="text-slate-400 font-bold uppercase text-[10px]">Service Advisor</span>
            <span className="font-medium truncate text-right text-sky-400">{job.service_advisor}</span>
          </div>
        )}
      </div>
    </div>
  );
}
