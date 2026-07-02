import React, { useState, useMemo } from "react";
import { 
  Sparkles, 
  Upload, 
  UserCheck, 
  Search, 
  FileText, 
  ShieldAlert, 
  ArrowRight, 
  Save, 
  History, 
  TrendingUp, 
  Smile, 
  Check, 
  AlertCircle,
  FileSpreadsheet,
  Settings,
  DollarSign
} from "lucide-react";
import { Employee, JobCard } from "../types";
import { calculateRevenueAllocation } from "../lib/revenue-split-engine";

interface ProductivityCalculatorProps {
  employees: Employee[];
  jobCards: JobCard[];
  onRefresh: () => Promise<void>;
  onUpdateJob?: (id: number, updatedFields: Partial<JobCard>) => void;
}

export default function ProductivityCalculator({ 
  employees, 
  jobCards, 
  onRefresh,
  onUpdateJob
}: ProductivityCalculatorProps) {
  // Input mode selection
  const [activePurpose, setActivePurpose] = useState<"a" | "b" | "c" | "d">("c");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Raw CRM DMS inputs
  const [textInput, setTextInput] = useState("");
  const [vrnSearch, setVrnSearch] = useState("");
  const [autoFillVrn, setAutoFillVrn] = useState("");
  const [autoFilledData, setAutoFilledData] = useState<any>(null);

  // Extracted/Parsed Invoice State
  const [invoiceNo, setInvoiceNo] = useState("INV-2026-9042");
  const [jcNo, setJcNo] = useState("JC084");
  const [labourAmount, setLabourAmount] = useState("3500");
  const [partsAmount, setPartsAmount] = useState("5400");
  const [customerName, setCustomerName] = useState("John Doe");
  const [customerMobile, setCustomerMobile] = useState("9876543210");
  const [vrn, setVrn] = useState("KA-03-MG-5678");
  const [chassisNo, setChassisNo] = useState("MAT451092M819042");
  const [engineNo, setEngineNo] = useState("TATA312N9042");
  const [mileage, setMileage] = useState("48500");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedTechs, setSelectedTechs] = useState<number[]>([1, 2]); // default IDs

  // Sample templates representing CRM DMS CRM invoices
  const sampleInvoices = [
    {
      label: "Sample 1: Single Tech (Mohsin)",
      invoice_no: "INV-2026-1011",
      job_card_no: "JC101",
      labour_amount: "1500",
      parts_amount: "2800",
      customer_name: "Anand Devanand",
      customer_mobile: "9448012345",
      vrn: "KA-01-AB-1234",
      chassis_no: "MAT451092M811011",
      engine_no: "TATA312N1011",
      mileage: "12400",
      techs: ["Mohsin Nawaz"] // Jr. Electrician
    },
    {
      label: "Sample 2: Two Techs Equal Split",
      invoice_no: "INV-2026-1022",
      job_card_no: "JC102",
      labour_amount: "3200",
      parts_amount: "4500",
      customer_name: "Amit Sharma",
      customer_mobile: "9880198765",
      vrn: "MH-12-PQ-9876",
      chassis_no: "MAT451092M811022",
      engine_no: "TATA312N1022",
      mileage: "35400",
      techs: ["Muzamill", "Srinath M. N"]
    },
    {
      label: "Sample 3: Triple Techs with Senior (Loku)",
      invoice_no: "INV-2026-1033",
      job_card_no: "JC103",
      labour_amount: "5000",
      parts_amount: "12800",
      customer_name: "Ramesh Gowda",
      customer_mobile: "9900112233",
      vrn: "DL-3C-AS-5555",
      chassis_no: "MAT451092M811033",
      engine_no: "TATA312N1033",
      mileage: "62100",
      techs: ["Loku", "Fakiraapa", "Umakanta"]
    },
    {
      label: "Sample 4: Four Techs Equal Split",
      invoice_no: "INV-2026-1044",
      job_card_no: "JC104",
      labour_amount: "8000",
      parts_amount: "18500",
      customer_name: "Vijay Mallya",
      customer_mobile: "9741004455",
      vrn: "KA-05-MM-7777",
      chassis_no: "MAT451092M811044",
      engine_no: "TATA312N1044",
      mileage: "98200",
      techs: ["Loku", "Fakiraapa", "Muzamill", "Umakanta"]
    }
  ];

  const handleLoadSample = (sample: typeof sampleInvoices[0]) => {
    setInvoiceNo(sample.invoice_no);
    setJcNo(sample.job_card_no);
    setLabourAmount(sample.labour_amount);
    setPartsAmount(sample.parts_amount);
    setCustomerName(sample.customer_name);
    setCustomerMobile(sample.customer_mobile);
    setVrn(sample.vrn);
    setChassisNo(sample.chassis_no);
    setEngineNo(sample.engine_no);
    setMileage(sample.mileage);

    // Map names to employee IDs
    const ids: number[] = [];
    sample.techs.forEach(name => {
      const match = employees.find(e => e.full_name.toLowerCase().includes(name.toLowerCase()));
      if (match) ids.push(match.employee_id);
    });
    setSelectedTechs(ids);
    setSuccessMsg(`Loaded sample invoice: ${sample.invoice_no}`);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // Perform Gemini AI Extraction simulation or actual API request
  const handleAiExtract = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const response = await fetch("/api/gemini/extract-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          textInput: textInput || "Tata Motors CRM DMS Invoice Ref: T-0914-26\nVRN: KA-03-MG-5678\nJC No: JC084\nCustomer: Rajesh Kumar\nMobile: 9876543210\nLabour Value: ₹3,500.00\nParts Value: ₹5,400.00\nEngine No: TATA312N9042\nChassis: MAT451092M819042\nMileage: 48500 km\nService Advisor: Anand\nTechs Assigned: Loku, Mohsin Nawaz"
        })
      });
      
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setInvoiceNo(data.invoice_no || `INV-${Math.floor(Math.random()*90000)}`);
      setJcNo(data.job_card_no || `JC${Math.floor(Math.random()*900)}`);
      setLabourAmount(String(data.labour_amount || 0));
      setPartsAmount(String(data.parts_amount || 0));
      setCustomerName(data.customer_name || "");
      setCustomerMobile(data.customer_mobile || "");
      setVrn(data.vrn || "");
      setChassisNo(data.chassis_no || "");
      setEngineNo(data.engine_no || "");
      setMileage(String(data.mileage || 0));
      if (data.invoice_date) setInvoiceDate(data.invoice_date);

      // Match tech names to IDs
      const ids: number[] = [];
      if (data.assigned_technicians && Array.isArray(data.assigned_technicians)) {
        data.assigned_technicians.forEach((name: string) => {
          const match = employees.find(e => e.full_name.toLowerCase().includes(name.toLowerCase()));
          if (match) ids.push(match.employee_id);
        });
      }
      if (ids.length > 0) setSelectedTechs(ids);

      setSuccessMsg("AI Engine successfully extracted CRM DMS parameters!");
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to process invoice via Gemini AI.");
    } finally {
      setLoading(false);
    }
  };

  // Toggle technicians selected
  const handleToggleTech = (id: number) => {
    if (selectedTechs.includes(id)) {
      setSelectedTechs(selectedTechs.filter(t => t !== id));
    } else {
      setSelectedTechs([...selectedTechs, id]);
    }
  };

  // Calculate split weightage live using our engine
  const liveAllocations = useMemo(() => {
    const totalLabour = parseFloat(labourAmount) || 0;
    const techsInput = selectedTechs.map(id => {
      const emp = employees.find(e => e.employee_id === id);
      return {
        employee_id: id,
        full_name: emp ? emp.full_name : "Unknown",
        role: emp ? emp.role : "Technician",
        employee_grade: emp ? emp.employee_grade : "Junior",
        basic_salary: emp ? emp.basic_salary : 0
      };
    });
    return calculateRevenueAllocation(0, techsInput, totalLabour);
  }, [selectedTechs, labourAmount, employees]);

  // A. Vehicle Service History Query Lookup
  const searchHistory = useMemo(() => {
    if (!vrnSearch) return [];
    return jobCards.filter(jc => jc.vrn.toLowerCase().trim() === vrnSearch.toLowerCase().trim());
  }, [vrnSearch, jobCards]);

  // B. Auto-Fill JC Form Simulator Lookup
  const handleSimulateAutoFill = () => {
    if (!autoFillVrn) return;
    // Find the latest completed/invoiced job card for this VRN to clone details from
    const matched = [...jobCards]
      .filter(jc => jc.vrn.toLowerCase().trim() === autoFillVrn.toLowerCase().trim())
      .sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
    if (matched.length > 0) {
      const latest = matched[0];
      setAutoFilledData({
        customer_name: latest.customer_name,
        customer_mobile: latest.customer_mobile,
        vehicle_model: latest.vehicle_model,
        vehicle_make: latest.vehicle_make || "Tata",
        vin: latest.vin || "MAT451092M810931",
        engine_no: latest.remarks?.includes("Engine:") ? latest.remarks.split("Engine:")[1].trim() : "TATA312N8820",
        last_km: latest.km_reading || 0,
        suggested_km: (latest.km_reading || 0) + 5000,
        remarks: latest.remarks
      });
      setSuccessMsg(`Auto-filled vehicle profile for ${latest.vrn}!`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } else {
      setErrorMsg(`No service history found for VRN ${autoFillVrn}`);
      setTimeout(() => setErrorMsg(null), 3000);
    }
  };

  // C. Commit Productivity Report database submit
  const handleCommitToDatabase = async () => {
    setLoading(true);
    try {
      // 1. Create/Find a Job Card
      // We will POST to /api/job-cards
      const resJc = await fetch("/api/job-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_card_no: jcNo,
          vrn: vrn,
          customer_name: customerName,
          customer_mobile: customerMobile,
          vehicle_model: vehicleModelFromString(vrn),
          vehicle_year: 2024,
          km_reading: parseInt(mileage),
          sr_type_id: 1,
          job_description: `[CRM DMS BILL IMPORT - ${invoiceNo}]`,
          priority: "Normal",
          vin: chassisNo,
          remarks: `Engine: ${engineNo}. Invoice Ref: ${invoiceNo}. Raw Parts: ₹${partsAmount}`
        })
      });

      const jcData = await resJc.json();
      if (!jcData.job_id) {
        throw new Error(jcData.error || "Failed to create or link Job Card record");
      }

      // 2. Assign selected technicians to this Job Card
      await fetch(`/api/job-cards/${jcData.job_id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_ids: selectedTechs
        })
      });

      // 3. Post the revenue value and trigger the split calculation
      const resRev = await fetch(`/api/job-cards/${jcData.job_id}/revenue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          labour_amount: parseFloat(labourAmount),
          parts_amount: parseFloat(partsAmount)
        })
      });

      const revData = await resRev.json();
      if (revData.error) throw new Error(revData.error);

      // 4. Update the job status to Invoiced (Paid/Finalized)
      await fetch(`/api/job-cards/${jcData.job_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "Invoiced"
        })
      });

      setSuccessMsg(`Invoice ${invoiceNo} finalized in DB! Total labour split: ₹${labourAmount} recorded.`);
      onRefresh(); // refresh dashboard roster metrics!
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to save invoice record.");
    } finally {
      setLoading(false);
    }
  };

  const vehicleModelFromString = (vrnStr: string) => {
    return "Tata Nexon";
  };

  // D. Customer Experience Rating & Stats
  const cxMetrics = useMemo(() => {
    if (!vrn) return null;
    const visits = jobCards.filter(jc => jc.vrn.toLowerCase().trim() === vrn.toLowerCase().trim());
    const visitCount = visits.length;
    let loyaltyTier = "Bronze";
    if (visitCount >= 5) loyaltyTier = "Gold";
    else if (visitCount >= 3) loyaltyTier = "Silver";

    const lastVisit = visits.length > 0 ? visits[0].created_at : "None";

    return {
      visitCount,
      loyaltyTier,
      lastVisit,
      careRecommendation: visitCount > 3 
        ? "Priority checkup. Offer 10% loyalty discount on synthetic oil."
        : "Welcome back campaign candidate. Remind them of roadside assistance."
    };
  }, [vrn, jobCards]);

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-4 flex items-center gap-3 text-xs font-semibold animate-pulse">
          <Check className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-4 flex items-center gap-3 text-xs font-semibold">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Grid: Left Panel (OCR + Form Editor) and Right Panel (Scenario Weights Live & Storage Purposes) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left 5 Cols: Ingest DMS Invoice via OCR or Sample templates */}
        <div className="lg:col-span-5 space-y-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5">
              <Upload className="h-4 w-4 text-orange-500" />
              1. CRM DMS Ingestion Panel
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Upload completed invoices for processing</p>
          </div>

          {/* Quick Sample Buttons */}
          <div className="space-y-2">
            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Click a Sample Invoice to Load Instantly</label>
            <div className="grid grid-cols-2 gap-2">
              {sampleInvoices.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => handleLoadSample(s)}
                  className="px-2 py-1.5 text-left bg-slate-50 hover:bg-orange-50 hover:border-orange-200 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 transition-all flex items-center justify-between"
                >
                  <span className="truncate">{s.label}</span>
                  <ArrowRight className="h-3 w-3 text-slate-400 shrink-0 ml-1" />
                </button>
              ))}
            </div>
          </div>

          <div className="relative border border-dashed border-slate-300 hover:border-orange-500 rounded-xl p-5 transition-all bg-slate-50/50 flex flex-col items-center justify-center space-y-3">
            <Upload className="h-8 w-8 text-slate-400" />
            <div className="text-center">
              <span className="text-[10px] font-extrabold text-slate-600 block uppercase">Drag and Drop PDF / Image Invoice Here</span>
              <span className="text-[9px] font-bold text-slate-400 block uppercase mt-0.5">or paste text to extract</span>
            </div>
            <textarea
              rows={3}
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Paste raw invoice CRM text copy-pasted from DMS screen..."
              className="w-full text-[10px] p-2 border border-slate-200 rounded bg-white font-mono focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
            />
            <button
              onClick={handleAiExtract}
              disabled={loading}
              className="w-full py-2 bg-slate-900 hover:bg-slate-950 text-white rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 text-orange-400 animate-spin-slow" />
              {loading ? "Parsing CRM document..." : "Process Invoice with Gemini OCR"}
            </button>
          </div>

          {/* Extracted Form Editor */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <h4 className="text-[10px] font-black uppercase text-slate-800 tracking-wider">Review Extracted Invoice Data</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Invoice No</label>
                <input 
                  type="text" 
                  value={invoiceNo}
                  onChange={(e) => setInvoiceNo(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs font-bold focus:bg-white"
                />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">JC No</label>
                <input 
                  type="text" 
                  value={jcNo}
                  onChange={(e) => setJcNo(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs font-bold focus:bg-white"
                />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Labour Charges (₹)</label>
                <input 
                  type="number" 
                  value={labourAmount}
                  onChange={(e) => setLabourAmount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs font-bold font-mono focus:bg-white"
                />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Parts Value (₹)</label>
                <input 
                  type="number" 
                  value={partsAmount}
                  onChange={(e) => setPartsAmount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs font-bold font-mono focus:bg-white"
                />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">VRN (Vehicle Reg)</label>
                <input 
                  type="text" 
                  value={vrn}
                  onChange={(e) => setVrn(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs font-bold focus:bg-white"
                />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Mileage (Odo KM)</label>
                <input 
                  type="number" 
                  value={mileage}
                  onChange={(e) => setMileage(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs font-bold focus:bg-white"
                />
              </div>
              <div className="col-span-2">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Customer Name</label>
                <input 
                  type="text" 
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs font-bold focus:bg-white"
                />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Chassis No (VIN)</label>
                <input 
                  type="text" 
                  value={chassisNo}
                  onChange={(e) => setChassisNo(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-[10px] font-mono focus:bg-white"
                />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Engine No</label>
                <input 
                  type="text" 
                  value={engineNo}
                  onChange={(e) => setEngineNo(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-[10px] font-mono focus:bg-white"
                />
              </div>
            </div>

            {/* Checkbox selector for employees assigned */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Assigned Technicians (Check to include)</label>
              <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto border border-slate-200 rounded-lg p-2.5 bg-slate-50/50">
                {employees.filter(e => e.is_active).map(emp => (
                  <label key={emp.employee_id} className="flex items-center gap-2 text-[10px] font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedTechs.includes(emp.employee_id)}
                      onChange={() => handleToggleTech(emp.employee_id)}
                      className="rounded text-orange-500 focus:ring-0"
                    />
                    <span className="truncate">{emp.full_name} ({emp.employee_grade})</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right 7 Cols: Weightage split simulator & 4 storage purposes */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Dynamic Weightage Split Preview */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  2. Weightage Distribution Simulator
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Calculated splits on labour: ₹{parseFloat(labourAmount).toLocaleString() || 0}</p>
              </div>
              <span className="px-2 py-0.5 bg-slate-100 rounded text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">
                {selectedTechs.length} Technicians Assigned
              </span>
            </div>

            {/* Live split calculations */}
            <div className="divide-y divide-slate-100 border border-slate-200/70 rounded-xl overflow-hidden shadow-2xs bg-white">
              {liveAllocations.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 font-bold uppercase">
                  Select at least 1 employee to see weightage splits
                </div>
              ) : (
                liveAllocations.map((alloc, index) => {
                  const emp = employees.find(e => e.employee_id === alloc.employee_id);
                  return (
                    <div key={index} className="p-3 flex items-center justify-between hover:bg-slate-50/50">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-xs text-slate-700">
                          {alloc.full_name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-extrabold text-slate-800">{alloc.full_name}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase">{alloc.role} • {emp?.employee_grade} • Sal: ₹{emp?.basic_salary.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-xs font-black text-emerald-600">₹{alloc.split_amount.toLocaleString()}</p>
                          <p className="text-[10px] font-extrabold text-slate-500">{alloc.split_pct}% Share</p>
                        </div>
                        <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-[9px] font-black uppercase tracking-wider border border-slate-200/80">
                          {alloc.allocated_role}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Split Scenario Rule Indicator Alert */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-[10px] text-blue-900 leading-normal font-medium flex items-start gap-2 shadow-2xs">
              <AlertCircle className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-extrabold block uppercase tracking-wider text-[9px] text-blue-800">Split logic rule applied:</span>
                {selectedTechs.length === 1 && "Scenario 1: Single employee gets 100% of the labor revenue split."}
                {selectedTechs.length === 2 && "Scenario 2: Dual employees split the labor revenue 50% / 50% equally."}
                {selectedTechs.length === 3 && "Scenario 3: Triple employees split the labor revenue. The highest ranking employee (highest grade/salary) gets 40%, and the remaining two get 30% each."}
                {selectedTechs.length === 4 && "Scenario 4: Four employees split the labor revenue equally (25% each)."}
                {selectedTechs.length >= 5 && "Scenario 5: 5+ employees split the labor revenue equally."}
              </div>
            </div>
          </div>

          {/* Interactive Storage Purpose Tabs */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            
            {/* Tab navigation */}
            <div className="flex border-b border-slate-200 pb-px">
              <button
                onClick={() => setActivePurpose("a")}
                className={`w-1/4 text-center pb-2.5 text-[10px] font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                  activePurpose === "a" 
                    ? "border-orange-500 text-orange-600" 
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                A. Vehicle History
              </button>
              <button
                onClick={() => setActivePurpose("b")}
                className={`w-1/4 text-center pb-2.5 text-[10px] font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                  activePurpose === "b" 
                    ? "border-orange-500 text-orange-600" 
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                B. Auto-Fill Form
              </button>
              <button
                onClick={() => setActivePurpose("c")}
                className={`w-1/4 text-center pb-2.5 text-[10px] font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                  activePurpose === "c" 
                    ? "border-orange-500 text-orange-600" 
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                C. Roster Ratios
              </button>
              <button
                onClick={() => setActivePurpose("d")}
                className={`w-1/4 text-center pb-2.5 text-[10px] font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                  activePurpose === "d" 
                    ? "border-orange-500 text-orange-600" 
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                D. CX Insights
              </button>
            </div>

            {/* Purpose A: Vehicle Service History Query */}
            {activePurpose === "a" && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={vrnSearch}
                    onChange={(e) => setVrnSearch(e.target.value)}
                    placeholder="Enter VRN (e.g. KA-03-MG-5678)"
                    className="flex-grow bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold focus:bg-white"
                  />
                  <button 
                    onClick={() => {}}
                    className="px-3 bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-slate-950 transition-all cursor-pointer"
                  >
                    <Search className="h-3.5 w-3.5" />
                    Query CRM
                  </button>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                        <th className="p-2.5">JC No</th>
                        <th className="p-2.5">Advisor / Techs</th>
                        <th className="p-2.5">Odometer</th>
                        <th className="p-2.5">Cost</th>
                        <th className="p-2.5">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {searchHistory.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-slate-400 font-bold uppercase text-[10px]">
                            {vrnSearch ? "No service history records found for this VRN" : "Enter a VRN above to retrieve Tata Motors CRM history"}
                          </td>
                        </tr>
                      ) : (
                        searchHistory.map((jc, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="p-2.5 font-bold text-slate-900">{jc.job_card_no}</td>
                            <td className="p-2.5">
                              <p className="text-[10px] font-bold text-slate-800">{jc.service_advisor || "advisor"}</p>
                              <p className="text-[9px] text-slate-400 uppercase">{jc.technician_name || "techs"}</p>
                            </td>
                            <td className="p-2.5 font-mono">{jc.km_reading ? `${jc.km_reading.toLocaleString()} KM` : "N/A"}</td>
                            <td className="p-2.5 font-mono text-emerald-600 font-bold">₹{((jc.labor_price || 0) + (jc.parts_price || 0)).toLocaleString()}</td>
                            <td className="p-2.5 text-slate-500 font-bold">{new Date(jc.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Purpose B: Auto Fill JC Forms */}
            {activePurpose === "b" && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={autoFillVrn}
                    onChange={(e) => setAutoFillVrn(e.target.value)}
                    placeholder="Scan Plate / Enter VRN"
                    className="flex-grow bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold focus:bg-white"
                  />
                  <button
                    onClick={handleSimulateAutoFill}
                    className="px-3 bg-orange-500 text-white rounded-lg text-xs font-bold hover:bg-orange-600 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Auto-Fill JC
                  </button>
                </div>

                {autoFilledData ? (
                  <div className="bg-slate-50/60 p-4 border border-slate-200 rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                      <span className="text-[10px] font-black text-slate-800 uppercase tracking-wider block">Mock Gate Entry Form (Auto-Filled)</span>
                      <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[9px] font-extrabold uppercase">Matched CRM Profile</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-700">
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase block">Customer Name</span>
                        <p className="text-slate-800">{autoFilledData.customer_name}</p>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase block">Customer Mobile</span>
                        <p className="text-slate-800">{autoFilledData.customer_mobile}</p>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase block">Vehicle Make / Model</span>
                        <p className="text-slate-800">{autoFilledData.vehicle_make} {autoFilledData.vehicle_model}</p>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase block">Chassis (VIN)</span>
                        <p className="text-slate-800 font-mono text-[10px]">{autoFilledData.vin}</p>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase block">Previous KM</span>
                        <p className="text-slate-800">{autoFilledData.last_km.toLocaleString()} KM</p>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase block">Suggested KM Odo</span>
                        <p className="text-orange-600 font-extrabold">{autoFilledData.suggested_km.toLocaleString()} KM</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-400 border border-dashed border-slate-300 rounded-xl font-bold uppercase text-[10px]">
                    Search a returning VRN above to test the auto-fill form capability
                  </div>
                )}
              </div>
            )}

            {/* Purpose C: Save to database & Update Productivity */}
            {activePurpose === "c" && (
              <div className="space-y-4">
                <p className="text-xs text-slate-500 leading-normal font-medium">
                  Click below to finalize invoice and split calculation. This inserts the revenue and split detail rows in the database, automatically updating employee targets and productivity dashboards.
                </p>
                <button
                  onClick={handleCommitToDatabase}
                  disabled={loading || selectedTechs.length === 0}
                  className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
                >
                  <Save className="h-4 w-4" />
                  {loading ? "Writing to Database..." : "Commit Extracted Invoice & Splits"}
                </button>
              </div>
            )}

            {/* Purpose D: Customer Experience Insights */}
            {activePurpose === "d" && (
              <div className="space-y-4">
                {cxMetrics ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-slate-50 p-2.5 border border-slate-200 rounded-xl text-center">
                        <span className="text-[8px] font-extrabold text-slate-400 uppercase block">Visits Count</span>
                        <span className="text-sm font-black text-slate-800">{cxMetrics.visitCount} times</span>
                      </div>
                      <div className="bg-slate-50 p-2.5 border border-slate-200 rounded-xl text-center">
                        <span className="text-[8px] font-extrabold text-slate-400 uppercase block">Loyalty Class</span>
                        <span className="text-sm font-black text-orange-500 uppercase">{cxMetrics.loyaltyTier}</span>
                      </div>
                      <div className="bg-slate-50 p-2.5 border border-slate-200 rounded-xl text-center">
                        <span className="text-[8px] font-extrabold text-slate-400 uppercase block">Last Visited</span>
                        <span className="text-[10px] font-black text-slate-800 block truncate">{cxMetrics.lastVisit !== "None" ? new Date(cxMetrics.lastVisit).toLocaleDateString() : "None"}</span>
                      </div>
                    </div>

                    <div className="bg-orange-50/50 border border-orange-200/80 rounded-xl p-3 text-[10px] text-orange-950 font-semibold space-y-1 shadow-2xs">
                      <div className="flex items-center gap-1.5 text-orange-800">
                        <Smile className="h-4 w-4" />
                        <span className="font-extrabold uppercase tracking-wider text-[9px]">Custom Care Recommendations:</span>
                      </div>
                      <p className="leading-relaxed text-orange-900 font-medium">{cxMetrics.careRecommendation}</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-400 border border-dashed border-slate-300 rounded-xl font-bold uppercase text-[10px]">
                    Fill invoice VRN to query customer loyalty insights
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
