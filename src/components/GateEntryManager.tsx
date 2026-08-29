import { useEscapeKey } from "../hooks/useEscapeKey";
import React, { useState, useMemo, useEffect } from "react";
import { 
  Truck, 
  Search, 
  Filter, 
  Calendar, 
  User, 
  Phone, 
  Car, 
  Plus, 
  ArrowLeftRight, 
  CheckCircle, 
  Clock, 
  FileText,
  Gauge,
  Fuel,
  LogOut,
  MapPin,
  RefreshCw,
  Camera,
  Upload,
  AlertCircle,
  Eye,
  Check,
  Sparkles,
  Cpu
} from "lucide-react";
import FunnyLoader from "./FunnyLoader";
import { JobCard, Bay } from "../types";

import { compressImageFile } from "../lib/imageUtils";
import { Capacitor } from "@capacitor/core";
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from "@capacitor/camera";
import { staffAuthHeaders, getStaffToken } from "../lib/authToken";

interface GateEntryManagerProps {
  jobCards: JobCard[];
  bays: Bay[];
  onCreateJob: (
    jobData: any,
    options?: { silent?: boolean }
  ) => Promise<{ success: boolean; pendingApproval?: boolean; message?: string } | void>;
  onUpdateJob: (id: number, updatedFields: Partial<JobCard>) => void;
  onRefresh: () => void;
  /**
   * Gate-in belongs to security and reception. Other roles that need visibility
   * of the gate ledger (a service advisor tracking an arrival) get it read-only:
   * the register form and gate-out action are withheld.
   */
  readOnly?: boolean;
}

export default function GateEntryManager({
  jobCards,
  bays,
  onCreateJob,
  onUpdateJob,
  onRefresh,
  readOnly = false
}: GateEntryManagerProps) {
  // State variables
  const [vrn, setVrn] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [chassisNumber, setChassisNumber] = useState("");
  const [make, setMake] = useState("TATA"); // vehicle make is TATA only
  const [model, setModel] = useState("Tata Commercial Heavy Vehicle");
  const [odometer, setOdometer] = useState("");
  const [fuelLevel, setFuelLevel] = useState("50%");
  const [fuelPercentage, setFuelPercentage] = useState(50);
  const [complaints, setComplaints] = useState("");
  const [success, setSuccess] = useState<string | null>(null);
  // Dedicated OCR error state — never conflated with success notifications.
  // Shown as a red banner; triggers manual VRN entry fallback automatically.
  const [ocrError, setOcrError] = useState<string | null>(null);
  /** Heading for the error banner. Defaults to the OCR case; gate-registration
   *  and duplicate-guard failures set their own so the user is not told to
   *  re-scan a plate that read perfectly. */
  const [ocrErrorTitle, setOcrErrorTitle] = useState<string>("Plate Recognition Failed");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [mobileActiveView, setMobileActiveView] = useState<"form" | "ledger">("form");

  // Draft Persistence Logic
  useEffect(() => {
    try {
      const saved = localStorage.getItem("dwip_gate_in_draft");
      if (saved) {
        const data = JSON.parse(saved);
        if (data.vrn) setVrn(data.vrn);
        if (data.customerName) setCustomerName(data.customerName);
        if (data.customerMobile) setCustomerMobile(data.customerMobile);
        if (data.chassisNumber) setChassisNumber(data.chassisNumber);
        if (data.odometer) setOdometer(data.odometer);
        if (data.fuelLevel) setFuelLevel(data.fuelLevel);
        if (data.fuelPercentage) setFuelPercentage(data.fuelPercentage);
        if (data.complaints) setComplaints(data.complaints);
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    const draft = { vrn, customerName, customerMobile, chassisNumber, odometer, fuelLevel, fuelPercentage, complaints };
    localStorage.setItem("dwip_gate_in_draft", JSON.stringify(draft));
  }, [vrn, customerName, customerMobile, chassisNumber, odometer, fuelLevel, fuelPercentage, complaints]);

  const clearDraft = () => {
    localStorage.removeItem("dwip_gate_in_draft");
  };

  // Real-time Metadata States
  const [capturedLocation, setCapturedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [capturedTime, setCapturedTime] = useState<string | null>(null);
  // GPS status is tracked explicitly so the UI can distinguish "not yet captured"
  // from "denied"/"unavailable" — we never invent coordinates for the latter two.
  const [gpsStatus, setGpsStatus] = useState<"idle" | "capturing" | "success" | "denied" | "unavailable">("idle");

  // Vehicle-photo evidence state (separate from the smaller image sent to OCR —
  // see performOCR below, which compresses independently for the API call).
  const [anprPhotoPreview, setAnprPhotoPreview] = useState<string | null>(null);
  const [evidenceImage, setEvidenceImage] = useState<string | null>(null);
  const [evidenceCapturedAt, setEvidenceCapturedAt] = useState<string | null>(null);
  const [ocrStatus, setOcrStatus] = useState<"idle" | "scanning" | "success" | "failed">("idle");

  // Captures timestamp (of this exact call, i.e. the capture event — not page load)
  // and high-accuracy GPS. Never fabricates coordinates: on denial/timeout/unavailable
  // the metadata is explicitly marked as such and capturedLocation stays null.
  const captureMetadata = (): Promise<{ lat: number; lng: number } | null> => {
    setCapturedTime(new Date().toLocaleString("en-IN"));
    if (!navigator.geolocation) {
      setGpsStatus("unavailable");
      return Promise.resolve(null);
    }
    setGpsStatus("capturing");
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
          setCapturedLocation(loc);
          setGpsStatus("success");
          resolve(loc);
        },
        (error) => {
          console.warn("Geolocation capture failed:", error.message);
          setCapturedLocation(null);
          setGpsStatus(error.code === error.PERMISSION_DENIED ? "denied" : "unavailable");
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  // Helper for OCR API call with client-side compression & timeout to prevent WebView OOM
  const performOCR = async (file: File) => {
    try {
      const compressedDataUrl = await compressImageFile(file, {
        maxWidth: 1280,
        maxHeight: 1280,
        quality: 0.8
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      const headers = staffAuthHeaders();

      const res = await fetch("/api/ocr", {
        method: "POST",
        headers,
        body: JSON.stringify({ image: compressedDataUrl, provider: "Azure" }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        return await res.json();
      } else {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `OCR failed with status ${res.status}`);
      }
    } catch (err: any) {
      console.warn("performOCR error:", err?.message || err);
      throw err;
    }
  };

  // Converts a data: URL (as returned by the native Capacitor Camera plugin)
  // into a Blob, for reuse with the existing File/Blob-based compression and
  // OCR pipeline — no network fetch involved, pure base64 decode.
  const dataUrlToBlob = (dataUrl: string): Blob => {
    const [header, base64] = dataUrl.split(",");
    const mimeMatch = header.match(/data:([^;]+);base64/);
    const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  };

  // File Input References for Robust Native Camera/Gallery Uploads
  const anprInputRef = React.useRef<HTMLInputElement>(null);
  const odoInputRef = React.useRef<HTMLInputElement>(null);
  const chassisInputRef = React.useRef<HTMLInputElement>(null);
  const fuelInputRef = React.useRef<HTMLInputElement>(null);

  // ANPR Fallback States
  const [anprFailed, setAnprFailed] = useState(false);
  const [showChassisModal, setShowChassisModal] = useState(false);
  useEscapeKey(() => {
    setShowChassisModal(false);
  }, showChassisModal);
  const [chassisScanning, setChassisScanning] = useState(false);

  // Modals & UI States
  const [showAnprModal, setShowAnprModal] = useState(false);
  useEscapeKey(() => {
    setShowAnprModal(false);
  }, showAnprModal);
  const [anprScanning, setAnprScanning] = useState(false);
  
  const [showOdoModal, setShowOdoModal] = useState(false);
  useEscapeKey(() => {
    setShowOdoModal(false);
  }, showOdoModal);
  const [odoScanning, setOdoScanning] = useState(false);
  const [odoCapturedText, setOdoCapturedText] = useState<string | null>(null);
  const [odoScanFailed, setOdoScanFailed] = useState(false);
  const [odoPlausibilityWarning, setOdoPlausibilityWarning] = useState<string | null>(null);
  const [odoPhotoPreview, setOdoPhotoPreview] = useState<string | null>(null);

  const [showFuelModal, setShowFuelModal] = useState(false);
  useEscapeKey(() => setShowFuelModal(false), showFuelModal);
  const [fuelCapturedText, setFuelCapturedText] = useState<string | null>(null);
  const [fuelScanFailed, setFuelScanFailed] = useState(false);
  const [fuelPhotoPreview, setFuelPhotoPreview] = useState<string | null>(null);
  const [chassisCapturedText, setChassisCapturedText] = useState<string | null>(null);
  const [chassisScanFailed, setChassisScanFailed] = useState(false);
  const [autoFetchNotice, setAutoFetchNotice] = useState<string | null>(null);
  // Reference points for sanity-checking a freshly OCR'd odometer reading —
  // never used to fabricate a value, only to flag an implausible one for
  // manual double-check. Kept separate from `odometer` (which the user edits).
  const [lastKnownOdometer, setLastKnownOdometer] = useState<number | null>(null);
  const [vehicleSaleDate, setVehicleSaleDate] = useState<string | null>(null);

  // Auto-Fetch Previous Visit & Customer Details on VRN Entry or Field Blur/Tab
  const handleAutoFetchVehicle = async (targetVrn: string) => {
    const cleanVrn = targetVrn.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (cleanVrn.length < 4) return;

    // 1. Search local jobCards memory for most recent visit
    const latestVisit = [...jobCards]
      .reverse()
      .filter(j => j && j.status !== "Cancelled")
      .find(j => (j.vrn || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "") === cleanVrn);

    if (latestVisit) {
      if (latestVisit.customer_name) setCustomerName(latestVisit.customer_name);
      if (latestVisit.customer_mobile) setCustomerMobile(latestVisit.customer_mobile);
      if (latestVisit.vehicle_model) setModel(latestVisit.vehicle_model);
      if (latestVisit.vehicle_make) setMake(latestVisit.vehicle_make);
      if (latestVisit.chassis_no) setChassisNumber(latestVisit.chassis_no);
      if (latestVisit.odometer_reading) {
        setOdometer(String(latestVisit.odometer_reading));
        setLastKnownOdometer(Number(latestVisit.odometer_reading));
      }

      setAutoFetchNotice(`✨ Auto-fetched previous visit records for ${latestVisit.vrn} (Customer: ${latestVisit.customer_name}). All fields remain 100% editable.`);
      return;
    }

    // 2. Query backend database lookup endpoint
    try {
      const res = await fetch(`/api/vehicles/lookup/${cleanVrn}`, {
        headers: staffAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.vehicle) {
          const v = data.vehicle;
          if (v.customer_name) setCustomerName(v.customer_name);
          if (v.customer_mobile) setCustomerMobile(v.customer_mobile);
          if (v.model) setModel(v.model);
          if (v.make) setMake(v.make);
          if (v.chassis_no) setChassisNumber(v.chassis_no);
          if (v.odometer_reading) {
            setOdometer(String(v.odometer_reading));
            setLastKnownOdometer(Number(v.odometer_reading));
          }
          if (v.original_sale_date) setVehicleSaleDate(v.original_sale_date);
          setAutoFetchNotice(`✨ Retrieved records from Vehicle Registry for ${cleanVrn}. All fields auto-filled & 100% editable.`);
        }
      }
    } catch (err) {
      // Quiet fail on network error
    }
  };

  // Escape key listener to close modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowAnprModal(false);
        setShowOdoModal(false);
        setShowFuelModal(false);
        setShowChassisModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Shared vehicle-photo pipeline: called after a photo is captured, whether
  // via the native Capacitor Camera (Android/iOS) or the web <input capture>
  // fallback. Preserves the captured image + metadata as evidence (separate
  // from the smaller copy compressed for the OCR request — see performOCR),
  // then runs the existing, unmodified Azure OCR flow.
  const processVehiclePhoto = async (file: File | Blob, previewDataUrl?: string) => {
    setAnprScanning(true);
    setOcrStatus("scanning");
    await captureMetadata();
    const capturedAt = new Date().toISOString();

    // Preserve the captured image as evidence at a higher quality than the
    // OCR-only copy. Never overwrite this with the compressed OCR image.
    try {
      const evidenceDataUrl = previewDataUrl || await compressImageFile(file, {
        maxWidth: 1600,
        maxHeight: 1600,
        quality: 0.85
      });
      setEvidenceImage(evidenceDataUrl);
      setAnprPhotoPreview(evidenceDataUrl);
      setEvidenceCapturedAt(capturedAt);
    } catch (e) {
      console.warn("Failed to preserve vehicle photo evidence:", e);
    }

    try {
      console.log("ANPR: Starting OCR process...");
      const result = await performOCR(file as File);
      console.log("ANPR: OCR process completed successfully");

      if (result && result.extractedFields) {
        if (result.extractedFields.vrn) {
          setVrn(result.extractedFields.vrn);
          handleAutoFetchVehicle(result.extractedFields.vrn);
        }
        if (result.extractedFields.chassisNo) setChassisNumber(result.extractedFields.chassisNo);
        if (result.extractedFields.odometer) setOdometer(String(result.extractedFields.odometer));
      }
      setAnprScanning(false);
      setOcrStatus("success");
      setSuccess(`AI OCR Scanned: Recognized vehicle plate "${result?.extractedFields?.vrn || "Unknown"}"! Location and Timestamp captured.`);
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      console.error("ANPR: OCR failed or process crashed:", err);
      setAnprScanning(false);
      setOcrStatus("failed");
      // The captured photo (evidence) and GPS/timestamp metadata are kept —
      // only the OCR result failed. The VRN field remains for manual entry.

      // Constitution: Real-Data-Only Operational Contract.
      // NEVER inject a fabricated or random vehicle number.
      // All OCR failures → show a clear error and activate manual VRN entry.
      const msg = err?.message || "Unknown error";
      const userMsg = err?.message === "IMAGE_TOO_LARGE_FOR_MEMORY"
        ? "Image too large for OCR. Take a closer, lower-resolution photo and try again."
        : msg.includes("GEMINI_API_KEY")
          ? "Plate recognition unavailable — server API key not configured. Enter the vehicle number manually."
          : msg.includes("no text")
            ? "No plate text detected in image. Ensure the plate is visible and well-lit, then try again."
            : `OCR failed: ${msg}. Enter the vehicle number manually.`;

      setOcrErrorTitle("Plate Recognition Failed");
      setOcrError(userMsg);
      setTimeout(() => setOcrError(null), 10000);
      // Manual VRN entry is always available directly in the form — no need
      // to force the chassis-number fallback path just because OCR failed.
    }
  };

  // Opens the native Android/iOS camera via Capacitor. This is the primary
  // capture mechanism on native platforms — the hidden <input capture> file
  // input remains only as the web/dev fallback (handleAnprPhotoUpload below).
  const captureVehiclePhotoNative = async () => {
    try {
      const photo = await CapacitorCamera.getPhoto({
        // Use Uri instead of DataUrl to avoid serializing a multi-MB base64
        // string through the WebView JS bridge — the #1 cause of OOM crashes
        // on return from the native camera on mid/low-RAM Android devices.
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        quality: 80,
        saveToGallery: false,
        allowEditing: false,
        correctOrientation: true,
        width: 1600,
        height: 1600
      });
      // Read the URI-based result into a blob via local fetch (no bridge
      // serialization bottleneck — the file is already on local disk).
      const imageUri = photo.webPath || photo.path;
      if (!imageUri) throw new Error("Camera returned no image path.");
      const response = await fetch(imageUri);
      const blob = await response.blob();
      // Generate a preview DataUrl from the already-fetched (smaller) blob
      const previewDataUrl = await compressImageFile(blob, {
        maxWidth: 1280, maxHeight: 1280, quality: 0.75
      });
      await processVehiclePhoto(blob, previewDataUrl);
    } catch (err: any) {
      const msg = String(err?.message || err || "");
      if (/cancel/i.test(msg)) {
        // User backed out of the camera — leave the draft/form exactly as it was.
        return;
      }
      console.error("Native camera capture failed:", msg);
      const userMsg = /denied|permission/i.test(msg)
        ? "Camera permission denied. Enable camera access for this app in Android Settings, or enter the vehicle number manually."
        : /no camera/i.test(msg)
          ? "No camera available on this device. Enter the vehicle number manually."
          : `Camera capture failed: ${msg}. Enter the vehicle number manually.`;
      setOcrErrorTitle("Plate Recognition Failed");
      setOcrError(userMsg);
      setTimeout(() => setOcrError(null), 10000);
    }
  };

  // Triggers vehicle-photo capture: native Capacitor camera on Android/iOS,
  // hidden file input (with capture="environment") as the web/dev fallback.
  const triggerVehiclePhotoCapture = () => {
    if (Capacitor.isNativePlatform()) {
      captureVehiclePhotoNative();
    } else {
      anprInputRef.current?.click();
    }
  };

  const handleAnprPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    console.log("ANPR: Photo captured, file size:", file?.size);
    if (e.target) e.target.value = ""; // Reset file input so subsequent triggers always fire
    if (!file) return;
    await processVehiclePhoto(file);
  };

  // Sanity-checks a freshly OCR'd odometer reading against real reference
  // points (never fabricates a "correct" value — only flags an implausible
  // one for the technician to double-check the digits):
  //  1. A truck's odometer cannot go backward from its last recorded reading.
  //  2. Average usage for these vehicles runs 5,000-12,000 KM/month, so total
  //     lifetime KM since the real `original_sale_date` (vehicle_master) should
  //     roughly fall in that band. Generous slack is applied on both sides —
  //     this only needs to catch gross OCR digit errors (e.g. a dropped or
  //     duplicated digit), not flag normal high/low-usage vehicles.
  const checkOdometerPlausibility = (newReading: number): string | null => {
    if (lastKnownOdometer != null && newReading < lastKnownOdometer) {
      return `This reading (${newReading.toLocaleString()} KM) is lower than the last recorded odometer (${lastKnownOdometer.toLocaleString()} KM) for this vehicle. Please verify the digits.`;
    }
    if (vehicleSaleDate) {
      const saleDate = new Date(vehicleSaleDate);
      if (!isNaN(saleDate.getTime())) {
        const now = new Date();
        const monthsElapsed = Math.max(
          1,
          (now.getFullYear() - saleDate.getFullYear()) * 12 + (now.getMonth() - saleDate.getMonth())
        );
        const minExpected = monthsElapsed * 5000 * 0.3;
        const maxExpected = monthsElapsed * 12000 * 3;
        if (newReading < minExpected || newReading > maxExpected) {
          return `This reading (${newReading.toLocaleString()} KM) is well outside the typical range for a vehicle sold on ${vehicleSaleDate} (~${Math.round(monthsElapsed * 5000).toLocaleString()}-${Math.round(monthsElapsed * 12000).toLocaleString()} KM at average usage). Please double-check the digits.`;
        }
      }
    }
    return null;
  };

  const handleOdoPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    console.log("ODO: Photo captured, file size:", file?.size);
    if (e.target) e.target.value = "";
    if (!file) return;
    setOdoScanning(true);
    setOdoCapturedText(null);
    setOdoScanFailed(false);
    setOdoPlausibilityWarning(null);
    let previewUrl: string | null = null;
    try {
      previewUrl = URL.createObjectURL(file);
      setOdoPhotoPreview(previewUrl);
    } catch (e) {}

    await captureMetadata();
    try {
      console.log("ODO: Starting OCR process...");
      const result = await performOCR(file);
      console.log("ODO: OCR process completed");
      const extractedOdo = result?.extractedFields?.odometer;
      setOdoScanning(false);
      // Real-Data-Only: never fabricate an odometer reading. If OCR did not
      // extract a real value from this photo, say so and require manual entry.
      if (extractedOdo) {
        setOdometer(String(extractedOdo));
        setOdoCapturedText(`Successfully scanned dashboard! Detected Odometer: ${extractedOdo} KM. Captured at ${capturedLocation?.lat || "N/A"}, ${capturedLocation?.lng || "N/A"}.`);
        setOdoPlausibilityWarning(checkOdometerPlausibility(extractedOdo));
      } else {
        setOdoScanFailed(true);
        setOdoCapturedText("No odometer reading detected in this photo. Please enter the KM reading manually.");
      }
    } catch (err: any) {
      console.warn("Odometer OCR failed:", err);
      setOdoScanning(false);
      setOdoScanFailed(true);
      setOdoCapturedText(
        err?.message === "IMAGE_TOO_LARGE_FOR_MEMORY"
          ? "Image too large for auto-scan. Please enter KM manually."
          : "OCR failed to read the odometer. Please enter the KM reading manually."
      );
    }
  };

  const handleChassisPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    console.log("Chassis: Photo captured, file size:", file?.size);
    if (e.target) e.target.value = "";
    if (!file) return;
    setChassisScanning(true);
    setChassisCapturedText(null);
    setChassisScanFailed(false);
    await captureMetadata();
    try {
      console.log("Chassis: Starting OCR process...");
      const result = await performOCR(file);
      console.log("Chassis: OCR process completed");
      const extractedChassis = result?.extractedFields?.chassisNo;
      setChassisScanning(false);
      // Real-Data-Only: a fabricated chassis/VIN number can be mistaken for a
      // real one downstream (warranty, ownership records). Never invent one.
      if (extractedChassis) {
        setChassisNumber(extractedChassis);
        setShowChassisModal(false);
        setSuccess(`Chassis OCR Scan Successful! Location: ${capturedLocation?.lat || "N/A"}, ${capturedLocation?.lng || "N/A"}`);
        setTimeout(() => setSuccess(null), 5000);
      } else {
        setChassisScanFailed(true);
        setChassisCapturedText("No chassis number detected in this photo. Please enter it manually in the form.");
      }
    } catch (err: any) {
      console.warn("Chassis OCR failed:", err);
      setChassisScanning(false);
      setChassisScanFailed(true);
      setChassisCapturedText(
        err?.message === "IMAGE_TOO_LARGE_FOR_MEMORY"
          ? "Image too large for auto-scan. Please enter the chassis number manually in the form."
          : "OCR failed to read the chassis plate. Please enter the chassis number manually in the form."
      );
    }
  };

  // Fuel gauge photo capture — evidence only, no automated reading. A needle
  // gauge has no text for OCR and vision-model analysis was intentionally
  // deferred, so the photo is kept purely as a visual reference: it stays
  // visible (both in this modal and next to the manual gauge on the main
  // screen) so the technician can look at the real dashboard while setting
  // the level themselves on the gauge arc — never an auto-filled guess.
  const handleFuelPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    console.log("Fuel: Photo captured, file size:", file?.size);
    if (e.target) e.target.value = "";
    if (!file) return;
    setFuelCapturedText(null);
    setFuelScanFailed(false);
    try {
      setFuelPhotoPreview(URL.createObjectURL(file));
    } catch (e) {}
    await captureMetadata();
    setFuelCapturedText("Photo captured. Compare it to the gauge below and set the exact level on the arc on the main screen.");
  };


  // Active WIP and gate passes filters
  const activeJobs = useMemo(() => {
    return jobCards.filter(j => j.status !== "Completed" && j.status !== "Invoiced");
  }, [jobCards]);

  const gatePasses = useMemo(() => {
    return jobCards.filter(j => {
      if (!j) return false;
      const vrnStr = j.vrn || "";
      const nameStr = j.customer_name || "";
      const matchSearch = vrnStr.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          nameStr.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === "all" || j.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [jobCards, searchQuery, statusFilter]);

  // Handler to register entries
  const handleRegisterEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return; // view-only role — the form is not rendered either
    const activeIdentifier = anprFailed ? chassisNumber : vrn;
    if (!activeIdentifier || !customerName || !customerMobile) return;

    // ── Duplicate Gate Entry Guard (client-side) ───────────────────────
    // Prevent accidental double-capture: block if an active (non-completed)
    // job card already exists for this VRN or chassis number. The backend
    // has the same guard (returns 409), but checking here gives instant
    // feedback without a server round-trip.
    const normalizeId = (s: string): string =>
      s.trim().toUpperCase().replace(/[\s\-]/g, "");
    const completedStatuses = ["Completed", "Invoiced", "Billed", "Out of Workshop", "Cancelled", "Closed"];

    const submittingVrn = anprFailed ? "" : normalizeId(vrn);
    const submittingChassis = anprFailed ? normalizeId(chassisNumber) : "";

    const duplicateJob = jobCards.find(j => {
      if (completedStatuses.includes(j.status)) return false;
      if (submittingVrn && submittingVrn.length >= 4) {
        const jVrn = normalizeId(j.vrn || "");
        if (jVrn && jVrn === submittingVrn) return true;
      }
      if (submittingChassis && submittingChassis.length >= 4) {
        const jChassis = normalizeId((j as any).chassis_number || "");
        if (jChassis && jChassis === submittingChassis) return true;
      }
      return false;
    });

    if (duplicateJob) {
      const dupeLabel = duplicateJob.vrn || (duplicateJob as any).chassis_number || "Unknown";
      setOcrErrorTitle("Duplicate Entry Blocked");
      setOcrError(
        `⚠️ Duplicate entry blocked: Vehicle "${dupeLabel}" already has an active job card (${duplicateJob.job_card_no || "—"}, status: ${duplicateJob.status}). Complete or invoice the existing entry before creating a new one.`
      );
      setTimeout(() => setOcrError(null), 12000);
      return;
    }
    // ── End Duplicate Guard ────────────────────────────────────────────

    const newJobNo = `JC-${Date.now().toString().slice(-5)}`;
    const result = await onCreateJob({
      job_card_no: newJobNo,
      vrn: anprFailed ? `CH-${chassisNumber.trim().toUpperCase().slice(-6)}` : vrn.trim().toUpperCase(),
      chassis_number: anprFailed ? chassisNumber.trim().toUpperCase() : undefined,
      customer_name: customerName.trim(),
      customer_mobile: customerMobile.trim(),
      vehicle_make: "TATA", // vehicle make is TATA only in all menus
      vehicle_model: model || "Tata Commercial Heavy Vehicle",
      status: "Waiting",
      current_workflow_state: "GATE_IN",
      current_queue: "Reception & Service Advisor Queue",
      is_virtual: 1,
      bay_id: null,
      created_at: new Date().toISOString(),
      remarks: `Virtual Job Card generated at Gate Inward Security. Fuel: ${fuelLevel} | Odometer: ${odometer || 0} KM${anprFailed ? ` | Chassis Scanned: ${chassisNumber}` : ''} | Captured at: ${capturedLocation ? `${capturedLocation.lat}, ${capturedLocation.lng}` : 'N/A'} on ${capturedTime || 'N/A'}`,
      km_reading: odometer ? parseInt(odometer) : 0,
      // Evidence: the captured vehicle photo (never the smaller OCR-only copy),
      // kept only when a real photo was captured — never a fabricated placeholder.
      numberplate_photo: evidenceImage || undefined
    }, { silent: true });

    // Backend rejected it (duplicate, or a same-day reopen still awaiting GM
    // approval) — leave the form filled in exactly as the user entered it so
    // they can see what happened and decide what to do, rather than silently
    // wiping their work and claiming success.
    if (result && result.success === false && !result.pendingApproval) {
      setOcrErrorTitle("Gate Registration Failed");
      setOcrError(result.message || "Could not register gate entry.");
      setTimeout(() => setOcrError(null), 12000);
      return;
    }

    if (result && result.pendingApproval) {
      setSuccess(`⏳ ${result.message || "Same-day re-entry sent for GM approval."}`);
    } else {
      setSuccess(`✨ Virtual Job Card ${newJobNo} created for ${anprFailed ? chassisNumber.toUpperCase() : vrn.toUpperCase()}! Full vehicle history auto-populated and routed to Receptionist, Service Advisor & Service Manager sequential queues.`);
    }
    clearDraft();
    setVrn("");
    setChassisNumber("");
    setAutoFetchNotice(null);
    setLastKnownOdometer(null);
    setVehicleSaleDate(null);
    setOdoPlausibilityWarning(null);
    setAnprFailed(false);
    setCustomerName("");
    setCustomerMobile("");
    setMake("TATA");
    setModel("Tata Commercial Heavy Vehicle");
    setOdometer("");
    setFuelLevel("50%");
    setFuelPercentage(50);
    setAnprPhotoPreview(null);
    setEvidenceImage(null);
    setEvidenceCapturedAt(null);
    setOcrStatus("idle");
    setGpsStatus("idle");
    setCapturedLocation(null);
    setCapturedTime(null);

    setMobileActiveView("ledger");
    setTimeout(() => setSuccess(null), 6000);
  };

  const handleGateOut = (jobId: number) => {
    if (readOnly) return; // view-only role — the button is not rendered either
    onUpdateJob(jobId, { status: "Invoiced", remarks: "Vehicle cleared Gate-Out" });
    setSuccess(`Vehicle status updated to Invoiced. Gate-Out cleared!`);
    setTimeout(() => setSuccess(null), 4000);
  };

  // Memoized Truck SVG to avoid lag/slowness on text input changes
  const memoizedTruckSvg = useMemo(() => {
    const readyOutCount = jobCards.filter(j => j.status === "Completed" || j.status === "Invoiced").length;
    const freeBaysCount = bays.filter(b => b.status === "Idle" || b.status === "Available").length;

    return (
      <svg viewBox="0 0 740 280" className="w-full h-auto text-slate-800" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Chassis and components under the truck body */}
        <path d="M 210 200 L 710 200 L 710 215 L 210 215 Z" fill="#0f172a" />
        <rect x="360" y="200" width="80" height="25" rx="4" fill="#334155" />

        {/* Axles / Wheels */}
        <g transform="translate(180, 220)">
          <circle cx="0" cy="0" r="26" fill="#0f172a" stroke="#ffffff" strokeWidth="2" />
          <circle cx="0" cy="0" r="15" fill="#475569" stroke="#94a3b8" strokeWidth="1.5" />
          <circle cx="0" cy="0" r="5" fill="#ffffff" />
        </g>
        <g transform="translate(320, 220)">
          <circle cx="0" cy="0" r="26" fill="#0f172a" stroke="#ffffff" strokeWidth="2" />
          <circle cx="0" cy="0" r="15" fill="#475569" stroke="#94a3b8" strokeWidth="1.5" />
          <circle cx="0" cy="0" r="5" fill="#ffffff" />
        </g>
        <g transform="translate(378, 220)">
          <circle cx="0" cy="0" r="26" fill="#0f172a" stroke="#ffffff" strokeWidth="2" />
          <circle cx="0" cy="0" r="15" fill="#475569" stroke="#94a3b8" strokeWidth="1.5" />
          <circle cx="0" cy="0" r="5" fill="#ffffff" />
        </g>
        <g transform="translate(520, 220)">
          <circle cx="0" cy="0" r="26" fill="#0f172a" stroke="#ffffff" strokeWidth="2" />
          <circle cx="0" cy="0" r="15" fill="#475569" stroke="#94a3b8" strokeWidth="1.5" />
          <circle cx="0" cy="0" r="5" fill="#ffffff" />
        </g>
        <g transform="translate(578, 220)">
          <circle cx="0" cy="0" r="26" fill="#0f172a" stroke="#ffffff" strokeWidth="2" />
          <circle cx="0" cy="0" r="15" fill="#475569" stroke="#94a3b8" strokeWidth="1.5" />
          <circle cx="0" cy="0" r="5" fill="#ffffff" />
        </g>

        {/* Cabin Body */}
        <path d="M 235 195 L 235 85 C 235 80, 225 70, 210 70 L 105 70 C 95 70, 90 78, 88 85 L 80 155 C 78 170, 82 180, 82 195 L 82 205 L 145 205 C 145 185, 160 170, 180 170 C 200 170, 215 185, 215 205 L 235 205 Z" fill="#0f172a" stroke="#1e293b" strokeWidth="2" />
              
        {/* Windshield */}
        <path d="M 98 85 L 155 85 L 150 130 L 92 130 Z" fill="#e2e8f0" stroke="#334155" strokeWidth="1.5" />
        {/* Window */}
        <path d="M 165 85 L 210 85 C 215 85, 217 88, 217 92 L 217 130 L 160 130 Z" fill="#e2e8f0" stroke="#334155" strokeWidth="1.5" />
        
        {/* Door line */}
        <path d="M 158 85 L 158 200" stroke="#334155" strokeWidth="1.5" />

        {/* Grille */}
        <path d="M 88 140 L 150 140 L 148 180 L 90 180 Z" fill="#1e293b" stroke="#334155" strokeWidth="1.5" />
        <line x1="96" y1="150" x2="142" y2="150" stroke="#ef4444" strokeWidth="1.5" />
        <line x1="96" y1="160" x2="142" y2="160" stroke="#f97316" strokeWidth="1.5" />
        <line x1="96" y1="170" x2="142" y2="170" stroke="#ffffff" strokeWidth="1.5" />
        
        {/* Headlights */}
        <rect x="80" y="185" width="12" height="8" rx="2" fill="#fef08a" stroke="#ca8a04" strokeWidth="1" />
        <rect x="145" y="185" width="12" height="8" rx="2" fill="#fef08a" stroke="#ca8a04" strokeWidth="1" />

        {/* TRUCK BODY */}
        <rect x="245" y="20" width="480" height="175" rx="12" fill="#0f172a" stroke="#f97316" strokeWidth="2.5" />
        
        <foreignObject x="255" y="30" width="460" height="155">
          <div xmlns="http://www.w3.org/1999/xhtml" className="text-white p-2 h-full flex flex-col justify-between text-left font-sans select-none">
            <div className="flex justify-between items-center border-b border-slate-800 pb-1">
              <span className="text-[9px] font-black uppercase tracking-wider text-orange-400 flex items-center gap-1.5">
                <span className="ds-button-primary w-1.5 h-1.5   rounded-full animate-ping"></span>
                TATA Signa 4830.T
              </span>
              <span className="ds-button-primary text-[8px] font-extrabold px-1.5 py-0.5 rounded  /10 text-orange-400 border border-orange-500/20 uppercase tracking-widest">
                Gate Registry Live
              </span>
            </div>
            
            <div className="grid grid-cols-3 gap-1.5 py-1">
              <div className="bg-slate-950/80 border border-slate-850 rounded-lg p-1.5 text-center">
                <div className="text-[7px] font-bold text-slate-500 uppercase tracking-wider">Active WIP</div>
                <div className="text-xs font-black text-orange-400 mt-0.5">{activeJobs.length} Veh</div>
              </div>
              <div className="bg-slate-950/80 border border-slate-850 rounded-lg p-1.5 text-center">
                <div className="text-[7px] font-bold text-slate-500 uppercase tracking-wider">Ready Out</div>
                <div className="text-xs font-black text-emerald-400 mt-0.5">{readyOutCount} Veh</div>
              </div>
              <div className="bg-slate-950/80 border border-slate-850 rounded-lg p-1.5 text-center">
                <div className="text-[7px] font-bold text-slate-500 uppercase tracking-wider">Free Bays</div>
                <div className="text-xs font-black text-blue-400 mt-0.5">{freeBaysCount}/{bays.length}</div>
              </div>
            </div>
            
            <div className="bg-slate-950/60 rounded-md p-1 text-[7px] border border-slate-850 text-slate-400 leading-tight">
              <strong className="text-orange-400 uppercase tracking-wider font-extrabold mr-1">Security SOP:</strong>
              TATA only • Always scan digital Odometer • Verify interactive fuel needles • Validate customer mobile.
            </div>
          </div>
        </foreignObject>
      </svg>
    );
  }, [activeJobs.length, jobCards, bays]);

  // Fuel Vector Arc dynamic needle rotation (-90 to +90 degrees)
  const needleAngle = -90 + (fuelPercentage * 1.8);

  return (
    <div className="space-y-6">
      {/* Success banner */}
      {success && (
        <div className="ds-button-success p-4  /10 border border-emerald-500/20 text-emerald-600 rounded-xl flex items-center gap-3 text-xs animate-in slide-in-from-top-2 duration-200">
          <CheckCircle className="h-5 w-5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* OCR Error banner — shown when plate recognition fails; prompts manual entry */}
      {ocrError && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-700 rounded-xl flex items-start gap-3 text-xs animate-in slide-in-from-top-2 duration-200">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-rose-500" />
          <div>
            {/* The heading was hardcoded to "Plate Recognition Failed", but this
                banner carries every error on the screen — including gate
                registration failures. A 403 from POST /api/job-cards was being
                shown to the user as a plate-recognition problem, sending them
                to re-scan a number plate that had read perfectly. */}
            <p className="font-bold uppercase tracking-wider text-rose-600 mb-0.5">{ocrErrorTitle}</p>
            <p>{ocrError}</p>
          </div>
          <button
            type="button"
            onClick={() => setOcrError(null)}
            className="ml-auto text-rose-400 hover:text-rose-600 font-bold text-sm shrink-0"
          >✕</button>
        </div>
      )}

      {/* Mobile Toggle Switch */}
      <div className={`lg:hidden ${readOnly ? "hidden" : "flex"} bg-slate-200/60 p-1 rounded-xl shadow-inner border border-slate-300/40`}>
        <button
          type="button"
          onClick={() => setMobileActiveView("form")}
          className={`flex-1 py-1.5 text-center text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
            mobileActiveView === "form"
              ? "bg-orange-500 text-white shadow-md"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Register Gate In
        </button>
        <button
          type="button"
          onClick={() => setMobileActiveView("ledger")}
          className={`flex-1 py-1.5 text-center text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
            mobileActiveView === "ledger"
              ? "bg-slate-900 text-white shadow-md"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Clearance Ledger ({gatePasses.length})
        </button>
      </div>

      {/* Grid: Stats and Action form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Form panel — withheld from view-only roles; gate-in is security/reception work. */}
        <div className={`lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4 ${
          readOnly ? "hidden" : mobileActiveView === "form" ? "block" : "hidden lg:block"
        }`}>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">Gate Inward Registry</h2>
                <p className="text-[10px] text-slate-400 font-medium">Record incoming vehicles and generate Job Cards instantly</p>
              </div>
            </div>

            {/* Quick CCTV Feeder Trigger */}
            <button
              type="button"
              onClick={() => setShowAnprModal(true)}
              className="px-3 py-1.5 bg-slate-950 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm border border-slate-800 cursor-pointer"
            >
              <Camera className="h-4 w-4 text-emerald-400" />
              <span>CCTV ANPR Fetch</span>
            </button>
          </div>

          <form onSubmit={handleRegisterEntry} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* VRN or Chassis Number input section */}
              {anprFailed ? (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Chassis Number (Plate Scan) *
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <FileText className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. MAT441234A567890"
                        value={chassisNumber}
                        onChange={(e) => setChassisNumber(e.target.value.toUpperCase())}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-orange-500 focus:outline-none uppercase font-semibold text-slate-800 font-mono"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowChassisModal(true)}
                      className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all border border-slate-700"
                      title="Scan Chassis Plate"
                    >
                      <Camera className="h-4 w-4 text-orange-400" />
                      <span>Scan Plate</span>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAnprFailed(false)}
                    className="text-[9px] text-orange-500 font-bold hover:underline mt-1 block"
                  >
                    ← Back to VRN / ANPR Entry
                  </button>
                </div>
              ) : (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Registration Number (VRN) *
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Car className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. MH-12-PQ-4567"
                        value={vrn}
                        onChange={(e) => {
                          const val = e.target.value;
                          setVrn(val);
                          handleAutoFetchVehicle(val);
                        }}
                        onBlur={() => {
                          handleAutoFetchVehicle(vrn);
                        }}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-orange-500 focus:outline-none uppercase font-semibold text-slate-800"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAnprModal(true)}
                      className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all border border-slate-700"
                      title="Fetch Plate from CCTV ANPR"
                    >
                      <Camera className="h-4 w-4 text-emerald-400" />
                      <span>ANPR</span>
                    </button>
                  </div>

                  {autoFetchNotice && (
                    <div className="mt-1.5 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-between text-[10px] text-emerald-600 font-bold">
                      <span>{autoFetchNotice}</span>
                      <button type="button" onClick={() => setAutoFetchNotice(null)} className="text-slate-400 hover:text-slate-600 ml-2 font-bold cursor-pointer">✕</button>
                    </div>
                  )}
                </div>
              )}

              {/* Customer Mobile (Editable & Auto-Lookup on Blur) */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Customer Mobile *
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9876543210"
                    value={customerMobile}
                    onChange={(e) => setCustomerMobile(e.target.value)}
                    onBlur={() => {
                      if (customerMobile.trim().length >= 10 && !customerName) {
                        const match = jobCards.find(j => (j.customer_mobile || "").includes(customerMobile.trim()));
                        if (match) {
                          setCustomerName(match.customer_name);
                          if (match.vrn && !vrn) {
                            setVrn(match.vrn);
                            handleAutoFetchVehicle(match.vrn);
                          }
                        }
                      }
                    }}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-orange-500 focus:outline-none text-slate-800 font-medium"
                  />
                </div>
              </div>

              {/* Customer Name (Editable) */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Customer Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Robert Downey"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-orange-500 focus:outline-none text-slate-800 font-medium"
                  />
                </div>
              </div>

              {/* Odometer Input with camera capture option */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Odometer Reading (KM)
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Gauge className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="number"
                      placeholder="e.g. 45200"
                      value={odometer}
                      onChange={(e) => setOdometer(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-orange-500 focus:outline-none text-slate-800 font-mono"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowOdoModal(true)}
                    className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all border border-slate-700"
                    title="Capture odometer by Camera"
                  >
                    <Camera className="h-4 w-4 text-orange-400" />
                    <span>Scan</span>
                  </button>
                </div>
                <p className="text-[9px] text-slate-400 mt-1 italic">
                  Odometer can be captured via cam scan and manually corrected above if required.
                </p>
              </div>

              {/* Vector Fuel Gauge interactive section (span 2 on grid to occupy elegant space) */}
              <div className="md:col-span-2 bg-slate-950 text-white rounded-2xl p-5 border border-slate-800 shadow-lg relative overflow-hidden flex flex-col md:flex-row items-center gap-6">
                
                {/* SVG Semicircle Vector Gauge */}
                <div className="w-full md:w-1/2 flex flex-col items-center">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Fuel className="h-3.5 w-3.5 text-orange-500" />
                    <span>Interactive Fuel Gauge (Click to Select)</span>
                  </div>
                  
                  <svg 
                    viewBox="0 0 200 115" 
                    className="w-full max-w-[200px] cursor-crosshair select-none relative z-10"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = e.clientX - rect.left - (rect.width / 2);
                      const y = e.clientY - rect.top - (rect.height * 0.85); // pivot near center bottom
                      const angleRad = Math.atan2(y, x);
                      let angleDeg = angleRad * (180 / Math.PI);
                      if (angleDeg < 0) {
                        let pct = Math.round(((angleDeg + 180) / 180) * 100);
                        pct = Math.max(0, Math.min(100, pct));
                        setFuelPercentage(pct);
                        setFuelLevel(`${pct}%`);
                      }
                    }}
                  >
                    {/* Dark empty gauge arc */}
                    <path 
                      d="M 25 95 A 75 75 0 0 1 175 95" 
                      fill="none" 
                      stroke="#1e293b" 
                      strokeWidth="10" 
                      strokeLinecap="round" 
                    />
                    
                    {/* Interactive overlay colors */}
                    <path 
                      d="M 25 95 A 75 75 0 0 1 65 42" 
                      fill="none" 
                      stroke="#ef4444" 
                      strokeWidth="10" 
                      strokeLinecap="round"
                      opacity="0.15"
                    />
                    <path 
                      d="M 65 42 A 75 75 0 0 1 135 42" 
                      fill="none" 
                      stroke="#f97316" 
                      strokeWidth="10"
                      opacity="0.15"
                    />
                    <path 
                      d="M 135 42 A 75 75 0 0 1 175 95" 
                      fill="none" 
                      stroke="#10b981" 
                      strokeWidth="10" 
                      strokeLinecap="round"
                      opacity="0.15"
                    />

                    {/* Active vector progress arc line */}
                    {fuelPercentage > 0 && (
                      <path 
                        d={`M 25 95 A 75 75 0 0 1 ${25 + (fuelPercentage * 1.5)} ${95 - (Math.sin(fuelPercentage * Math.PI / 100) * 75)}`} 
                        fill="none" 
                        stroke={fuelPercentage < 20 ? "#ef4444" : fuelPercentage < 55 ? "#f97316" : "#10b981"} 
                        strokeWidth="10" 
                        strokeLinecap="round"
                        className="transition-all duration-300"
                      />
                    )}

                    {/* Central anchor */}
                    <circle cx="100" cy="95" r="8" fill="#475569" />
                    <circle cx="100" cy="95" r="4" fill="#f97316" />

                    {/* Semicircle labels */}
                    <text x="18" y="110" fill="#ef4444" fontSize="9" fontWeight="bold" textAnchor="middle">E</text>
                    <text x="100" y="30" fill="#94a3b8" fontSize="9" fontWeight="bold" textAnchor="middle">1/2</text>
                    <text x="182" y="110" fill="#10b981" fontSize="9" fontWeight="bold" textAnchor="middle">F</text>

                    {/* Animated needle */}
                    <g transform={`rotate(${needleAngle} 100 95)`} className="transition-transform duration-500 ease-out">
                      <line x1="100" y1="95" x2="100" y2="35" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" />
                      <polygon points="97,55 103,55 100,32" fill="#f97316" />
                    </g>
                  </svg>
                </div>

                {/* Dashboard Vector Adjuster and Image Upload simulation */}
                <div className="w-full md:w-1/2 space-y-3 flex flex-col justify-center">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-orange-400">Exact Fuel Calibration</p>
                    <p className="text-[10px] text-slate-400">
                      Click directly on the gauge vector arc to set exact levels, or upload a dashboard photo to analyze the fuel needle automatically.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-[9px] font-bold text-slate-500 uppercase">Selected Level</p>
                      <p className="text-lg font-black text-white">{fuelPercentage}% Tank</p>
                    </div>
                    <div className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                      fuelPercentage < 15 ? "bg-rose-500/20 text-rose-400" :
                      fuelPercentage < 45 ? "bg-amber-500/20 text-amber-400" :
                      "bg-emerald-500/20 text-emerald-400"
                    }`}>
                      {fuelPercentage < 15 ? "Reserve" :
                       fuelPercentage < 35 ? "1/4 Fuel" :
                       fuelPercentage < 65 ? "1/2 Fuel" :
                       fuelPercentage < 85 ? "3/4 Fuel" : "Full Tank"}
                    </div>
                  </div>

                  {fuelPhotoPreview && (
                    <button
                      type="button"
                      onClick={() => window.open(fuelPhotoPreview, "_blank")}
                      className="p-2 bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-2.5 text-left hover:border-orange-500 transition-all cursor-pointer"
                    >
                      <img
                        src={fuelPhotoPreview}
                        alt="Captured fuel gauge"
                        className="h-10 w-14 object-cover rounded-lg border border-slate-700 shrink-0"
                      />
                      <span className="text-[9px] text-slate-400 leading-relaxed">
                        Captured gauge photo — tap to view full size while correcting the level above.
                      </span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowFuelModal(true)}
                    className="py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-700 shadow-sm"
                  >
                    <Upload className="h-3.5 w-3.5 text-orange-400" />
                    <span>Analyze Fuel Gauge Photo</span>
                  </button>
                </div>
              </div>

            </div>



            <button
              type="submit"
              className="ds-button-primary w-full py-2.5   hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Register Gate Inward & Issue Job Card</span>
            </button>
          </form>
        </div>

        {/* Live status indicators - Truck Vector Info Box */}
        <div className={`bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4 ${
          mobileActiveView === "form" ? "block" : "hidden lg:block"
        }`}>
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100 mb-3">
              Gate Overview
            </h3>
            
            {/* SVG B&W Vector Truck */}
            <div className="w-full flex items-center justify-center">
              {memoizedTruckSvg}
            </div>
          </div>
        </div>
      </div>

      {/* Grid: List of Gate Log and Out Passes */}
      <div className={`bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm ${
        mobileActiveView === "ledger" ? "block" : "hidden lg:block"
      }`}>
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-slate-50">
          <div>
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Gate Clearance Ledger</h2>
            <p className="text-[10px] text-slate-400 font-medium">Verify vehicle state and grant Gate-Out Passports</p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search VRN or Customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg text-xs px-2 py-1 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="Waiting">Waiting</option>
              <option value="WIP">WIP</option>
              <option value="Completed">Completed</option>
              <option value="Invoiced">Invoiced</option>
            </select>
            <button 
              onClick={onRefresh}
              className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="ds-table w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="ds-th py-3 px-5">Job Card / VRN</th>
                <th className="ds-th py-3 px-5">Customer Profile</th>
                <th className="ds-th py-3 px-5">Vehicle Specifics</th>
                <th className="ds-th py-3 px-5 font-mono">Fuel & Odo</th>
                <th className="ds-th py-3 px-5">Arrival State</th>
                <th className="ds-th py-3 px-5 text-right">Gate Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {gatePasses.map((job) => (
                <tr key={job.job_id} className="ds-table-row hover:bg-slate-50/50 transition-colors">
                  <td className="ds-td py-3.5 px-5">
                    <div className="font-mono font-bold text-slate-800">{job.job_card_no}</div>
                    <div className="mt-0.5 text-[10px] font-black text-indigo-600 tracking-wider uppercase bg-indigo-50 border border-indigo-100 px-1.5 py-0.2 rounded inline-block">
                      {job.vrn}
                    </div>
                  </td>
                  <td className="ds-td py-3.5 px-5">
                    <div className="font-bold text-slate-700">{job.customer_name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{job.customer_mobile}</div>
                  </td>
                  <td className="ds-td py-3.5 px-5">
                    {/* vehicle make is always TATA or Tata Motors in all logs */}
                    <div className="font-bold text-slate-700">TATA {job.vehicle_model}</div>
                    <div className="text-[10px] text-slate-400">Type: {job.sr_type || "General Service"}</div>
                  </td>
                  <td className="ds-td py-3.5 px-5 font-mono">
                    <div className="text-slate-700 flex items-center gap-1">
                      <Gauge className="h-3 w-3 text-slate-400" />
                      <span>{(() => {
                        const odoVal = job.km_reading || job.odometer_reading || (job.remarks?.match(/Odometer:\s*(\d+)/i)?.[1]);
                        return odoVal && Number(odoVal) > 0 ? `${Number(odoVal).toLocaleString()} KM` : "—";
                      })()}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                      <Fuel className="h-3 w-3 text-slate-400" />
                      <span>{(() => {
                        if (job.remarks) {
                          const match = job.remarks.match(/Fuel:\s*([^|\n\r]+)/i);
                          if (match && match[1].trim()) return match[1].trim();
                        }
                        if ((job as any).fuel_level) return (job as any).fuel_level;
                        return "—";
                      })()}</span>
                    </div>
                  </td>
                  <td className="ds-td py-3.5 px-5">
                    <div className="flex flex-col gap-1">
                      <div className="text-[10px] text-slate-400">
                        In: {job.created_at ? new Date(job.created_at).toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "N/A"}
                      </div>
                      <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider w-fit ${
                        job.status === "Invoiced" 
                          ? "bg-emerald-100 text-emerald-800 border-emerald-200" 
                          : job.status === "Completed"
                          ? "bg-blue-100 text-blue-800 border-blue-200 animate-pulse"
                          : "bg-amber-100 text-amber-800 border-amber-200"
                      }`}>
                        {job.status}
                      </span>
                    </div>
                  </td>
                  <td className="ds-td py-3.5 px-5 text-right">
                    {job.status === "Invoiced" ? (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded">
                        Cleared Outward
                      </span>
                    ) : job.status === "Completed" && !readOnly ? (
                      <button
                        onClick={() => handleGateOut(job.job_id)}
                        className="ds-button-success px-2.5 py-1.5   hover:bg-emerald-700 text-white font-bold text-[10px] uppercase tracking-wider rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
                      >
                        <LogOut className="h-3 w-3" />
                        <span>Issue Gate-Out Pass</span>
                      </button>
                    ) : (
                      <span className="text-[10px] font-medium text-slate-400 italic">
                        Servicing In-Progress
                      </span>
                    )}
                  </td>
                </tr>
              ))}

              {gatePasses.length === 0 && (
                <tr>
                  <td colSpan={6} className="ds-td text-center py-12 text-slate-400 font-medium">
                    No vehicles found in Gate Registry ledger.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ======================================= */}
      {/* 1. CCTV ANPR SCAN MODAL */}
      {/* ======================================= */}
      {showAnprModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl w-full max-w-lg max-h-[90dvh] overflow-y-auto shadow-2xl flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="ds-button-success w-8 h-8 rounded-lg  /10 text-emerald-400 flex items-center justify-center">
                  <Camera className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-white">Live Gate CCTV ANPR</h3>
                  <p className="text-[9px] text-slate-400 font-medium">Automatic Number Plate Recognition Stream</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAnprModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold font-mono p-1"
              >
                ✕
              </button>
            </div>

            {/* Interactive Photo Capture Scanner Box — opens the native camera on
                Android/iOS via Capacitor; falls back to <input capture> on web. */}
            <div
              onClick={anprPhotoPreview ? undefined : triggerVehiclePhotoCapture}
              className={`ds-card relative aspect-video bg-slate-950 hover:  transition-all flex flex-col items-center justify-center border-b   overflow-hidden group ${anprPhotoPreview ? "" : "cursor-pointer"}`}
            >
              <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={anprInputRef}
                onChange={handleAnprPhotoUpload}
                className="hidden"
              />

              {anprPhotoPreview && (
                <img
                  src={anprPhotoPreview}
                  alt="Captured vehicle plate"
                  className="absolute inset-0 w-full h-full object-cover opacity-60"
                />
              )}

              {/* Scanning visual sweep line */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/10 to-transparent h-1/2 w-full animate-bounce pointer-events-none"></div>

              {anprScanning ? (
                <div className="relative z-10 text-emerald-400">
                  <FunnyLoader message="Running Neural OCR Scan on Image..." />
                </div>
              ) : anprPhotoPreview ? (
                <div className="text-center p-6 space-y-2 relative z-10">
                  <div className="w-14 h-14 rounded-full bg-slate-900/90 border border-slate-800 flex items-center justify-center mx-auto text-emerald-400 shadow-md">
                    {ocrStatus === "success" ? <Check className="h-6 w-6" /> : ocrStatus === "failed" ? <AlertCircle className="h-6 w-6 text-rose-400" /> : <Camera className="h-6 w-6" />}
                  </div>
                  <p className="text-xs font-black text-slate-100 uppercase tracking-widest bg-slate-950/70 px-2 py-1 rounded inline-block">
                    Vehicle Photo Captured
                  </p>
                </div>
              ) : (
                <div className="text-center p-6 space-y-2.5 relative z-10">
                  <div className="w-14 h-14 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-emerald-400 group-hover:scale-110 group-hover:border-emerald-500/40 transition-all shadow-md">
                    <Camera className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-100 uppercase tracking-widest">TAP TO CAPTURE VEHICLE PHOTO</p>
                    <p className="text-[9px] text-slate-400 mt-1">Opens the camera for instant plate OCR recognition</p>
                  </div>
                </div>
              )}

              {/* Scope corners */}
              <div className="absolute top-6 left-6 w-4 h-4 border-t-2 border-l-2 border-emerald-500 pointer-events-none"></div>
              <div className="absolute top-6 right-6 w-4 h-4 border-t-2 border-r-2 border-emerald-500 pointer-events-none"></div>
              <div className="absolute bottom-6 left-6 w-4 h-4 border-b-2 border-l-2 border-emerald-500 pointer-events-none"></div>
              <div className="absolute bottom-6 right-6 w-4 h-4 border-b-2 border-r-2 border-emerald-500 pointer-events-none"></div>
            </div>

            {anprPhotoPreview && !anprScanning && (
              <div className="px-5 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setAnprPhotoPreview(null);
                    setEvidenceImage(null);
                    setEvidenceCapturedAt(null);
                    setOcrStatus("idle");
                    triggerVehiclePhotoCapture();
                  }}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-700"
                >
                  <Camera className="h-3.5 w-3.5 text-orange-400" />
                  <span>Retake Photo</span>
                </button>
              </div>
            )}

            {/* Capture metadata: timestamp, GPS status, OCR status, detected VRN */}
            {anprPhotoPreview && (
              <div className="px-5 pt-4 grid grid-cols-2 gap-2 text-[9px]">
                <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2">
                  <p className="text-slate-500 font-bold uppercase tracking-wider">Captured At</p>
                  <p className="text-slate-200 font-mono mt-0.5">{evidenceCapturedAt ? new Date(evidenceCapturedAt).toLocaleString("en-IN") : capturedTime || "—"}</p>
                </div>
                <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2">
                  <p className="text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1"><MapPin className="h-2.5 w-2.5" /> GPS Status</p>
                  <p className={`font-mono mt-0.5 ${gpsStatus === "success" ? "text-emerald-400" : gpsStatus === "capturing" ? "text-amber-400" : "text-rose-400"}`}>
                    {gpsStatus === "success" && capturedLocation
                      ? `${capturedLocation.lat.toFixed(5)}, ${capturedLocation.lng.toFixed(5)}`
                      : gpsStatus === "capturing" ? "Acquiring…"
                      : gpsStatus === "denied" ? "Permission Denied"
                      : gpsStatus === "unavailable" ? "Unavailable"
                      : "—"}
                  </p>
                </div>
                <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2">
                  <p className="text-slate-500 font-bold uppercase tracking-wider">OCR Status</p>
                  <p className={`font-mono mt-0.5 ${ocrStatus === "success" ? "text-emerald-400" : ocrStatus === "failed" ? "text-rose-400" : ocrStatus === "scanning" ? "text-amber-400" : "text-slate-400"}`}>
                    {ocrStatus === "success" ? "Recognized" : ocrStatus === "failed" ? "Failed — Enter Manually" : ocrStatus === "scanning" ? "Scanning…" : "—"}
                  </p>
                </div>
                <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2">
                  <p className="text-slate-500 font-bold uppercase tracking-wider">Detected VRN</p>
                  <p className="text-orange-400 font-mono font-bold mt-0.5">{vrn || "—"}</p>
                </div>
              </div>
            )}

            {/* OCR instructions & manual fallback */}
            <div className="p-5 flex-1 space-y-3 bg-slate-900/50">
              <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span>📸</span> Live ANPR Scanner Instructions
                </p>
                <ul className="text-[10px] text-slate-400 space-y-1 list-disc list-inside">
                  <li>Tap the box above to take a clear, well-lit photo of the vehicle number plate.</li>
                  <li>AI OCR will extract the registration number (VRN) and auto-fetch vehicle history.</li>
                  <li>The detected VRN below is always editable — confirm or correct it before registering.</li>
                  <li>If the camera/OCR is unavailable, tap <strong className="text-slate-200">"Bypass & Enter Manually"</strong> below.</li>
                </ul>
              </div>
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setAnprFailed(true);
                  setShowAnprModal(false);
                }}
                className="ds-button-secondary px-4 py-2     text-slate-350 border border-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Bypass & Enter Manually
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAnprModal(false);
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. ODOMETER CAM SCAN MODAL */}
      {/* ======================================= */}
      {showOdoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl w-full max-w-md max-h-[90dvh] overflow-y-auto shadow-2xl flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="ds-button-primary w-8 h-8 rounded-lg  /10 text-orange-400 flex items-center justify-center">
                  <Gauge className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-white">Dashboard Odometer Cam Scan</h3>
                  <p className="text-[9px] text-slate-400 font-medium">Extract odometer numbers with smart OCR</p>
                </div>
              </div>
              <button 
                onClick={() => setShowOdoModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold font-mono p-1"
              >
                ✕
              </button>
            </div>

            {/* Photo Selection Area */}
            <div className="p-5 space-y-4">
              <p className="text-[10px] text-slate-400">
                Choose a dashboard image from the camera roll to scan the Odometer automatically.
              </p>

              {/* Odometer Image Upload Scanner Box */}
              <div 
                onClick={() => odoInputRef.current?.click()}
                className="aspect-video bg-slate-950 border border-slate-800 rounded-2xl relative flex flex-col items-center justify-center overflow-hidden cursor-pointer group"
              >
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment"
                  ref={odoInputRef}
                  onChange={handleOdoPhotoUpload} 
                  className="hidden" 
                />

                {odoPhotoPreview ? (
                  <img 
                    src={odoPhotoPreview} 
                    alt="Odometer Preview" 
                    className="absolute inset-0 w-full h-full object-cover opacity-45"
                  />
                ) : null}

                <div className="absolute top-3 left-3 px-2 py-0.5 bg-slate-900/80 border border-slate-700/50 rounded text-[9px] text-orange-400 font-bold uppercase tracking-wider z-10">
                  Tap to Snap Odo Photo
                </div>

                {/* Dashboard graphic scan overlay */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900/10 via-slate-950/80 to-slate-950 pointer-events-none"></div>
                
                {odoScanning ? (
                  <div className="relative z-10 text-orange-400">
                    <FunnyLoader message="Analyzing dashboard LCD cluster..." />
                  </div>
                ) : (
                  <div className="text-center space-y-2 relative z-10 p-4">
                    <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-orange-400 group-hover:scale-110 transition-transform mb-1.5 shadow-md">
                      <Camera className="h-5 w-5" />
                    </div>
                    <div className="font-mono text-2xl font-black tracking-wider bg-slate-900/80 border border-slate-800 px-4 py-1.5 rounded-lg inline-block shadow-inner text-orange-400">
                      {odometer ? Number(odometer).toLocaleString() : "51,240"} <span className="text-xs text-slate-400 font-sans">KM</span>
                    </div>
                    <p className="text-[9px] text-slate-400 font-medium">Ready to extract values from instrument cluster photo</p>
                  </div>
                )}

                {/* Scanning line indicator */}
                {odoScanning && (
                  <div className="ds-button-primary absolute left-0 right-0 h-0.5   shadow-[0_0_10px_#f97316] animate-bounce z-20"></div>
                )}
              </div>

              {odoCapturedText && (
                <div className={`p-3 border rounded-xl text-[10px] leading-relaxed flex items-start gap-2.5 ${
                  odoScanFailed
                    ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                    : "ds-button-success  /10 border-emerald-500/20 text-emerald-400"
                }`}>
                  {odoScanFailed ? (
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  ) : (
                    <Check className="h-4 w-4 shrink-0 mt-0.5" />
                  )}
                  <span>{odoCapturedText}</span>
                </div>
              )}

              {odoPlausibilityWarning && (
                <div className="p-3 border rounded-xl text-[10px] leading-relaxed flex items-start gap-2.5 bg-amber-500/10 border-amber-500/30 text-amber-300">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{odoPlausibilityWarning}</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowOdoModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                Close
              </button>
              {odoCapturedText && (
                <button
                  type="button"
                  onClick={() => setShowOdoModal(false)}
                  className="ds-button-primary px-4 py-2   hover:bg-orange-600 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Verify & Confirm
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================= */}
      {/* 3. FUEL GAUGE CLUSTER SCAN MODAL */}
      {/* ======================================= */}
      {showFuelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl w-full max-w-md max-h-[90dvh] overflow-y-auto shadow-2xl flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="ds-button-primary w-8 h-8 rounded-lg  /10 text-orange-400 flex items-center justify-center">
                  <Fuel className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-white">Dashboard Fuel Gauge Scan</h3>
                  <p className="text-[9px] text-slate-400 font-medium">Extract exact needle level from original dashboard image</p>
                </div>
              </div>
              <button 
                onClick={() => setShowFuelModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold font-mono p-1"
              >
                ✕
              </button>
            </div>

            {/* Selector Area */}
            <div className="p-5 space-y-4">
              <p className="text-[10px] text-slate-400">
                Take a photo of the dashboard gauge for reference, then set the exact level on the gauge arc on the main screen while looking at it.
              </p>

              {/* Fuel gauge photo capture — evidence only, no automated reading */}
              <div
                onClick={() => fuelInputRef.current?.click()}
                className="aspect-video bg-slate-950 border border-slate-800 rounded-2xl relative flex flex-col items-center justify-center p-4 cursor-pointer group overflow-hidden"
              >
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  ref={fuelInputRef}
                  onChange={handleFuelPhotoUpload}
                  className="hidden"
                />
                {fuelPhotoPreview && (
                  <img
                    src={fuelPhotoPreview}
                    alt="Fuel Gauge Preview"
                    className="absolute inset-0 w-full h-full object-cover opacity-45"
                  />
                )}
                <div className="text-center space-y-2 relative z-10">
                  <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-orange-400 group-hover:scale-110 transition-transform mb-1 shadow-md">
                    <Camera className="h-5 w-5" />
                  </div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">
                    {fuelPhotoPreview ? "Photo Captured" : "Tap to Capture Fuel Gauge"}
                  </p>
                  <div className="text-4xl font-black text-orange-400 font-mono tracking-tighter bg-slate-900/80 border border-slate-800 px-4 py-1.5 rounded-lg inline-block shadow-inner">
                    {fuelPercentage}%
                  </div>
                  <p className="text-[9px] text-slate-400">
                    {fuelPhotoPreview ? "Selected level (set manually) — tap to retake photo" : "Take a clear photo of the fuel gauge"}
                  </p>
                </div>
              </div>

              {fuelCapturedText && (
                <div className={`p-3 border rounded-xl text-[10px] leading-relaxed flex items-start gap-2.5 ${
                  fuelScanFailed
                    ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                    : "ds-button-success  /10 border-emerald-500/20 text-emerald-400"
                }`}>
                  {fuelScanFailed ? (
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  ) : (
                    <Check className="h-4 w-4 shrink-0 mt-0.5" />
                  )}
                  <span>{fuelCapturedText}</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowFuelModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                Close
              </button>
              {fuelCapturedText && (
                <button
                  type="button"
                  onClick={() => setShowFuelModal(false)}
                  className="ds-button-primary px-4 py-2   hover:bg-orange-600 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Confirm & Sync Needle
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. CHASSIS PLATE SCAN MODAL */}
      {showChassisModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl w-full max-w-md max-h-[90dvh] overflow-y-auto shadow-2xl flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="ds-button-primary w-8 h-8 rounded-lg  /10 text-orange-400 flex items-center justify-center">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-white">Chassis Plate Cam Scan</h3>
                  <p className="text-[9px] text-slate-400 font-medium">Extract chassis number from steel plate</p>
                </div>
              </div>
              <button 
                onClick={() => setShowChassisModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold font-mono p-1"
              >
                ✕
              </button>
            </div>

            {/* Viewfinder / Capture Feed */}
            <div className="p-5 space-y-4">
              <p className="text-[10px] text-slate-400">
                Align the metal chassis plate or scan barcode photo using browser camera OCR.
              </p>

              {/* Odometer Image Upload Scanner Box */}
              <div 
                onClick={() => chassisInputRef.current?.click()}
                className="aspect-video bg-slate-950 border border-slate-800 rounded-2xl relative flex flex-col items-center justify-center overflow-hidden cursor-pointer group"
              >
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment"
                  ref={chassisInputRef}
                  onChange={handleChassisPhotoUpload} 
                  className="hidden" 
                />

                <div className="absolute top-3 left-3 px-2 py-0.5 bg-slate-900/80 border border-slate-700/50 rounded text-[9px] text-orange-400 font-bold uppercase tracking-wider z-10">
                  Tap to Scan Chassis Plate
                </div>

                {/* Dashboard graphic scan overlay */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900/10 via-slate-950/80 to-slate-950 pointer-events-none"></div>
                
                {chassisScanning ? (
                  <div className="relative z-10 text-orange-400">
                    <FunnyLoader message="Running Neural Barcode OCR Dial Extraction..." />
                  </div>
                ) : (
                  <div className="text-center space-y-2 relative z-10 p-4">
                    <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-orange-400 group-hover:scale-110 transition-transform mb-1.5 shadow-md">
                      <Camera className="h-5 w-5" />
                    </div>
                    <div className="font-mono text-xs font-bold tracking-wider bg-slate-900/80 border border-slate-800 px-4 py-2.5 rounded-lg inline-block shadow-inner text-orange-450">
                      {chassisNumber || "READY TO EXTRACT CHASSIS ID"}
                    </div>
                    <p className="text-[9px] text-slate-400 font-medium">Click to take photo of VIN plate / barcode</p>
                  </div>
                )}

                {/* Scanning line indicator */}
                {chassisScanning && (
                  <div className="ds-button-primary absolute left-0 right-0 h-0.5   shadow-[0_0_10px_#f97316] animate-bounce z-20"></div>
                )}
              </div>

              {chassisCapturedText && (
                <div className={`p-3 border rounded-xl text-[10px] leading-relaxed flex items-start gap-2.5 ${
                  chassisScanFailed
                    ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                    : "ds-button-success  /10 border-emerald-500/20 text-emerald-400"
                }`}>
                  {chassisScanFailed ? (
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  ) : (
                    <Check className="h-4 w-4 shrink-0 mt-0.5" />
                  )}
                  <span>{chassisCapturedText}</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowChassisModal(false);
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-350 rounded-xl text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
