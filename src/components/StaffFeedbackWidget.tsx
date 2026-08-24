import React, { useState } from "react";
import { MessageSquare, Bug, Star, FileImage, Send, X, Lightbulb, UserPlus } from "lucide-react";
import { staffAuthHeaders } from "../lib/authToken";

interface StaffFeedbackWidgetProps {
  employeeId: number;
  role: string;
  activeScreen: string;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

// Panel is draggable by its header so it can be pulled off whatever it's
// covering; the chosen spot is remembered per-browser across opens.
const DRAG_POSITION_KEY = "dwip_feedback_panel_pos";

export default function StaffFeedbackWidget({ employeeId, role, activeScreen, showToast }: StaffFeedbackWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<"BUG" | "ENHANCEMENT" | "REQUEST_FEATURE">("BUG");
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState<number>(5);
  const [loading, setLoading] = useState(false);

  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);

  // Drag state: offset (in px) from the panel's default top-right anchor.
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem(DRAG_POSITION_KEY);
      return saved ? JSON.parse(saved) : { x: 0, y: 0 };
    } catch {
      return { x: 0, y: 0 };
    }
  });
  const dragState = React.useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const panelRef = React.useRef<HTMLDivElement | null>(null);

  const clampOffset = (x: number, y: number) => {
    const panelWidth = panelRef.current?.offsetWidth || 400;
    const panelHeight = panelRef.current?.offsetHeight || 400;
    // Default anchor is top-right (x=0) — dragging left (negative x) moves it
    // away from that edge; keep at least a sliver of the panel on-screen.
    const minX = -(window.innerWidth - 60);
    const maxX = panelWidth - 60;
    const minY = -0;
    const maxY = window.innerHeight - 60;
    return {
      x: Math.min(maxX, Math.max(minX, x)),
      y: Math.min(maxY, Math.max(minY, y))
    };
  };

  const handleDragStart = (e: React.PointerEvent) => {
    // Ignore drags started on the close button.
    if ((e.target as HTMLElement).closest("[data-no-drag]")) return;
    dragState.current = { startX: e.clientX, startY: e.clientY, originX: dragOffset.x, originY: dragOffset.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const latestOffset = React.useRef(dragOffset);

  const handleDragMove = (e: React.PointerEvent) => {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    const next = clampOffset(dragState.current.originX + dx, dragState.current.originY + dy);
    latestOffset.current = next;
    setDragOffset(next);
  };

  const handleDragEnd = () => {
    if (!dragState.current) return;
    dragState.current = null;
    try {
      localStorage.setItem(DRAG_POSITION_KEY, JSON.stringify(latestOffset.current));
    } catch {
      /* ignore */
    }
  };

  const handleCaptureScreen = async () => {
    setCapturing(true);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const track = stream.getVideoTracks()[0];
        const canvas = document.createElement("canvas");
        const video = document.createElement("video");
        video.srcObject = stream;
        await video.play();
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
        track.stop();
        const dataUrl = canvas.toDataURL("image/png");
        setScreenshot(dataUrl);
        showToast("Live screen snapshot captured & attached!", "success");
      } else {
        triggerFileInput();
      }
    } catch (err) {
      triggerFileInput();
    } finally {
      setCapturing(false);
    }
  };

  const triggerFileInput = () => {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setScreenshot(event.target?.result as string);
          showToast("Screenshot image attached successfully!", "success");
        };
        reader.readAsDataURL(file);
      }
    };
    fileInput.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      showToast("Please enter a feedback description.", "error");
      return;
    }
    setLoading(true);
    try {
      const deviceInfo = {
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        userAgent: navigator.userAgent,
        currentPath: window.location.pathname + window.location.search,
        timestamp: new Date().toISOString()
      };

      const res = await fetch("/api/v1/pilot/feedback", {
        method: "POST",
        headers: staffAuthHeaders(),
        body: JSON.stringify({
          employee_id: employeeId,
          role,
          screen_id: activeScreen,
          feedback_type: type,
          message,
          rating,
          screenshot,
          device_info: deviceInfo
        })
      });
      const data = await res.json();
      if (data.success) {
        const triageMsg = data.aiTriage?.rootCause 
          ? `⚡ DeepSeek Triaged [${data.aiTriage.severity}]: ${data.aiTriage.rootCause.slice(0, 60)}...`
          : "Bug & screenshot recorded and triaged by DeepSeek!";
        showToast(triageMsg, "success");
        setMessage("");
        setScreenshot(null);
        setIsOpen(false);
      } else {
        showToast(data.error || "Failed to submit feedback", "error");
      }
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 flex items-center space-x-2 bg-orange-600 hover:bg-orange-500 text-white font-bold px-3.5 py-2.5 rounded-full shadow-2xl transition-all transform hover:scale-105 cursor-pointer"
        title="Staff Feedback & Bug Report"
      >
        <MessageSquare className="w-4 h-4 md:w-5 md:h-5 animate-pulse text-white" />
        <span className="text-xs md:text-sm">Feedback</span>
      </button>

      {/* Floating Panel — draggable by its header so it can be pulled off
          whatever it's covering on a given screen; position is remembered. */}
      {isOpen && (
        <div
          ref={panelRef}
          style={{ transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)` }}
          className="fixed top-4 right-4 z-50 w-full max-w-md max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl text-slate-100 flex flex-col"
        >
          {/* Header — drag handle */}
          <div
            onPointerDown={handleDragStart}
            onPointerMove={handleDragMove}
            onPointerUp={handleDragEnd}
            onPointerCancel={handleDragEnd}
            className="p-5 bg-slate-950 flex justify-between items-center border-b border-slate-800 rounded-t-2xl cursor-move select-none touch-none"
            title="Drag to move this panel"
          >
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-6 h-6 text-orange-500" />
              <div>
                <h3 className="text-lg font-bold">Staff Feedback Panel</h3>
                <p className="text-xs text-slate-400">On-screen rating for screen: <span className="text-orange-400 font-bold">{activeScreen}</span></p>
              </div>
            </div>
            <button data-no-drag onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-slate-300">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 flex-1 space-y-6 overflow-y-auto">
            {/* Feedback Category */}
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">Category</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "BUG", label: "Report Bug", icon: Bug, color: "text-red-500" },
                  { id: "ENHANCEMENT", label: "Suggest Improvement", icon: Lightbulb, color: "text-yellow-500" },
                  { id: "REQUEST_FEATURE", label: "Request Feature", icon: UserPlus, color: "text-blue-500" }
                ].map((t) => (
                  <button 
                    key={t.id}
                    type="button"
                    onClick={() => setType(t.id as any)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                      type === t.id 
                        ? "bg-slate-950 border-orange-500 text-slate-100" 
                        : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <t.icon className={`w-5 h-5 mb-1 ${t.color}`} />
                    <span className="text-[10px] text-center font-semibold">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Screen Rating */}
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">Rate this Screen Usability</label>
              <div className="flex items-center space-x-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button 
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="focus:outline-none"
                  >
                    <Star className={`w-8 h-8 transition-colors ${
                      star <= rating ? "text-yellow-500 fill-yellow-500" : "text-slate-600"
                    }`} />
                  </button>
                ))}
              </div>
            </div>

            {/* Message Description */}
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">Description</label>
              <textarea 
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What can we improve? Describe any issues, features, or suggestions..."
                className="w-full bg-slate-950 border border-slate-850 p-3 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-orange-500"
              />
            </div>

            {/* Interactive Screen Capture & Attachment */}
            <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileImage className="w-5 h-5 text-orange-400" />
                  <span className="text-xs font-bold text-slate-200">Capture Screen & Attach</span>
                </div>
                <button
                  type="button"
                  onClick={handleCaptureScreen}
                  disabled={capturing}
                  className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs rounded-lg shadow transition cursor-pointer flex items-center gap-1.5"
                >
                  <FileImage className="w-3.5 h-3.5" />
                  <span>{capturing ? "Capturing..." : screenshot ? "Recapture" : "Capture Live"}</span>
                </button>
              </div>

              {screenshot ? (
                <div className="relative mt-2 p-2 bg-slate-900 border border-emerald-500/40 rounded-xl flex items-center gap-3">
                  <img src={screenshot} alt="Screen Preview" className="w-16 h-12 object-cover rounded-lg border border-slate-700" />
                  <div className="flex-1 text-[11px]">
                    <span className="font-bold text-emerald-400 flex items-center gap-1">
                      <span>✓</span> Screenshot Attached
                    </span>
                    <p className="text-slate-400 text-[10px]">Canvas snapshot ready for upload</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setScreenshot(null)}
                    className="p-1 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-md transition"
                    title="Remove Screenshot"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Click <strong className="text-slate-200">"Capture Live"</strong> to snap your active screen or select an image file to report visual bugs.
                </p>
              )}
            </div>
          </form>

          {/* Action buttons */}
          <div className="p-5 bg-slate-950 border-t border-slate-800 flex justify-end space-x-3">
            <button 
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 border border-slate-800 hover:border-slate-600 rounded-lg font-semibold text-sm"
            >
              Cancel
            </button>
            <button 
              type="button"
              disabled={loading}
              onClick={handleSubmit}
              className="flex items-center space-x-2 px-5 py-2 bg-orange-600 hover:bg-orange-500 rounded-lg text-white font-bold text-sm"
            >
              <Send className="w-4 h-4" />
              <span>{loading ? "Sending..." : "Submit Feedback"}</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
