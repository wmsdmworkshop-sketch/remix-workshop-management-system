import React, { useState, useMemo, useEffect } from "react";
import { useEscapeKey } from '../hooks/useEscapeKey';
import TruckInfoCard from './TruckInfoCard';
import FunnySpinner from './FunnySpinner';
import { 
  Plus, 
  Wrench, 
  Clock, 
  UserPlus, 
  DollarSign, 
  CheckCircle, 
  AlertTriangle, 
  RotateCcw, 
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  ClipboardList,
  MapPin,
  Camera,
  Search,
  Download,
  Mic,
  StopCircle,
  Volume2,
  UploadCloud,
  FileAudio,
  Layers,
  RefreshCw,
  Eye,
  Check,
  Loader2,
  History
} from "lucide-react";
import { JobCard, Bay, SRType, Employee, JobTechnicianMap, JobRevenue, JobRevenueSplitDetail, User } from "../types";

interface JobCardManagerProps {
  jobCards: JobCard[];
  bays: Bay[];
  srTypes: SRType[];
  employees: Employee[];
  allocations: JobTechnicianMap[];
  revenues: JobRevenue[];
  splitDetails: JobRevenueSplitDetail[];
  onCreateJob: (jobData: Partial<JobCard>) => void;
  onUpdateJob: (id: number, updatedFields: Partial<JobCard>) => void;
  onUpdateJobStatus: (id: number, status: JobCard["status"]) => void;
  onAssignTechnicians: (id: number, allocs: { employee_id: number; tech_role: string }[]) => void;
  onCalculateRevenue: (id: number, labour: number, parts: number) => void;
  onRaiseCarryForward: (id: number, reason: string) => void;
  onRaiseRework: (id: number, reason: string, originalTechId: number) => void;
  selectedJobExternal: JobCard | null;
  currentUserRole?: string;
  currentUser?: User | null;
  onLookupVehicle?: (vrn: string) => void;
}

export default function JobCardManager({
  jobCards,
  bays,
  srTypes,
  employees,
  allocations,
  revenues,
  splitDetails,
  onCreateJob,
  onUpdateJob,
  onUpdateJobStatus,
  onAssignTechnicians,
  onCalculateRevenue,
  onRaiseCarryForward,
  onRaiseRework,
  selectedJobExternal,
  currentUserRole = "Workshop Manager",
  currentUser,
  onLookupVehicle
}: JobCardManagerProps) {
  const [selectedJob, setSelectedJob] = useState<JobCard | null>(selectedJobExternal || jobCards[0] || null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  useEscapeKey(() => setShowCreateModal(false), showCreateModal);

  // Escape key listener to close modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowCreateModal(false);
        setShowEditModal(false);
        setPreviewPhotoUrl(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Form states for creating a new Job Card
  const [vrn, setVrn] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [vehicleMake, setVehicleMake] = useState("Tata Motors");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleYear, setVehicleYear] = useState(new Date().getFullYear());
  const [kmReading, setKmReading] = useState<number | "">("");
  const [srTypeId, setSrTypeId] = useState(1);
  const [priority, setPriority] = useState<"Normal" | "Express">("Normal");
  const [bayId, setBayId] = useState<number | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [etdHours, setEtdHours] = useState(2); // hours from now
  const [createdBy, setCreatedBy] = useState<number>(() => {
    const defaultAdvisor = employees.find(e => e.is_active && e.role && ["manager", "supervisor", "advisor", "admin"].some(role => e.role.toLowerCase().includes(role)));
    return defaultAdvisor?.employee_id || employees[0]?.employee_id || 1;
  });

  // Helpers for formatting
  const getTodayDateStr = () => new Date().toISOString().split("T")[0];
  const getCurrentTimeStr = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };
  const getEtdTimeStr = (offsetHours = 2) => {
    const d = new Date(Date.now() + offsetHours * 60 * 60 * 1000);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const resolveBayIdFromNo = (bayNoStr: string | null): number | null => {
    if (!bayNoStr) return null;
    const clean = bayNoStr.toLowerCase().trim();
    const found = bays.find(b => b.bay_name.toLowerCase().includes(clean) || b.bay_code.toLowerCase() === clean || clean.includes(b.bay_name.toLowerCase()));
    if (found) return found.bay_id;
    if (clean.includes("bay 1") || clean === "1" || clean.endsWith("bay01")) return 1;
    if (clean.includes("bay 2") || clean === "2" || clean.endsWith("bay02")) return 2;
    if (clean.includes("bay 3") || clean === "3" || clean.endsWith("bay03")) return 3;
    if (clean.includes("bay 4") || clean === "4" || clean.endsWith("bay04")) return 4;
    if (clean.includes("bay 5") || clean === "5" || clean.endsWith("bay05")) return 5;
    if (clean.includes("bay 6") || clean === "6" || clean.endsWith("bay06")) return 6;
    if (clean.includes("bay 7") || clean === "7" || clean.endsWith("bay07")) return 7;
    if (clean.includes("bay 8") || clean === "8" || clean.endsWith("bay08")) return 8;
    if (clean.includes("bay 9") || clean === "9" || clean.endsWith("bay09")) return 9;
    return null;
  };

  const getWaitingDays = (job: JobCard) => {
    const startStr = job.date_in || (job.created_at ? job.created_at.split("T")[0] : "");
    if (!startStr) return 0;
    const endStr = job.date_completed || (job.completed_at ? job.completed_at.split("T")[0] : new Date().toISOString().split("T")[0]);
    try {
      const start = new Date(startStr);
      const end = new Date(endStr);
      const diffTime = end.getTime() - start.getTime();
      const diffDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
      return diffDays;
    } catch {
      return 0;
    }
  };

  const getActualTimeTaken = (job: JobCard) => {
    const startStr = job.date_in || (job.created_at ? job.created_at.split("T")[0] : "");
    const timeInStr = job.time_in || (job.created_at ? job.created_at.split("T")[1]?.substring(0, 5) : "00:00");
    if (!startStr) return "-";

    const endStr = job.date_completed || (job.completed_at ? job.completed_at.split("T")[0] : "");
    const timeOutStr = job.time_out || (job.completed_at ? job.completed_at.split("T")[1]?.substring(0, 5) : "");

    if (!endStr || !timeOutStr) {
      if (job.started_at && job.completed_at) {
        try {
          const start = new Date(job.started_at);
          const end = new Date(job.completed_at);
          const diffMins = Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
          if (diffMins < 0) return "-";
          const h = Math.floor(diffMins / 60);
          const m = diffMins % 60;
          return `${h}h ${m}m`;
        } catch {
          return "Active";
        }
      }
      return "Active";
    }

    try {
      const start = new Date(`${startStr}T${timeInStr}`);
      const end = new Date(`${endStr}T${timeOutStr}`);
      const diffMins = Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
      if (diffMins < 0) return "-";
      const h = Math.floor(diffMins / 60);
      const m = diffMins % 60;
      return `${h}h ${m}m`;
    } catch {
      return "-";
    }
  };

  // Additional Create Form States
  const [createJobCardNo, setCreateJobCardNo] = useState("");
  const [createDateIn, setCreateDateIn] = useState(getTodayDateStr());
  const [createTimeIn, setCreateTimeIn] = useState(getCurrentTimeStr());
  const [createExpectedDateOut, setCreateExpectedDateOut] = useState(getTodayDateStr());
  const [createExpectedTimeOfCompletion, setCreateExpectedTimeOfCompletion] = useState(getEtdTimeStr(2));
  const [createPendingReason, setCreatePendingReason] = useState("");
  const [createRemarks, setCreateRemarks] = useState("");
  const [bayNo, setBayNo] = useState("");
  const [serviceAdvisor, setServiceAdvisor] = useState("");
  const [technicianName, setTechnicianName] = useState("");
  const [noOfLaborers, setNoOfLaborers] = useState("");
  const [actualTimeTaken, setActualTimeTaken] = useState("");
  const [timeOut, setTimeOut] = useState("");
  const [dateCompleted, setDateCompleted] = useState("");

  // Photo & OCR upload states
  const [numberplatePhoto, setNumberplatePhoto] = useState<string | null>(null);
  const [odometerPhoto, setOdometerPhoto] = useState<string | null>(null);
  const [isOcrReadingVrn, setIsOcrReadingVrn] = useState(false);
  const [isOcrReadingOdo, setIsOcrReadingOdo] = useState(false);

  const [editNumberplatePhoto, setEditNumberplatePhoto] = useState<string | null>(null);
  const [editOdometerPhoto, setEditOdometerPhoto] = useState<string | null>(null);
  const [isEditOcrReadingVrn, setIsEditOcrReadingVrn] = useState(false);
  const [isEditOcrReadingOdo, setIsEditOcrReadingOdo] = useState(false);

  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);
  const [previewPhotoTitle, setPreviewPhotoTitle] = useState("");

  // Voice Recording and Polishing States
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [polishedAudioResult, setPolishedAudioResult] = useState<string | null>(null);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const audioChunksRef = React.useRef<Blob[]>([]);

  // Manual Jobcard OCR states
  const [manualJobcardPhoto, setManualJobcardPhoto] = useState<string | null>(null);
  const [isOcrReadingJobcard, setIsOcrReadingJobcard] = useState(false);
  const [ocrJobcardError, setOcrJobcardError] = useState<string | null>(null);

  // Batch Multi-Page OCR states
  const [ocrTab, setOcrTab] = useState<'single' | 'batch'>('single');
  const [batchOcrQueue, setBatchOcrQueue] = useState<{
    id: string;
    fileName: string;
    photoUrl: string;
    status: 'pending' | 'processing' | 'success' | 'failed';
    error: string | null;
    extractedData: {
      vrn: string;
      customer_name: string;
      customer_mobile: string;
      vehicle_model: string;
      km_reading: number | string;
      job_description: string;
      remarks: string;
      service_advisor: string;
      verification_flags: {
        vrn_needs_verification: boolean;
        customer_name_needs_verification: boolean;
        customer_mobile_needs_verification: boolean;
        vehicle_model_needs_verification: boolean;
        km_reading_needs_verification: boolean;
        job_description_needs_verification: boolean;
        service_advisor_needs_verification: boolean;
      };
      verification_reasons: {
        vrn_reason: string;
        customer_name_reason: string;
        customer_mobile_reason: string;
        vehicle_model_reason: string;
        km_reading_reason: string;
        job_description_reason: string;
        service_advisor_reason: string;
      };
    } | null;
  }[]>([]);
  const [activeBatchIndex, setActiveBatchIndex] = useState<number | null>(null);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleBatchJobcardUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newEntries = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const id = Math.random().toString(36).substring(2, 9);
      const localUrl = URL.createObjectURL(file);
      newEntries.push({
        id,
        fileName: file.name,
        photoUrl: localUrl,
        status: 'pending' as const,
        error: null,
        extractedData: null
      });
    }

    const startIdx = batchOcrQueue.length;
    setBatchOcrQueue(prev => [...prev, ...newEntries]);
    if (activeBatchIndex === null && newEntries.length > 0) {
      setActiveBatchIndex(startIdx);
    }

    // Process files sequentially or in small parallel batches
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const correspondingId = newEntries[i].id;

      setBatchOcrQueue(prev => prev.map(item => 
        item.id === correspondingId ? { ...item, status: 'processing' } : item
      ));

      try {
        const base64 = await fileToBase64(file);
        const res = await fetch("/api/gemini/extract-manual-jobcard", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageData: base64, mimeType: file.type })
        });
        const data = await res.json();
        if (res.ok) {
          setBatchOcrQueue(prev => prev.map(item => 
            item.id === correspondingId ? { 
              ...item, 
              status: 'success', 
              extractedData: data 
            } : item
          ));
        } else {
          setBatchOcrQueue(prev => prev.map(item => 
            item.id === correspondingId ? { 
              ...item, 
              status: 'failed', 
              error: data.error || "OCR failed." 
            } : item
          ));
        }
      } catch (err: any) {
        setBatchOcrQueue(prev => prev.map(item => 
          item.id === correspondingId ? { 
            ...item, 
            status: 'failed', 
            error: err.message || "An error occurred." 
          } : item
        ));
      }
    }
  };

  const handleUpdateBatchDataField = (id: string, field: string, value: any) => {
    setBatchOcrQueue(prev => prev.map(item => {
      if (item.id === id && item.extractedData) {
        return {
          ...item,
          extractedData: {
            ...item.extractedData,
            [field]: value
          }
        };
      }
      return item;
    }));
  };

  const handleUpdateBatchVerificationFlag = (id: string, flagName: string, value: boolean) => {
    setBatchOcrQueue(prev => prev.map(item => {
      if (item.id === id && item.extractedData) {
        return {
          ...item,
          extractedData: {
            ...item.extractedData,
            verification_flags: {
              ...item.extractedData.verification_flags,
              [flagName]: value
            }
          }
        };
      }
      return item;
    }));
  };

  const handleApplyBatchCardToForm = (item: typeof batchOcrQueue[0]) => {
    if (!item.extractedData) return;
    const data = item.extractedData;
    
    if (data.vrn) setVrn(data.vrn.toUpperCase());
    if (data.customer_name) setCustomerName(data.customer_name);
    if (data.customer_mobile) setCustomerMobile(data.customer_mobile);
    if (data.vehicle_model) setVehicleModel(data.vehicle_model);
    if (data.km_reading) setKmReading(Number(data.km_reading));
    if (data.job_description) setJobDescription(data.job_description);
    if (data.remarks) {
      setCreateRemarks(prev => {
        const spacer = prev ? "\n\n" : "";
        return prev + spacer + `📝 Extracted Manual Remarks:\n${data.remarks}`;
      });
    }
    if (data.service_advisor) {
      const matched = employees.find(emp => 
        emp.full_name.toLowerCase().includes(data.service_advisor.toLowerCase()) ||
        data.service_advisor.toLowerCase().includes(emp.full_name.toLowerCase())
      );
      if (matched) {
        setCreatedBy(matched.employee_id);
        setServiceAdvisor(matched.full_name);
      } else {
        setServiceAdvisor(data.service_advisor);
      }
    }
    alert(`🎉 Extracted & verified data from "${item.fileName}" has been applied to the creation form below!`);
  };

  const startAudioRecording = async () => {
    setAudioError(null);
    setPolishedAudioResult(null);
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const options = { mimeType: "audio/webm" };
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, options);
      } catch (e) {
        recorder = new MediaRecorder(stream);
      }
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setIsProcessingAudio(true);
        try {
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64WithHeader = reader.result as string;
            const base64Data = base64WithHeader.split(",")[1];
            await sendAudioToServer(base64Data, recorder.mimeType || "audio/webm");
          };
        } catch (err: any) {
          setAudioError("Error preparing audio data: " + err.message);
          setIsProcessingAudio(false);
        }
        stream.getTracks().forEach(track => track.stop());
      };
      recorder.start();
      setIsRecording(true);
    } catch (err: any) {
      console.error(err);
      setAudioError("Microphone access denied or not available: " + err.message);
    }
  };

  const stopAudioRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAudioError(null);
    setPolishedAudioResult(null);
    setIsProcessingAudio(true);
    try {
      const base64 = await fileToBase64(file);
      await sendAudioToServer(base64, file.type || "audio/wav");
    } catch (err: any) {
      setAudioError("Error reading audio file: " + err.message);
      setIsProcessingAudio(false);
    }
  };

  const sendAudioToServer = async (base64Data: string, mimeType: string) => {
    try {
      const res = await fetch("/api/gemini/process-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioData: base64Data, mimeType })
      });
      const data = await res.json();
      if (res.ok) {
        setPolishedAudioResult(data.text);
        setCreateRemarks(prev => {
          const spacer = prev ? "\n\n" : "";
          return prev + spacer + data.text;
        });
      } else {
        setAudioError(data.error || "Failed to process audio complaint.");
      }
    } catch (err: any) {
      setAudioError("Network error sending audio: " + err.message);
    } finally {
      setIsProcessingAudio(false);
    }
  };

  const handleManualJobcardUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsOcrReadingJobcard(true);
    setOcrJobcardError(null);
    try {
      const base64 = await fileToBase64(file);
      setManualJobcardPhoto(`data:${file.type};base64,${base64}`);

      const res = await fetch("/api/gemini/extract-manual-jobcard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageData: base64, mimeType: file.type })
      });
      const data = await res.json();
      if (res.ok) {
        if (data.vrn) setVrn(data.vrn.toUpperCase());
        if (data.customer_name) setCustomerName(data.customer_name);
        if (data.customer_mobile) setCustomerMobile(data.customer_mobile);
        if (data.vehicle_model) setVehicleModel(data.vehicle_model);
        if (data.km_reading) setKmReading(Number(data.km_reading));
        if (data.job_description) setJobDescription(data.job_description);
        if (data.remarks) {
          setCreateRemarks(prev => {
            const spacer = prev ? "\n\n" : "";
            return prev + spacer + `📝 Extracted Manual Remarks:\n${data.remarks}`;
          });
        }
        if (data.service_advisor) {
          const matched = employees.find(emp => 
            emp.full_name.toLowerCase().includes(data.service_advisor.toLowerCase()) ||
            data.service_advisor.toLowerCase().includes(emp.full_name.toLowerCase())
          );
          if (matched) {
            setCreatedBy(matched.employee_id);
            setServiceAdvisor(matched.full_name);
          } else {
            setServiceAdvisor(data.service_advisor);
          }
        }
        alert("🎉 Manual Job Card extracted successfully! All parsed parameters have been auto-populated.");
      } else {
        setOcrJobcardError(data.error || "OCR extraction failed.");
      }
    } catch (err: any) {
      setOcrJobcardError("Error doing OCR extraction: " + err.message);
    } finally {
      setIsOcrReadingJobcard(false);
    }
  };

  const handleNumberplateUpload = (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (isEdit) {
      setIsEditOcrReadingVrn(true);
    } else {
      setIsOcrReadingVrn(true);
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setTimeout(() => {
        const nameWithoutExt = file.name.split(".")[0].toUpperCase();
        const vrnRegex = /^[A-Z]{2}[- ]?\d{2}[- ]?[A-Z]{1,2}[- ]?\d{4}$/;
        let detectedVrn = "MH-12-TM-9090";
        if (vrnRegex.test(nameWithoutExt)) {
          detectedVrn = nameWithoutExt.replace(/[- ]/g, "-");
        } else {
          const matches = nameWithoutExt.match(/[A-Z]{2}\d{2}[A-Z\d]+/);
          if (matches) {
            detectedVrn = matches[0];
          }
        }
        if (isEdit) {
          setEditVrn(detectedVrn);
          setEditNumberplatePhoto(base64);
          setIsEditOcrReadingVrn(false);
        } else {
          setVrn(detectedVrn);
          setNumberplatePhoto(base64);
          setIsOcrReadingVrn(false);
        }
      }, 1500);
    };
    reader.readAsDataURL(file);
  };

  const handleOdometerUpload = (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (isEdit) {
      setIsEditOcrReadingOdo(true);
    } else {
      setIsOcrReadingOdo(true);
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setTimeout(() => {
        const nameWithoutExt = file.name.split(".")[0];
        const digitMatches = nameWithoutExt.match(/\d+/);
        let detectedKm = 45210;
        if (digitMatches) {
          detectedKm = parseInt(digitMatches[0]);
        } else {
          detectedKm = Math.floor(Math.random() * (85000 - 15000) + 15000);
        }
        if (isEdit) {
          setEditKmReading(detectedKm);
          setEditOdometerPhoto(base64);
          setIsEditOcrReadingOdo(false);
        } else {
          setKmReading(detectedKm);
          setOdometerPhoto(base64);
          setIsOcrReadingOdo(false);
        }
      }, 1500);
    };
    reader.readAsDataURL(file);
  };

  // EDIT JOB CARD MODAL STATE
  const [showEditModal, setShowEditModal] = useState(false);
  useEscapeKey(() => setShowEditModal(false), showEditModal);
  const [editJobId, setEditJobId] = useState<number | null>(null);
  const [editJobCardNo, setEditJobCardNo] = useState("");
  const [editBayId, setEditBayId] = useState<number | null>(null);
  const [editVrn, setEditVrn] = useState("");
  const [editCustomerName, setEditCustomerName] = useState("");
  const [editCustomerMobile, setEditCustomerMobile] = useState("");
  const [editVehicleMake, setEditVehicleMake] = useState("");
  const [editVehicleModel, setEditVehicleModel] = useState("");
  const [editVehicleYear, setEditVehicleYear] = useState(new Date().getFullYear());
  const [editKmReading, setEditKmReading] = useState<number | "" | null>(0);
  const [editSrTypeId, setEditSrTypeId] = useState(1);
  const [editPriority, setEditPriority] = useState<"Normal" | "Express">("Normal");
  const [editCreatedBy, setEditCreatedBy] = useState<number>(1);
  const [editDateIn, setEditDateIn] = useState("");
  const [editTimeIn, setEditTimeIn] = useState("");
  const [editExpectedDateOut, setEditExpectedDateOut] = useState("");
  const [editExpectedTimeOfCompletion, setEditExpectedTimeOfCompletion] = useState("");
  const [editTimeOut, setEditTimeOut] = useState("");
  const [editJobDescription, setEditJobDescription] = useState("");
  const [editStatus, setEditStatus] = useState<JobCard["status"]>("Waiting");
  const [editPendingReason, setEditPendingReason] = useState("");
  const [editDateCompleted, setEditDateCompleted] = useState("");
  const [editRemarks, setEditRemarks] = useState("");
  const [editBayNo, setEditBayNo] = useState("");
  const [editServiceAdvisor, setEditServiceAdvisor] = useState("");
  const [editTechnicianName, setEditTechnicianName] = useState("");
  const [editNoOfLaborers, setEditNoOfLaborers] = useState("");
  const [editActualTimeTaken, setEditActualTimeTaken] = useState("");

  React.useEffect(() => {
    const userObj = currentUser || (() => {
      try {
        const saved = localStorage.getItem("wms_user");
        return saved ? JSON.parse(saved) : null;
      } catch {
        return null;
      }
    })();

    const advisors = employees.filter(e => 
      e.is_active && e.role && (
        e.role.toLowerCase().includes("advisor") || 
        e.role.toLowerCase() === "service_advisor" ||
        e.role.toLowerCase().includes("service")
      )
    );

    const defaultAdvisor = advisors[0] || employees.find(e => e.is_active && e.role && ["manager", "supervisor", "advisor", "admin"].some(role => e.role.toLowerCase().includes(role))) || employees[0];

    if (userObj) {
      const userFullName = userObj.full_name || userObj.displayName || "";
      const userUsername = userObj.username || "";
      const matchedEmp = employees.find(e => 
        (userFullName && e.full_name.toLowerCase() === userFullName.toLowerCase()) ||
        (e.employee_code && userUsername && e.employee_code.toLowerCase() === userUsername.toLowerCase())
      );
      if (matchedEmp) {
        setCreatedBy(matchedEmp.employee_id);
        setServiceAdvisor(matchedEmp.full_name);
      } else if (defaultAdvisor) {
        setCreatedBy(defaultAdvisor.employee_id);
        setServiceAdvisor(defaultAdvisor.full_name);
      }
    } else if (defaultAdvisor) {
      setCreatedBy(defaultAdvisor.employee_id);
      setServiceAdvisor(defaultAdvisor.full_name);
    }
  }, [employees, currentUser, showCreateModal]);

  const isTechnicianRole = (role: string) => {
    if (!role) return false;
    const lower = role.toLowerCase();
    return (
      lower.includes("tech") ||
      lower.includes("electrician") ||
      lower.includes("helper") ||
      lower.includes("alignment") ||
      lower.includes("incharge")
    );
  };

  // Assignment states
  const [assignedStaff, setAssignedStaff] = useState<{ employee_id: number; tech_role: string }[]>([]);
  const [tempEmpId, setTempEmpId] = useState<number>(() => {
    const firstActive = employees.find(e => e.is_active && isTechnicianRole(e.role));
    return firstActive?.employee_id || employees[0]?.employee_id || 0;
  });
  const [tempRole, setTempRole] = useState<string>("Primary Technician");

  React.useEffect(() => {
    const activeSpecialists = employees.filter(e => e.is_active && isTechnicianRole(e.role));
    if (activeSpecialists.length > 0 && !activeSpecialists.some(e => e.employee_id === tempEmpId)) {
      setTempEmpId(activeSpecialists[0].employee_id);
    }
  }, [employees]);

  // Revenue Form states
  const [labourAmount, setLabourAmount] = useState(3500);
  const [partsAmount, setPartsAmount] = useState(1200);

  // Carry Forward / Rework inputs
  const [showCfForm, setShowCfForm] = useState(false);
  const [cfReason, setCfReason] = useState("");
  const [showReworkForm, setShowReworkForm] = useState(false);
  const [reworkReason, setReworkReason] = useState("");

  // --- GEMINI CO-PILOT INTERACTIVE FORM ASSISTANT STATE ---
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Function to run form co-pilot calculation/prediction
  const handleAiFormAnalysis = async (mode: "create" | "edit", currentDesc: string, currentModel: string, currentKm: number, currentPriority: string) => {
    if (!currentDesc.trim()) {
      alert("Please enter some basic keywords or complaints in the Description first so the AI has context to analyze!");
      return;
    }
    setIsAiAnalyzing(true);
    setAiError(null);
    try {
      const response = await fetch("/api/gemini/analyze-form-interactive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDescription: currentDesc,
          vehicleModel: currentModel,
          kmReading: currentKm,
          priority: currentPriority
        })
      });
      const data = await response.json();
      if (response.ok) {
        setAiSuggestions(data);
      } else {
        setAiError(data.error || "Failed to analyze details.");
      }
    } catch (err: any) {
      console.error(err);
      setAiError("Network error. Make sure server is running.");
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  const applyAiSuggestions = (mode: "create" | "edit") => {
    if (!aiSuggestions) return;
    
    if (mode === "create") {
      // Apply to form states
      setSrTypeId(aiSuggestions.service_type_id || 1);
      setPriority(aiSuggestions.priority || "Normal");
      if (aiSuggestions.bay_id) {
        setBayId(aiSuggestions.bay_id);
        const b = bays.find(bay => bay.bay_id === aiSuggestions.bay_id);
        if (b) {
          setBayNo(b.bay_name);
        }
      }
      setNoOfLaborers(String(aiSuggestions.no_of_laborers || 1));
      setTechnicianName(aiSuggestions.technician_name || "");
      
      // Pre-populate estimates if state matches
      setLabourAmount(aiSuggestions.labor_price || 1500);
      setPartsAmount(aiSuggestions.parts_price || 500);
      
      // Append diagnostic analysis to special remarks
      setCreateRemarks((prev) => {
        const spacer = prev ? "\n\n" : "";
        return prev + spacer + `💡 Gemma-4 Diagnostic Analysis:\n${aiSuggestions.scenario_analysis}`;
      });
    } else {
      // For editing or detail calculations
      setLabourAmount(aiSuggestions.labor_price || 1500);
      setPartsAmount(aiSuggestions.parts_price || 500);
      // We can also append suggestions to the active description
      if (selectedJob) {
        onUpdateJob(selectedJob.job_id, {
          priority: aiSuggestions.priority || selectedJob.priority,
          sr_type_id: aiSuggestions.service_type_id || selectedJob.sr_type_id,
          no_of_laborers: Number(aiSuggestions.no_of_laborers || selectedJob.no_of_laborers),
          remarks: (selectedJob.remarks || "") + `\n\n💡 Gemma-4 Diagnostics:\n${aiSuggestions.scenario_analysis}`
        });
      }
    }
    
    alert("AI Recommended parameters applied successfully to form fields!");
    setAiSuggestions(null);
  };

  // Sync with prop from dashboard if clicked there
  React.useEffect(() => {
    if (selectedJobExternal) {
      setSelectedJob(selectedJobExternal);
    }
  }, [selectedJobExternal]);

  // Search & Filter states for job cards list
  const [listSearch, setListSearch] = useState("");
  const [listDate, setListDate] = useState("");
  const [listStatus, setListStatus] = useState("All");

  const filteredJobCards = useMemo(() => {
    return jobCards.filter(job => {
      const matchesSearch = 
        job.vrn.toLowerCase().includes(listSearch.toLowerCase()) ||
        job.job_card_no.toLowerCase().includes(listSearch.toLowerCase()) ||
        (job.customer_name && job.customer_name.toLowerCase().includes(listSearch.toLowerCase()));

      const matchesDate = !listDate || job.date_in === listDate || job.date_completed === listDate;
      const matchesStatus = listStatus === "All" || job.status.toLowerCase() === listStatus.toLowerCase();

      return matchesSearch && matchesDate && matchesStatus;
    });
  }, [jobCards, listSearch, listDate, listStatus]);

  const handleExportCSV = () => {
    const headers = [
      "Job Card No",
      "VRN",
      "Customer Name",
      "Customer Mobile",
      "Date In",
      "Time-in",
      "Expected Date Out",
      "Expected Time of Completion",
      "Vehicle Make",
      "Vehicle Model",
      "Odometer Reading (KM)",
      "Status",
      "Bay No",
      "Service Advisor",
      "Technician Name",
      "No. of Laborers",
      "Date Completed",
      "Time Out",
      "Actual Time Taken",
      "Pending Reason",
      "Remarks"
    ];

    const rows = filteredJobCards.map(job => [
      `"${job.job_card_no || ""}"`,
      `"${job.vrn || ""}"`,
      `"${job.customer_name || ""}"`,
      `"${job.customer_mobile || ""}"`,
      `"${job.date_in || ""}"`,
      `"${job.time_in || ""}"`,
      `"${job.expected_date_out || ""}"`,
      `"${job.expected_time_of_completion || ""}"`,
      `"${job.vehicle_make || ""}"`,
      `"${job.vehicle_model || ""}"`,
      job.km_reading || 0,
      `"${job.status || ""}"`,
      `"${job.bay_no || ""}"`,
      `"${job.service_advisor || ""}"`,
      `"${job.technician_name || ""}"`,
      job.no_of_laborers || 0,
      `"${job.date_completed || ""}"`,
      `"${job.time_out || ""}"`,
      `"${job.actual_time_taken || ""}"`,
      `"${job.pending_reason || ""}"`,
      `"${job.remarks || ""}"`
    ]);

    const csvContent = headers.join(",") + "\n" + rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `job_cards_export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Initialize Create Modal values when opened
  React.useEffect(() => {
    if (showCreateModal) {
      const nextId = jobCards.reduce((max, j) => Math.max(max, j.job_id), 0) + 1;
      setCreateJobCardNo(`JC${String(nextId).padStart(3, "0")}`);
      setCreateDateIn(getTodayDateStr());
      setCreateTimeIn(getCurrentTimeStr());
      setCreateExpectedDateOut(getTodayDateStr());
      setCreateExpectedTimeOfCompletion(getEtdTimeStr(2));
      setCreatePendingReason("");
      setCreateRemarks("");
    }
  }, [showCreateModal, jobCards]);

  // Load active allocations when selected job changes
  React.useEffect(() => {
    if (selectedJob) {
      const activeAllocs = allocations.filter(a => a.job_id === selectedJob.job_id);
      setAssignedStaff(activeAllocs.map(a => ({ employee_id: a.employee_id, tech_role: a.tech_role })));

      // Load revenue if already calculated
      const rev = revenues.find(r => r.job_id === selectedJob.job_id);
      if (rev) {
        setLabourAmount(rev.labour_amount);
        setPartsAmount(rev.parts_amount);
      } else {
        setLabourAmount(3000);
        setPartsAmount(1000);
      }
    }
  }, [selectedJob, allocations, revenues]);

  const handleSubmitCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedKm = kmReading === "" ? null : Number(kmReading);
    if (kmReading !== "" && (isNaN(Number(kmReading)) || Number(kmReading) <= 0)) {
      alert("Odometer Reading (KM) must be a valid number greater than 0!");
      return;
    }
    const combinedCreatedAt = `${createDateIn}T${createTimeIn}:00.000Z`;
    const combinedEtd = `${createExpectedDateOut}T${createExpectedTimeOfCompletion}:00.000Z`;
    
    onCreateJob({
      job_card_no: createJobCardNo || undefined,
      vrn: vrn.toUpperCase(),
      customer_name: customerName,
      customer_mobile: customerMobile,
      vehicle_make: "Tata Motors",
      vehicle_model: vehicleModel,
      vehicle_year: Number(vehicleYear),
      km_reading: parsedKm,
      sr_type_id: Number(srTypeId),
      priority,
      bay_id: resolveBayIdFromNo(bayNo),
      job_description: jobDescription,
      etd: combinedEtd,
      created_by: Number(createdBy) || 1,
      created_at: combinedCreatedAt,
      date_in: createDateIn,
      time_in: createTimeIn,
      expected_date_out: createExpectedDateOut,
      expected_time_of_completion: createExpectedTimeOfCompletion,
      pending_reason: createPendingReason || null,
      remarks: createRemarks || null,
      bay_no: bayNo || "Queue",
      service_advisor: serviceAdvisor || null,
      technician_name: technicianName || null,
      no_of_laborers: noOfLaborers ? Number(noOfLaborers) : null,
      actual_time_taken: actualTimeTaken || null,
      time_out: timeOut || null,
      date_completed: dateCompleted || null,
      numberplate_photo: numberplatePhoto,
      odometer_photo: odometerPhoto
    });

    // Reset Form
    setVrn("");
    setCustomerName("");
    setCustomerMobile("");
    setVehicleMake("Tata Motors");
    setVehicleModel("");
    setKmReading("");
    setJobDescription("");
    setCreatePendingReason("");
    setCreateRemarks("");
    setBayNo("");
    setServiceAdvisor("");
    setTechnicianName("");
    setNoOfLaborers("");
    setActualTimeTaken("");
    setTimeOut("");
    setDateCompleted("");
    setNumberplatePhoto(null);
    setOdometerPhoto(null);
    setShowCreateModal(false);
  };

  const openEditModal = (job: JobCard) => {
    setEditJobId(job.job_id);
    setEditJobCardNo(job.job_card_no);
    setEditBayId(job.bay_id);
    setEditVrn(job.vrn);
    setEditCustomerName(job.customer_name);
    setEditCustomerMobile(job.customer_mobile);
    setEditVehicleMake("Tata Motors");
    setEditVehicleModel(job.vehicle_model);
    setEditVehicleYear(job.vehicle_year);
    setEditKmReading(job.km_reading !== undefined && job.km_reading !== null ? job.km_reading : "");
    setEditSrTypeId(job.sr_type_id);
    setEditPriority(job.priority);
    setEditCreatedBy(job.created_by);
    
    const dIn = job.date_in || (job.created_at ? job.created_at.split("T")[0] : getTodayDateStr());
    const tIn = job.time_in || (job.created_at ? job.created_at.split("T")[1]?.substring(0, 5) : getCurrentTimeStr());
    setEditDateIn(dIn);
    setEditTimeIn(tIn);

    const dOut = job.expected_date_out || (job.etd ? job.etd.split("T")[0] : getTodayDateStr());
    const tOut = job.expected_time_of_completion || (job.etd ? job.etd.split("T")[1]?.substring(0, 5) : getEtdTimeStr(2));
    setEditExpectedDateOut(dOut);
    setEditExpectedTimeOfCompletion(tOut);

    setEditTimeOut(job.time_out || "");
    setEditJobDescription(job.job_description);
    setEditStatus(job.status);
    setEditPendingReason(job.pending_reason || "");
    setEditDateCompleted(job.date_completed || "");
    setEditRemarks(job.remarks || "");
    
    setEditBayNo(job.bay_no || (job.bay_id ? String(job.bay_id) : "Queue"));
    const emp = employees.find(e => e.employee_id === job.created_by);
    setEditServiceAdvisor(job.service_advisor || emp?.full_name || "");
    setEditTechnicianName(job.technician_name || "");
    setEditNoOfLaborers(job.no_of_laborers !== null && job.no_of_laborers !== undefined ? String(job.no_of_laborers) : "");
    setEditActualTimeTaken(job.actual_time_taken || "");
    setEditNumberplatePhoto(job.numberplate_photo || null);
    setEditOdometerPhoto(job.odometer_photo || null);
    setShowEditModal(true);
  };

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editJobId) return;

    const combinedCreatedAt = `${editDateIn}T${editTimeIn}:00.000Z`;
    const combinedEtd = `${editExpectedDateOut}T${editExpectedTimeOfCompletion}:00.000Z`;

    const updatedFields: Partial<JobCard> = {
      job_card_no: editJobCardNo,
      vrn: editVrn.toUpperCase(),
      customer_name: editCustomerName,
      customer_mobile: editCustomerMobile,
      vehicle_make: "Tata Motors",
      vehicle_model: editVehicleModel,
      vehicle_year: Number(editVehicleYear),
      km_reading: editKmReading === "" || editKmReading === null ? null : Number(editKmReading),
      sr_type_id: Number(editSrTypeId),
      priority: editPriority,
      bay_id: resolveBayIdFromNo(editBayNo),
      job_description: editJobDescription,
      etd: combinedEtd,
      created_by: Number(editCreatedBy),
      created_at: combinedCreatedAt,
      date_in: editDateIn,
      time_in: editTimeIn,
      expected_date_out: editExpectedDateOut,
      expected_time_of_completion: editExpectedTimeOfCompletion,
      time_out: editTimeOut || null,
      status: editStatus,
      pending_reason: editPendingReason || null,
      date_completed: editDateCompleted || null,
      remarks: editRemarks || null,
      bay_no: editBayNo || "Queue",
      service_advisor: editServiceAdvisor || null,
      technician_name: editTechnicianName || null,
      no_of_laborers: editNoOfLaborers ? Number(editNoOfLaborers) : null,
      actual_time_taken: editActualTimeTaken || null,
      numberplate_photo: editNumberplatePhoto,
      odometer_photo: editOdometerPhoto
    };

    onUpdateJob(editJobId, updatedFields);
    setShowEditModal(false);
    
    // Immediately update selectedJob local state
    if (selectedJob && selectedJob.job_id === editJobId) {
      setSelectedJob({
        ...selectedJob,
        ...updatedFields
      });
    }
  };

  const addStaffAllocation = () => {
    if (!tempEmpId) return;
    // Avoid double primary tech or double assigning same employee
    if (assignedStaff.some(s => s.employee_id === Number(tempEmpId))) {
      alert("Employee is already assigned to this job card.");
      return;
    }
    setAssignedStaff([...assignedStaff, { employee_id: Number(tempEmpId), tech_role: tempRole }]);
  };

  const removeStaffAllocation = (empId: number) => {
    setAssignedStaff(assignedStaff.filter(s => s.employee_id !== empId));
  };

  const handleSaveAllocations = () => {
    if (!selectedJob) return;
    onAssignTechnicians(selectedJob.job_id, assignedStaff);
    alert("Technicians allocated successfully.");
  };

  const handleCalculateRevSplit = () => {
    if (!selectedJob) return;
    onCalculateRevenue(selectedJob.job_id, labourAmount, partsAmount);
    alert("Revenue split calculated and locked successfully!");
  };

  const handleCfSubmit = () => {
    if (!selectedJob || !cfReason) return;
    onRaiseCarryForward(selectedJob.job_id, cfReason);
    setCfReason("");
    setShowCfForm(false);
    alert("Carry forward request submitted.");
  };

  const handleReworkSubmit = () => {
    if (!selectedJob || !reworkReason) return;
    // Find the original primary technician
    const primaryTech = allocations.find(a => a.job_id === selectedJob.job_id && a.tech_role === "Primary Technician");
    const techId = primaryTech ? primaryTech.employee_id : 3; // fallback default technician Alex Carter

    onRaiseRework(selectedJob.job_id, reworkReason, techId);
    setReworkReason("");
    setShowReworkForm(false);
    alert("Rework request raised.");
  };

  // Find detailed stats for the selected job
  const selectedJobRevenue = selectedJob ? revenues.find(r => r.job_id === selectedJob.job_id) : null;
  const selectedJobSplits = selectedJobRevenue ? splitDetails.filter(d => d.revenue_id === selectedJobRevenue.revenue_id) : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full items-start">
      
      {/* LEFT: JOB CARDS LIST */}
      <div className="lg:col-span-1 bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4 max-h-[800px] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 bg-slate-50/50 -mx-4 -mt-4 p-4">
          <div>
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Job Cards</h2>
            <p className="text-[10px] text-slate-400 font-medium">Queue of vehicle workshop repairs.</p>
          </div>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            New Job
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="space-y-2 border-b border-slate-100 pb-3 mt-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Search VRN, Customer, Card #..."
              value={listSearch}
              onChange={(e) => setListSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-[10px] placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-orange-500/30 focus:border-orange-500 font-semibold text-slate-700"
            />
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          </div>

          <div className="flex gap-2">
            <input
              type="date"
              value={listDate}
              onChange={(e) => setListDate(e.target.value)}
              className="w-1/2 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[9px] font-bold focus:outline-none text-slate-500"
            />
            <select
              value={listStatus}
              onChange={(e) => setListStatus(e.target.value)}
              className="w-1/2 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[9px] font-bold focus:outline-none text-slate-500"
            >
              <option value="All">All Statuses</option>
              <option value="Waiting">Waiting</option>
              <option value="Active">Active</option>
              <option value="Completed">Completed</option>
              <option value="Invoiced">Invoiced</option>
              <option value="Rework">Rework</option>
              <option value="Carry Forward">Carry Forward</option>
            </select>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              onClick={handleExportCSV}
              className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded flex items-center gap-1 transition-all shadow-xs cursor-pointer"
            >
              <Download className="h-3 w-3" />
              Export CSV ({filteredJobCards.length})
            </button>
            {(listSearch || listDate || listStatus !== "All") && (
              <button
                onClick={() => {
                  setListSearch("");
                  setListDate("");
                  setListStatus("All");
                }}
                className="text-slate-400 hover:text-slate-600 text-[9px] font-bold uppercase tracking-wider cursor-pointer"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        <div className="space-y-3 pt-1">
          {filteredJobCards.map((job) => {
            const isSelected = selectedJob?.job_id === job.job_id;
            const srType = srTypes.find(s => s.sr_type_id === job.sr_type_id);
            
            let statusBadge = "bg-slate-100 text-slate-800 border-slate-200";
            if (job.status === "Active") statusBadge = "bg-green-50 text-green-800 border-green-200/50";
            else if (job.status === "Waiting") statusBadge = "bg-amber-50 text-amber-800 border-amber-200/50";
            else if (job.status === "Completed") statusBadge = "bg-purple-50 text-purple-800 border-purple-200/50";
            else if (job.status === "Invoiced") statusBadge = "bg-blue-50 text-blue-800 border-blue-200/50";
            else if (job.status === "Rework") statusBadge = "bg-red-50 text-red-800 border-red-200/50";
            else if (job.status === "Carry Forward") statusBadge = "bg-orange-50 text-orange-800 border-orange-200/50";

            return (
              <div 
                key={job.job_id}
                onClick={() => setSelectedJob(job)}
                className={`p-3 rounded-lg border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected 
                    ? "border-orange-500 bg-orange-500/5 shadow-xs" 
                    : "border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-mono bg-slate-100 px-1.5 py-0.5 rounded font-bold text-slate-500 uppercase">
                      {job.job_card_no}
                    </span>
                    <h3 className="font-bold text-slate-900 text-xs mt-1">{job.vrn}</h3>
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${statusBadge}`}>
                    {job.status}
                  </span>
                </div>

                <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                  <p className="line-clamp-1">{job.vehicle_make} {job.vehicle_model} • {srType?.sr_type_name}</p>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT: JOB DETAIL & ACTIVE OPERATIONS */}
      <div className="lg:col-span-2 space-y-6">
        {selectedJob ? (
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-5">
            <TruckInfoCard job={selectedJob} className="mb-4" />
            {/* Header / Meta */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-mono bg-orange-500/10 text-orange-600 border border-orange-500/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                    {selectedJob.job_card_no}
                  </span>
                  {selectedJob.priority === "Express" && (
                    <span className="bg-red-50 text-red-600 border border-red-200/50 text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider animate-pulse">
                      Express Job
                    </span>
                  )}
                </div>
                <h1 className="text-lg font-bold text-slate-900 tracking-tight uppercase flex items-center gap-3">
                  {selectedJob.vrn}
                  {onLookupVehicle && (
                    <button
                      onClick={() => onLookupVehicle(selectedJob.vrn)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/50 rounded transition-all cursor-pointer shadow-xs"
                      title="View entire diagnostics and service history of this vehicle"
                    >
                      <History className="h-3 w-3" />
                      <span>View History</span>
                    </button>
                  )}
                </h1>
                <p className="text-xs text-slate-500 font-medium">
                  Customer: <span className="font-bold text-slate-700">{selectedJob.customer_name}</span> ({selectedJob.customer_mobile})
                </p>
              </div>
 
              {/* Status Controls */}
              <div className="flex flex-wrap items-center gap-2">
                {selectedJob.status === "Waiting" && currentUserRole !== "Service Advisor" && (
                  <div className="flex items-center gap-2">
                    <select 
                      onChange={(e) => {
                        const bId = Number(e.target.value);
                        if (!bId) return;
                        onAssignTechnicians(selectedJob.job_id, allocations.filter(a => a.job_id === selectedJob.job_id));
                        onUpdateJob(selectedJob.job_id, { status: "Active", bay_id: bId });
                      }}
                      className="text-[11px] bg-slate-50 border border-slate-200 rounded px-2 py-1.5 font-semibold focus:outline-hidden"
                    >
                      <option value="">Select Bay to Start...</option>
                      {bays.map(b => (
                        <option key={b.bay_id} value={b.bay_id}>{b.bay_name}</option>
                      ))}
                    </select>
                    <button 
                      onClick={() => onUpdateJobStatus(selectedJob.job_id, "Active")}
                      className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-[10px] px-3 py-1.5 rounded uppercase tracking-wider shadow-sm cursor-pointer"
                    >
                      Start Repair
                    </button>
                  </div>
                )}
 
                {selectedJob.status === "Active" && currentUserRole !== "Service Advisor" && (
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => onUpdateJobStatus(selectedJob.job_id, "Completed")}
                      className="bg-green-600 hover:bg-green-700 text-white font-bold text-[10px] px-3 py-1.5 rounded uppercase tracking-wider shadow-sm cursor-pointer flex items-center gap-1"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      Complete Work
                    </button>
                    <button 
                      onClick={() => setShowCfForm(true)}
                      className="bg-orange-50 text-orange-800 border border-orange-200/50 hover:bg-orange-100 font-bold text-[10px] px-3 py-1.5 rounded uppercase tracking-wider cursor-pointer"
                    >
                      Carry Forward
                    </button>
                  </div>
                )}
 
                {selectedJob.status === "Completed" && currentUserRole === "Workshop Manager" && (
                  <button 
                    onClick={() => onUpdateJobStatus(selectedJob.job_id, "Invoiced")}
                    className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-[10px] px-3 py-1.5 rounded uppercase tracking-wider shadow-sm cursor-pointer flex items-center gap-1"
                  >
                    <DollarSign className="h-3.5 w-3.5" />
                    Mark Invoiced
                  </button>
                )}
 
                {["Waiting", "Active"].includes(selectedJob.status) && currentUserRole !== "Service Advisor" && (
                  <button 
                    onClick={() => setShowReworkForm(true)}
                    className="bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 font-bold text-[10px] px-3 py-1.5 rounded uppercase tracking-wider cursor-pointer"
                  >
                    Raise Rework
                  </button>
                )}

                <button 
                  onClick={() => openEditModal(selectedJob)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold text-[10px] px-3 py-1.5 rounded uppercase tracking-wider cursor-pointer flex items-center gap-1"
                >
                  <Wrench className="h-3.5 w-3.5 text-orange-600" />
                  Edit Job Card
                </button>
              </div>
            </div>

            {/* Quick CF / Rework Inline Forms */}
            {showCfForm && (
              <div className="p-4 bg-orange-500/5 rounded-lg border border-orange-500/20 space-y-3">
                <div className="flex items-center gap-2 text-orange-600">
                  <ShieldAlert className="h-4 w-4" />
                  <h3 className="font-bold text-xs uppercase tracking-wider">Request Carry Forward Approval</h3>
                </div>
                <textarea 
                  value={cfReason}
                  onChange={(e) => setCfReason(e.target.value)}
                  placeholder="Enter reason (e.g. Parts delay, special tools needed tomorrow)..."
                  className="w-full bg-white border border-slate-200 rounded p-2 text-xs font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
                />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowCfForm(false)} className="text-[10px] font-bold px-3 py-1.5 bg-slate-100 rounded text-slate-700 uppercase tracking-wider">Cancel</button>
                  <button onClick={handleCfSubmit} className="text-[10px] font-bold px-4 py-1.5 bg-orange-500 hover:bg-orange-600 rounded text-white uppercase tracking-wider shadow-sm">Submit Request</button>
                </div>
              </div>
            )}
 
            {showReworkForm && (
              <div className="p-4 bg-red-500/5 rounded-lg border border-red-500/20 space-y-3">
                <div className="flex items-center gap-2 text-red-600">
                  <RotateCcw className="h-4 w-4" />
                  <h3 className="font-bold text-xs uppercase tracking-wider">Raise Rework Log</h3>
                </div>
                <textarea 
                  value={reworkReason}
                  onChange={(e) => setReworkReason(e.target.value)}
                  placeholder="What is wrong? Why must we re-do this repair?"
                  className="w-full bg-white border border-slate-200 rounded p-2 text-xs font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
                />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowReworkForm(false)} className="text-[10px] font-bold px-3 py-1.5 bg-slate-100 rounded text-slate-700 uppercase tracking-wider">Cancel</button>
                  <button onClick={handleReworkSubmit} className="text-[10px] font-bold px-4 py-1.5 bg-red-600 hover:bg-red-700 rounded text-white uppercase tracking-wider shadow-sm">Raise Rework</button>
                </div>
              </div>
            )}
            {/* SPREADSHEET / LEDGER SHEET VIEW */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-800 text-white px-4 py-2.5 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <ClipboardList className="h-4 w-4 text-orange-400" />
                  Job Card Spreadsheet Ledger
                </span>
                <span className="text-[9px] font-mono text-slate-300">DMS Worksheet Format</span>
              </div>
              
              <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                <div className="border-b border-slate-200/60 pb-2.5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Job Card No.</span>
                  <p className="font-mono font-bold text-slate-800 mt-0.5 text-sm">{selectedJob.job_card_no}</p>
                </div>

                <div className="border-b border-slate-200/60 pb-2.5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Bay No</span>
                  <p className="font-bold text-slate-800 mt-0.5">
                    {selectedJob.bay_no || bays.find(b => b.bay_id === selectedJob.bay_id)?.bay_name || "Queue (No Bay)"}
                  </p>
                </div>

                <div className="border-b border-slate-200/60 pb-2.5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    Vehicle No (VRN)
                    {selectedJob.numberplate_photo && (
                      <button 
                        onClick={() => {
                          setPreviewPhotoUrl(selectedJob.numberplate_photo!);
                          setPreviewPhotoTitle(`Numberplate Photo: ${selectedJob.vrn}`);
                        }}
                        className="text-orange-500 hover:text-orange-600 cursor-pointer flex items-center"
                        title="View Numberplate Photo"
                      >
                        <Camera className="h-3 w-3" />
                      </button>
                    )}
                  </span>
                  <p className="font-bold text-orange-600 mt-0.5 uppercase">{selectedJob.vrn}</p>
                </div>

                <div className="border-b border-slate-200/60 pb-2.5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Customer Name</span>
                  <p className="font-semibold text-slate-800 mt-0.5">{selectedJob.customer_name}</p>
                </div>

                <div className="border-b border-slate-200/60 pb-2.5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Date In</span>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {selectedJob.date_in || (selectedJob.created_at ? selectedJob.created_at.split("T")[0] : "-")}
                  </p>
                </div>

                <div className="border-b border-slate-200/60 pb-2.5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Time-In</span>
                  <p className="font-mono text-slate-800 mt-0.5">
                    {selectedJob.time_in || (selectedJob.created_at ? selectedJob.created_at.split("T")[1]?.substring(0, 5) : "-")}
                  </p>
                </div>

                <div className="border-b border-slate-200/60 pb-2.5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Expected Date Out</span>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {selectedJob.expected_date_out || (selectedJob.etd ? selectedJob.etd.split("T")[0] : "-")}
                  </p>
                </div>

                <div className="border-b border-slate-200/60 pb-2.5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Expected Time of Completion</span>
                  <p className="font-mono text-orange-600 mt-0.5 font-bold">
                    {selectedJob.expected_time_of_completion || (selectedJob.etd ? selectedJob.etd.split("T")[1]?.substring(0, 5) : "-")}
                  </p>
                </div>

                <div className="border-b border-slate-200/60 pb-2.5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Time Out</span>
                  <p className="font-mono text-slate-800 mt-0.5">
                    {selectedJob.time_out || (selectedJob.completed_at ? selectedJob.completed_at.split("T")[1]?.substring(0, 5) : "Active in Workshop")}
                  </p>
                </div>

                <div className="border-b border-slate-200/60 pb-2.5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    Odometer (KM)
                    {selectedJob.odometer_photo && (
                      <button 
                        onClick={() => {
                          setPreviewPhotoUrl(selectedJob.odometer_photo!);
                          setPreviewPhotoTitle(`Odometer Reading Photo: ${selectedJob.km_reading} KM`);
                        }}
                        className="text-orange-500 hover:text-orange-600 cursor-pointer flex items-center"
                        title="View Odometer Photo"
                      >
                        <Camera className="h-3 w-3" />
                      </button>
                    )}
                  </span>
                  <p className="font-mono text-slate-800 mt-0.5 font-bold">
                    {selectedJob.km_reading ? `${selectedJob.km_reading} KM` : "-"}
                  </p>
                </div>

                <div className="border-b border-slate-200/60 pb-2.5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Status</span>
                  <p className="mt-0.5">
                    <span className="px-2 py-0.5 font-bold text-[10px] rounded border uppercase tracking-wider bg-orange-500/10 text-orange-700 border-orange-200">
                      {selectedJob.status}
                    </span>
                  </p>
                </div>

                <div className="border-b border-slate-200/60 pb-2.5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Waiting Days</span>
                  <p className="font-bold text-slate-800 mt-0.5">
                    {getWaitingDays(selectedJob)} {getWaitingDays(selectedJob) === 1 ? 'day' : 'days'}
                  </p>
                </div>

                <div className="border-b border-slate-200/60 pb-2.5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Date Completed</span>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {selectedJob.date_completed || (selectedJob.completed_at ? selectedJob.completed_at.split("T")[0] : "Not Completed")}
                  </p>
                </div>

                <div className="border-b border-slate-200/60 pb-2.5 col-span-2 md:col-span-3">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">SERVICE ADVISOR</span>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {selectedJob.service_advisor || employees.find(e => e.employee_id === selectedJob.created_by)?.full_name || "Unknown Advisor"}
                  </p>
                </div>

                <div className="border-b border-slate-200/60 pb-2.5 col-span-2">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-semibold">Technician Name</span>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {selectedJob.technician_name || (assignedStaff.length === 0 ? (
                      <span className="text-slate-400 italic">No Technicians Assigned</span>
                    ) : (
                      assignedStaff.map(staff => {
                        const emp = employees.find(e => e.employee_id === staff.employee_id);
                        return `${emp?.full_name} (${staff.tech_role})`;
                      }).join(", ")
                    ))}
                  </p>
                </div>

                <div className="border-b border-slate-200/60 pb-2.5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">No. of Laborers</span>
                  <p className="font-bold text-slate-800 mt-0.5">
                    {selectedJob.no_of_laborers !== null && selectedJob.no_of_laborers !== undefined ? `${selectedJob.no_of_laborers} laborers` : `${assignedStaff.length} laborers`}
                  </p>
                </div>

                <div className="border-b border-slate-200/60 pb-2.5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Actual Time Taken</span>
                  <p className="font-bold text-green-700 mt-0.5">
                    {selectedJob.actual_time_taken || getActualTimeTaken(selectedJob)}
                  </p>
                </div>

                {selectedJob.pending_reason && (
                  <div className="border-b border-slate-200/60 pb-2.5 col-span-2 md:col-span-3">
                    <span className="text-[9px] font-bold text-red-500 uppercase tracking-wider">Pending Reason</span>
                    <p className="text-slate-700 mt-0.5 bg-red-50 border border-red-100 p-2 rounded-lg">{selectedJob.pending_reason}</p>
                  </div>
                )}

                {selectedJob.remarks && (
                  <div className="border-b border-slate-200/60 pb-2.5 col-span-2 md:col-span-3">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Remarks</span>
                    <p className="text-slate-700 mt-0.5 bg-white border border-slate-100 p-2 rounded-lg italic">{selectedJob.remarks}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Job Description</h3>
              <p className="text-xs text-slate-600 bg-slate-50/30 p-2.5 rounded-lg border border-slate-100 leading-relaxed font-medium">
                {selectedJob.job_description || "No description provided."}
              </p>
            </div>

            {/* TECHNICIAN ALLOCATOR */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <UserPlus className="h-4.5 w-4.5 text-orange-600" />
                  Technician Allocations
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Assign multiple specialists & co-techs.</p>
              </div>
 
              <div className="flex flex-wrap items-center gap-3">
                <select 
                  disabled={currentUserRole === "Service Advisor"}
                  value={tempEmpId}
                  onChange={(e) => setTempEmpId(Number(e.target.value))}
                  className="text-xs bg-slate-50 border border-slate-200 rounded p-2 font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-hidden disabled:opacity-60"
                >
                  {employees.filter(e => e.is_active !== false && isTechnicianRole(e.role)).map(e => (
                    <option key={e.employee_id} value={e.employee_id}>{e.full_name} ({e.role})</option>
                  ))}
                </select>
 
                <select 
                  disabled={currentUserRole === "Service Advisor"}
                  value={tempRole}
                  onChange={(e) => setTempRole(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded p-2 font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-hidden disabled:opacity-60"
                >
                  <option value="Primary Technician">Primary Technician</option>
                  <option value="Co-Technician">Co-Technician</option>
                  <option value="Electrician">Electrician</option>
                  <option value="Add Tech">Add Tech</option>
                </select>
 
                {currentUserRole !== "Service Advisor" && (
                  <button 
                    onClick={addStaffAllocation}
                    className="bg-orange-500/10 text-orange-600 border border-orange-500/20 hover:bg-orange-500/20 font-bold text-[10px] px-3 py-2 rounded uppercase tracking-wider transition-all cursor-pointer"
                  >
                    + Add Specialist
                  </button>
                )}
              </div>
 
              {/* Active list */}
              <div className="space-y-2 mt-3">
                {assignedStaff.length === 0 ? (
                  <p className="text-xs italic text-slate-400">No technicians currently assigned.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {assignedStaff.map((staff, idx) => {
                      const emp = employees.find(e => e.employee_id === staff.employee_id);
                      return (
                        <div key={idx} className="flex items-center gap-2 bg-slate-50 text-slate-800 rounded px-2.5 py-1 text-xs font-semibold border border-slate-200 shadow-3xs">
                          <span>{emp?.full_name}</span>
                          <span className="text-[9px] bg-orange-500/10 text-orange-600 border border-orange-500/20 font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                            {staff.tech_role}
                          </span>
                          {currentUserRole !== "Service Advisor" && (
                            <button 
                              onClick={() => removeStaffAllocation(staff.employee_id)}
                              className="text-slate-400 hover:text-rose-600 font-bold ml-1 text-sm cursor-pointer"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
 
                {assignedStaff.length > 0 && currentUserRole !== "Service Advisor" && (
                  <div className="flex justify-end pt-2">
                    <button 
                      onClick={handleSaveAllocations}
                      className="bg-orange-500 hover:bg-orange-600 text-white text-[10px] font-bold px-4 py-2 rounded uppercase tracking-wider shadow-sm transition-all cursor-pointer"
                    >
                      Save Allocations
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* DYNAMIC REVENUE SPLITTING CALCULATOR */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="h-4.5 w-4.5 text-orange-600" />
                Dynamic Revenue Splitting (DMS Sync)
              </h3>
 
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <h4 className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Lock Workshop Invoice Details</h4>
                  
                  <div className="space-y-2">
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Labour Amount (₹)</label>
                      <input 
                        type="number"
                        disabled={currentUserRole !== "Workshop Manager"}
                        value={labourAmount}
                        onChange={(e) => setLabourAmount(Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded p-2 text-xs font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-hidden disabled:opacity-60 disabled:bg-slate-100"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Parts Amount (₹)</label>
                      <input 
                        type="number"
                        disabled={currentUserRole !== "Workshop Manager"}
                        value={partsAmount}
                        onChange={(e) => setPartsAmount(Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded p-2 text-xs font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-hidden disabled:opacity-60 disabled:bg-slate-100"
                      />
                    </div>
                  </div>
 
                  <button 
                    onClick={handleCalculateRevSplit}
                    disabled={currentUserRole !== "Workshop Manager"}
                    className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold text-[10px] py-2 rounded uppercase tracking-wider shadow-sm transition-colors cursor-pointer"
                  >
                    Calculate Split Share
                  </button>
                </div>
 
                {/* Display splits */}
                <div className="space-y-3 bg-orange-500/5 p-3 rounded-lg border border-orange-500/10">
                  <h4 className="text-[10px] font-bold text-orange-700 uppercase tracking-wider">Current Split Shares</h4>
                  
                  {selectedJobSplits.length === 0 ? (
                    <p className="text-xs italic text-slate-400 py-6 text-center">Calculate split to see breakdown.</p>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[9px] font-bold text-orange-600/70 uppercase border-b border-orange-500/10 pb-1">
                        <span>Technician</span>
                        <span>Share (₹)</span>
                      </div>
                      <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                        {selectedJobSplits.map((detail, idx) => {
                          const emp = employees.find(e => e.employee_id === detail.employee_id);
                          return (
                            <div key={idx} className="flex items-center justify-between text-xs font-semibold">
                              <div className="space-y-0.5">
                                <p className="text-slate-800">{emp?.full_name}</p>
                                <p className="text-[9px] text-slate-400 uppercase tracking-wider">{detail.tech_role} ({detail.split_pct}%)</p>
                              </div>
                              <p className="font-extrabold text-orange-600">₹{detail.split_amount.toLocaleString()}</p>
                            </div>
                          );
                        })}
                      </div>
                      <div className="border-t border-orange-500/10 pt-1.5 flex items-center justify-between text-xs font-bold text-slate-800 uppercase tracking-wider">
                        <span>Total Split Share</span>
                        <span>₹{selectedJobRevenue?.labour_amount.toLocaleString()} (Labour)</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
 
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400 text-sm shadow-sm">
            <ClipboardList className="h-10 w-10 mx-auto text-slate-300 mb-3" />
            No Job Cards available. Click "New Job" to register the first vehicle.
          </div>
        )}
      </div>
       {/* CREATE JOB CARD MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className={`bg-white rounded-xl border border-slate-200 shadow-md transition-all duration-300 w-full p-4 space-y-4 max-h-[90dvh] overflow-y-auto ${ocrTab === 'batch' ? 'max-w-3xl' : 'max-w-lg'}`}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Wrench className="h-4.5 w-4.5 text-orange-600" />
                Register Vehicle & Create Job Card
              </h2>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">×</button>
            </div>
 
            <form onSubmit={handleSubmitCreate} className="space-y-3.5 max-h-[500px] overflow-y-auto pr-1">
              {/* SINGLE / BATCH OCR WORKSPACE TABS */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden mb-4">
                <div className="flex border-b border-slate-200 bg-slate-100">
                  <button
                    type="button"
                    onClick={() => setOcrTab('single')}
                    className={`flex-1 py-2 text-[10px] font-extrabold uppercase tracking-wider text-center border-r border-slate-200 transition-colors ${
                      ocrTab === 'single'
                        ? 'bg-white text-orange-600 border-b-2 border-b-orange-500'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
                    }`}
                  >
                    <span className="flex items-center justify-center gap-1">
                      <Camera className="h-3.5 w-3.5" />
                      Single Card Scan
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOcrTab('batch')}
                    className={`flex-1 py-2 text-[10px] font-extrabold uppercase tracking-wider text-center transition-colors ${
                      ocrTab === 'batch'
                        ? 'bg-white text-orange-600 border-b-2 border-b-orange-500'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
                    }`}
                  >
                    <span className="flex items-center justify-center gap-1">
                      <Layers className="h-3.5 w-3.5" />
                      Batch Stack Scan (Multi-Page)
                      {batchOcrQueue.length > 0 && (
                        <span className="ml-1 bg-orange-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full">
                          {batchOcrQueue.length}
                        </span>
                      )}
                    </span>
                  </button>
                </div>

                {ocrTab === 'single' ? (
                  <div className="p-3 bg-white space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Camera className="h-4 w-4 text-orange-600" />
                          Scan Single Manual Job Card (Free AI OCR)
                        </h4>
                        <p className="text-[9px] text-slate-500 font-medium">Upload or snap a handwritten manual card to auto-populate all fields.</p>
                      </div>
                      <label className="bg-orange-600 hover:bg-orange-700 text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors flex items-center gap-1 shadow-xs">
                        <UploadCloud className="h-3.5 w-3.5" />
                        Upload Card Photo
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleManualJobcardUpload} 
                          className="hidden" 
                        />
                      </label>
                    </div>
                    {isOcrReadingJobcard && (
                      <div className="flex items-center gap-2 p-1.5 text-orange-600 text-[10px] font-bold animate-pulse bg-white border border-orange-200 rounded-lg">
                        <div className="w-2.5 h-2.5 bg-orange-600 rounded-full animate-ping"></div>
                        Parsing manual card layout, handwriting & details via Gemini OCR...
                      </div>
                    )}
                    {ocrJobcardError && (
                      <div className="p-1.5 bg-red-50 text-red-600 border border-red-150 rounded-lg text-[9px] font-bold">
                        ⚠️ Error: {ocrJobcardError}
                      </div>
                    )}
                    {manualJobcardPhoto && !isOcrReadingJobcard && (
                      <div className="flex items-center gap-1.5 text-[9px] font-semibold text-slate-500">
                        <span className="text-emerald-600 font-extrabold">✓ Card loaded:</span>
                        <button 
                          type="button" 
                          onClick={() => { setPreviewPhotoUrl(manualJobcardPhoto); setPreviewPhotoTitle("Scanned Manual Job Card"); }} 
                          className="text-orange-600 underline hover:text-orange-700 cursor-pointer"
                        >
                          View Scanned Image
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 bg-white space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div>
                        <h4 className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Layers className="h-4 w-4 text-orange-600" />
                          Batch Physical Card & Stack Processor
                        </h4>
                        <p className="text-[9px] text-slate-500 font-medium">
                          Select multiple handwritten job cards. Gemini will analyze each and highlight points requiring verification.
                        </p>
                      </div>
                      <label className="bg-slate-900 hover:bg-black text-white text-[9.5px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg cursor-pointer transition-colors flex items-center gap-1 shadow-xs">
                        <UploadCloud className="h-3.5 w-3.5 text-orange-500 animate-pulse" />
                        Select Stack of Images
                        <input 
                          type="file" 
                          accept="image/*" 
                          multiple 
                          onChange={handleBatchJobcardUpload} 
                          className="hidden" 
                        />
                      </label>
                    </div>

                    {/* Batch Stack Status Grid */}
                    {batchOcrQueue.length === 0 ? (
                      <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center text-slate-400 text-[10px] font-semibold">
                        📂 No card images in stack yet. Click "Select Stack of Images" to begin batch processing.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                            Queue Stack ({batchOcrQueue.filter(q => q.status === 'success').length}/{batchOcrQueue.length} Processed)
                          </span>
                          <button
                            type="button"
                            onClick={() => { setBatchOcrQueue([]); setActiveBatchIndex(null); }}
                            className="text-red-500 hover:text-red-600 text-[8px] font-black uppercase tracking-wider cursor-pointer"
                          >
                            Clear Stack
                          </button>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 overflow-x-auto pb-1 max-h-[140px]">
                          {batchOcrQueue.map((item, idx) => {
                            const needsVerificationCount = item.extractedData 
                              ? Object.values(item.extractedData.verification_flags).filter(Boolean).length
                              : 0;
                            return (
                              <div 
                                key={item.id}
                                onClick={() => setActiveBatchIndex(idx)}
                                className={`flex items-center gap-2 p-2 rounded-lg border text-left cursor-pointer transition-all ${
                                  activeBatchIndex === idx 
                                    ? 'border-orange-500 bg-orange-50/40 ring-1 ring-orange-500/50' 
                                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                                }`}
                              >
                                <img 
                                  src={item.photoUrl} 
                                  alt="Card preview" 
                                  className="w-8 h-8 rounded-md object-cover border border-slate-200 bg-slate-100 flex-shrink-0"
                                />
                                <div className="min-w-0 flex-1 space-y-0.5">
                                  <p className="text-[9px] font-bold text-slate-800 truncate" title={item.fileName}>
                                    {item.fileName}
                                  </p>
                                  {item.status === 'pending' && (
                                    <span className="inline-block text-[7.5px] font-extrabold text-slate-500 bg-slate-100 px-1 rounded">
                                      PENDING
                                    </span>
                                  )}
                                  {item.status === 'processing' && (
                                    <span className="inline-flex items-center gap-1 text-[7.5px] font-extrabold text-amber-600 bg-amber-50 px-1 rounded animate-pulse">
                                      <FunnySpinner className="h-2 w-2" /> SCANNING...
                                    </span>
                                  )}
                                  {item.status === 'failed' && (
                                    <span className="inline-block text-[7.5px] font-extrabold text-red-600 bg-red-50 px-1 rounded">
                                      OCR FAILED
                                    </span>
                                  )}
                                  {item.status === 'success' && item.extractedData && (
                                    <div className="space-y-0.5">
                                      <span className="inline-block text-[8px] font-extrabold text-emerald-700 bg-emerald-50 px-1 rounded">
                                        {item.extractedData.vrn || 'NO VRN'}
                                      </span>
                                      {needsVerificationCount > 0 ? (
                                        <p className="text-[7.5px] font-bold text-amber-600 flex items-center gap-0.5">
                                          ⚠️ {needsVerificationCount} to verify
                                        </p>
                                      ) : (
                                        <p className="text-[7.5px] font-bold text-emerald-600 flex items-center gap-0.5">
                                          ✓ Verified clean
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* ACTIVE REVIEW PANEL */}
                        {activeBatchIndex !== null && batchOcrQueue[activeBatchIndex] && (
                          <div className="mt-3 bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                              <h5 className="text-[9px] font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                                <Eye className="h-3.5 w-3.5 text-orange-600" />
                                Review Extracted Data: <span className="text-orange-600 normal-case italic font-semibold">{batchOcrQueue[activeBatchIndex].fileName}</span>
                              </h5>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPreviewPhotoUrl(batchOcrQueue[activeBatchIndex].photoUrl);
                                    setPreviewPhotoTitle(batchOcrQueue[activeBatchIndex].fileName);
                                  }}
                                  className="text-[8px] font-black uppercase text-slate-500 hover:text-slate-800 flex items-center gap-0.5 bg-slate-200/50 px-2 py-1 rounded cursor-pointer"
                                >
                                  View Scanned Image
                                </button>
                                {batchOcrQueue[activeBatchIndex].status === 'success' && (
                                  <button
                                    type="button"
                                    onClick={() => handleApplyBatchCardToForm(batchOcrQueue[activeBatchIndex])}
                                    className="text-[8.5px] font-black uppercase tracking-wider text-white bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1 px-2.5 py-1 rounded-lg shadow-xs cursor-pointer"
                                  >
                                    <Check className="h-3 w-3" />
                                    Pre-fill Main Form
                                  </button>
                                )}
                              </div>
                            </div>

                            {batchOcrQueue[activeBatchIndex].status === 'processing' && (
                              <div className="py-6 text-center space-y-2">
                                <FunnySpinner className="h-6 w-6 text-orange-500  mx-auto" />
                                <p className="text-[10px] text-slate-500 font-bold animate-pulse">
                                  Running Gemini multi-page intelligence OCR parsing on card image...
                                </p>
                              </div>
                            )}

                            {batchOcrQueue[activeBatchIndex].status === 'failed' && (
                              <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-center text-red-600 text-[10px] font-bold">
                                ❌ OCR Failed: {batchOcrQueue[activeBatchIndex].error || "Check image quality and try again."}
                              </div>
                            )}

                            {batchOcrQueue[activeBatchIndex].status === 'success' && batchOcrQueue[activeBatchIndex].extractedData && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {/* First Column of Fields */}
                                <div className="space-y-2">
                                  {/* VRN Field */}
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                      <label className="text-[8.5px] font-extrabold text-slate-500 uppercase tracking-wider">Registration Number (VRN)</label>
                                      {batchOcrQueue[activeBatchIndex].extractedData?.verification_flags.vrn_needs_verification && (
                                        <span className="text-[7px] font-black uppercase text-amber-700 bg-amber-100 px-1 rounded">
                                          ⚠️ needs verify
                                        </span>
                                      )}
                                    </div>
                                    <input 
                                      type="text" 
                                      value={batchOcrQueue[activeBatchIndex].extractedData?.vrn || ""}
                                      onChange={(e) => handleUpdateBatchDataField(batchOcrQueue[activeBatchIndex].id, 'vrn', e.target.value.toUpperCase())}
                                      className={`w-full bg-white border rounded p-1.5 text-[10px] font-bold uppercase focus:outline-none ${
                                        batchOcrQueue[activeBatchIndex].extractedData?.verification_flags.vrn_needs_verification 
                                          ? 'border-amber-400 bg-amber-50/10 focus:ring-1 focus:ring-amber-500' 
                                          : 'border-slate-200 focus:ring-1 focus:ring-orange-500'
                                      }`}
                                    />
                                    {batchOcrQueue[activeBatchIndex].extractedData?.verification_flags.vrn_needs_verification && (
                                      <div className="flex items-center justify-between bg-amber-50 text-[8px] text-amber-800 p-1 rounded-md">
                                        <span>💡 {batchOcrQueue[activeBatchIndex].extractedData?.verification_reasons.vrn_reason}</span>
                                        <button 
                                          type="button" 
                                          onClick={() => handleUpdateBatchVerificationFlag(batchOcrQueue[activeBatchIndex].id, 'vrn_needs_verification', false)} 
                                          className="text-[7px] font-black text-amber-700 hover:underline hover:text-amber-900 ml-1 uppercase cursor-pointer"
                                        >
                                          Dismiss
                                        </button>
                                      </div>
                                    )}
                                  </div>

                                  {/* Customer Name Field */}
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                      <label className="text-[8.5px] font-extrabold text-slate-500 uppercase tracking-wider">Customer Name</label>
                                      {batchOcrQueue[activeBatchIndex].extractedData?.verification_flags.customer_name_needs_verification && (
                                        <span className="text-[7px] font-black uppercase text-amber-700 bg-amber-100 px-1 rounded">
                                          ⚠️ needs verify
                                        </span>
                                      )}
                                    </div>
                                    <input 
                                      type="text" 
                                      value={batchOcrQueue[activeBatchIndex].extractedData?.customer_name || ""}
                                      onChange={(e) => handleUpdateBatchDataField(batchOcrQueue[activeBatchIndex].id, 'customer_name', e.target.value)}
                                      className={`w-full bg-white border rounded p-1.5 text-[10px] font-bold focus:outline-none ${
                                        batchOcrQueue[activeBatchIndex].extractedData?.verification_flags.customer_name_needs_verification 
                                          ? 'border-amber-400 bg-amber-50/10 focus:ring-1 focus:ring-amber-500' 
                                          : 'border-slate-200 focus:ring-1 focus:ring-orange-500'
                                      }`}
                                    />
                                    {batchOcrQueue[activeBatchIndex].extractedData?.verification_flags.customer_name_needs_verification && (
                                      <div className="flex items-center justify-between bg-amber-50 text-[8px] text-amber-800 p-1 rounded-md">
                                        <span>💡 {batchOcrQueue[activeBatchIndex].extractedData?.verification_reasons.customer_name_reason}</span>
                                        <button 
                                          type="button" 
                                          onClick={() => handleUpdateBatchVerificationFlag(batchOcrQueue[activeBatchIndex].id, 'customer_name_needs_verification', false)} 
                                          className="text-[7px] font-black text-amber-700 hover:underline hover:text-amber-900 ml-1 uppercase cursor-pointer"
                                        >
                                          Dismiss
                                        </button>
                                      </div>
                                    )}
                                  </div>

                                  {/* Customer Mobile Field */}
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                      <label className="text-[8.5px] font-extrabold text-slate-500 uppercase tracking-wider">Customer Phone</label>
                                      {batchOcrQueue[activeBatchIndex].extractedData?.verification_flags.customer_mobile_needs_verification && (
                                        <span className="text-[7px] font-black uppercase text-amber-700 bg-amber-100 px-1 rounded">
                                          ⚠️ needs verify
                                        </span>
                                      )}
                                    </div>
                                    <input 
                                      type="text" 
                                      value={batchOcrQueue[activeBatchIndex].extractedData?.customer_mobile || ""}
                                      onChange={(e) => handleUpdateBatchDataField(batchOcrQueue[activeBatchIndex].id, 'customer_mobile', e.target.value)}
                                      className={`w-full bg-white border rounded p-1.5 text-[10px] font-bold focus:outline-none ${
                                        batchOcrQueue[activeBatchIndex].extractedData?.verification_flags.customer_mobile_needs_verification 
                                          ? 'border-amber-400 bg-amber-50/10 focus:ring-1 focus:ring-amber-500' 
                                          : 'border-slate-200 focus:ring-1 focus:ring-orange-500'
                                      }`}
                                    />
                                    {batchOcrQueue[activeBatchIndex].extractedData?.verification_flags.customer_mobile_needs_verification && (
                                      <div className="flex items-center justify-between bg-amber-50 text-[8px] text-amber-800 p-1 rounded-md">
                                        <span>💡 {batchOcrQueue[activeBatchIndex].extractedData?.verification_reasons.customer_mobile_reason}</span>
                                        <button 
                                          type="button" 
                                          onClick={() => handleUpdateBatchVerificationFlag(batchOcrQueue[activeBatchIndex].id, 'customer_mobile_needs_verification', false)} 
                                          className="text-[7px] font-black text-amber-700 hover:underline hover:text-amber-900 ml-1 uppercase cursor-pointer"
                                        >
                                          Dismiss
                                        </button>
                                      </div>
                                    )}
                                  </div>

                                  {/* Vehicle Model Field */}
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                      <label className="text-[8.5px] font-extrabold text-slate-500 uppercase tracking-wider">Vehicle Model</label>
                                      {batchOcrQueue[activeBatchIndex].extractedData?.verification_flags.vehicle_model_needs_verification && (
                                        <span className="text-[7px] font-black uppercase text-amber-700 bg-amber-100 px-1 rounded">
                                          ⚠️ needs verify
                                        </span>
                                      )}
                                    </div>
                                    <input 
                                      type="text" 
                                      value={batchOcrQueue[activeBatchIndex].extractedData?.vehicle_model || ""}
                                      onChange={(e) => handleUpdateBatchDataField(batchOcrQueue[activeBatchIndex].id, 'vehicle_model', e.target.value)}
                                      className={`w-full bg-white border rounded p-1.5 text-[10px] font-bold focus:outline-none ${
                                        batchOcrQueue[activeBatchIndex].extractedData?.verification_flags.vehicle_model_needs_verification 
                                          ? 'border-amber-400 bg-amber-50/10 focus:ring-1 focus:ring-amber-500' 
                                          : 'border-slate-200 focus:ring-1 focus:ring-orange-500'
                                      }`}
                                    />
                                    {batchOcrQueue[activeBatchIndex].extractedData?.verification_flags.vehicle_model_needs_verification && (
                                      <div className="flex items-center justify-between bg-amber-50 text-[8px] text-amber-800 p-1 rounded-md">
                                        <span>💡 {batchOcrQueue[activeBatchIndex].extractedData?.verification_reasons.vehicle_model_reason}</span>
                                        <button 
                                          type="button" 
                                          onClick={() => handleUpdateBatchVerificationFlag(batchOcrQueue[activeBatchIndex].id, 'vehicle_model_needs_verification', false)} 
                                          className="text-[7px] font-black text-amber-700 hover:underline hover:text-amber-900 ml-1 uppercase cursor-pointer"
                                        >
                                          Dismiss
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Second Column of Fields */}
                                <div className="space-y-2">
                                  {/* KM Reading */}
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                      <label className="text-[8.5px] font-extrabold text-slate-500 uppercase tracking-wider">Odometer Reading (KM)</label>
                                      {batchOcrQueue[activeBatchIndex].extractedData?.verification_flags.km_reading_needs_verification && (
                                        <span className="text-[7px] font-black uppercase text-amber-700 bg-amber-100 px-1 rounded">
                                          ⚠️ needs verify
                                        </span>
                                      )}
                                    </div>
                                    <input 
                                      type="number" 
                                      value={batchOcrQueue[activeBatchIndex].extractedData?.km_reading || ""}
                                      onChange={(e) => handleUpdateBatchDataField(batchOcrQueue[activeBatchIndex].id, 'km_reading', e.target.value === "" ? "" : Number(e.target.value))}
                                      className={`w-full bg-white border rounded p-1.5 text-[10px] font-bold focus:outline-none ${
                                        batchOcrQueue[activeBatchIndex].extractedData?.verification_flags.km_reading_needs_verification 
                                          ? 'border-amber-400 bg-amber-50/10 focus:ring-1 focus:ring-amber-500' 
                                          : 'border-slate-200 focus:ring-1 focus:ring-orange-500'
                                      }`}
                                    />
                                    {batchOcrQueue[activeBatchIndex].extractedData?.verification_flags.km_reading_needs_verification && (
                                      <div className="flex items-center justify-between bg-amber-50 text-[8px] text-amber-800 p-1 rounded-md">
                                        <span>💡 {batchOcrQueue[activeBatchIndex].extractedData?.verification_reasons.km_reading_reason}</span>
                                        <button 
                                          type="button" 
                                          onClick={() => handleUpdateBatchVerificationFlag(batchOcrQueue[activeBatchIndex].id, 'km_reading_needs_verification', false)} 
                                          className="text-[7px] font-black text-amber-700 hover:underline hover:text-amber-900 ml-1 uppercase cursor-pointer"
                                        >
                                          Dismiss
                                        </button>
                                      </div>
                                    )}
                                  </div>

                                  {/* Service Advisor */}
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                      <label className="text-[8.5px] font-extrabold text-slate-500 uppercase tracking-wider">Service Advisor</label>
                                      {batchOcrQueue[activeBatchIndex].extractedData?.verification_flags.service_advisor_needs_verification && (
                                        <span className="text-[7px] font-black uppercase text-amber-700 bg-amber-100 px-1 rounded">
                                          ⚠️ needs verify
                                        </span>
                                      )}
                                    </div>
                                    <input 
                                      type="text" 
                                      value={batchOcrQueue[activeBatchIndex].extractedData?.service_advisor || ""}
                                      onChange={(e) => handleUpdateBatchDataField(batchOcrQueue[activeBatchIndex].id, 'service_advisor', e.target.value)}
                                      className={`w-full bg-white border rounded p-1.5 text-[10px] font-bold focus:outline-none ${
                                        batchOcrQueue[activeBatchIndex].extractedData?.verification_flags.service_advisor_needs_verification 
                                          ? 'border-amber-400 bg-amber-50/10 focus:ring-1 focus:ring-amber-500' 
                                          : 'border-slate-200 focus:ring-1 focus:ring-orange-500'
                                      }`}
                                    />
                                    {batchOcrQueue[activeBatchIndex].extractedData?.verification_flags.service_advisor_needs_verification && (
                                      <div className="flex items-center justify-between bg-amber-50 text-[8px] text-amber-800 p-1 rounded-md">
                                        <span>💡 {batchOcrQueue[activeBatchIndex].extractedData?.verification_reasons.service_advisor_reason}</span>
                                        <button 
                                          type="button" 
                                          onClick={() => handleUpdateBatchVerificationFlag(batchOcrQueue[activeBatchIndex].id, 'service_advisor_needs_verification', false)} 
                                          className="text-[7px] font-black text-amber-700 hover:underline hover:text-amber-900 ml-1 uppercase cursor-pointer"
                                        >
                                          Dismiss
                                        </button>
                                      </div>
                                    )}
                                  </div>

                                  {/* Job Description */}
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                      <label className="text-[8.5px] font-extrabold text-slate-500 uppercase tracking-wider">Job Description / Complaints</label>
                                      {batchOcrQueue[activeBatchIndex].extractedData?.verification_flags.job_description_needs_verification && (
                                        <span className="text-[7px] font-black uppercase text-amber-700 bg-amber-100 px-1 rounded">
                                          ⚠️ needs verify
                                        </span>
                                      )}
                                    </div>
                                    <textarea 
                                      value={batchOcrQueue[activeBatchIndex].extractedData?.job_description || ""}
                                      rows={2}
                                      onChange={(e) => handleUpdateBatchDataField(batchOcrQueue[activeBatchIndex].id, 'job_description', e.target.value)}
                                      className={`w-full bg-white border rounded p-1.5 text-[10px] font-semibold focus:outline-none ${
                                        batchOcrQueue[activeBatchIndex].extractedData?.verification_flags.job_description_needs_verification 
                                          ? 'border-amber-400 bg-amber-50/10 focus:ring-1 focus:ring-amber-500' 
                                          : 'border-slate-200 focus:ring-1 focus:ring-orange-500'
                                      }`}
                                    />
                                    {batchOcrQueue[activeBatchIndex].extractedData?.verification_flags.job_description_needs_verification && (
                                      <div className="flex items-center justify-between bg-amber-50 text-[8px] text-amber-800 p-1 rounded-md">
                                        <span>💡 {batchOcrQueue[activeBatchIndex].extractedData?.verification_reasons.job_description_reason}</span>
                                        <button 
                                          type="button" 
                                          onClick={() => handleUpdateBatchVerificationFlag(batchOcrQueue[activeBatchIndex].id, 'job_description_needs_verification', false)} 
                                          className="text-[7px] font-black text-amber-700 hover:underline hover:text-amber-900 ml-1 uppercase cursor-pointer"
                                        >
                                          Dismiss
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Job Card No.*</label>
                  <input 
                    type="text" 
                    required 
                    value={createJobCardNo}
                    onChange={(e) => setCreateJobCardNo(e.target.value)}
                    placeholder="e.g. JC001"
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Registration No (VRN)*</label>
                  <div className="relative flex items-center">
                    <input 
                      type="text" 
                      required 
                      value={vrn}
                      onChange={(e) => {
                        const val = e.target.value;
                        setVrn(val);
                        const cleanVrn = val.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
                        if (cleanVrn.length >= 4) {
                          const latestVisit = [...jobCards]
                            .reverse()
                            .filter(j => j.status !== "Cancelled")
                            .find(j => j.vrn.trim().toUpperCase().replace(/[^A-Z0-9]/g, "") === cleanVrn);
                          if (latestVisit) {
                            setCustomerName(latestVisit.customer_name);
                            setCustomerMobile(latestVisit.customer_mobile);
                            if (latestVisit.vehicle_model) setVehicleModel(latestVisit.vehicle_model);
                            if (latestVisit.vehicle_make) setVehicleMake(latestVisit.vehicle_make);
                          }
                        }
                      }}
                      placeholder="e.g. MH-12-AB-1234"
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 pr-9 text-xs font-semibold uppercase focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
                    />
                    <label className="absolute right-2 cursor-pointer text-slate-400 hover:text-orange-500 transition-colors" title="Scan Numberplate Photo">
                      <Camera className="h-4.5 w-4.5" />
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => handleNumberplateUpload(e, false)} 
                        className="hidden" 
                      />
                    </label>
                  </div>
                  {isOcrReadingVrn && (
                    <div className="text-[9px] text-orange-500 font-semibold animate-pulse mt-0.5 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-ping"></span>
                      Scanning plate via OCR...
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Customer Name*</label>
                  <input 
                    type="text" 
                    required 
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Full Name"
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Customer Mobile*</label>
                  <input 
                    type="tel" 
                    required 
                    value={customerMobile}
                    onChange={(e) => setCustomerMobile(e.target.value)}
                    placeholder="+91..."
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Date In*</label>
                  <input 
                    type="date" 
                    required 
                    value={createDateIn}
                    onChange={(e) => setCreateDateIn(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Time-in*</label>
                  <input 
                    type="time" 
                    required 
                    value={createTimeIn}
                    onChange={(e) => setCreateTimeIn(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Expected Date Out*</label>
                  <input 
                    type="date" 
                    required 
                    value={createExpectedDateOut}
                    onChange={(e) => setCreateExpectedDateOut(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Expected Time of Completion*</label>
                  <input 
                    type="time" 
                    required 
                    value={createExpectedTimeOfCompletion}
                    onChange={(e) => setCreateExpectedTimeOfCompletion(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Make*</label>
                  <input 
                    type="text" 
                    readOnly
                    required 
                    value="Tata Motors"
                    className="w-full bg-slate-100 border border-slate-200 rounded p-2 text-xs font-semibold focus:outline-hidden cursor-not-allowed text-slate-500"
                  />
                </div>
                <div className="col-span-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Model*</label>
                  <input 
                    type="text" 
                    required 
                    value={vehicleModel}
                    onChange={(e) => setVehicleModel(e.target.value)}
                    placeholder="e.g. i20"
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
                  />
                </div>
                <div className="col-span-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Year</label>
                  <input 
                    type="number" 
                    value={vehicleYear}
                    onChange={(e) => setVehicleYear(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Odometer Reading (KM)</label>
                  <div className="relative flex items-center">
                    <input 
                      type="number" 
                      value={kmReading}
                      onChange={(e) => setKmReading(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="e.g. 12500"
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 pr-9 text-xs font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
                    />
                    <label className="absolute right-2 cursor-pointer text-slate-400 hover:text-orange-500 transition-colors" title="Scan Odometer Photo">
                      <Camera className="h-4.5 w-4.5" />
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => handleOdometerUpload(e, false)} 
                        className="hidden" 
                      />
                    </label>
                  </div>
                  {isOcrReadingOdo && (
                    <div className="text-[9px] text-orange-500 font-semibold animate-pulse mt-0.5 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-ping"></span>
                      Scanning dashboard via OCR...
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Service Type (SR)*</label>
                  <select 
                    value={srTypeId}
                    onChange={(e) => setSrTypeId(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
                  >
                    {srTypes.map(s => (
                      <option key={s.sr_type_id} value={s.sr_type_id}>{s.sr_type_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Priority*</label>
                  <select 
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
                  >
                    <option value="Normal">Normal Service</option>
                    <option value="Express">Express (Urgent)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Service Advisor (Created By)*</label>
                  <select 
                    required
                    value={createdBy}
                    onChange={(e) => setCreatedBy(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
                  >
                    {(() => {
                      const list = employees.filter(e => e.is_active && (
                        e.role.toLowerCase().includes("advisor") ||
                        e.role.toLowerCase() === "service_advisor" ||
                        e.role.toLowerCase().includes("service")
                      ));
                      const finalDropdownList = list.length > 0 ? list : employees.filter(e => e.is_active);
                      return finalDropdownList.map(e => (
                        <option key={e.employee_id} value={e.employee_id}>
                          {e.full_name} ({e.role})
                        </option>
                      ));
                    })()}
                  </select>
                </div>
              </div>
 
              <div>
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Assign Bay (Optional)</label>
                <select 
                  disabled={currentUserRole === "Service Advisor"}
                  value={bayId || ""}
                  onChange={(e) => setBayId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-hidden disabled:opacity-60 disabled:bg-slate-100"
                >
                  <option value="">No Bay Allocation (Queue)</option>
                  {bays.map(b => (
                    <option key={b.bay_id} value={b.bay_id}>{b.bay_name} ({b.status})</option>
                  ))}
                </select>
              </div>
 
              <div className="border-t border-slate-150 pt-3.5 mt-3.5 space-y-3.5">
                <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider block">Live Tracker Fields</span>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Bay No</label>
                    <input 
                      type="text"
                      disabled={currentUserRole === "Service Advisor"}
                      list="bays-datalist"
                      value={bayNo}
                      onChange={(e) => setBayNo(e.target.value)}
                      placeholder="e.g. Bay 3 or Parking"
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-hidden disabled:opacity-60 disabled:bg-slate-100"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">No. of Laborers</label>
                    <input 
                      type="number"
                      disabled={currentUserRole === "Service Advisor"}
                      value={noOfLaborers}
                      onChange={(e) => setNoOfLaborers(e.target.value)}
                      placeholder="e.g. 2"
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-hidden disabled:opacity-60 disabled:bg-slate-100"
                    />
                  </div>
                </div>
 
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Service Advisor Name</label>
                    <input 
                      type="text"
                      list="advisors-datalist"
                      value={serviceAdvisor}
                      onChange={(e) => setServiceAdvisor(e.target.value)}
                      placeholder="Advisor Name"
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Technician Name</label>
                    <input 
                      type="text"
                      disabled={currentUserRole === "Service Advisor"}
                      list="technicians-datalist"
                      value={technicianName}
                      onChange={(e) => setTechnicianName(e.target.value)}
                      placeholder="Technician Name"
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-hidden disabled:opacity-60 disabled:bg-slate-100"
                    />
                  </div>
                </div>
 
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Date Completed</label>
                    <input 
                      type="date"
                      disabled={currentUserRole === "Service Advisor"}
                      value={dateCompleted}
                      onChange={(e) => setDateCompleted(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-hidden disabled:opacity-60 disabled:bg-slate-100"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Time Out</label>
                    <input 
                      type="time"
                      disabled={currentUserRole === "Service Advisor"}
                      value={timeOut}
                      onChange={(e) => setTimeOut(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-hidden disabled:opacity-60 disabled:bg-slate-100"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Actual Time Taken</label>
                    <input 
                      type="text"
                      disabled={currentUserRole === "Service Advisor"}
                      value={actualTimeTaken}
                      onChange={(e) => setActualTimeTaken(e.target.value)}
                      placeholder="e.g. 4h 30m"
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-hidden disabled:opacity-60 disabled:bg-slate-100"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Pending Reason (Optional)</label>
                <input 
                  type="text" 
                  value={createPendingReason}
                  onChange={(e) => setCreatePendingReason(e.target.value)}
                  placeholder="e.g. Waiting for parts approval"
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Complaint / Job Description</label>
                <textarea 
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Engine oil change, dashboard noise check, brake inspection..."
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
                />
              </div>

              {/* Gemma-4 Real-time Interactive Form Copilot Widget */}
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">
                      ✨ Gemma-4 Form Copilot
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={isAiAnalyzing}
                    onClick={() => handleAiFormAnalysis("create", jobDescription, vehicleModel, kmReading, priority)}
                    className="text-[9px] bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black uppercase tracking-wider px-2.5 py-1 rounded transition-all cursor-pointer shadow-3xs"
                  >
                    {isAiAnalyzing ? "⏳ Analyzing..." : "⚡ Suggest & Calculate"}
                  </button>
                </div>

                <p className="text-[9px] text-slate-500 leading-normal font-semibold">
                  Type the customer's complaint above, then click to automatically predict the service type, select the optimal bay, allocate technicians, and calculate estimated repair prices.
                </p>

                {aiError && (
                  <div className="text-[9px] text-rose-600 font-bold bg-rose-50 border border-rose-100 p-2 rounded">
                    ⚠️ {aiError}
                  </div>
                )}

                {aiSuggestions && (
                  <div className="bg-white border border-emerald-500/10 rounded-md p-2.5 space-y-2 text-slate-700 text-xs shadow-3xs">
                    <div className="grid grid-cols-2 gap-2 text-[10px] font-bold border-b border-slate-100 pb-2">
                      <div>
                        <span className="text-slate-400 uppercase tracking-tight block">Recommended Bay</span>
                        <span className="text-emerald-700">
                          {bays.find(b => b.bay_id === aiSuggestions.bay_id)?.bay_name || "Queue/Parking"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 uppercase tracking-tight block">Service Type</span>
                        <span className="text-slate-800">
                          {srTypes.find(s => s.sr_type_id === aiSuggestions.service_type_id)?.sr_type_name || "General"}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] font-bold border-b border-slate-100 pb-2">
                      <div>
                        <span className="text-slate-400 uppercase tracking-tight block">Laborer Count</span>
                        <span className="text-slate-800">{aiSuggestions.no_of_laborers} Techs</span>
                      </div>
                      <div>
                        <span className="text-slate-400 uppercase tracking-tight block">Suggested Advisor/Tech</span>
                        <span className="text-slate-800">{aiSuggestions.technician_name}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] font-bold border-b border-slate-100 pb-2">
                      <div>
                        <span className="text-slate-400 uppercase tracking-tight block">Est. Labor Price</span>
                        <span className="text-slate-800">₹{aiSuggestions.labor_price}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 uppercase tracking-tight block">Est. Parts Price</span>
                        <span className="text-slate-800">₹{aiSuggestions.parts_price}</span>
                      </div>
                    </div>

                    <div className="text-[10px] bg-slate-50 border border-slate-100 p-2 rounded font-semibold leading-relaxed">
                      <span className="text-[8px] uppercase text-slate-400 block font-black tracking-wider mb-0.5">
                        🧠 Scenario & Diagnostic Analysis
                      </span>
                      {aiSuggestions.scenario_analysis}
                    </div>

                    <button
                      type="button"
                      onClick={() => applyAiSuggestions("create")}
                      className="w-full text-center bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] uppercase font-black tracking-wider py-1.5 rounded cursor-pointer transition-colors"
                    >
                      ✅ Apply AI Recommendations
                    </button>
                  </div>
                )}
              </div>

              {/* Voice Complaint Recorder & Polisher */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Mic className="h-4 w-4 text-orange-600 animate-pulse" />
                      Customer Voice & Complaints Polisher
                    </h4>
                    <p className="text-[9px] text-slate-500 font-medium">Record voice complaint or upload phone audio. Gemini will transcribe & polish!</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!isRecording ? (
                    <button
                      type="button"
                      onClick={startAudioRecording}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white text-[9.5px] font-bold uppercase tracking-wider py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Mic className="h-3.5 w-3.5" />
                      Record Customer Voice
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopAudioRecording}
                      className="flex-1 bg-slate-900 hover:bg-black text-white text-[9.5px] font-bold uppercase tracking-wider py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 animate-pulse transition-colors cursor-pointer"
                    >
                      <StopCircle className="h-3.5 w-3.5 text-red-500" />
                      Stop & Process Complaint
                    </button>
                  )}

                  <label className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[9.5px] font-bold uppercase tracking-wider py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-all">
                    <UploadCloud className="h-3.5 w-3.5" />
                    Upload Audio
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={handleAudioUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {isProcessingAudio && (
                  <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-100 rounded-lg text-amber-700 text-[9px] font-bold animate-pulse">
                    <div className="w-1.5 h-1.5 bg-amber-600 rounded-full animate-ping"></div>
                    Polishing complaint voice message via Gemini model...
                  </div>
                )}

                {audioError && (
                  <div className="p-2 bg-red-50 text-red-600 border border-red-100 rounded-lg text-[9px] font-bold">
                    ⚠️ Audio error: {audioError}
                  </div>
                )}

                {polishedAudioResult && (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-2.5 space-y-1">
                    <div className="flex items-center gap-1 text-[9px] text-emerald-800 font-extrabold uppercase tracking-wider">
                      <Volume2 className="h-3.5 w-3.5" />
                      Polished Diagnostic Description
                    </div>
                    <p className="text-[10px] text-slate-700 font-semibold italic bg-white p-2 border border-slate-100 rounded-md whitespace-pre-line leading-relaxed">
                      {polishedAudioResult}
                    </p>
                    <p className="text-[8px] text-emerald-600 font-bold">✓ Added and polished details successfully inserted into Special Notes/Remarks.</p>
                  </div>
                )}
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Remarks / Special Notes</label>
                <textarea 
                  value={createRemarks}
                  onChange={(e) => setCreateRemarks(e.target.value)}
                  placeholder="Any extra comments or observations..."
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 rounded text-xs uppercase tracking-wider shadow-sm transition-colors cursor-pointer"
              >
                Create Job Card
              </button>
            </form>
          </div>
        </div>
      )}

      {/* EDIT JOB CARD MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-slate-200 shadow-md max-w-lg w-full p-4 space-y-4 max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Wrench className="h-4.5 w-4.5 text-orange-600" />
                Edit Job Card details
              </h2>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">×</button>
            </div>

            <form onSubmit={handleSubmitEdit} className="space-y-3.5 max-h-[500px] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Job Card No.*</label>
                  <input 
                    type="text" 
                    required 
                    value={editJobCardNo}
                    onChange={(e) => setEditJobCardNo(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Registration No (VRN)*</label>
                  <div className="relative flex items-center">
                    <input 
                      type="text" 
                      required 
                      value={editVrn}
                      onChange={(e) => setEditVrn(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 pr-9 text-xs font-semibold uppercase focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
                    />
                    <label className="absolute right-2 cursor-pointer text-slate-400 hover:text-orange-500 transition-colors" title="Scan Numberplate Photo">
                      <Camera className="h-4.5 w-4.5" />
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => handleNumberplateUpload(e, true)} 
                        className="hidden" 
                      />
                    </label>
                  </div>
                  {isEditOcrReadingVrn && (
                    <div className="text-[9px] text-orange-500 font-semibold animate-pulse mt-0.5 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-ping"></span>
                      Scanning plate via OCR...
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Customer Name*</label>
                  <input 
                    type="text" 
                    required 
                    value={editCustomerName}
                    onChange={(e) => setEditCustomerName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Customer Mobile*</label>
                  <input 
                    type="tel" 
                    required 
                    value={editCustomerMobile}
                    onChange={(e) => setEditCustomerMobile(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Date In*</label>
                  <input 
                    type="date" 
                    required 
                    value={editDateIn}
                    onChange={(e) => setEditDateIn(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Time-In*</label>
                  <input 
                    type="time" 
                    required 
                    value={editTimeIn}
                    onChange={(e) => setEditTimeIn(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Expected Date Out*</label>
                  <input 
                    type="date" 
                    required 
                    value={editExpectedDateOut}
                    onChange={(e) => setEditExpectedDateOut(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Expected Time of Completion*</label>
                  <input 
                    type="time" 
                    required 
                    value={editExpectedTimeOfCompletion}
                    onChange={(e) => setEditExpectedTimeOfCompletion(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Make*</label>
                  <input 
                    type="text" 
                    readOnly
                    required 
                    value="Tata Motors"
                    className="w-full bg-slate-100 border border-slate-200 rounded p-2 text-xs font-semibold focus:outline-hidden cursor-not-allowed text-slate-500"
                  />
                </div>
                <div className="col-span-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Model*</label>
                  <input 
                    type="text" 
                    required 
                    value={editVehicleModel}
                    onChange={(e) => setEditVehicleModel(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
                  />
                </div>
                <div className="col-span-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Year</label>
                  <input 
                    type="number" 
                    value={editVehicleYear}
                    onChange={(e) => setEditVehicleYear(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Odometer Reading (KM)</label>
                  <div className="relative flex items-center">
                    <input 
                      type="number" 
                      value={editKmReading ?? ""}
                      onChange={(e) => setEditKmReading(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 pr-9 text-xs font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
                    />
                    <label className="absolute right-2 cursor-pointer text-slate-400 hover:text-orange-500 transition-colors" title="Scan Odometer Photo">
                      <Camera className="h-4.5 w-4.5" />
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => handleOdometerUpload(e, true)} 
                        className="hidden" 
                      />
                    </label>
                  </div>
                  {isEditOcrReadingOdo && (
                    <div className="text-[9px] text-orange-500 font-semibold animate-pulse mt-0.5 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-ping"></span>
                      Scanning dashboard via OCR...
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Service Type (SR)*</label>
                  <select 
                    value={editSrTypeId}
                    onChange={(e) => setEditSrTypeId(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
                  >
                    {srTypes.map(s => (
                      <option key={s.sr_type_id} value={s.sr_type_id}>{s.sr_type_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Priority*</label>
                  <select 
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
                  >
                    <option value="Normal">Normal Service</option>
                    <option value="Express">Express (Urgent)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Service Advisor*</label>
                  <select 
                    required
                    value={editCreatedBy}
                    onChange={(e) => setEditCreatedBy(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
                  >
                    {employees.filter(e => e.is_active).map(e => (
                      <option key={e.employee_id} value={e.employee_id}>
                        {e.full_name} ({e.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
                     <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Job Status*</label>
                  <select 
                    disabled={currentUserRole === "Service Advisor"}
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-hidden disabled:opacity-60 disabled:bg-slate-100"
                  >
                    <option value="Waiting">Waiting</option>
                    <option value="Active">Active</option>
                    <option value="Completed">Completed</option>
                    <option value="Invoiced">Invoiced</option>
                    <option value="Carry Forward">Carry Forward</option>
                    <option value="Rework">Rework</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Allocated Bay</label>
                  <select 
                    disabled={currentUserRole === "Service Advisor"}
                    value={editBayId || ""}
                    onChange={(e) => setEditBayId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-hidden disabled:opacity-60 disabled:bg-slate-100"
                  >
                    <option value="">No Bay Allocation (Queue)</option>
                    {bays.map(b => (
                      <option key={b.bay_id} value={b.bay_id}>{b.bay_name} ({b.status})</option>
                    ))}
                  </select>
                </div>
              </div>
 
              <div className="border-t border-slate-150 pt-3.5 mt-3.5 space-y-3.5">
                <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider block">Live Tracker Fields</span>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Bay No</label>
                    <input 
                      type="text"
                      disabled={currentUserRole === "Service Advisor"}
                      list="bays-datalist"
                      value={editBayNo}
                      onChange={(e) => setEditBayNo(e.target.value)}
                      placeholder="e.g. Bay 3 or Parking"
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-hidden disabled:opacity-60 disabled:bg-slate-100"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">No. of Laborers</label>
                    <input 
                      type="number"
                      disabled={currentUserRole === "Service Advisor"}
                      value={editNoOfLaborers}
                      onChange={(e) => setEditNoOfLaborers(e.target.value)}
                      placeholder="e.g. 2"
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-hidden disabled:opacity-60 disabled:bg-slate-100"
                    />
                  </div>
                </div>
 
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Service Advisor Name</label>
                    <input 
                      type="text"
                      list="advisors-datalist"
                      value={editServiceAdvisor}
                      onChange={(e) => setEditServiceAdvisor(e.target.value)}
                      placeholder="Advisor Name"
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Technician Name</label>
                    <input 
                      type="text"
                      disabled={currentUserRole === "Service Advisor"}
                      list="technicians-datalist"
                      value={editTechnicianName}
                      onChange={(e) => setEditTechnicianName(e.target.value)}
                      placeholder="Technician Name"
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-hidden disabled:opacity-60 disabled:bg-slate-100"
                    />
                  </div>
                </div>
 
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Date Completed</label>
                    <input 
                      type="date"
                      disabled={currentUserRole === "Service Advisor"}
                      value={editDateCompleted}
                      onChange={(e) => setEditDateCompleted(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-hidden disabled:opacity-60 disabled:bg-slate-100"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Time Out</label>
                    <input 
                      type="time"
                      disabled={currentUserRole === "Service Advisor"}
                      value={editTimeOut}
                      onChange={(e) => setEditTimeOut(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-hidden disabled:opacity-60 disabled:bg-slate-100"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Actual Time Taken</label>
                    <input 
                      type="text"
                      disabled={currentUserRole === "Service Advisor"}
                      value={editActualTimeTaken}
                      onChange={(e) => setEditActualTimeTaken(e.target.value)}
                      placeholder="e.g. 4h 30m"
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-hidden disabled:opacity-60 disabled:bg-slate-100"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Pending Reason</label>
                <input 
                  type="text" 
                  value={editPendingReason}
                  onChange={(e) => setEditPendingReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Complaint / Job Instructions</label>
                <textarea 
                  value={editJobDescription}
                  onChange={(e) => setEditJobDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Remarks / Delay Notes</label>
                <textarea 
                  value={editRemarks}
                  onChange={(e) => setEditRemarks(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 rounded text-xs uppercase tracking-wider shadow-sm transition-colors cursor-pointer"
              >
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Datalists for Auto-complete */}
      <datalist id="bays-datalist">
        {bays.map(b => (
          <option key={b.bay_id} value={b.bay_name} />
        ))}
      </datalist>
      <datalist id="advisors-datalist">
        {(() => {
          const list = employees.filter(e => e.is_active && (
            e.role.toLowerCase().includes("advisor") ||
            e.role.toLowerCase() === "service_advisor" ||
            e.role.toLowerCase().includes("service")
          ));
          const finalAdvisorList = list.length > 0 ? list : employees;
          return finalAdvisorList.map(e => (
            <option key={e.employee_id} value={e.full_name} />
          ));
        })()}
      </datalist>
      <datalist id="technicians-datalist">
        {employees.filter(e => ["Technician", "Electrician", "Add Tech", "Mechanic"].some(r => e.role.includes(r))).map(e => (
          <option key={e.employee_id} value={e.full_name} />
        ))}
      </datalist>

      {/* PHOTO PREVIEW OVERLAY MODAL */}
      {previewPhotoUrl && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-lg w-full p-4 space-y-4 relative overflow-y-auto max-h-[90dvh]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Camera className="h-4.5 w-4.5 text-orange-600" />
                {previewPhotoTitle}
              </h2>
              <button onClick={() => setPreviewPhotoUrl(null)} className="text-slate-400 hover:text-slate-600 font-bold text-lg leading-none">×</button>
            </div>
            <div className="flex items-center justify-center bg-slate-50 border border-slate-100 rounded-xl overflow-hidden min-h-[300px]">
              <img src={previewPhotoUrl} alt={previewPhotoTitle} className="max-w-full max-h-[450px] object-contain rounded" />
            </div>
            <div className="flex justify-end pt-1">
              <button 
                onClick={() => setPreviewPhotoUrl(null)}
                className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-1.5 px-4 rounded text-[10px] uppercase tracking-wider transition-colors cursor-pointer"
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
