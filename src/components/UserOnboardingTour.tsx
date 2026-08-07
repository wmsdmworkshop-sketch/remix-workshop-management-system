import React, { useState, useEffect } from "react";
import { Award, Compass, Play, BookOpen, CheckSquare, X } from "lucide-react";

interface UserOnboardingTourProps {
  employeeId: number;
  role: string;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

export default function UserOnboardingTour({ employeeId, role, showToast }: UserOnboardingTourProps) {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/v1/pilot/onboarding/progress?employee_id=${employeeId}&role=${role}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setProgress(data.progress);
          // If completion is less than 100%, show onboarding popup
          if (data.progress.completion_percentage < 100) {
            setVisible(true);
          }
        }
      })
      .catch(err => console.error("Failed to load onboarding tour:", err));
  }, [employeeId, role]);

  const handleCheckItem = async (itemId: string) => {
    if (!progress) return;
    const updatedChecklist = progress.checklist.map((item: any) => {
      if (item.id === itemId) {
        return { ...item, completed: !item.completed };
      }
      return item;
    });

    try {
      const res = await fetch("/api/v1/pilot/onboarding/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: employeeId,
          role,
          checklist: updatedChecklist
        })
      });
      const data = await res.json();
      if (data.success) {
        setProgress((prev: any) => ({
          ...prev,
          completion_percentage: data.completion_percentage,
          checklist: updatedChecklist
        }));
        showToast("Onboarding progress updated!", "success");
      }
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  if (!visible || !progress) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl text-slate-100 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-slate-950 flex justify-between items-center border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <Compass className="w-8 h-8 text-orange-500 animate-spin-slow" />
            <div>
              <h3 className="text-xl font-bold">Welcome to DWIP Enterprise</h3>
              <p className="text-xs text-slate-400">Interactive onboarding for the role of <span className="text-orange-500 font-bold uppercase">{role.replace("_", " ")}</span></p>
            </div>
          </div>
          <button onClick={() => setVisible(false)} className="text-slate-500 hover:text-slate-300">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Onboarding Checklist Details */}
        <div className="p-6 space-y-6">
          {/* Progress Bar */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold">Onboarding Completion</span>
              <span className="text-sm font-bold text-orange-500">{progress.completion_percentage}%</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div className="bg-orange-500 h-full transition-all duration-500" style={{ width: `${progress.completion_percentage}%` }} />
            </div>
          </div>

          {/* Interactive Steps Checklist */}
          <div className="space-y-4">
            {progress.checklist.map((item: any) => (
              <div key={item.id} className="flex items-start justify-between p-4 bg-slate-950/50 hover:bg-slate-950 border border-slate-800 rounded-xl transition-all">
                <div className="flex items-start space-x-3">
                  {item.id === "tour" && <Compass className="w-6 h-6 text-blue-500 mt-1" />}
                  {item.id === "role_video" && <Play className="w-6 h-6 text-red-500 mt-1" />}
                  {item.id === "checklist_doc" && <BookOpen className="w-6 h-6 text-green-500 mt-1" />}
                  <div>
                    <h4 className="font-semibold text-slate-200">{item.label}</h4>
                    <p className="text-xs text-slate-500">
                      {item.id === "tour" && "Run the automated interface onboarding walkthrough."}
                      {item.id === "role_video" && "Watch the 3-minute video guide outlining workflow steps."}
                      {item.id === "checklist_doc" && "Verify Standard Operating Procedures checklist requirements."}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => handleCheckItem(item.id)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    item.completed 
                      ? "bg-green-600/20 text-green-400 border border-green-500/50" 
                      : "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-transparent"
                  }`}
                >
                  <CheckSquare className="w-4 h-4" />
                  <span>{item.completed ? "Completed" : "Mark Done"}</span>
                </button>
              </div>
            ))}
          </div>

          {/* Video Placeholder */}
          <div className="bg-black/40 rounded-xl border border-slate-800 p-4 text-center">
            <h4 className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Role Tutorial Video Preview</h4>
            <div className="aspect-video bg-slate-950 flex flex-col items-center justify-center rounded-lg border border-slate-800 relative overflow-hidden group cursor-pointer">
              <Play className="w-12 h-12 text-slate-600 group-hover:text-red-500 transition-all duration-300 transform group-hover:scale-110" />
              <span className="text-xs text-slate-500 mt-2">SOP_Tutorial_Video_{role}.mp4 (Placeholder)</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-950 flex justify-between items-center border-t border-slate-800">
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <Award className="w-4 h-4 text-yellow-500" />
            <span>Complete onboarding to unlock advanced role features.</span>
          </div>
          <button onClick={() => setVisible(false)} className="px-4 py-2 bg-orange-600 hover:bg-orange-500 rounded-lg font-bold text-sm">
            Close & Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
