import React, { useState, useMemo } from "react";
import { UploadCloud, CheckCircle, AlertTriangle, HelpCircle, RefreshCw, ClipboardList, Download } from "lucide-react";
import { DMSImportBatch, DMSImportRow, JobCard } from "../types";
import DmsImporterConsolidated from "./dms-import";
import FunnySpinner from "./FunnySpinner";
import { Database } from "lucide-react";

interface DmsImporterProps {
  isAdmin?: boolean;
  userRole?: string;
  jobCards: JobCard[];
  onImportRows: (fileName: string, rows: any[]) => void;
  onResolveRow: (rowId: number, status: DMSImportRow["match_status"], matchedJobId: number) => void;
}


const SAMPLE_LOGS: any[] = [];

export default function DmsImporter({
  jobCards,
  onImportRows,
  onResolveRow,
  isAdmin,
  userRole
}: DmsImporterProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const [resolvingRow, setResolvingRow] = useState<DMSImportRow | null>(null);
  const [targetJobId, setTargetJobId] = useState<number | "">("");
  const [pastedData, setPastedData] = useState("");
  const [showPasteArea, setShowPasteArea] = useState(false);
  const [activeMode, setActiveMode] = useState<"reconcile" | "backdated" | "master-data" | "other-imports">("backdated");
  const [backdatedText, setBackdatedText] = useState("");
  const [isUploadingBackdated, setIsUploadingBackdated] = useState(false);
  const [backdatedResult, setBackdatedResult] = useState<{
    success: boolean;
    importedCount: number;
    revenueCreated: number;
    splitsCreated: number;
  } | null>(null);
  
  // Custom CSV states for April 2025 - June 2026 Historical uploader
  const [backdatedParsedRows, setBackdatedParsedRows] = useState<any[]>([]);
  const [backdatedFileName, setBackdatedFileName] = useState("");
  const [backdatedDragActive, setBackdatedDragActive] = useState(false);

  // Searching, filtering, and sorting state for compiled master data table
  const [rowSearch, setRowSearch] = useState("");
  const [rowStatusFilter, setRowStatusFilter] = useState("All");
  const [rowSortField, setRowSortField] = useState<string | null>(null);
  const [rowSortDirection, setRowSortDirection] = useState<"asc" | "desc">("asc");
  
  // Master Data state
  const [masterVehicles, setMasterVehicles] = useState<any[]>([]);
  const [loadingMasterVehicles, setLoadingMasterVehicles] = useState(false);
  const [masterSearch, setMasterSearch] = useState("");
  const [masterSortField, setMasterSortField] = useState<string | null>(null);
  const [masterSortDirection, setMasterSortDirection] = useState<"asc" | "desc">("asc");

  const processedMasterVehicles = useMemo(() => {
    let result = [...masterVehicles];

    // Filter by search
    if (masterSearch.trim()) {
      const q = masterSearch.toLowerCase().trim();
      result = result.filter(v => 
        (v.vrn || "").toLowerCase().includes(q) ||
        (v.customer_name || "").toLowerCase().includes(q) ||
        (v.customer_mobile || "").toLowerCase().includes(q) ||
        (v.job_card_no || "").toLowerCase().includes(q) ||
        (v.status || "").toLowerCase().includes(q) ||
        (v.job_date || "").toLowerCase().includes(q)
      );
    }

    // Sort by field
    if (masterSortField) {
      result.sort((a, b) => {
        let valA = a[masterSortField] || "";
        let valB = b[masterSortField] || "";
        
        if (typeof valA === "string") valA = valA.toLowerCase();
        if (typeof valB === "string") valB = valB.toLowerCase();

        if (valA < valB) return masterSortDirection === "asc" ? -1 : 1;
        if (valA > valB) return masterSortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [masterVehicles, masterSearch, masterSortField, masterSortDirection]);

  React.useEffect(() => {
    if (activeMode === "master-data") {
      setLoadingMasterVehicles(true);
      fetch("/api/master/vehicles")
        .then(res => res.json())
        .then(data => {
          setMasterVehicles(Array.isArray(data) ? data : []);
          setLoadingMasterVehicles(false);
        })
        .catch(err => {
          console.error("Failed to load master vehicles:", err);
          setMasterVehicles([]);
          setLoadingMasterVehicles(false);
        });
    }
  }, [activeMode]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      readAndParseFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      readAndParseFile(e.target.files[0]);
    }
  };

  const readAndParseFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseDMSContent(text, file.name);
    };
    reader.readAsText(file);
  };

  const parseDMSContent = (text: string, fileName: string) => {
    try {
      // Clean up null bytes from UTF-16 representation
      const cleanText = text.replace(/\0/g, "").trim();
      if (!cleanText) {
        alert("The file or pasted content appears to be empty.");
        return;
      }

      const rawLines = cleanText.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
      if (rawLines.length === 0) {
        alert("No lines found in the content.");
        return;
      }

      // Check if tab-delimited or comma-delimited
      const firstLine = rawLines[0];
      const isTab = firstLine.includes("\t");
      const delimiter = isTab ? "\t" : ",";

      const parseCSVLine = (line: string) => {
        if (isTab) {
          return line.split("\t").map(cell => {
            let val = cell.trim();
            if (val.startsWith('"') && val.endsWith('"')) {
              val = val.substring(1, val.length - 1).trim();
            }
            return val;
          });
        } else {
          const result: string[] = [];
          let current = "";
          let insideQuotes = false;
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              insideQuotes = !insideQuotes;
            } else if (char === ',' && !insideQuotes) {
              result.push(current.trim());
              current = "";
            } else {
              current += char;
            }
          }
          result.push(current.trim());
          return result.map(val => {
            if (val.startsWith('"') && val.endsWith('"')) {
              val = val.substring(1, val.length - 1).trim();
            }
            return val;
          });
        }
      };

      const headers = parseCSVLine(firstLine).map(h => h.toLowerCase().replace(/["']/g, "").trim());
      
      // Look up column indexes based on keywords
      const colIndices = {
        sr_type: headers.findIndex(h => h.includes("sr type") || h.includes("service type") || h === "sr_type" || h === "type"),
        vrn: headers.findIndex(h => h === "vrn" || h.includes("vehicle") || h.includes("registration") || h.includes("number")),
        job_date: headers.findIndex(h => h.includes("date") || h === "job_date" || h === "invoice date"),
        labour: headers.findIndex(h => h.includes("labour") || h.includes("labor") || h === "labour_amount" || h.includes("labor amount")),
        parts: headers.findIndex(h => h.includes("spares") || h.includes("parts") || h === "parts_amount" || h.includes("parts amount") || h.includes("spares amount"))
      };

      // Fallbacks if mapping is not fully matching
      if (colIndices.sr_type === -1) colIndices.sr_type = 0;
      if (colIndices.vrn === -1) colIndices.vrn = headers.findIndex(h => h.includes("vrn") || h.includes("vehicle") || h.includes("registration") || h.includes("number"));
      if (colIndices.job_date === -1) colIndices.job_date = headers.findIndex(h => h.includes("date"));
      if (colIndices.labour === -1) colIndices.labour = headers.findIndex(h => h.includes("labour") || h.includes("labor"));
      if (colIndices.parts === -1) colIndices.parts = headers.findIndex(h => h.includes("spares") || h.includes("parts"));

      const rowsParsed: any[] = [];

      for (let i = 1; i < rawLines.length; i++) {
        const cells = parseCSVLine(rawLines[i]);
        if (cells.length < 2) continue;

        const sr_type_val = colIndices.sr_type !== -1 && colIndices.sr_type < cells.length ? cells[colIndices.sr_type] : "General";
        const vrn_val = colIndices.vrn !== -1 && colIndices.vrn < cells.length ? cells[colIndices.vrn] : "Unknown";
        const raw_date = colIndices.job_date !== -1 && colIndices.job_date < cells.length ? cells[colIndices.job_date] : "";
        const raw_labour = colIndices.labour !== -1 && colIndices.labour < cells.length ? cells[colIndices.labour] : "0";
        const raw_parts = colIndices.parts !== -1 && colIndices.parts < cells.length ? cells[colIndices.parts] : "0";

        const parseAmount = (valStr: string) => {
          let cleanStr = valStr.trim();
          const firstDigitIndex = cleanStr.search(/\d/);
          if (firstDigitIndex !== -1) {
            cleanStr = cleanStr.substring(firstDigitIndex);
          }
          const clean = cleanStr.replace(/[^0-9.]/g, "");
          return Math.round(parseFloat(clean) || 0);
        };

        const labour_val = parseAmount(raw_labour);
        const parts_val = parseAmount(raw_parts);

        // Convert DD/MM/YYYY to YYYY-MM-DD
        let formattedDate = raw_date;
        if (raw_date.includes("/")) {
          const parts = raw_date.split("/");
          if (parts.length === 3) {
            const day = parts[0].padStart(2, "0");
            const month = parts[1].padStart(2, "0");
            const year = parts[2];
            formattedDate = `${year}-${month}-${day}`;
          }
        }

        rowsParsed.push({
          vrn: vrn_val || "Unknown",
          job_date: formattedDate || new Date().toISOString().split("T")[0],
          sr_type: sr_type_val || "General",
          labour_amount: labour_val,
          parts_amount: parts_val
        });
      }

      if (rowsParsed.length > 0) {
        onImportRows(fileName, rowsParsed);
        setPastedData("");
        setShowPasteArea(false);
      } else {
        alert("Could not extract any rows with valid data. Please ensure header matching is correct.");
      }
    } catch (err: any) {
      console.error(err);
      alert("Error parsing file: " + err.message);
    }
  };

  const handlePasteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastedData.trim()) {
      alert("Please paste some text first.");
      return;
    }
    parseDMSContent(pastedData, `Pasted_Report_${new Date().toLocaleDateString().replace(/\//g, "-")}.tsv`);
  };

  const triggerSampleImport = (log: typeof SAMPLE_LOGS[0]) => {
    onImportRows(log.name, log.rows);
    alert(`Successfully loaded ${log.rows.length} rows from ${log.name}!`);
  };

  const downloadTemplate = () => {
    const headers = [
      "SR Type",
      "SR Assigned To",
      "Invoice #",
      "Order #",
      "SR #",
      "Invoice Date",
      "VRN",
      "IRN Date",
      "Invoice Type",
      "Account",
      "Bill To First Name",
      "Final Labour Invoice Amount",
      "Final Spares Invoice Amount",
      "Final Consolidated Invoice Amount",
      "Invoice Status",
      "IRN Status",
      "Cancellation Reason"
    ];
    const sampleRow = [
      '"Paid Service"',
      '"CSP_100B210"',
      '"IDEVAN2627001836"',
      '"JC-DWIP-AA1-2627-001179"',
      '"SR-DWIP/AA1-2627-001201"',
      '"25/06/2026"',
      '"KA13AA1596"',
      '""',
      '"Consolidated"',
      '"HEMANTHA A"',
      '"HEMANTHA A"',
      '"Rs.1,180.00"',
      '"Rs.4,563.15"',
      '"Rs.5,743.15"',
      '"New"',
      '""',
      '""'
    ];
    const csvContent = headers.join(",") + "\n" + sampleRow.join(",");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "dms_crm_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- TEMPLATE IMPORT WIZARD STATES ---
  const [selectedTemplate, setSelectedTemplate] = useState<"vehicle_master" | "service_history" | "invoices">("vehicle_master");
  const [importerStep, setImporterStep] = useState(1);
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
  const [aiHeaderMapping, setAiHeaderMapping] = useState<any>({});
  const [csvRows, setCsvRows] = useState<any[]>([]);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [importReport, setImportReport] = useState<any | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [matchingHeadersLoading, setMatchingHeadersLoading] = useState(false);
  const [detectedFileName, setDetectedFileName] = useState("");

  const handleTemplateDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleTemplateDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUploaded(e.dataTransfer.files[0]);
    }
  };

  const handleTemplateFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUploaded(e.target.files[0]);
    }
  };

  const handleFileUploaded = async (file: File) => {
    setDetectedFileName(file.name);
    setMatchingHeadersLoading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const parsed = parseCSVContent(text);
      if (!parsed) {
        alert("The uploaded file is empty or invalid.");
        setMatchingHeadersLoading(false);
        return;
      }
      
      setParsedHeaders(parsed.headers);
      setCsvRows(parsed.rows);
      setPreviewRows(parsed.rows.slice(0, 5));

      // Call AI mapping
      try {
        const res = await fetch("/api/import/ai-match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            headers: parsed.headers,
            templateType: selectedTemplate
          })
        });
        const matchData = await res.json();
        if (res.ok) {
          setAiHeaderMapping(matchData.mapping || {});
          setImporterStep(3);
        } else {
          alert(matchData.error || "Failed to fetch header mapping from AI matching service.");
        }
      } catch (err) {
        console.error(err);
        alert("Network error occurred during AI header matching.");
      } finally {
        setMatchingHeadersLoading(false);
      }
    };
    reader.readAsText(file);
  };

  const parseCSVContent = (text: string) => {
    const cleanText = text.replace(/\0/g, "").trim();
    if (!cleanText) return null;
    const rawLines = cleanText.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    if (rawLines.length === 0) return null;

    const firstLine = rawLines[0];
    const isTab = firstLine.includes("\t");

    const parseCSVLine = (line: string) => {
      if (isTab) {
        return line.split("\t").map(cell => {
          let val = cell.trim();
          if (val.startsWith('"') && val.endsWith('"')) {
            val = val.substring(1, val.length - 1).trim();
          }
          return val;
        });
      } else {
        const result = [];
        let current = "";
        let insideQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            insideQuotes = !insideQuotes;
          } else if (char === ',' && !insideQuotes) {
            result.push(current.trim());
            current = "";
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result.map(val => {
          if (val.startsWith('"') && val.endsWith('"')) {
            val = val.substring(1, val.length - 1).trim();
          }
          return val;
        });
      }
    };

    const headers = parseCSVLine(firstLine).map(h => h.trim());
    const rows = [];
    for (let i = 1; i < rawLines.length; i++) {
      const cells = parseCSVLine(rawLines[i]);
      if (cells.length > 0) {
        const rowObj = {};
        headers.forEach((h, idx) => {
          rowObj[h] = cells[idx] || "";
        });
        rows.push(rowObj);
      }
    }
    return { headers, rows };
  };

  const runImportProcess = async () => {
    setImportLoading(true);
    setImportReport(null);

    // Transform rows based on the mapping
    const transformedRows = csvRows.map(row => {
      const transformed = {};
      Object.keys(row).forEach(csvHeader => {
        const dbCol = aiHeaderMapping[csvHeader];
        if (dbCol) {
          let val = row[csvHeader];
          // Handle amount formatting (remove currency prefix like Rs. and clean non-numeric)
          if (
            dbCol === "final_labour_amount" ||
            dbCol === "final_spares_amount" ||
            dbCol === "final_consolidated_amt"
          ) {
            if (val && typeof val === "string") {
              const clean = val.replace(/[^0-9.]/g, "");
              val = parseFloat(clean) || 0;
            }
          }
          // Handle odometer reading numeric sanitization
          if (dbCol === "odometer_reading") {
            if (val && typeof val === "string") {
              const clean = val.replace(/[^0-9]/g, "");
              val = parseInt(clean, 10) || 0;
            }
          }
          transformed[dbCol] = val;
        }
      });
      return transformed;
    });

    // Determine target endpoint
    let endpoint = "/api/import/vehicle-master";
    if (selectedTemplate === "service_history") endpoint = "/api/import/service-history";
    else if (selectedTemplate === "invoices") endpoint = "/api/import/invoices";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: transformedRows })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setImportReport(data);
        setImporterStep(4);
      } else {
        alert(data.error || "Import failed. Please verify headers mapping & date formats.");
      }
    } catch (e) {
      console.error(e);
      alert("Network error: failed to complete import transaction.");
    } finally {
      setImportLoading(false);
    }
  };

  const resetWizard = () => {
    setImporterStep(1);
    setCsvRows([]);
    setPreviewRows([]);
    setParsedHeaders([]);
    setAiHeaderMapping({});
    setImportReport(null);
    setDetectedFileName("");
  };

  const renderBackdatedUploader = () => {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6 shadow-sm animate-fade-in">
        
        {/* Step Indicator Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              📋 DMS Step-by-Step Data Importer (Templates & AI Matcher)
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Upload historical CSV files to populate Vehicle Master, Service History, or Invoice tables in GCP Cloud SQL.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
            <span>STEP {importerStep} OF 4</span>
          </div>
        </div>

        {/* STEP 1: SELECT TEMPLATE TYPE */}
        {importerStep === 1 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              1. Choose Import Template Target
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div 
                onClick={() => setSelectedTemplate("vehicle_master")}
                className={`p-5 rounded-xl border-2 cursor-pointer transition-all space-y-2.5 ${
                  selectedTemplate === "vehicle_master" 
                    ? "border-orange-500 bg-orange-500/5 shadow-sm" 
                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                }`}
              >
                <div className="h-9 w-9 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xs uppercase">VM</div>
                <h4 className="font-extrabold text-xs text-slate-800 uppercase">Vehicle Master</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                  Import core vehicle details (Chassis #, Registration #, Engine #, Product VC#, Owner Account, Sale Date, Selling Dealer).
                </p>
              </div>

              <div 
                onClick={() => setSelectedTemplate("service_history")}
                className={`p-5 rounded-xl border-2 cursor-pointer transition-all space-y-2.5 ${
                  selectedTemplate === "service_history" 
                    ? "border-orange-500 bg-orange-500/5 shadow-sm" 
                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                }`}
              >
                <div className="h-9 w-9 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs uppercase">SH</div>
                <h4 className="font-extrabold text-xs text-slate-800 uppercase">Service History</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                  Import historical service record entries (SH #, Chassis #, Odometer, SR Type, Summary, Open Date, Revisit Logs).
                </p>
              </div>

              <div 
                onClick={() => setSelectedTemplate("invoices")}
                className={`p-5 rounded-xl border-2 cursor-pointer transition-all space-y-2.5 ${
                  selectedTemplate === "invoices" 
                    ? "border-orange-500 bg-orange-500/5 shadow-sm" 
                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                }`}
              >
                <div className="h-9 w-9 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs uppercase">IN</div>
                <h4 className="font-extrabold text-xs text-slate-800 uppercase">Invoices Ledger</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                  Import spares and labor invoices (Invoice #, Order #, Spares Amount, Labor Amount, Advisor ID, Invoice Status).
                </p>
              </div>
            </div>
            
            <div className="flex justify-end pt-3">
              <button
                onClick={() => setImporterStep(2)}
                className="bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs py-2.5 px-6 rounded-lg shadow-sm uppercase tracking-wider transition-colors cursor-pointer"
              >
                Next: Upload CSV File
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: UPLOAD CSV FILE */}
        {importerStep === 2 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                2. Upload File for <span className="text-orange-600 font-extrabold">{selectedTemplate === 'vehicle_master' ? 'Vehicle Master' : selectedTemplate === 'service_history' ? 'Service History' : 'Invoices'}</span>
              </h3>
              <button onClick={() => setImporterStep(1)} className="text-xs font-bold text-slate-400 hover:text-slate-600 underline">
                Change Target Template
              </button>
            </div>

            <div 
              onDragEnter={handleTemplateDrag}
              onDragOver={handleTemplateDrag}
              onDragLeave={handleTemplateDrag}
              onDrop={handleTemplateDrop}
              className="border border-dashed rounded-xl p-10 text-center transition-all flex flex-col items-center justify-center space-y-4 bg-slate-50/50 hover:bg-slate-50 relative overflow-hidden cursor-pointer"
            >
              <input
                type="file"
                accept=".csv"
                onChange={handleTemplateFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="h-10 w-10 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shadow-3xs">
                <UploadCloud className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Drag & Drop CSV File or Click to Browse</h4>
                <p className="text-[10px] text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
                  The system will automatically parse headers, call Gemini AI to match matching columns, and run database sanity checks.
                </p>
              </div>
            </div>

            {matchingHeadersLoading && (
              <div className="p-4 bg-indigo-50 border border-indigo-150 rounded-xl flex items-center justify-center gap-2 text-indigo-700 text-xs font-bold animate-pulse">
                <FunnySpinner className="h-4 w-4" />
                <span>Consulting Gemini AI to auto-match CSV headers and clean values...</span>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: MAPPED COLUMNS PREVIEW */}
        {importerStep === 3 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="space-y-0.5">
                <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                  3. Verify Header Mapping & Data Preview
                </h3>
                <p className="text-[11px] text-slate-400">
                  Verify the AI-matched columns from <span className="font-bold text-slate-600">{detectedFileName}</span>.
                </p>
              </div>
              <button onClick={resetWizard} className="text-xs font-bold text-slate-400 hover:text-slate-600 underline">
                Reset Uploader
              </button>
            </div>

            {/* AI Columns Mapped Grid */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">
                🧠 Gemini AI Header Match Matrix
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {Object.keys(aiHeaderMapping).map((csvHeader) => (
                  <div key={csvHeader} className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-slate-150 shadow-3xs">
                    <span className="font-mono text-slate-500 font-bold">{csvHeader}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">MAPPED TO:</span>
                      <span className={`px-2 py-0.5 rounded font-black font-mono text-[10px] uppercase border ${
                        aiHeaderMapping[csvHeader] 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {aiHeaderMapping[csvHeader] || "IGNORE / SKIP"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Preview table (5 rows) */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Preview Mapped Records (Top 5 Rows)
              </span>
              <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-3xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                      {parsedHeaders.map(h => (
                        <th key={h} className="p-2.5 font-bold uppercase tracking-wider border-r border-slate-200">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {previewRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        {parsedHeaders.map(h => (
                          <td key={h} className="p-2.5 border-r border-slate-100 truncate max-w-[150px] font-mono text-[10px]">{row[h] || "—"}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Total Rows Loaded: {csvRows.length}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setImporterStep(2)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs py-2 px-4 rounded shadow-3xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Back
                </button>
                <button
                  onClick={runImportProcess}
                  disabled={importLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-800 text-white font-extrabold text-xs py-2.5 px-6 rounded shadow-sm uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {importLoading ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Writing Transaction to MySQL...</span>
                    </>
                  ) : (
                    "Confirm & Import Data"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: IMPORT REPORT CARD */}
        {importerStep === 4 && importReport && (
          <div className="space-y-4 text-center p-6 animate-in fade-in duration-300">
            <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle className="h-6 w-6" />
            </div>
            
            <div className="space-y-1">
              <h3 className="font-extrabold text-slate-855 uppercase text-sm tracking-wider">
                Database Bulk Import Transaction Successful!
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto font-medium">
                The parsed dataset has been committed successfully to the Google Cloud SQL instance tables.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 max-w-md mx-auto grid grid-cols-3 gap-2.5 text-center text-xs">
              <div>
                <span className="text-slate-400 font-bold block uppercase text-[10px]">Records Added</span>
                <span className="font-black text-slate-800 text-base font-mono mt-1 block">{importReport.created}</span>
              </div>
              <div className="border-l border-r border-slate-200">
                <span className="text-slate-400 font-bold block uppercase text-[10px]">Updated / Merged</span>
                <span className="font-black text-slate-800 text-base font-mono mt-1 block">{importReport.updated}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block uppercase text-[10px]">Total Processed</span>
                <span className="font-black text-indigo-600 text-base font-mono mt-1 block">{importReport.total}</span>
              </div>
            </div>

            <div className="pt-4 flex justify-center gap-2">
              <button
                onClick={resetWizard}
                className="bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs py-2.5 px-6 rounded-lg shadow-sm uppercase tracking-wider transition-colors cursor-pointer"
              >
                Import Another File
              </button>
            </div>
          </div>
        )}

      </div>
    );
  };

  const renderMasterData = () => {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6 shadow-sm animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-indigo-800 uppercase tracking-wider flex items-center gap-2">
              <Database className="h-4 w-4" />
              Master Vehicle Data (Compiled)
            </h2>
            <p className="text-[11px] text-slate-500 font-medium">
              This data is continuously compiled and merged from historical uploads to preserve the most available data without duplicates.
            </p>
          </div>
          <button 
            onClick={() => {
              const safeVehicles = Array.isArray(masterVehicles) ? masterVehicles : [];
              const csv = [
                "VRN,Customer,Mobile,Latest Job Date,Latest Job Card,Labour,Parts",
                ...safeVehicles.map(v => `${v.vrn},${v.customer_name},${v.customer_mobile},${v.job_date},${v.job_card_no},${v.labour_amount},${v.parts_amount}`)
              ].join("\n");
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = "Master_Vehicle_Data.csv";
              a.click();
            }}
            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors cursor-pointer border border-indigo-200"
          >
            <Download className="h-3.5 w-3.5" />
            Download Compiled CSV
          </button>
        </div>

        {loadingMasterVehicles ? (
          <div className="py-12 text-center text-slate-500 font-medium text-xs flex flex-col items-center">
            <RefreshCw className="h-6 w-6 animate-spin text-indigo-400 mb-2" />
            Compiling Master Data...
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative">
              <input
                type="text"
                value={masterSearch}
                onChange={(e) => setMasterSearch(e.target.value)}
                placeholder="Search master data (VRN, Customer, Mobile, Job Card, Date)..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none font-semibold text-slate-700"
              />
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase text-slate-500">
                  <tr>
                    <th 
                      onClick={() => {
                        setMasterSortField("vrn");
                        setMasterSortDirection(prev => prev === "asc" ? "desc" : "asc");
                      }}
                      className="py-2.5 px-3 cursor-pointer hover:text-slate-700 select-none"
                    >
                      Vehicle (VRN) {masterSortField === "vrn" ? (masterSortDirection === "asc" ? "▲" : "▼") : ""}
                    </th>
                    <th 
                      onClick={() => {
                        setMasterSortField("customer_name");
                        setMasterSortDirection(prev => prev === "asc" ? "desc" : "asc");
                      }}
                      className="py-2.5 px-3 cursor-pointer hover:text-slate-700 select-none"
                    >
                      Customer {masterSortField === "customer_name" ? (masterSortDirection === "asc" ? "▲" : "▼") : ""}
                    </th>
                    <th 
                      onClick={() => {
                        setMasterSortField("customer_mobile");
                        setMasterSortDirection(prev => prev === "asc" ? "desc" : "asc");
                      }}
                      className="py-2.5 px-3 cursor-pointer hover:text-slate-700 select-none"
                    >
                      Mobile {masterSortField === "customer_mobile" ? (masterSortDirection === "asc" ? "▲" : "▼") : ""}
                    </th>
                    <th 
                      onClick={() => {
                        setMasterSortField("job_date");
                        setMasterSortDirection(prev => prev === "asc" ? "desc" : "asc");
                      }}
                      className="py-2.5 px-3 cursor-pointer hover:text-slate-700 select-none"
                    >
                      Latest Service Date {masterSortField === "job_date" ? (masterSortDirection === "asc" ? "▲" : "▼") : ""}
                    </th>
                    <th 
                      onClick={() => {
                        setMasterSortField("job_card_no");
                        setMasterSortDirection(prev => prev === "asc" ? "desc" : "asc");
                      }}
                      className="py-2.5 px-3 cursor-pointer hover:text-slate-700 select-none"
                    >
                      Job Card {masterSortField === "job_card_no" ? (masterSortDirection === "asc" ? "▲" : "▼") : ""}
                    </th>
                    <th 
                      onClick={() => {
                        setMasterSortField("status");
                        setMasterSortDirection(prev => prev === "asc" ? "desc" : "asc");
                      }}
                      className="py-2.5 px-3 cursor-pointer hover:text-slate-700 select-none"
                    >
                      Status {masterSortField === "status" ? (masterSortDirection === "asc" ? "▲" : "▼") : ""}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {(!Array.isArray(processedMasterVehicles) || processedMasterVehicles.length === 0) ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 italic">No master data found.</td>
                    </tr>
                  ) : (
                    processedMasterVehicles.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-3 font-bold text-slate-900">{row.vrn}</td>
                        <td className="p-3">{row.customer_name || 'N/A'}</td>
                        <td className="p-3">{row.customer_mobile || 'N/A'}</td>
                        <td className="p-3 font-mono text-indigo-600">{row.job_date || 'N/A'}</td>
                        <td className="p-3 font-mono text-slate-400 font-bold">{row.job_card_no}</td>
                        <td className="p-3 text-emerald-600">{row.status}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header & Quick Simulator Instructions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900 uppercase">Dealer Management System (DMS) Import</h1>
          <p className="text-xs text-slate-500 font-medium">
            Reconcile billing records, detect VRN/SR code mismatches, and automate split revenue.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={downloadTemplate}
            className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-bold text-[11px] px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Download className="h-4 w-4" />
            Download CRM Template
          </button>
        </div>
      </div>

      {/* Mode Segmented Tab Selector */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveMode("backdated")}
          className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeMode === "backdated"
              ? "border-orange-500 text-orange-600 font-extrabold"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
          }`}
        >
          📂 Historical / Backdated
        </button>
        <button
          onClick={() => setActiveMode("other-imports")}
          className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeMode === "other-imports"
              ? "border-orange-500 text-orange-600 font-extrabold"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
          }`}
        >
          📦 Other Imports
        </button>
        {(isAdmin || userRole === 'developer') && (
          <button
            onClick={() => setActiveMode("master-data")}
            className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeMode === "master-data"
                ? "border-indigo-500 text-indigo-600 font-extrabold"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            }`}
          >
            🛡️ Master Data (Admin)
          </button>
        )}
      </div>

      {activeMode === "backdated" ? (
        renderBackdatedUploader()
      ) : activeMode === "master-data" ? (
        renderMasterData()
      ) : (
        <DmsImporterConsolidated />
      )}
    </div>
  );
}
