import React, { useState } from "react";
import { ShieldCheck, Award, Check, Sparkles, DollarSign } from "lucide-react";

export const AMCSubscriptionsPage: React.FC = () => {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [subscribedSuccess, setSubscribedSuccess] = useState<string | null>(null);

  const plans = [
    {
      id: "silver",
      name: "Silver Maintenance Plan",
      price: 12999,
      period: "1 Year / 20,000 KM",
      color: "border-slate-300 bg-white",
      badge: "Essential Care",
      features: [
        "2 Free Periodic Maintenance Servicings",
        "10% Discount on OEM Replacement Spares",
        "Free Wheel Alignment & Balancing",
        "Priority Service Bay Allocation"
      ]
    },
    {
      id: "gold",
      name: "Gold Enterprise Care",
      price: 24999,
      period: "1 Year / 40,000 KM",
      color: "border-amber-400 bg-gradient-to-b from-amber-50/50 to-white ring-2 ring-amber-400/30",
      badge: "Most Popular",
      features: [
        "4 Free Periodic Maintenance Servicings",
        "15% Discount on OEM Replacement Spares",
        "Unlimited Free 24/7 Roadside Towing",
        "Free AC & Battery Health Audits",
        "Dedicated Service Advisor"
      ]
    },
    {
      id: "platinum",
      name: "Platinum Fleet Assurance",
      price: 44999,
      period: "2 Years / 80,000 KM",
      color: "border-indigo-400 bg-gradient-to-b from-indigo-50/50 to-white",
      badge: "Maximum Uptime",
      features: [
        "8 Free Periodic Maintenance Servicings",
        "20% Discount on OEM Replacement Spares",
        "Zero-Cost Breakdown Towing & On-Site Repair",
        "Free Annual Brake & Clutch Overhaul Labour",
        "Executive Priority Workshop Express Bay"
      ]
    }
  ];

  const handleSubscribe = (planName: string, price: number) => {
    setSubscribedSuccess(`Congratulations! You have successfully subscribed to ${planName} (₹${price.toLocaleString('en-IN')}). Active on vehicle KA-32-AA-5577!`);
    setSelectedPlan(null);
    setTimeout(() => setSubscribedSuccess(null), 6000);
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950 to-slate-950 text-white rounded-2xl p-6 shadow-md border border-slate-800 space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/20 border border-amber-500/40 text-amber-400 rounded-xl">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight text-white uppercase">Devanand AMC Subscriptions</h2>
            <p className="text-xs text-slate-300">Save up to 35% annually on servicing, spares, and roadside breakdown cover</p>
          </div>
        </div>
      </div>

      {subscribedSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{subscribedSuccess}</span>
        </div>
      )}

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`rounded-2xl p-6 border shadow-sm flex flex-col justify-between space-y-5 transition-all ${plan.color}`}
          >
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-100 text-amber-900 border border-amber-300">
                  {plan.badge}
                </span>
                <span className="text-[10px] text-slate-500 font-mono font-bold">{plan.period}</span>
              </div>

              <h3 className="text-sm font-black text-slate-900">{plan.name}</h3>

              <div className="pt-2">
                <span className="text-2xl font-black text-slate-900 font-mono">₹{plan.price.toLocaleString('en-IN')}</span>
                <span className="text-xs text-slate-500 font-medium ml-1">/ Plan Term</span>
              </div>

              <div className="space-y-2 pt-3 border-t border-slate-200/80">
                {plan.features.map((feat, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => handleSubscribe(plan.name, plan.price)}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider transition shadow cursor-pointer"
            >
              1-Tap Enroll Now
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
