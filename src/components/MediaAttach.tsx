import React, { useState, useEffect, useRef, useCallback } from "react";
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Camera, Upload, FileText, X, Loader2, Paperclip, AlertCircle } from "lucide-react";
import { getStaffToken } from "../lib/authToken";

export interface AttachmentCategory {
  key: string;   // must match a server ATTACHMENT_CATEGORIES value
  label: string; // shown in the category picker
}

export interface MediaAttachProps {
  jobCardNo?: string | null;
  vrn?: string | null;
  token?: string | null;
  /** Allowed categories for this surface; the first is the default. */
  categories: AttachmentCategory[];
  title?: string;
}

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });

/**
 * Unified capture-and-keep control shared by technician / advisor / billing.
 * "Take photo" uses the native camera (Capacitor) with a web file-input
 * fallback; "Upload" accepts an image or PDF from the device. Everything is
 * persisted to the shared 90-day evidence store (POST /api/attachments) and
 * listed back via the /api/evidence/* endpoints. Attachments are keyed by the
 * job card (or VRN) so any role sees the same documents for a vehicle.
 */
export const MediaAttach: React.FC<MediaAttachProps> = ({ jobCardNo, vrn, token, categories, title = "Attachments" }) => {
  const authToken = token || getStaffToken();
  const allowedKeys = categories.map((c) => c.key);
  const [category, setCategory] = useState<string>(categories[0]?.key || "DOCUMENT");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const authHeaders = (json = false): HeadersInit => ({
    ...(json ? { "Content-Type": "application/json" } : {}),
    Authorization: `Bearer ${authToken}`,
  });

  const fetchItems = useCallback(async () => {
    if (!jobCardNo && !vrn) return;
    setLoading(true);
    try {
      const url = jobCardNo
        ? `/api/evidence/job-card/${encodeURIComponent(jobCardNo)}`
        : `/api/evidence/vrn/${encodeURIComponent(vrn!)}`;
      const res = await fetch(url, { headers: authHeaders() });
      const data = await res.json();
      const recs = Array.isArray(data?.records) ? data.records : [];
      // Only surface the categories this control manages (hide gate-in OCR, etc.)
      setItems(recs.filter((r: any) => allowedKeys.includes(String(r.ocr_type))));
    } catch {
      /* non-fatal: render an empty list */
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobCardNo, vrn]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const upload = async (dataUrl: string, mimeType: string) => {
    setUploading(true);
    setError(null);
    try {
      const res = await fetch("/api/attachments", {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({ base64Image: dataUrl, category, jobCardNo: jobCardNo || null, vrn: vrn || null, mimeType }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Upload failed.");
      await fetchItems();
    } catch (e: any) {
      setError(e.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const onFile = async (file?: File | null) => {
    if (!file) return;
    try {
      const dataUrl = await blobToDataUrl(file);
      await upload(dataUrl, file.type || "image/jpeg");
    } catch {
      setError("Could not read the selected file.");
    }
  };

  const takePhoto = async () => {
    // Native camera first (Uri result → blob, to avoid serializing MBs over the
    // WebView bridge). Falls back to a capture-enabled file input on the web.
    try {
      const photo = await CapacitorCamera.getPhoto({
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        quality: 80,
        saveToGallery: false,
        allowEditing: false,
        correctOrientation: true,
        width: 1600,
        height: 1600,
      });
      const uri = photo.webPath || photo.path;
      if (!uri) throw new Error("no-uri");
      const blob = await (await fetch(uri)).blob();
      const dataUrl = await blobToDataUrl(blob);
      await upload(dataUrl, blob.type || "image/jpeg");
    } catch {
      cameraRef.current?.click();
    }
  };

  const isPdf = (r: any) => String(r.photo_url || "").toLowerCase().endsWith(".pdf") || String(r.ocr_type) === "DOCUMENT" && String(r.photo_url || "").includes(".pdf");
  const busy = uploading || loading;

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Paperclip className="h-4 w-4 text-cyan-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">{title}</h3>
          {items.length > 0 && (
            <span className="text-[10px] font-bold text-slate-400 bg-slate-800 rounded-full px-2 py-0.5">{items.length}</span>
          )}
        </div>
        {categories.length > 1 && (
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
            aria-label="Attachment type"
          >
            {categories.map((c) => (
              <option key={c.key} value={c.key}>{c.label}</option>
            ))}
          </select>
        )}
      </div>

      {(!jobCardNo && !vrn) ? (
        <p className="text-[11px] text-slate-500">Select a vehicle / job card to attach media.</p>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={takePhoto}
              disabled={busy}
              className="flex items-center gap-1.5 px-3 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all"
            >
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
              Take photo
            </button>
            <button
              type="button"
              onClick={() => uploadRef.current?.click()}
              disabled={busy}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold transition-all"
            >
              <Upload className="h-3.5 w-3.5" />
              Upload
            </button>
            {/* Gallery / PDF picker */}
            <input
              ref={uploadRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => { onFile(e.target.files?.[0]); e.currentTarget.value = ""; }}
            />
            {/* Web camera fallback */}
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => { onFile(e.target.files?.[0]); e.currentTarget.value = ""; }}
            />
          </div>

          {error && (
            <div className="flex items-center gap-1.5 text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-2 py-1.5">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center gap-2 text-slate-400 text-xs py-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading attachments…
            </div>
          ) : items.length === 0 ? (
            <p className="text-[11px] text-slate-500">No attachments yet.</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {items.map((r) => (
                isPdf(r) ? (
                  <a
                    key={r.evidence_id}
                    href={r.photo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center justify-center gap-1 aspect-square rounded-lg border border-slate-700 bg-slate-950 hover:border-cyan-500 transition-all p-1"
                    title={`${r.ocr_type} — ${new Date(r.captured_at).toLocaleString()}`}
                  >
                    <FileText className="h-6 w-6 text-rose-400" />
                    <span className="text-[8px] text-slate-400 font-bold">PDF</span>
                  </a>
                ) : (
                  <button
                    key={r.evidence_id}
                    type="button"
                    onClick={() => setPreview(r.photo_url)}
                    className="aspect-square rounded-lg overflow-hidden border border-slate-700 hover:border-cyan-500 transition-all"
                    title={`${r.ocr_type} — ${new Date(r.captured_at).toLocaleString()}`}
                  >
                    <img src={r.photo_url} alt={r.ocr_type} className="w-full h-full object-cover" loading="lazy" />
                  </button>
                )
              ))}
            </div>
          )}
        </>
      )}

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm" onClick={() => setPreview(null)}>
          <div className="relative max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <img src={preview} alt="Attachment" className="w-full max-h-[80vh] object-contain rounded-lg border border-slate-800" />
            <button
              type="button"
              onClick={() => setPreview(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-slate-800 text-white border border-slate-700 font-bold flex items-center justify-center shadow-xl"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaAttach;
