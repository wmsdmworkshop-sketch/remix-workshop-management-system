import React, { useState } from 'react';
import { Upload, Database, FileSpreadsheet, CheckCircle, AlertTriangle, Download, RefreshCw, BarChart2 } from 'lucide-react';

interface ImportConfig {
  id: string;
  title: string;
  requiredFields: string[];
  description: string;
}

const IMPORT_OPTIONS: ImportConfig[] = [
  {
    id: 'job-cards',
    title: 'Job Card Import',
    description: 'Bulk upload and register new active service job cards.',
    requiredFields: ['job_card_no', 'vrn', 'customer_name', 'customer_mobile', 'vehicle_model', 'km_reading']
  },
  {
    id: 'invoices',
    title: 'Invoice Import',
    description: 'Import invoice history, parts, and labour cost splits.',
    requiredFields: ['invoice_no', 'job_card_no', 'parts_amount', 'labour_amount', 'billing_status']
  },
  {
    id: 'customers',
    title: 'Customer Master Import',
    description: 'Sync or update customer profiles and phone details.',
    requiredFields: ['customer_name', 'mobile_no', 'email', 'address']
  },
  {
    id: 'vehicles',
    title: 'Vehicle Master Import',
    description: 'Upload vehicle manufacturing details and commission dates.',
    requiredFields: ['vrn', 'vin', 'model', 'original_sale_date', 'engine_no']
  },
  {
    id: 'parts-labour',
    title: 'Parts/Labour Import',
    description: 'Import parts master catalogs, prices, and standard hours.',
    requiredFields: ['part_no', 'part_name', 'unit_price', 'labour_code', 'standard_labour_hours']
  }
];

interface ImportStatus {
  progress: number;
  successCount: number;
  errorCount: number;
  errors: Array<{ row: number; field: string; reason: string }>;
  isProcessing: boolean;
}

export default function DmsImporterConsolidated() {
  const [activeImport, setActiveImport] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<Record<string, ImportStatus>>({});

  const handleFileUpload = (optionId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Initialize state for this import task
    setStatuses(prev => ({
      ...prev,
      [optionId]: {
        progress: 0,
        successCount: 0,
        errorCount: 0,
        errors: [],
        isProcessing: true
      }
    }));

    // Parse files asynchronously, allowing the user to navigate
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 10;
      setStatuses(prev => {
        const current = prev[optionId] || { progress: 0, successCount: 0, errorCount: 0, errors: [], isProcessing: true };
        const finished = currentProgress >= 100;
        
        if (finished) {
          clearInterval(interval);
          // Generate mock processing results
          const success = Math.floor(Math.random() * 50) + 10;
          const errors = [
            { row: 12, field: 'vrn', reason: 'Missing registration number' },
            { row: 24, field: 'customer_mobile', reason: 'Invalid format (must be 10 digits)' }
          ];
          return {
            ...prev,
            [optionId]: {
              progress: 100,
              successCount: success,
              errorCount: errors.length,
              errors: errors,
              isProcessing: false
            }
          };
        }

        return {
          ...prev,
          [optionId]: {
            ...current,
            progress: currentProgress
          }
        };
      });
    }, 400);
  };

  const downloadErrorsCSV = (optionId: string) => {
    const status = statuses[optionId];
    if (!status || status.errors.length === 0) return;

    let csvContent = 'data:text/csv;charset=utf-8,Row Number,Field Name,Reason\n';
    status.errors.forEach(err => {
      csvContent += `${err.row},${err.field},${err.reason}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${optionId}_import_errors.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 bg-slate-50 min-h-screen">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <Database className="w-8 h-8 text-indigo-600" />
          Consolidated DMS Sync Importer
        </h1>
        <p className="text-slate-500 mt-1">
          Perform asynchronous CSV/Excel master imports for job cards, vehicle/customer catalogs, and parts lists.
        </p>
      </div>

      {/* Grid of options cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {IMPORT_OPTIONS.map((opt) => {
          const status = statuses[opt.id];
          const isProcessing = status?.isProcessing;
          
          return (
            <div key={opt.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between hover:shadow-md transition space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                    <FileSpreadsheet className="w-6 h-6" />
                  </span>
                  <h3 className="text-lg font-bold text-slate-800">{opt.title}</h3>
                </div>
                <p className="text-xs text-slate-500">{opt.description}</p>

                {/* Required Fields list */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Required columns:</span>
                  <div className="flex flex-wrap gap-1">
                    {opt.requiredFields.map(f => (
                      <span key={f} className="text-[10px] font-mono px-2 py-0.5 bg-slate-200 text-slate-700 rounded-md">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Progress/Results section */}
              <div className="pt-4 border-t border-slate-100 space-y-4">
                {status && (
                  <div className="space-y-3">
                    {isProcessing ? (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold text-indigo-600">
                          <span>Processing records...</span>
                          <span>{status.progress}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                          <div 
                            className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${status.progress}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 text-xs">
                        <div className="grid grid-cols-2 gap-2 text-center">
                          <div className="bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-lg p-2 font-bold">
                            <div className="text-lg text-emerald-700">{status.successCount}</div>
                            Success Rows
                          </div>
                          <div className="bg-rose-50 text-rose-800 border border-rose-100 rounded-lg p-2 font-bold">
                            <div className="text-lg text-rose-700">{status.errorCount}</div>
                            Error Rows
                          </div>
                        </div>

                        {status.errorCount > 0 && (
                          <button
                            onClick={() => downloadErrorsCSV(opt.id)}
                            className="w-full py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg font-bold flex items-center justify-center gap-1.5 transition active:scale-[0.98]"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Download Errors CSV
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Upload Button */}
                <label className={`w-full py-3 border border-slate-300 rounded-xl hover:bg-slate-50 transition cursor-pointer flex items-center justify-center gap-2 font-semibold text-slate-700 ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}>
                  <Upload className="w-4 h-4 text-slate-500" />
                  Upload File
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    className="hidden"
                    onChange={(e) => handleFileUpload(opt.id, e)}
                    disabled={isProcessing}
                  />
                </label>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
