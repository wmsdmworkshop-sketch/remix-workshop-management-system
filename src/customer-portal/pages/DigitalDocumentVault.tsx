import React, { useState } from "react";
import { FileText, Download, Printer, Share2, ShieldCheck, DollarSign, Search, ExternalLink, Eye, Award } from "lucide-react";

export interface VaultDocument {
  id: string;
  category: "Invoice" | "Estimate" | "JobCard" | "Warranty" | "AMC";
  title: string;
  documentNo: string;
  vrn: string;
  date: string;
  amount?: number;
  status: "Finalized" | "Paid" | "Approved" | "Active";
  downloadUrl?: string;
}

export const DigitalDocumentVault: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedDoc, setSelectedDoc] = useState<VaultDocument | null>(null);

  const sampleVaultDocs: VaultDocument[] = [
    {
      id: "doc-1",
      category: "Invoice",
      title: "Tax Invoice — Paid Servicing & Spares Replacement",
      documentNo: "IDEVAN2526003930",
      vrn: "KA-32-AA-5577",
      date: "14/11/2025",
      amount: 14885.18,
      status: "Paid"
    },
    {
      id: "doc-2",
      category: "Estimate",
      title: "Approved Repair & Spare Parts Estimate",
      documentNo: "EST-2025-09821",
      vrn: "KA-32-AA-5577",
      date: "14/11/2025",
      amount: 14850.00,
      status: "Approved"
    },
    {
      id: "doc-3",
      category: "JobCard",
      title: "Digital Job Card & 360° Inspection Report",
      documentNo: "JC-DevAus-AA1-2526-002338",
      vrn: "KA-32-AA-5577",
      date: "14/11/2025",
      status: "Finalized"
    },
    {
      id: "doc-4",
      category: "Warranty",
      title: "OEM Warranty Replacement Certificate (Brake Actuator)",
      documentNo: "OEM-WAR-99212",
      vrn: "KA-32-AA-5577",
      date: "30/06/2025",
      amount: 0.00,
      status: "Active"
    },
    {
      id: "doc-5",
      category: "AMC",
      title: "Gold Fleet Care Annual Maintenance Contract",
      documentNo: "AMC-GOLD-2025-004",
      vrn: "KA-32-AA-5577",
      date: "01/01/2025",
      amount: 24999.00,
      status: "Active"
    },
    {
      id: "doc-6",
      category: "Invoice",
      title: "Historical Tax Invoice — Regular Servicing",
      documentNo: "IDEVAN2526001499",
      vrn: "KA-32-AA-5577",
      date: "30/06/2025",
      amount: 7257.30,
      status: "Paid"
    }
  ];

  const filteredDocs = sampleVaultDocs.filter(doc => {
    const matchCategory = activeCategory === "All" || doc.category === activeCategory;
    const matchQuery = 
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.documentNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.vrn.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchQuery;
  });

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "Invoice":
        return "bg-emerald-100 text-emerald-800 border-emerald-300";
      case "Estimate":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "JobCard":
        return "bg-indigo-100 text-indigo-800 border-indigo-300";
      case "Warranty":
        return "bg-purple-100 text-purple-800 border-purple-300";
      case "AMC":
        return "bg-amber-100 text-amber-800 border-amber-300";
      default:
        return "bg-slate-100 text-slate-700 border-slate-300";
    }
  };

  const handleDownloadDoc = (doc: VaultDocument) => {
    alert(`Downloading Official PDF: ${doc.documentNo} (${doc.title})`);
  };

  const handlePrintDoc = (doc: VaultDocument) => {
    window.print();
  };

  const handleShareDoc = (doc: VaultDocument) => {
    if (navigator.share) {
      navigator.share({
        title: doc.title,
        text: `Official Document ${doc.documentNo} for vehicle ${doc.vrn}`,
        url: window.location.href
      }).catch(err => console.error("Share failed", err));
    } else {
      alert(`Shareable Link copied for ${doc.documentNo}!`);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800 space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/20 border border-amber-500/40 text-amber-400 rounded-xl">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight text-white uppercase">Digital Document Vault</h2>
            <p className="text-xs text-slate-300">Single Source of Truth for all Job Cards, Tax Invoices, Estimates, Warranty & AMC Certificates</p>
          </div>
        </div>

        {/* Filter categories & search */}
        <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-slate-800">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Document No, Invoice No, or Vehicle VRN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:ring-1 focus:ring-amber-400"
            />
          </div>

          <div className="flex flex-wrap gap-1.5 overflow-x-auto">
            {["All", "Invoice", "Estimate", "JobCard", "Warranty", "AMC"].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeCategory === cat
                    ? "bg-amber-500 text-slate-950 shadow-md font-extrabold"
                    : "bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Document Grid / List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredDocs.map((doc) => (
          <div 
            key={doc.id}
            className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${getCategoryBadge(doc.category)}`}>
                  {doc.category}
                </span>
                <span className="text-[10px] font-mono text-slate-500 font-semibold">{doc.date}</span>
              </div>

              <h3 className="text-xs font-extrabold text-slate-900 leading-snug">{doc.title}</h3>
              
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="font-mono text-slate-600 font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  {doc.documentNo}
                </span>

                {doc.amount !== undefined && (
                  <span className="font-mono font-extrabold text-indigo-700 text-sm">
                    {doc.amount > 0 ? `₹${doc.amount.toLocaleString('en-IN')}` : "₹0.00 (Covered)"}
                  </span>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                onClick={() => setSelectedDoc(doc)}
                className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
              >
                <Eye className="w-3.5 h-3.5" /> View Document
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleShareDoc(doc)}
                  className="p-1.5 text-slate-500 hover:text-slate-800 bg-slate-100 rounded-lg transition"
                  title="Share Link"
                >
                  <Share2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handlePrintDoc(doc)}
                  className="p-1.5 text-slate-500 hover:text-slate-800 bg-slate-100 rounded-lg transition"
                  title="Print Document"
                >
                  <Printer className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDownloadDoc(doc)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" /> PDF
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Document View Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-5 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-extrabold text-slate-900 uppercase">Document Preview</h3>
              </div>
              <button 
                onClick={() => setSelectedDoc(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-sm px-2 py-1 bg-slate-100 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
              <div className="flex justify-between font-mono">
                <span className="text-slate-500">Document No:</span>
                <strong className="text-slate-800">{selectedDoc.documentNo}</strong>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-slate-500">Vehicle VRN:</span>
                <strong className="text-slate-800">{selectedDoc.vrn}</strong>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-slate-500">Date Issued:</span>
                <strong className="text-slate-800">{selectedDoc.date}</strong>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-slate-500">Status:</span>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded">{selectedDoc.status}</span>
              </div>
              {selectedDoc.amount !== undefined && (
                <div className="flex justify-between font-mono pt-2 border-t border-slate-200">
                  <span className="text-slate-500 font-bold">Total Amount:</span>
                  <strong className="text-indigo-700 text-sm font-bold">₹{selectedDoc.amount.toLocaleString('en-IN')}</strong>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setSelectedDoc(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold"
              >
                Close Preview
              </button>
              <button
                onClick={() => handleDownloadDoc(selectedDoc)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow"
              >
                <Download className="w-4 h-4" /> Download Official PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
