import React from "react";

export interface PhotoCaptureProps {
  isLoading?: boolean;
  error?: string | null;
  onPhotoUploaded?: (photoUrl: string) => void;
}

export default function PhotoCapture({
  isLoading = false,
  error = null,
  onPhotoUploaded,
}: PhotoCaptureProps) {
  // TODO: Integrate native mobile camera overlays and OCR odometer readings
  
  if (error) {
    return (
      <div className="p-4 bg-slate-900 text-red-500" role="alert">
        Camera upload failure: {error}
      </div>
    );
  }

  return (
    <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3" aria-label="Inspection Photos Upload Deck">
      <h3 className="text-md font-bold text-white">Capture Inspection Photos</h3>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="p-4 bg-slate-850 border border-slate-700 rounded-lg text-center text-xs text-slate-400 hover:border-blue-500">
          [+] Front Side Photo
        </button>
        <button type="button" className="p-4 bg-slate-850 border border-slate-700 rounded-lg text-center text-xs text-slate-400 hover:border-blue-500">
          [+] Rear Side Photo
        </button>
      </div>
      {isLoading && <p className="text-xs text-slate-400 animate-pulse">Uploading and running OCR...</p>}
    </div>
  );
}
