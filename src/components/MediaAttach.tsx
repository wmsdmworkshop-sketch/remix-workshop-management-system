import React, { useState, useEffect, useRef, useCallback } from "react";
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Camera, Upload, FileText, X, Loader2, Paperclip, AlertCircle, Trash2 } from "lucide-react";
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
  /** evidence_id currently being removed, so its tile can show progress. */
  const [deletingId, setDeletingId] = useState<string | null>(null);

  /**
   * Remove an attachment.
   *
   * Confirmed first, because it deletes the stored file — the metadata row is
   * kept (is_deleted = 1) so who attached what and when stays on the record,
   * which is the same rule the 90-day retention policy follows.
   *
   * The tile disappears only after the server confirms. A failed delete says so
   * rather than removing it from the screen and leaving the file in place.
   */
  const deleteAttachment = async (rec: any) => {
    const label = rec?.ocr_type ? String(rec.ocr_type).replace(/_/g, " ") : "this attachment";
    if (!window.confirm(`Remove ${label}? The file is deleted permanently.`)) return;
    setDeletingId(rec.evidence_id);
    try {
      const res = await fetch(`/api/attachments/${encodeURIComponent(rec.evidence_id)}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d?.success) {
        alert(d?.error || `Could not remove the attachment (HTTP ${res.status}).`);
        return;
      }
      setItems((prev) => prev.filter((x) => x.evidence_id !== rec.evidence_id));
    } catch (e: any) {
      alert(`Could not reach the server to remove the attachment. ${e?.message || ""}`.trim());
    } finally {
      setDeletingId(null);
    }
  };

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  // --- TAT chain capture -----------------------------------------------------
  // A CRM job card and an invoice carry the two timestamps Tata's daily review
  // counts (JC opening, invoice/billing). Attaching the document is not enough —
  // a PDF cannot be counted — so the number and time are lifted into real fields.
  // OCR only SUGGESTS; what gets saved is what the advisor confirms.
  type TatField = { key: string; label: string; type: "text" | "datetime-local" | "date" };
  const TAT_DOC: Record<string, { title: string; fields: TatField[] }> = {
    // Straight off the CRM job-card office copy, in the order it is printed.
    MANUAL_JOBCARD: {
      title: "CRM job card details",
      fields: [
        { key: "crm_jc_no", label: "Job card no.", type: "text" },
        { key: "crm_arrival_at", label: "Arrival of customer", type: "datetime-local" },
        { key: "crm_jc_started_at", label: "Job card started", type: "datetime-local" },
        { key: "crm_expected_delivery_at", label: "Expected delivery", type: "datetime-local" },
        { key: "crm_jc_completed_at", label: "Job card completed", type: "datetime-local" },
      ],
    },
    // The invoice prints a date with no time, so it never supplies a closing stamp.
    INVOICE: {
      title: "Invoice details",
      fields: [
        { key: "invoice_no", label: "Invoice no.", type: "text" },
        { key: "invoice_date", label: "Invoice date", type: "date" },
      ],
    },
  };
  const tatDoc = TAT_DOC[category];
  const [vals, setVals] = useState<Record<string, string>>({});
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrNote, setOcrNote] = useState<string | null>(null);
  const [savingMeta, setSavingMeta] = useState(false);
  const [metaMsg, setMetaMsg] = useState<string | null>(null);
  const [saved, setSaved] = useState<any>(null);

  // Values are wall-clock strings ("2026-09-01T12:58") — kept as text end to end
  // so a timezone conversion can never move a time printed on paper.
  const trimForInput = (v: any, type: string) => {
    const s = String(v || "");
    if (!s) return "";
    return type === "date" ? s.slice(0, 10) : s.slice(0, 16);
  };

  const fetchSaved = useCallback(async () => {
    if (!jobCardNo) return;
    try {
      const res = await fetch(`/api/job-cards/${encodeURIComponent(jobCardNo)}/crm-timestamps`, { headers: authHeaders() });
      const d = await res.json();
      if (res.ok && d.success) setSaved(d);
    } catch { /* non-fatal */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobCardNo]);

  useEffect(() => { fetchSaved(); }, [fetchSaved]);

  // Show the currently-saved values for whichever document type is selected.
  useEffect(() => {
    if (!tatDoc || !saved) return;
    const next: Record<string, string> = {};
    for (const f of tatDoc.fields) next[f.key] = trimForInput(saved[f.key], f.type);
    setVals(next);
    setMetaMsg(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, saved]);

  const runOcr = async (dataUrl: string, mimeType: string) => {
    setOcrBusy(true);
    setOcrNote(null);
    try {
      const res = await fetch("/api/ocr/jc-invoice-extract", {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({ base64Image: dataUrl, kind: category === "INVOICE" ? "INVOICE" : "JOBCARD", mimeType }),
      });
      const d = await res.json();
      if (d?.available) {
        const got = d.fields || {};
        let filled = 0;
        setVals((prev) => {
          const next = { ...prev };
          for (const f of (TAT_DOC[category]?.fields || [])) {
            const v = trimForInput(got[f.key], f.type);
            if (v) { next[f.key] = v; filled++; }
          }
          return next;
        });
        setOcrNote(
          filled > 0
            ? "Read from the document — please check each value before saving."
            : "Nothing could be read from the document — enter the details below."
        );
      } else {
        setOcrNote(d?.reason || "Enter the details below.");
      }
    } catch {
      setOcrNote("Could not read the document — enter the details below.");
    } finally {
      setOcrBusy(false);
    }
  };

  const saveMeta = async () => {
    if (!tatDoc || !jobCardNo) return;
    setSavingMeta(true);
    setMetaMsg(null);
    try {
      const payload: Record<string, any> = {};
      for (const f of tatDoc.fields) payload[f.key] = vals[f.key] || null;
      const res = await fetch(`/api/job-cards/${encodeURIComponent(jobCardNo)}/crm-timestamps`, {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (!res.ok || !d.success) throw new Error(d.error || "Could not save.");
      setMetaMsg("Saved.");
      await fetchSaved();
    } catch (e: any) {
      setMetaMsg(e.message || "Could not save.");
    } finally {
      setSavingMeta(false);
    }
  };

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
      // A CRM job card / invoice carries a timestamp the daily review counts —
      // offer it for confirmation straight after the upload, while it's in hand.
      if (TAT_DOC[category] && jobCardNo) await runOcr(dataUrl, mimeType);
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

          {tatDoc && jobCardNo && (
            <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400">{tatDoc.title}</span>
                {ocrBusy && (
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> Reading document…
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-500">
                Counted in the daily TAT / NC review. Attaching the file alone isn’t enough — copy the values exactly as printed.
                {category === "MANUAL_JOBCARD" && " Leave a row blank if it is blank on the job card."}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {tatDoc.fields.map((f) => (
                  <label key={f.key} className="block">
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">{f.label}</span>
                    <input
                      type={f.type === "text" ? "text" : f.type}
                      value={vals[f.key] || ""}
                      onChange={(e) => setVals((p) => ({ ...p, [f.key]: e.target.value }))}
                      placeholder={f.type === "text" ? "as printed" : undefined}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                    />
                  </label>
                ))}
              </div>
              {ocrNote && <p className="text-[10px] text-amber-400">{ocrNote}</p>}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={saveMeta}
                  disabled={savingMeta || !Object.values(vals).some(Boolean)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-lg text-[11px] font-bold transition-all"
                >
                  {savingMeta && <Loader2 className="h-3 w-3 animate-spin" />}
                  Confirm &amp; save
                </button>
                {metaMsg && <span className="text-[10px] text-slate-300">{metaMsg}</span>}
              </div>
              {saved && (saved.tat_hours != null || saved.crm_lag_minutes != null || saved.is_nc != null) && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-2 border-t border-slate-800 text-[10px] text-slate-400">
                  {saved.tat_hours != null && (
                    <span>TAT: <strong className="text-slate-200 font-mono">{saved.tat_hours} h</strong></span>
                  )}
                  {saved.is_nc === true && (
                    <span className="px-2 py-0.5 rounded font-black uppercase tracking-wider bg-rose-500/15 text-rose-400 border border-rose-500/30">
                      NC · {saved.nc_by_minutes} min late
                    </span>
                  )}
                  {saved.is_nc === false && (
                    <span className="px-2 py-0.5 rounded font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      Within TAT
                    </span>
                  )}
                  {saved.crm_lag_minutes != null && (
                    <span>Gate-in → CRM arrival: <strong className="text-slate-200 font-mono">{saved.crm_lag_minutes} min</strong></span>
                  )}
                </div>
              )}
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
                <div key={r.evidence_id} className="relative group">
                  {isPdf(r) ? (
                    <a
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
                      type="button"
                      onClick={() => setPreview(r.photo_url)}
                      className="w-full aspect-square rounded-lg overflow-hidden border border-slate-700 hover:border-cyan-500 transition-all"
                      title={`${r.ocr_type} — ${new Date(r.captured_at).toLocaleString()}`}
                    >
                      <img src={r.photo_url} alt={r.ocr_type} className="w-full h-full object-cover" loading="lazy" />
                    </button>
                  )}
                  {/* Always visible on touch, where there is no hover. */}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); deleteAttachment(r); }}
                    disabled={deletingId === r.evidence_id}
                    aria-label={`Remove ${r.ocr_type}`}
                    title="Remove this attachment"
                    className="absolute top-1 right-1 p-1 rounded-md bg-slate-950/85 border border-slate-700 text-slate-300 hover:text-red-400 hover:border-red-500/50 disabled:opacity-50 transition-all"
                  >
                    {deletingId === r.evidence_id
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : <Trash2 className="h-3 w-3" />}
                  </button>
                </div>
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
