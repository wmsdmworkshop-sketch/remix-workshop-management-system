const fs = require('fs');

const filepath = 'src/components/DmsImporter.tsx';
const content = fs.readFileSync(filepath, 'utf8');

const lines = content.split('\n');

// We want to replace from line 352 to 856 inclusive.
// JavaScript array index is 0-indexed, so:
// Line 352 is index 351.
// Line 856 is index 855.
const startIdx = 341;
const endIdx = 854;

console.log('Replacing from line:', lines[startIdx]);
console.log('To line:', lines[endIdx]);

const beforePart = lines.slice(0, startIdx).join('\n');
const afterPart = lines.slice(endIdx + 1).join('\n');

const replacement = `  // --- TEMPLATE IMPORT WIZARD STATES ---
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
    const cleanText = text.replace(/\\0/g, "").trim();
    if (!cleanText) return null;
    const rawLines = cleanText.split(/\\r?\\n/).map(line => line.trim()).filter(Boolean);
    if (rawLines.length === 0) return null;

    const firstLine = rawLines[0];
    const isTab = firstLine.includes("\\t");

    const parseCSVLine = (line: string) => {
      if (isTab) {
        return line.split("\\t").map(cell => {
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
                className={\`p-5 rounded-xl border-2 cursor-pointer transition-all space-y-2.5 \${
                  selectedTemplate === "vehicle_master" 
                    ? "border-orange-500 bg-orange-500/5 shadow-sm" 
                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                }\`}
              >
                <div className="h-9 w-9 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xs uppercase">VM</div>
                <h4 className="font-extrabold text-xs text-slate-800 uppercase">Vehicle Master</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                  Import core vehicle details (Chassis #, Registration #, Engine #, Product VC#, Owner Account, Sale Date, Selling Dealer).
                </p>
              </div>

              <div 
                onClick={() => setSelectedTemplate("service_history")}
                className={\`p-5 rounded-xl border-2 cursor-pointer transition-all space-y-2.5 \${
                  selectedTemplate === "service_history" 
                    ? "border-orange-500 bg-orange-500/5 shadow-sm" 
                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                }\`}
              >
                <div className="h-9 w-9 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs uppercase">SH</div>
                <h4 className="font-extrabold text-xs text-slate-800 uppercase">Service History</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                  Import historical service record entries (SH #, Chassis #, Odometer, SR Type, Summary, Open Date, Revisit Logs).
                </p>
              </div>

              <div 
                onClick={() => setSelectedTemplate("invoices")}
                className={\`p-5 rounded-xl border-2 cursor-pointer transition-all space-y-2.5 \${
                  selectedTemplate === "invoices" 
                    ? "border-orange-500 bg-orange-500/5 shadow-sm" 
                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                }\`}
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
                      <span className={\`px-2 py-0.5 rounded font-black font-mono text-[10px] uppercase border \${
                        aiHeaderMapping[csvHeader] 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }\`}>
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
  };`;

const newContent = beforePart + '\n' + replacement + '\n' + afterPart;
fs.writeFileSync(filepath, newContent, 'utf8');
console.log('Successfully updated DmsImporter.tsx');
