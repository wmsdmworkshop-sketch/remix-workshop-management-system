import React, { useState } from "react";
import { UploadCloud, CheckCircle, AlertTriangle, HelpCircle, RefreshCw, ClipboardList, Download } from "lucide-react";
import { DMSImportBatch, DMSImportRow, JobCard } from "../types";

interface DmsImporterProps {
  batches: DMSImportBatch[];
  rows: DMSImportRow[];
  jobCards: JobCard[];
  onImportRows: (fileName: string, rows: any[]) => void;
  onResolveRow: (rowId: number, status: DMSImportRow["match_status"], matchedJobId: number) => void;
}

const SAMPLE_LOGS = [
  {
    name: "DMS_Daily_Log_June26.csv",
    rows: [
      { vrn: "MH-12-AB-1234", job_date: "2026-06-26", sr_type: "GR", labour_amount: 4000, parts_amount: 1500 },
      { vrn: "DL-03-XY-9876", job_date: "2026-06-26", sr_type: "PM", labour_amount: 2500, parts_amount: 800 },
      { vrn: "KA-51-MM-4321", job_date: "2026-06-26", sr_type: "EL", labour_amount: 3200, parts_amount: 500 }
    ]
  },
  {
    name: "DMS_Conflict_And_Unmatched_Log.csv",
    rows: [
      // Conflict: VRN matches JC001 (MH-12-AB-1234), but SR Type is PM (Periodic Maintenance) instead of GR (General Repair)
      { vrn: "MH-12-AB-1234", job_date: "2026-06-26", sr_type: "PM", labour_amount: 4200, parts_amount: 1800 },
      // Unmatched: VRN does not exist in our system
      { vrn: "HR-26-CC-8888", job_date: "2026-06-26", sr_type: "QS", labour_amount: 1500, parts_amount: 100 }
    ]
  }
];

export default function DmsImporter({
  batches,
  rows,
  jobCards,
  onImportRows,
  onResolveRow
}: DmsImporterProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const [resolvingRow, setResolvingRow] = useState<DMSImportRow | null>(null);
  const [targetJobId, setTargetJobId] = useState<number | "">("");
  const [pastedData, setPastedData] = useState("");
  const [showPasteArea, setShowPasteArea] = useState(false);
  const [activeMode, setActiveMode] = useState<"reconcile" | "backdated">("reconcile");
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
      '"JC-DevAus-AA1-2627-001179"',
      '"SR-DevAus/AA1-2627-001201"',
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

  // Filter rows for the selected batch
  const currentBatch = batches.find(b => b.batch_id === selectedBatchId) || batches[batches.length - 1];
  const filteredRows = currentBatch ? rows.filter(r => r.batch_id === currentBatch.batch_id) : [];

  const handleResolveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingRow || !targetJobId) return;

    onResolveRow(resolvingRow.row_id, "Matched", Number(targetJobId));
    setResolvingRow(null);
    setTargetJobId("");
    alert("Conflict resolved. Revenue has been synced and allocated to the job card.");
  };

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
                      <RefreshCw className="h-3 w-3 animate-spin" />
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
                      <RefreshCw className="h-4 w-4 animate-spin" />
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
          <button
            onClick={() => setShowPasteArea(!showPasteArea)}
            className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 font-bold text-[11px] px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <ClipboardList className="h-4 w-4" />
            {showPasteArea ? "Hide Paste Area" : "Paste DMS Raw Text"}
          </button>
          {SAMPLE_LOGS.map((log, idx) => (
            <button 
              key={idx}
              onClick={() => triggerSampleImport(log)}
              className="bg-orange-500/10 text-orange-600 border border-orange-500/20 hover:bg-orange-500/20 font-bold text-[11px] px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <ClipboardList className="h-4 w-4" />
              Load {log.name.split("_")[1]}
            </button>
          ))}
        </div>
      </div>

      {/* Mode Segmented Tab Selector */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveMode("reconcile")}
          className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeMode === "reconcile"
              ? "border-orange-500 text-orange-600 font-extrabold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          📋 DMS Billings Reconciler
        </button>
        <button
          onClick={() => setActiveMode("backdated")}
          className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeMode === "backdated"
              ? "border-orange-500 text-orange-600 font-extrabold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          ⚙️ June Backdated Job Card Uploader
        </button>
      </div>

      {activeMode === "backdated" ? (
        renderBackdatedUploader()
      ) : (
        <>
          {/* Optional Raw Paste Area */}
          {showPasteArea && (
            <form onSubmit={handlePasteSubmit} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Paste DMS Tab/Comma Separated Report</h3>
                <span className="text-[10px] text-slate-400 font-semibold">Will automatically clean null characters</span>
              </div>
              <textarea
                value={pastedData}
                onChange={(e) => setPastedData(e.target.value)}
                rows={6}
                placeholder="Paste your report here, including header columns (e.g. SR Type, VRN, Invoice Date, Final Labour Invoice Amount, Final Spares Invoice Amount)..."
                className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-mono text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
              ></textarea>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-lg transition-colors shadow-sm cursor-pointer"
                >
                  Process and Reconcile Pasted Report
                </button>
              </div>
            </form>
          )}

          {/* 2. Drag-and-drop simulated landing */}
          {batches.length === 0 && (
            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`border border-dashed rounded-xl p-12 text-center transition-all flex flex-col items-center justify-center space-y-4 cursor-pointer bg-slate-50/50 relative overflow-hidden ${
                dragActive ? "border-orange-500 bg-orange-500/5" : "border-slate-300 hover:border-slate-400"
              }`}
            >
              <input
                type="file"
                accept=".csv,.tsv,.txt"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="h-10 w-10 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-600 flex items-center justify-center">
                <UploadCloud className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Drag & Drop DMS Billing Log or Click to Browse</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto font-medium">
                  Upload daily workshop invoice logs in CSV, TSV or TXT format to reconcile with active job cards. Support auto headers mapping.
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {/* 3. Batch Reconciliation View */}
      {batches.length > 0 && currentBatch && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
          
          {/* Batches History List & Metrics */}
          <div className="xl:col-span-1 bg-white border border-slate-200 rounded-xl p-4 space-y-4 shadow-sm">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2">Reconciliation Batches</h2>
            <div className="space-y-3">
              {batches.map((b) => {
                const isActive = b.batch_id === currentBatch.batch_id;
                return (
                  <div 
                    key={b.batch_id}
                    onClick={() => setSelectedBatchId(b.batch_id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      isActive ? "border-orange-500 bg-orange-500/5" : "border-slate-100 hover:border-slate-200"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <p className="text-[11px] font-bold text-slate-800 truncate max-w-[150px]">{b.file_name}</p>
                      <span className="text-[9px] font-bold text-orange-600 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded uppercase tracking-wider">
                        {b.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-[9px] mt-3 border-t border-slate-100 pt-2 font-bold uppercase tracking-wider">
                      <div className="text-slate-500">
                        <p className="text-xs font-bold text-slate-800">{b.total_rows}</p>
                        <p className="text-[8px] mt-0.5 text-slate-400">Total</p>
                      </div>
                      <div className="text-green-600">
                        <p className="text-xs font-bold">{b.matched_rows}</p>
                        <p className="text-[8px] mt-0.5 text-green-500/70">Matched</p>
                      </div>
                      <div className="text-red-600">
                        <p className="text-xs font-bold">{b.unmatched_rows}</p>
                        <p className="text-[8px] mt-0.5 text-red-500/70">Issues</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Table of Rows inside Selected Batch */}
          <div className="xl:col-span-2 bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 bg-slate-50/50 -mx-4 -mt-4 p-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Log Rows inside <span className="font-mono text-orange-600">{currentBatch.file_name}</span>
              </h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total matched: {currentBatch.matched_rows} / {currentBatch.total_rows}</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold text-[9px] uppercase tracking-wider">
                    <th className="py-2.5">Row</th>
                    <th className="py-2.5">VRN</th>
                    <th className="py-2.5">SR Type</th>
                    <th className="py-2.5">Labour (₹)</th>
                    <th className="py-2.5">Parts (₹)</th>
                    <th className="py-2.5">Status</th>
                    <th className="py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  {filteredRows.map((row) => {
                    let statusColor = "bg-slate-50 text-slate-700 border-slate-200";
                    if (row.match_status === "Matched") statusColor = "bg-green-50 text-green-700 border border-green-200/50";
                    else if (row.match_status === "Conflict") statusColor = "bg-red-50 text-red-700 border border-red-200/50";
                    else if (row.match_status === "Unmatched") statusColor = "bg-amber-50 text-amber-700 border border-amber-200/50";

                    return (
                      <tr key={row.row_id} className="hover:bg-slate-50/50">
                        <td className="py-3 font-mono text-slate-400 font-bold">#{row.row_number}</td>
                        <td className="py-3 font-bold text-slate-900">{row.vrn}</td>
                        <td className="py-3 font-bold text-slate-600 uppercase tracking-wider">{row.sr_type}</td>
                        <td className="py-3 font-semibold text-slate-800">₹{row.labour_amount.toLocaleString()}</td>
                        <td className="py-3 font-semibold text-slate-800">₹{row.parts_amount.toLocaleString()}</td>
                        <td className="py-3">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${statusColor}`}>
                            {row.match_status}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          {["Conflict", "Unmatched"].includes(row.match_status) ? (
                            <button 
                              onClick={() => setResolvingRow(row)}
                              className="bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 border border-orange-500/20 text-[9px] font-bold px-2.5 py-1 rounded uppercase tracking-wider transition-colors cursor-pointer"
                            >
                              Resolve
                            </button>
                          ) : (
                            <span className="text-green-600 font-bold text-[10px] uppercase tracking-wider">✓ Synced</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* RECONCILIATION CONFLICT RESOLVER MODAL */}
      {resolvingRow && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-slate-200 shadow-md max-w-md w-full p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="h-4.5 w-4.5 text-orange-500" />
                Resolve DMS Sync Conflict
              </h2>
              <button onClick={() => setResolvingRow(null)} className="text-slate-400 hover:text-slate-600 font-bold text-sm">×</button>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg space-y-2 text-xs border border-slate-200">
              <p className="text-slate-500 font-bold uppercase tracking-wider text-[9px]">DMS Record Row #{resolvingRow.row_number}</p>
              <div className="grid grid-cols-2 gap-2 font-semibold text-slate-800">
                <p>VRN: <strong className="text-slate-900 font-bold">{resolvingRow.vrn}</strong></p>
                <p>SR Code: <strong className="text-slate-900 font-bold">{resolvingRow.sr_type}</strong></p>
                <p>Labour: <strong className="text-slate-900 font-bold">₹{resolvingRow.labour_amount}</strong></p>
                <p>Parts: <strong className="text-slate-900 font-bold">₹{resolvingRow.parts_amount}</strong></p>
              </div>
              {resolvingRow.conflict_reason && (
                <p className="text-red-700 font-bold text-[10px] uppercase tracking-wider mt-2 bg-red-50 p-2 rounded border border-red-200/50">
                  ⚠️ Conflict: {resolvingRow.conflict_reason}
                </p>
              )}
            </div>

            <form onSubmit={handleResolveSubmit} className="space-y-3 pt-2">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Map to Registered Job Card*</label>
                <select 
                  required
                  value={targetJobId}
                  onChange={(e) => setTargetJobId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
                >
                  <option value="">Select target Job Card...</option>
                  {jobCards.filter(j => j.status !== "Invoiced").map(j => (
                    <option key={j.job_id} value={j.job_id}>
                      {j.job_card_no} • {j.vrn} ({j.customer_name}) • Status: {j.status}
                    </option>
                  ))}
                </select>
              </div>

              <button 
                type="submit"
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 rounded text-xs uppercase tracking-wider shadow-sm transition-colors cursor-pointer"
              >
                Link and Force Reconcile
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
