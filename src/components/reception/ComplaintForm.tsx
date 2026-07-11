import React, { useState, useEffect } from "react";
import { Plus, Trash2, Mic, StopCircle, Camera, Video, AlertTriangle, Save, Sparkles } from "lucide-react";

export interface ComplaintItem {
  id: string;
  description: string;
  category: "Engine" | "Electrical" | "Brakes" | "Suspension" | "Transmission" | "Body" | "Other";
  priority: "Normal" | "Express" | "Emergency" | "Fleet" | "VIP";
  voiceRecordingUrl?: string | null;
  photos: string[];
  videos: string[];
}

export interface ComplaintFormProps {
  isLoading?: boolean;
  error?: string | null;
  onSubmitComplaints?: (complaints: ComplaintItem[]) => void;
}

export default function ComplaintForm({
  isLoading = false,
  error = null,
  onSubmitComplaints,
}: ComplaintFormProps) {
  const [complaints, setComplaints] = useState<ComplaintItem[]>([]);
  
  // Single input form states
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ComplaintItem["category"]>("Engine");
  const [priority, setPriority] = useState<ComplaintItem["priority"]>("Normal");
  
  // Voice capture simulation state
  const [isRecording, setIsRecording] = useState(false);
  const [tempVoiceUrl, setTempVoiceUrl] = useState<string | null>(null);
  
  // Media attachments state
  const [tempPhotos, setTempPhotos] = useState<string[]>([]);
  const [tempVideos, setTempVideos] = useState<string[]>([]);
  
  // Validation state
  const [validationError, setValidationError] = useState<string | null>(null);
  const [draftSaved, setDraftSaved] = useState(false);

  // Auto-load draft from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("wms_complaint_drafts");
      if (saved) {
        setComplaints(JSON.parse(saved));
      }
    } catch (e) {
      console.warn("Failed to load drafts from local storage:", e);
    }
  }, []);

  // Auto-save drafts to localStorage whenever complaints change
  useEffect(() => {
    if (complaints.length > 0) {
      try {
        localStorage.setItem("wms_complaint_drafts", JSON.stringify(complaints));
        setDraftSaved(true);
        const timer = setTimeout(() => setDraftSaved(false), 2000);
        return () => clearTimeout(timer);
      } catch (e) {
        console.warn("Failed to write drafts to local storage:", e);
      }
    }
  }, [complaints]);

  // Voice recording simulation
  const startRecording = () => {
    setIsRecording(true);
    setTempVoiceUrl(null);
  };

  const stopRecording = () => {
    setIsRecording(false);
    // Simulate recording complete
    setTempVoiceUrl("blob:http://localhost:3000/voice-complaint-1.wav");
  };

  // Add simulated photo attachment
  const handleAddPhoto = () => {
    setTempPhotos((prev) => [...prev, `http://localhost:3000/photos/complaint-${Date.now()}.jpg`]);
  };

  // Add simulated video attachment
  const handleAddVideo = () => {
    setTempVideos((prev) => [...prev, `http://localhost:3000/videos/complaint-${Date.now()}.mp4`]);
  };

  // Add single complaint to the list
  const handleAddComplaint = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!description.trim()) {
      setValidationError("Complaint description cannot be empty.");
      return;
    }

    const newItem: ComplaintItem = {
      id: `COMP-${Date.now()}`,
      description: description.trim(),
      category,
      priority,
      voiceRecordingUrl: tempVoiceUrl,
      photos: tempPhotos,
      videos: tempVideos,
    };

    setComplaints((prev) => [...prev, newItem]);
    
    // Reset form inputs
    setDescription("");
    setCategory("Engine");
    setPriority("Normal");
    setTempVoiceUrl(null);
    setTempPhotos([]);
    setTempVideos([]);
  };

  // Remove complaint from list
  const handleRemoveComplaint = (id: string) => {
    setComplaints((prev) => prev.filter((c) => c.id !== id));
    if (complaints.length === 1) {
      localStorage.removeItem("wms_complaint_drafts");
    }
  };

  const handleSubmit = () => {
    setValidationError(null);
    if (complaints.length === 0) {
      setValidationError("Please add at least one complaint to the list before submitting.");
      return;
    }
    if (onSubmitComplaints) {
      onSubmitComplaints(complaints);
    }
    // Clear drafts on successful submit
    localStorage.removeItem("wms_complaint_drafts");
    setComplaints([]);
  };

  return (
    <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 space-y-6 max-w-2xl mx-auto" aria-label="Complaint Logger Deck">
      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="text-orange-500 h-5 w-5" /> Vehicle Complaint Intake Form
          </h2>
          <p className="text-xs text-slate-400 mt-1">Record complaints, categories, priorities, and voice or media attachments.</p>
        </div>
        {draftSaved && (
          <span className="text-[10px] px-2 py-1 rounded bg-green-500/10 text-green-400 border border-green-500/20 flex items-center gap-1">
            <Save className="h-3 w-3" /> Draft Auto-Saved
          </span>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-950/20 border border-red-500/30 text-red-400 rounded-xl" role="alert">
          System Error: {error}
        </div>
      )}

      {/* Add Complaint Inline Form */}
      <form onSubmit={handleAddComplaint} className="space-y-4 bg-slate-950 p-4 rounded-xl border border-slate-800/80">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Add Complaint Concern</h3>
        
        {validationError && (
          <div className="p-3 bg-orange-950/20 border border-orange-500/30 text-orange-400 rounded-lg text-xs flex items-center gap-1.5" role="alert">
            <AlertTriangle className="h-4 w-4" /> {validationError}
          </div>
        )}

        <div className="space-y-1">
          <label htmlFor="compDesc" className="text-xs text-slate-400">Description</label>
          <textarea
            id="compDesc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe complaint (e.g., heavy blue exhaust smoke, coolant leaking near radiator)..."
            className="w-full h-20 p-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:border-orange-500"
            aria-label="Complaint concern description input"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label htmlFor="compCategory" className="text-xs text-slate-400">Category</label>
            <select
              id="compCategory"
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-orange-500"
              aria-label="Select complaint category"
            >
              <option value="Engine">Engine & Powertrain</option>
              <option value="Electrical">Electrical & Batteries</option>
              <option value="Brakes">Braking System</option>
              <option value="Suspension">Suspension & Axles</option>
              <option value="Transmission">Gearbox & Clutch</option>
              <option value="Body">Cabin & Chassis Body</option>
              <option value="Other">Other Concerns</option>
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="compPriority" className="text-xs text-slate-400">Priority Level</label>
            <select
              id="compPriority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-orange-500"
              aria-label="Select priority classification"
            >
              <option value="Normal">Normal Route</option>
              <option value="Express">Express Bay Route</option>
              <option value="Emergency">Emergency Breakdown</option>
              <option value="Fleet">Fleet Priority</option>
              <option value="VIP">VIP Customer</option>
            </select>
          </div>
        </div>

        {/* Voice and Media Deck */}
        <div className="flex flex-wrap gap-2.5 pt-2">
          {isRecording ? (
            <button
              type="button"
              onClick={stopRecording}
              className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg flex items-center gap-1.5 animate-pulse"
              aria-label="Stop recording speech-to-text"
            >
              <StopCircle className="h-4 w-4" /> Stop Recording
            </button>
          ) : (
            <button
              type="button"
              onClick={startRecording}
              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs rounded-lg border border-slate-700 flex items-center gap-1.5"
              aria-label="Start recording customer voice complaints"
            >
              <Mic className="h-4 w-4" /> Record Voice
            </button>
          )}

          <button
            type="button"
            onClick={handleAddPhoto}
            className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs rounded-lg border border-slate-700 flex items-center gap-1.5"
            aria-label="Add vehicle inspection photo"
          >
            <Camera className="h-4 w-4" /> Attach Photo ({tempPhotos.length})
          </button>

          <button
            type="button"
            onClick={handleAddVideo}
            className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs rounded-lg border border-slate-700 flex items-center gap-1.5"
            aria-label="Add vehicle inspection video walkaround"
          >
            <Video className="h-4 w-4" /> Attach Video ({tempVideos.length})
          </button>
        </div>

        {tempVoiceUrl && (
          <p className="text-xs text-green-400 flex items-center gap-1.5">
            🎙️ Voice memo recorded successfully.
          </p>
        )}

        <button
          type="submit"
          className="w-full py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1"
        >
          <Plus className="h-4 w-4" /> Add Complaint to List
        </button>
      </form>

      {/* Compiled Complaints List */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recorded Complaints ({complaints.length})</h3>
        {complaints.length === 0 ? (
          <p className="text-xs text-slate-500 italic p-4 bg-slate-950 rounded-xl border border-slate-850 text-center">
            No complaints added yet. Record concerns in form above.
          </p>
        ) : (
          <div className="space-y-2.5">
            {complaints.map((item) => (
              <div key={item.id} className="p-4 bg-slate-950 border border-slate-850 rounded-xl flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-sm font-bold">{item.description}</p>
                  <p className="text-xs text-slate-400">
                    Category: {item.category} | Priority: {item.priority}
                  </p>
                  <div className="flex gap-2.5 mt-1.5">
                    {item.voiceRecordingUrl && <span className="text-[10px] text-green-400 font-bold">🎙️ Voice Attachment</span>}
                    {item.photos.length > 0 && <span className="text-[10px] text-blue-400 font-bold">🖼️ {item.photos.length} Photos</span>}
                    {item.videos.length > 0 && <span className="text-[10px] text-purple-400 font-bold">📹 {item.videos.length} Videos</span>}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveComplaint(item.id)}
                  className="p-1.5 hover:bg-slate-900 rounded text-red-500"
                  aria-label="Delete complaint concern"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={handleSubmit}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
              disabled={isLoading}
            >
              {isLoading ? "Saving Complaints..." : "Submit Complaints Ledger"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
