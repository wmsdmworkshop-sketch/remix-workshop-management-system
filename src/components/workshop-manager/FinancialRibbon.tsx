import React, { useMemo } from "react";
import { DollarSign, TrendingUp, Target, CreditCard, Sparkles } from "lucide-react";

export interface FinancialRibbonProps {
  todayRevenue?: number;
  targetRevenue?: number;
  labourRevenue?: number;
  partsRevenue?: number;
  avgJobCardVal?: number;
  isLoading?: boolean;
  hasError?: boolean;
}

export const FinancialRibbon: React.FC<FinancialRibbonProps> = React.memo(({
  todayRevenue,
  targetRevenue,
  labourRevenue,
  partsRevenue,
  avgJobCardVal,
  isLoading = false,
  hasError = false,
}) => {
  const values = useMemo(() => {
    const today = todayRevenue ?? 0;
    const target = targetRevenue ?? 500000;
    const remaining = Math.max(0, target - today);
    const achievement = today > 0 && target > 0 ? Math.round((today / target) * 100) : 0;
    const labour = labourRevenue ?? 0;
    const parts = partsRevenue ?? 0;
    const avgJc = avgJobCardVal ?? 0;

    return { today, target, remaining, achievement, labour, parts, avgJc };
  }, [todayRevenue, targetRevenue, labourRevenue, partsRevenue, avgJobCardVal]);

  if (hasError) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
        Failed to load financial data.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 bg-slate-900 border border-slate-800 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Today's Revenue & Achievement */}
      <div className="ds-card   border   rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold tracking-wider">
          <span>Today's Revenue</span>
          <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-xl font-extrabold text-white">₹{values.today.toLocaleString()}</span>
          <span className="text-xs text-emerald-400 font-bold">({values.achievement}%)</span>
        </div>
        <div className="mt-1 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full" 
            style={{ width: `${Math.min(100, values.achievement)}%` }} 
          />
        </div>
      </div>

      {/* Target & Remaining */}
      <div className="ds-card   border   rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold tracking-wider">
          <span>Daily Target</span>
          <Target className="h-3.5 w-3.5 text-cyan-400" />
        </div>
        <div className="mt-2">
          <span className="text-xl font-extrabold text-slate-200">₹{values.target.toLocaleString()}</span>
        </div>
        <p className="text-[9px] text-slate-500 font-semibold uppercase mt-1">
          Remaining: <span className="text-cyan-400 font-mono">₹{values.remaining.toLocaleString()}</span>
        </p>
      </div>

      {/* Labour & Parts Breakdown */}
      <div className="ds-card   border   rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold tracking-wider">
          <span>Sales Split</span>
          <TrendingUp className="h-3.5 w-3.5 text-amber-500" />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs font-bold text-slate-300">
          <div>
            <p className="text-[9px] text-slate-500 uppercase">Labour</p>
            <span>₹{values.labour.toLocaleString()}</span>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-slate-500 uppercase">Parts</p>
            <span>₹{values.parts.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Average Job Card Value */}
      <div className="ds-card   border   rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold tracking-wider">
          <span>Average Job Card</span>
          <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
        </div>
        <div className="mt-2">
          <span className="text-xl font-extrabold text-slate-100">₹{values.avgJc.toLocaleString()}</span>
        </div>
        <p className="text-[9px] text-slate-500 font-semibold uppercase mt-1">Based on active floor count</p>
      </div>
    </div>
  );
});

FinancialRibbon.displayName = "FinancialRibbon";
