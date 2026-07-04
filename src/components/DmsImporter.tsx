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

  // Filter and Sort rows for the selected batch
  const handleUploadBackdated = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!backdatedText.trim()) {
      alert("Please paste backdated job cards first.");
      return;
    }
    parseBackdatedCSVContent(backdatedText, "Pasted Text Data");
  };

  const handleBackdatedDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setBackdatedDragActive(true);
    } else if (e.type === "dragleave") {
      setBackdatedDragActive(false);
    }
  };

  const handleBackdatedDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setBackdatedDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      readAndParseBackdatedFile(file);
    }
  };

  const handleBackdatedFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      readAndParseBackdatedFile(e.target.files[0]);
    }
  };

  const readAndParseBackdatedFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseBackdatedCSVContent(text, file.name);
    };
    reader.readAsText(file);
  };

  const parseBackdatedCSVContent = (text: string, fileName: string) => {
    try {
      const cleanText = text.replace(/\0/g, "").trim();
      if (!cleanText) {
        alert("The CSV file is empty.");
        return;
      }

      const rawLines = cleanText.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
      if (rawLines.length === 0) {
        alert("No lines found in the CSV.");
        return;
      }

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

      const rawHeaders = parseCSVLine(firstLine);
      const headersLower = rawHeaders.map(h => h.toLowerCase().trim());

      const findColIndex = (keywords: string[]) => {
        return headersLower.findIndex(h => keywords.some(kw => h.includes(kw) || kw.includes(h)));
      };

      // Map precise and truncated header names as shared in your screenshot:
      const idxSrType = findColIndex(["sr type", "service type", "sr_type", "type"]);
      const idxSrAssignee = findColIndex(["sr assigned to", "sr_assigned_to", "assigned to", "assigned_to", "sr assignee", "sr assigne", "assignee", "technician", "tech", "employee"]);
      const idxInvoiceNo = findColIndex(["invoice #", "invoice no", "invoice_no", "invoice_number", "job card no", "job_card_no", "jobcardno"]);
      const idxOrderNo = findColIndex(["order #", "order no", "order_no"]);
      const idxSrNo = findColIndex(["sr #", "sr no", "sr_no"]);
      const idxInvoiceDate = findColIndex(["invoice date", "invoice da", "date in", "job_date", "date"]);
      const idxVrn = findColIndex(["vrn", "vehicle", "registration"]);
      const idxAccount = findColIndex(["account", "bill to first", "customer", "owner"]);
      const idxBillToFirst = findColIndex(["bill to first", "account", "customer", "owner"]);
      const idxFinalLabor = findColIndex(["final labor", "final labour", "labour amount", "labor amount", "labour_amount"]);
      const idxFinalSpares = findColIndex(["final spares", "final spare", "parts amount", "spares amount", "parts_amount"]);
      const idxConsolidatedAmount = findColIndex(["consolidated invoice amount", "consolidated_invoice_amount", "consolidated invoice", "invoice amount", "total amount", "net amount", "total", "amount"]);
      const idxOdometer = findColIndex(["odometer", "km reading", "km_reading", "mileage", "odometer_reading", "odometer reading"]);
      const idxInvoiceStatus = findColIndex(["invoice status", "status"]);

      const rows: any[] = [];

      for (let i = 1; i < rawLines.length; i++) {
        const cells = parseCSVLine(rawLines[i]);
        if (cells.length < 2) continue;

        const getVal = (idx: number, fallback = "") => {
          if (idx !== -1 && idx < cells.length) return cells[idx];
          return fallback;
        };

        // Resolve job card number
        let jobCardNo = getVal(idxInvoiceNo);
        if (!jobCardNo) jobCardNo = getVal(idxSrNo);
        if (!jobCardNo) jobCardNo = getVal(idxOrderNo);
        if (!jobCardNo) {
          jobCardNo = `JC-${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 1000)}`;
        }

        // Resolve customer
        let customerName = getVal(idxBillToFirst);
        if (!customerName) customerName = getVal(idxAccount);
        if (!customerName) customerName = "";

        // Parse Amounts (cleaning currency codes)
        const parseAmount = (valStr: string) => {
          let clean = valStr.replace(/[^\d.]/g, "");
          return Math.round(parseFloat(clean) || 0);
        };

        let labourAmount = parseAmount(getVal(idxFinalLabor, "0"));
        let partsAmount = parseAmount(getVal(idxFinalSpares, "0"));
        const consolidatedAmount = parseAmount(getVal(idxConsolidatedAmount, "0"));

        if (consolidatedAmount > 0 && labourAmount === 0 && partsAmount === 0) {
          labourAmount = Math.round(consolidatedAmount * 0.6);
          partsAmount = Math.round(consolidatedAmount * 0.4);
        }

        // Status mapping
        const invoiceStatus = getVal(idxInvoiceStatus, "Completed");
        const rawRemarks = getVal(idxSrType, "General Repair");

        // Ignore Cancelled and Credit Notes
        const statusLower = invoiceStatus.toLowerCase();
        const remarksLower = rawRemarks.toLowerCase();
        const jcNoLower = jobCardNo.toLowerCase();

        if (
          statusLower.includes("cancel") || 
          statusLower.includes("credit") || 
          remarksLower.includes("cancel") || 
          remarksLower.includes("credit") ||
          jcNoLower.includes("cancel") ||
          jcNoLower.includes("credit")
        ) {
          continue; // Ignore cancelled and credit notes
        }

        // Convert DD/MM/YYYY to YYYY-MM-DD
        const rawDate = getVal(idxInvoiceDate);
        let formattedDate = rawDate;
        if (rawDate.includes("/")) {
          const parts = rawDate.split("/");
          if (parts.length === 3) {
            const day = parts[0].padStart(2, "0");
            const month = parts[1].padStart(2, "0");
            const year = parts[2];
            formattedDate = `${year}-${month}-${day}`;
          }
        }

        let rawTechName = getVal(idxSrAssignee, "");
        const resolvedDate = formattedDate || new Date().toISOString().split("T")[0];

        // Map breakdown or e-breakdown types irrespective of CRM ID or name
        const cleanRemarksLower = rawRemarks.toLowerCase();
        const isBreakdown = cleanRemarksLower.includes("breakdown") || cleanRemarksLower.includes("e-breakdown");

        if (isBreakdown) {
          rawTechName = "Abdul Gani Shek";
        } else if (rawTechName) {
          // Map CSP_100B210 CRM ID to Shashikumar Patil
          if (typeof rawTechName === "string" && (rawTechName.toUpperCase().includes("CSP_100B210") || rawTechName.toUpperCase().includes("CSP100B210"))) {
            rawTechName = "Shashikumar Patil";
          }

          // Parse date to do date-based mapping for RS1_100B210 and CAS_100b210
          let isAfterDec2025 = false;
          let isAfterFeb2026 = false;

          if (resolvedDate) {
            try {
              let parsedDate = new Date(resolvedDate);
              if (isNaN(parsedDate.getTime()) && resolvedDate.includes("/")) {
                const parts = resolvedDate.split("/");
                if (parts.length === 3) {
                  const day = parseInt(parts[0]);
                  const month = parseInt(parts[1]) - 1;
                  const year = parseInt(parts[2]);
                  parsedDate = new Date(year, month, day);
                }
              }
              if (!isNaN(parsedDate.getTime())) {
                const limitDec2025 = new Date(2025, 11, 31);
                const limitFeb2026 = new Date(2026, 1, 28);
                if (parsedDate > limitDec2025) isAfterDec2025 = true;
                if (parsedDate > limitFeb2026) isAfterFeb2026 = true;
              }
            } catch (e) {
              console.error(e);
            }
          }

          // Apply RS1_100B210 mapping rule
          if (typeof rawTechName === "string" && (rawTechName.toUpperCase().includes("RS1_100B210") || rawTechName.toUpperCase().includes("RS1100B210"))) {
            rawTechName = isAfterDec2025 ? "Mustafa" : "Raghavendra Kulkarni";
          }

          // Apply CAS_100B210 mapping rule
          if (typeof rawTechName === "string" && (rawTechName.toUpperCase().includes("CAS_100B210") || rawTechName.toUpperCase().includes("CAS100B210"))) {
            rawTechName = isAfterFeb2026 ? "" : "Ali Shair";
          }
        }

        const rawOdometer = getVal(idxOdometer, "");
        const kmReading = rawOdometer ? Math.round(parseFloat(rawOdometer.replace(/[^\d.]/g, ""))) : null;

        rows.push({
          job_card_no: jobCardNo,
          vrn: getVal(idxVrn, "").toUpperCase(),
          customer_name: customerName,
          customer_mobile: "", // Do not populate placeholder data if not available
          date_in: resolvedDate,
          status: invoiceStatus,
          technician_name: rawTechName || "",
          remarks: rawRemarks,
          labour_amount: labourAmount,
          parts_amount: partsAmount,
          consolidated_invoice_amount: consolidatedAmount || (labourAmount + partsAmount),
          km_reading: kmReading !== null && !isNaN(kmReading) ? kmReading : null,
          vehicle_model: "" // Do not populate placeholder model if not available
        });
      }

      if (rows.length > 0) {
        setBackdatedParsedRows(rows);
        setBackdatedFileName(fileName);
        alert(`Successfully parsed ${rows.length} records from ${fileName}! Preview loaded.`);
      } else {
        alert("Could not parse any records from the CSV file. Please make sure headers are matching.");
      }
    } catch (err: any) {
      console.error(err);
      alert("Error parsing backdated CSV: " + err.message);
    }
  };

  const triggerSubmitImportBackdatedRows = async () => {
    if (backdatedParsedRows.length === 0) return;
    setIsUploadingBackdated(true);
    setBackdatedResult(null);

    try {
      const res = await fetch("/api/job-cards/bulk-import-backdated", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: backdatedParsedRows })
      });

      const data = await res.json();
      if (data.success) {
        setBackdatedResult(data);
        setBackdatedParsedRows([]);
        setBackdatedFileName("");
        alert(`Successfully imported ${data.importedCount} historical vehicle records into the database!`);
      } else {
        alert("Error during import: " + (data.error || "Unknown error"));
      }
    } catch (err: any) {
      console.error(err);
      alert("Error: " + err.message);
    } finally {
      setIsUploadingBackdated(false);
    }
  };

  const renderBackdatedUploader = () => {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6 shadow-sm animate-fade-in">
        <div className="space-y-1">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            ⚙️ DMS Historical Vehicle Visits & Job Card Uploader (April 1, 2025 - June 29, 2026)
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Upload DMS records spanning <strong>1st April 2025 to 29th June 2026</strong>. These records instantly seed our vehicle history database to power **Automatic Fetching of Customer & Vehicle Details** at Gate Entry.
          </p>
        </div>

        {backdatedResult && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3 animate-fade-in">
            <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs text-emerald-800">
              <h4 className="font-extrabold uppercase">DMS Historical Records Synced Successfully!</h4>
              <p className="font-medium">
                Successfully parsed and inserted historical records into the database.
              </p>
              <ul className="list-disc pl-4 mt-1.5 space-y-1 font-bold">
                <li>Job Cards Added to History: {backdatedResult.importedCount}</li>
                <li>Revenue Records Tracked: {backdatedResult.revenueCreated}</li>
                <li>Technicians Fuzzy-Matched & Allocated: {backdatedResult.splitsCreated}</li>
              </ul>
              <button 
                onClick={() => {
                  setBackdatedResult(null);
                  window.location.reload();
                }}
                className="mt-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-md uppercase tracking-wider text-[10px] cursor-pointer"
              >
                Refresh App History Data
              </button>
            </div>
          </div>
        )}

        {/* DRAG AND DROP FILE ZONE */}
        <div 
          onDragEnter={handleBackdatedDrag}
          onDragOver={handleBackdatedDrag}
          onDragLeave={handleBackdatedDrag}
          onDrop={handleBackdatedDrop}
          className={`border border-dashed rounded-xl p-8 text-center transition-all flex flex-col items-center justify-center space-y-3 cursor-pointer bg-slate-50/50 relative overflow-hidden ${
            backdatedDragActive ? "border-orange-500 bg-orange-500/5" : "border-slate-300 hover:border-slate-400"
          }`}
        >
          <input
            type="file"
            accept=".csv"
            onChange={handleBackdatedFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
          <div className="h-9 w-9 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-600 flex items-center justify-center">
            <UploadCloud className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Drag & Drop DMS CSV File or Click to Browse</h3>
            <p className="text-[10px] text-slate-400 mt-1 max-w-lg mx-auto font-medium">
              Supports standard column layouts and truncated columns: <code className="font-mono bg-slate-100 px-1 text-[9px]">SR Type, SR Assignee, Invoice #, VRN, Final Labor, Invoice Status, Account</code>.
            </p>
          </div>
        </div>

        {/* PARSED ROWS PREVIEW & ACTIONS */}
        {backdatedParsedRows.length > 0 && (
          <div className="space-y-4 border border-indigo-100 bg-indigo-50/10 p-4 rounded-xl animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                  <span className="text-indigo-600 font-extrabold">📄 Mapped:</span> {backdatedFileName}
                </p>
                <p className="text-[11px] text-slate-500 font-medium">
                  Detected <span className="font-bold text-indigo-600">{backdatedParsedRows.length} vehicle visits</span> ready for historical import.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setBackdatedParsedRows([]);
                    setBackdatedFileName("");
                  }}
                  className="px-3 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-[10px] uppercase rounded-lg cursor-pointer"
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={triggerSubmitImportBackdatedRows}
                  disabled={isUploadingBackdated}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-lg flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
                >
                  {isUploadingBackdated ? (
                    <>
                      <FunnySpinner className="h-3 w-3" />
                      Syncing database...
                    </>
                  ) : (
                    `⚡ Import ${backdatedParsedRows.length} Visits to DB`
                  )}
                </button>
              </div>
            </div>

            {/* Preview Grid */}
            <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white">
              <table className="w-full text-left text-[10px] border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-extrabold border-b border-slate-200 uppercase tracking-wider text-[9px]">
                    <th className="p-2">Invoice #</th>
                    <th className="p-2">VRN</th>
                    <th className="p-2">Customer Name</th>
                    <th className="p-2">Date In</th>
                    <th className="p-2">Labour Amount</th>
                    <th className="p-2">Parts Amount</th>
                    <th className="p-2">Assignee</th>
                    <th className="p-2">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {backdatedParsedRows.slice(0, 5).map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="p-2 font-mono font-bold text-indigo-600">{row.job_card_no}</td>
                      <td className="p-2 font-bold text-slate-900">{row.vrn}</td>
                      <td className="p-2 truncate max-w-[120px]">{row.customer_name}</td>
                      <td className="p-2 font-mono">{row.date_in}</td>
                      <td className="p-2">₹{row.labour_amount.toLocaleString()}</td>
                      <td className="p-2">₹{row.parts_amount.toLocaleString()}</td>
                      <td className="p-2 truncate max-w-[100px]">{row.technician_name}</td>
                      <td className="p-2 text-slate-500 uppercase">{row.remarks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {backdatedParsedRows.length > 5 && (
                <div className="p-2 text-center text-[10px] font-bold text-slate-400 bg-slate-50 border-t border-slate-100">
                  + {backdatedParsedRows.length - 5} more rows parsed...
                </div>
              )}
            </div>
          </div>
        )}

        {/* PASTING COLLAPSIBLE SECTION */}
        <details className="group border border-slate-200 rounded-xl">
          <summary className="list-none p-4 flex justify-between items-center cursor-pointer font-bold text-xs uppercase text-slate-700 hover:bg-slate-50 select-none">
            <span className="flex items-center gap-1.5">
              <ClipboardList className="h-4 w-4 text-slate-500" />
              Toggle Paste Grid Area (Excel / Sheets Copy-Paste fallback)
            </span>
            <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <div className="p-4 pt-0 border-t border-slate-100 space-y-4">
            <form onSubmit={handleUploadBackdated} className="space-y-4">
              <div className="space-y-2">
                <div className="text-[10px] text-slate-400 bg-slate-50 border border-slate-200 p-3 rounded-lg font-mono leading-relaxed space-y-1">
                  <span className="font-extrabold text-slate-500 uppercase block mb-1">Expected columns format (include header row):</span>
                  <code>Job Card No, VRN, Customer Name, Date In, Vehicle Model, Status, Bay No, Service Advisor, Technician Name, Remarks, Labour Amount, Spares Amount</code>
                </div>
                <textarea
                  value={backdatedText}
                  onChange={(e) => setBackdatedText(e.target.value)}
                  rows={6}
                  placeholder="Paste your copied rows here... Include the header line!"
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-xl p-4 text-xs font-mono text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 focus:bg-white transition-all"
                ></textarea>
              </div>

              <div className="flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => {
                    setBackdatedText(
                      "Job Card No\tVRN\tCustomer Name\tDate In\tVehicle Model\tStatus\tBay No\tService Advisor\tTechnician Name\tRemarks\tLabour Amount\tSpares Amount\n" +
                      "JC-B101\tMH-12-PQ-9999\tJohn Doe\t2026-06-15\tTata Prima 2825\tInvoiced\t2\tAdvisor Smith\tASHFAQ\tGeneral Repair with Oil Service\t1850\t2200\n" +
                      "JC-B102\tDL-03-ZZ-1111\tJane Miller\t2026-06-20\tTata Signa 4825\tCompleted\t4\tAdvisor Smith\tALTAF HUSSAIN\tPeriodic Maintenance AMC\t1200\t800"
                    );
                  }}
                  className="text-indigo-600 hover:text-indigo-700 font-bold text-xs uppercase cursor-pointer"
                >
                  📋 Load Sample Rows
                </button>
                <button
                  type="submit"
                  disabled={isUploadingBackdated}
                  className={`bg-orange-500 hover:bg-orange-600 text-white font-black text-xs uppercase tracking-wider px-6 py-3 rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer ${
                    isUploadingBackdated ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {isUploadingBackdated ? (
                    <>
                      <FunnySpinner className="h-4 w-4" />
                      Fuzzy Matching...
                    </>
                  ) : (
                    "Upload Paste Rows"
                  )}
                </button>
              </div>
            </form>
          </div>
        </details>
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
