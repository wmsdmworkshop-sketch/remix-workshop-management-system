import React, { useState, useEffect, useMemo } from "react";
import { 
  Database, UploadCloud, Download, Plus, Edit, Trash2, CheckCircle, 
  AlertTriangle, RefreshCw, Layers, Sliders, Play, Server, UserCheck, 
  Users, Key, Truck, ShieldAlert, Award, FileSpreadsheet, PlayCircle
} from "lucide-react";

interface Profile {
  profile_id: number;
  profile_name: string;
  profile_version: string;
  mapping_json: Record<string, string>;
  mandatory_fields_json: string[];
  optional_fields_json: string[];
  validation_rules_json: Record<string, string>;
  is_active: number;
}

const DEFAULT_IMPORT_PROFILES: Profile[] = [
  {
    profile_id: 1,
    profile_name: "Employee Roster & Workforce Import",
    profile_version: "v2.0",
    mapping_json: { "full_name": "full_name", "role": "role", "salary": "salary", "employee_code": "employee_code" },
    mandatory_fields_json: ["full_name", "role"],
    optional_fields_json: ["salary"],
    validation_rules_json: {},
    is_active: 1
  },
  {
    profile_id: 2,
    profile_name: "Parts & Inventory Catalogue",
    profile_version: "v1.5",
    mapping_json: { "part_number": "part_number", "part_name": "part_name", "unit_price": "unit_price", "category": "category" },
    mandatory_fields_json: ["part_number", "part_name"],
    optional_fields_json: ["unit_price"],
    validation_rules_json: {},
    is_active: 1
  },
  {
    profile_id: 3,
    profile_name: "Vehicle Master Registry",
    profile_version: "v2.1",
    mapping_json: { "vrn": "vrn", "customer_name": "customer_name", "customer_mobile": "customer_mobile", "make": "make", "model": "model" },
    mandatory_fields_json: ["vrn", "customer_name"],
    optional_fields_json: ["customer_mobile", "model"],
    validation_rules_json: {},
    is_active: 1
  },
  {
    profile_id: 4,
    profile_name: "Historical Job Cards & Invoices",
    profile_version: "v2.0",
    mapping_json: { "job_card_no": "job_card_no", "vrn": "vrn", "amount": "amount", "date_in": "date_in" },
    mandatory_fields_json: ["job_card_no", "vrn"],
    optional_fields_json: ["amount"],
    validation_rules_json: {},
    is_active: 1
  }
];

export default function EnterpriseMasterDataHub() {
  // Navigation & Tabs
  const [activeWorkspace, setActiveWorkspace] = useState<"dashboard" | "crud" | "import" | "readiness">("dashboard");
  const [selectedDomain, setSelectedDomain] = useState<string>("dealers");

  // Core Data States
  const [dealers, setDealers] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [parts, setParts] = useState<any[]>([]);
  const [labour, setLabour] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [warranties, setWarranties] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [importProfiles, setImportProfiles] = useState<Profile[]>(DEFAULT_IMPORT_PROFILES);

  // UI Loaders
  const [loading, setLoading] = useState(false);
  const [seedingLoading, setSeedingLoading] = useState(false);

  // CRUD Forms State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [formData, setFormData] = useState<any>({});

  // Reusable Import Center States
  const [dragActive, setDragActive] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<number | "">(1);
  const [importedRows, setImportedRows] = useState<any[]>([]);
  const [mappedHeaders, setMappedHeaders] = useState<Record<string, string>>({});
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
  const [importStep, setImportStep] = useState(1);
  const [dryRunReport, setDryRunReport] = useState<any | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [uploadFileName, setUploadFileName] = useState("");

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState("");

  // ==========================================
  // API LOAD DATA
  // ==========================================
  const loadMasterData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("dwip_token") || localStorage.getItem("token") || localStorage.getItem("wms_token") || "";
      const headers = token ? { "Authorization": `Bearer ${token}` } : {};

      const fetchDomain = async (url: string) => {
        try {
          const res = await fetch(url, { headers });
          if (!res.ok) return [];
          const contentType = res.headers.get("content-type") || "";
          if (!contentType.includes("application/json")) {
            console.warn(`[MasterDataHub] Non-JSON response from ${url}:`, contentType);
            return [];
          }
          return await res.json();
        } catch (e) {
          console.error(`[MasterDataHub] Failed to fetch ${url}:`, e);
          return [];
        }
      };

      const [dl, br, pt, lb, cp, wr, prf, emp, veh, cust] = await Promise.all([
        fetchDomain("/api/master/dealers"),
        fetchDomain("/api/master/branches"),
        fetchDomain("/api/master/parts"),
        fetchDomain("/api/master/labour"),
        fetchDomain("/api/master/complaints"),
        fetchDomain("/api/master/warranty-codes"),
        fetchDomain("/api/master/import-profiles"),
        fetchDomain("/api/employees"),
        fetchDomain("/api/master/vehicles"),
        fetch("/api/customer/passports", { headers })
          .then(async r => {
            if (!r.ok) return [];
            const contentType = r.headers.get("content-type") || "";
            if (!contentType.includes("application/json")) return [];
            const d = await r.json();
            return d.passports || [];
          })
          .catch(e => {
            console.error("[MasterDataHub] Failed to fetch customer passports:", e);
            return [];
          })
      ]);

      setDealers(dl);
      setBranches(br);
      setParts(pt);
      setLabour(lb);
      setComplaints(cp);
      setWarranties(wr);
      const activePrfList = Array.isArray(prf) && prf.length > 0 ? prf : DEFAULT_IMPORT_PROFILES;
      setImportProfiles(activePrfList);
      if (!selectedProfileId && activePrfList.length > 0) {
        setSelectedProfileId(activePrfList[0].profile_id);
      }
      setEmployees(emp);
      setCustomers(cust);
      setVehicles(veh);
    } catch (err) {
      console.error("Failed to load master data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMasterData();
  }, []);

  const activeProfile = useMemo(() => {
    return importProfiles.find(p => p.profile_id === Number(selectedProfileId)) || null;
  }, [importProfiles, selectedProfileId]);

  // ==========================================
  // CRUD ACTIONS
  // ==========================================
  const getToken = () => localStorage.getItem("dwip_token") || localStorage.getItem("token") || localStorage.getItem("wms_token") || "";

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getToken();
    const headers: any = { 
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {})
    };

    let url = `/api/master/${selectedDomain}`;
    let method = "POST";

    if (editingItem) {
      const id = editingItem.dealer_id || editingItem.branch_id || editingItem.part_id || editingItem.labour_id || editingItem.complaint_id || editingItem.warranty_code_id;
      url = `${url}/${id}`;
      method = "PUT";
    }

    try {
      const res = await fetch(url, { method, headers, body: JSON.stringify(formData) });
      const contentType = res.headers.get("content-type") || "";

      if (res.ok) {
        setShowAddModal(false);
        setEditingItem(null);
        setFormData({});
        loadMasterData();
      } else {
        let errorMsg = `HTTP ${res.status}`;
        if (contentType.includes("application/json")) {
          const errData = await res.json();
          errorMsg = errData.error || errData.message || errorMsg;
        } else {
          errorMsg = "Server API returned invalid response page.";
        }

        alert(
          `⚠️ Unable to save record: ${errorMsg}\n\n` +
          `Correction Steps:\n` +
          `1. Ensure your account has 'Admin' or 'User Management' authorization.\n` +
          `2. Check that mandatory fields (Code & Name) are properly filled.\n` +
          `3. Re-login if your session timed out, then click 'Save Record' again.`
        );
      }
    } catch (e: any) {
      console.error(e);
      alert(
        `⚠️ Network error: ${e.message || "Failed to reach backend server"}\n\n` +
        `Correction Steps:\n` +
        `1. Verify network connectivity.\n` +
        `2. Refresh browser and try saving again.`
      );
    }
  };

  const handleDelete = async (domain: string, id: any) => {
    if (!confirm("Are you sure you want to delete this master record?")) return;
    const token = getToken();
    const headers = token ? { "Authorization": `Bearer ${token}` } : {};

    try {
      const res = await fetch(`/api/master/${domain}/${id}`, { method: "DELETE", headers });
      if (res.ok) {
        loadMasterData();
      } else {
        alert("Failed to delete record. Please ensure you are logged in with admin credentials.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  // ==========================================
  // SAMPLE DATA SEEDER
  // ==========================================
  const triggerSampleSeeding = async () => {
    if (dealers.length > 0 || parts.length > 0 || customers.length > 0) {
      alert("Database already contains master data. Seeding is locked to prevent overwriting pilot data.");
      return;
    }

    setSeedingLoading(true);
    try {
      const token = getToken();
      const headers: any = {
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {})
      };

      // 1. Seed Dealers
      await fetch("/api/master/dealers", {
        method: "POST",
        headers,
        body: JSON.stringify({ dealer_code: "DEALER-DEV", dealer_name: "Devanand Automobiles LLP", is_active: 1 })
      });
      const dlRes = await fetch("/api/master/dealers", { headers });
      const dlList = await dlRes.json();
      const devDealer = dlList.find((d: any) => d.dealer_code === "DEALER-DEV");

      if (devDealer) {
        // Seed Branch
        await fetch("/api/master/branches", {
          method: "POST",
          headers,
          body: JSON.stringify({ branch_code: "BR-MAIN", branch_name: "Devanand Automobiles Main Workshop", dealer_id: devDealer.dealer_id, is_active: 1 })
        });
      }

      // 2. Generate 500 Parts
      const sampleParts = Array.from({ length: 500 }, (_, i) => ({
        part_number: `TML-PART-${1000 + i}`,
        part_name: `Tata Commercial Part Spec ${i + 1}`,
        price: Math.round(150 + Math.random() * 5000),
        stock_qty: Math.round(5 + Math.random() * 200),
        is_active: 1
      }));

      // 3. Generate 150 Labour
      const sampleLabour = Array.from({ length: 150 }, (_, i) => ({
        labour_code: `LAB-OP-${200 + i}`,
        description: `Periodic Labour Routine Operational Grade ${i + 1}`,
        std_hours: Number((0.5 + Math.random() * 5.5).toFixed(2)),
        rate_per_hour: 450.00,
        is_active: 1
      }));

      // Bulk Upload
      await fetch("/api/master/bulk-import", {
        method: "POST",
        headers,
        body: JSON.stringify({ profileName: "Part Profile", rows: sampleParts })
      });

      await fetch("/api/master/bulk-import", {
        method: "POST",
        headers,
        body: JSON.stringify({ profileName: "Labour Profile", rows: sampleLabour })
      });

      alert("Sample Pilot Data seeded successfully! Loaded 1 Dealer, 1 Branch, 500 Parts, and 150 Labour Operations.");
      loadMasterData();
    } catch (e: any) {
      console.error(e);
      alert("Error during seeding: " + e.message);
    } finally {
      setSeedingLoading(false);
    }
  };

  // ==========================================
  // REUSABLE IMPORT PROCESSOR
  // ==========================================
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      processFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    setUploadFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseContent(text);
    };
    reader.readAsText(file);
  };

  const parseContent = (text: string) => {
    const cleanText = text.replace(/\0/g, "").trim();
    if (!cleanText) return alert("The uploaded file is empty.");

    const rawLines = cleanText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (rawLines.length === 0) return alert("No valid text lines parsed.");

    // Detect delimiter
    const firstLine = rawLines[0];
    const isTab = firstLine.includes("\t");
    const delimiter = isTab ? "\t" : ",";

    const parseLine = (line: string) => {
      if (isTab) return line.split("\t").map(c => c.trim().replace(/^["']|["']$/g, ""));
      // Comma splitting with quote safety
      const result: string[] = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') inQuotes = !inQuotes;
        else if (char === ',' && !inQuotes) {
          result.push(current.trim().replace(/^["']|["']$/g, ""));
          current = "";
        } else current += char;
      }
      result.push(current.trim().replace(/^["']|["']$/g, ""));
      return result;
    };

    const headers = parseLine(firstLine);
    setDetectedHeaders(headers);

    const rows: any[] = [];
    for (let i = 1; i < rawLines.length; i++) {
      const cells = parseLine(rawLines[i]);
      if (cells.length < headers.length) continue;
      const rowObj: any = {};
      headers.forEach((h, idx) => {
        rowObj[h] = cells[idx];
      });
      rows.push(rowObj);
    }

    setImportedRows(rows);

    // Dynamic pre-mapping logic based on profile mapping
    if (activeProfile) {
      const autoMap: Record<string, string> = {};
      headers.forEach(h => {
        const matchedField = activeProfile.mapping_json[h] || activeProfile.mapping_json[h.toLowerCase().trim()];
        if (matchedField) autoMap[h] = matchedField;
        else autoMap[h] = "";
      });
      setMappedHeaders(autoMap);
    }

    setImportStep(2);
  };

  const downloadCsvTemplate = (profileId?: number | string) => {
    const targetId = Number(profileId || selectedProfileId);
    const profile = importProfiles.find(p => p.profile_id === targetId) || activeProfile;

    let csvContent = "";
    let filename = "Import_Template.csv";

    if (!profile || profile.profile_name.includes("Employee")) {
      filename = "Employee_Roster_Import_Template.csv";
      csvContent = 
`full_name,employee_code,role,mobile,email,salary,is_active
ABDUL GANI SHEK,EMP001,Breakdown Assistant,9876543210,abdul.gani@devanand.com,18080,1
ALTAF HUSSAIN,EMP002,Jr Technician,9876543211,altaf.hussain@devanand.com,16480,1
ASHFAQ HUSSAIN,EMP003,Jr Technician,9876543212,ashfaq.hussain@devanand.com,18000,1
ASIF,EMP004,Electrician,9876543213,asif@devanand.com,15040,1
FAKIRAAPA,EMP005,Sr Electrician,9876543214,fakiraapa@devanand.com,25000,1
MUSTAFA,EMP018,Service Advisor,9876543217,mustafa@devanand.com,12000,1`;
    } else if (profile.profile_name.includes("Parts")) {
      filename = "Parts_Catalogue_Import_Template.csv";
      csvContent = 
`part_number,part_name,category,unit_price,stock_qty,location,min_order_qty
TML-OIL-FILTER-01,Tata Ace Genuine Oil Filter,Filters,350.00,45,Rack-A1,5
TML-BRAKE-PAD-02,Brake Pad Set Front,Brakes,1250.00,20,Rack-B3,2
TML-CLUTCH-DISC-03,Clutch Disc Assembly 200mm,Clutch,2450.00,12,Rack-C2,1
TML-AIR-FILTER-04,Commercial Air Filter Heavy Duty,Filters,680.00,30,Rack-A2,5`;
    } else if (profile.profile_name.includes("Vehicle")) {
      filename = "Vehicle_Master_Registry_Template.csv";
      csvContent = 
`vrn,chassis_no,engine_no,make,model,manufacture_year,owner_name,owner_mobile
KA32A1234,MAT401011N1234567,ENG908123456,Tata Motors,Ace Gold,2023,Dhanraj Motors,9845012345
KA32B5678,MAT401012N7654321,ENG908654321,Tata Motors,Intra V30,2024,Suresh Transport,9845098765
KA32C9999,MAT401013N9999999,ENG908999999,Tata Motors,Yodha 1700,2022,Karnataka Logistics,9845088888`;
    } else {
      filename = "Historical_JobCards_Invoices_Template.csv";
      csvContent = 
`job_card_no,vrn,customer_name,customer_mobile,service_advisor,technician,creation_date,labor_amount,parts_amount,total_amount,status
JC-2026-0001,KA32A1234,Dhanraj Motors,9845012345,MUSTAFA,ALTAF HUSSAIN,2026-07-20,1200.00,350.00,1550.00,Completed
JC-2026-0002,KA32B5678,Suresh Transport,9845098765,SHASHIKUMAR,FAKIRAAPA,2026-07-22,2450.00,1250.00,3700.00,Completed
JC-2026-0003,KA32C9999,Karnataka Logistics,9845088888,MUSTAFA,MALLINATH,2026-07-25,850.00,680.00,1530.00,In-Progress`;
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportDryRun = async () => {
    if (!activeProfile) return alert("Please select an import profile.");

    // Transform imported row keys using the header mapping UI selections
    const mappedRows = importedRows.map(row => {
      const mappedRow: any = {};
      Object.keys(row).forEach(k => {
        const dbField = mappedHeaders[k];
        if (dbField) mappedRow[dbField] = row[k];
      });
      return mappedRow;
    });

    try {
      const token = localStorage.getItem("wms_token");
      const res = await fetch("/api/master/bulk-import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          profileName: activeProfile.profile_name,
          profileVersion: activeProfile.profile_version,
          rows: mappedRows,
          dryRun: true
        })
      });

      const data = await res.json();
      setDryRunReport(data);
      setImportStep(3);
    } catch (e: any) {
      alert("Dry run failed: " + e.message);
    }
  };

  const executeBulkImport = async () => {
    if (!activeProfile || !dryRunReport) return;

    // Transform imported row keys
    const mappedRows = importedRows.map(row => {
      const mappedRow: any = {};
      Object.keys(row).forEach(k => {
        const dbField = mappedHeaders[k];
        if (dbField) mappedRow[dbField] = row[k];
      });
      return mappedRow;
    });

    setImportProgress(10);
    const interval = setInterval(() => setImportProgress(p => Math.min(p + 15, 90)), 300);

    try {
      const token = getToken();
      const res = await fetch("/api/master/bulk-import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          profileName: activeProfile.profile_name,
          profileVersion: activeProfile.profile_version,
          rows: mappedRows,
          dryRun: false
        })
      });

      clearInterval(interval);
      setImportProgress(100);

      const data = await res.json();
      if (data.success) {
        alert(`Successfully imported ${data.importedCount} records into ${activeProfile.profile_name}!`);
        setImportStep(1);
        setImportedRows([]);
        setDryRunReport(null);
        loadMasterData();
      } else {
        alert("Import failed. Review the dry-run checklist and try again.");
      }
    } catch (e: any) {
      clearInterval(interval);
      alert("Error committing import: " + e.message);
    }
  };

  // ==========================================
  // PILOT READINESS DATA COMPUTATION
  // ==========================================
  const readinessStats = useMemo(() => {
    const stats = {
      dealers: dealers.length > 0,
      branches: branches.length > 0,
      parts: parts.length > 0,
      labour: labour.length > 0,
      employees: employees.length > 0,
      customers: customers.length > 0,
      vehicles: vehicles.length > 0,
      totalPercent: 0
    };

    let matched = 0;
    const totalMasters = 7;
    if (stats.dealers) matched++;
    if (stats.branches) matched++;
    if (stats.parts) matched++;
    if (stats.labour) matched++;
    if (stats.employees) matched++;
    if (stats.customers) matched++;
    if (stats.vehicles) matched++;

    stats.totalPercent = Math.round((matched / totalMasters) * 100);
    return stats;
  }, [dealers, branches, parts, labour, employees, customers, vehicles]);

  // Dynamic row rendering depending on active CRUD selection
  const activeDomainData = useMemo(() => {
    let dataList = [];
    if (selectedDomain === "dealers") dataList = dealers;
    else if (selectedDomain === "branches") dataList = branches;
    else if (selectedDomain === "parts") dataList = parts;
    else if (selectedDomain === "labour") dataList = labour;
    else if (selectedDomain === "complaints") dataList = complaints;
    else if (selectedDomain === "warranty-codes") dataList = warranties;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      dataList = dataList.filter(item => 
        Object.values(item).some(val => String(val || "").toLowerCase().includes(q))
      );
    }
    return dataList;
  }, [selectedDomain, dealers, branches, parts, labour, complaints, warranties, searchTerm]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-6 mb-8">
        <div className="flex items-center gap-3">
          <Database className="h-8 w-8 text-orange-500 animate-pulse" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Enterprise Master Data Hub</h1>
            <p className="text-slate-400 text-sm">Devanand Automobiles LLP · Pilot Control Station</p>
          </div>
        </div>

        <div className="flex gap-4">
          <button 
            onClick={() => setActiveWorkspace("dashboard")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeWorkspace === "dashboard" ? "bg-orange-600 text-white" : "bg-slate-900 text-slate-400 hover:text-slate-200"}`}
          >
            Dashboard
          </button>
          <button 
            onClick={() => setActiveWorkspace("crud")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeWorkspace === "crud" ? "bg-orange-600 text-white" : "bg-slate-900 text-slate-400 hover:text-slate-200"}`}
          >
            Master CRUD
          </button>
          <button 
            onClick={() => setActiveWorkspace("import")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeWorkspace === "import" ? "bg-orange-600 text-white" : "bg-slate-900 text-slate-400 hover:text-slate-200"}`}
          >
            Import Center
          </button>
          <button 
            onClick={() => setActiveWorkspace("readiness")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeWorkspace === "readiness" ? "bg-orange-600 text-white" : "bg-slate-900 text-slate-400 hover:text-slate-200"}`}
          >
            Pilot Readiness
          </button>
        </div>
      </div>

      {/* DASHBOARD WORKSPACE */}
      {activeWorkspace === "dashboard" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="col-span-2 bg-slate-900/60 border border-slate-800 rounded-xl p-6 backdrop-blur-sm">
            <h2 className="text-lg font-bold text-white mb-4">Master Data Sync Overview</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: "Dealers", count: dealers.length, icon: Layers },
                { label: "Branches", count: branches.length, icon: Sliders },
                { label: "Parts Catalog", count: parts.length, icon: FileSpreadsheet },
                { label: "Labour Ops", count: labour.length, icon: RefreshCw },
                { label: "Complaints", count: complaints.length, icon: ShieldAlert },
                { label: "Warranty Rules", count: warranties.length, icon: Award },
                { label: "Customers", count: customers.length, icon: Users },
                { label: "Vehicles", count: vehicles.length, icon: Truck },
                { label: "Employees", count: employees.length, icon: UserCheck }
              ].map(domain => (
                <div key={domain.label} className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-4 flex flex-col justify-between">
                  <div className="flex justify-between items-center text-slate-400 text-xs mb-2">
                    <span>{domain.label}</span>
                    <domain.icon className="h-4 w-4 text-orange-500" />
                  </div>
                  <span className="text-xl font-bold text-white">{domain.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-bold text-white mb-2">Pilot Initialization</h2>
              <p className="text-slate-400 text-sm mb-4">Click below to generate initial pilot masters (Parts, Labour, and Dealers) if the local database state is completely blank.</p>
            </div>
            
            <button
              onClick={triggerSampleSeeding}
              disabled={seedingLoading || dealers.length > 0}
              className={`w-full py-3 rounded-lg flex items-center justify-center gap-2 font-semibold transition-all ${
                dealers.length > 0 
                  ? "bg-slate-800 text-slate-500 cursor-not-allowed" 
                  : "bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white"
              }`}
            >
              {seedingLoading ? <RefreshCw className="h-5 w-5 animate-spin" /> : <PlayCircle className="h-5 w-5" />}
              Seed Sample Pilot Data
            </button>
          </div>
        </div>
      )}

      {/* CRUD WORKSPACE */}
      {activeWorkspace === "crud" && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Domain sidebar */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex flex-col gap-2">
            {[
              { id: "dealers", label: "Dealer Master" },
              { id: "branches", label: "Branch Master" },
              { id: "parts", label: "Parts Master" },
              { id: "labour", label: "Labour Master" },
              { id: "complaints", label: "Complaint Master" },
              { id: "warranty-codes", label: "Warranty Master" }
            ].map(d => (
              <button
                key={d.id}
                onClick={() => { setSelectedDomain(d.id); setSearchTerm(""); }}
                className={`w-full text-left px-4 py-2.5 rounded-lg text-sm transition-all ${selectedDomain === d.id ? "bg-orange-600 text-white" : "text-slate-400 hover:bg-slate-800"}`}
              >
                {d.label}
              </button>
            ))}
          </div>

          {/* Grid view */}
          <div className="md:col-span-3 bg-slate-900/60 border border-slate-800 rounded-xl p-6">
            <div className="flex justify-between items-center mb-6">
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search master records..."
                className="bg-slate-950 border border-slate-850 px-4 py-2 rounded-lg text-sm w-64 text-white focus:outline-none"
              />
              <button
                onClick={() => { setEditingItem(null); setFormData({}); setShowAddModal(true); }}
                className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Record
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs">
                    <th className="pb-3 px-2">ID</th>
                    <th className="pb-3 px-2">Primary Info</th>
                    <th className="pb-3 px-2">Detail Code</th>
                    <th className="pb-3 px-2">Status</th>
                    <th className="pb-3 px-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activeDomainData.map((item: any, idx) => {
                    const id = item.dealer_id || item.branch_id || item.part_id || item.labour_id || item.complaint_id || item.warranty_code_id;
                    const primary = item.dealer_name || item.branch_name || item.part_name || item.description || item.complaint_code;
                    const code = item.dealer_code || item.branch_code || item.part_number || item.labour_code || item.warranty_code || "N/A";
                    return (
                      <tr key={idx} className="border-b border-slate-800/40 text-sm hover:bg-slate-800/20">
                        <td className="py-3 px-2 text-slate-500">{id}</td>
                        <td className="py-3 px-2 text-white font-medium">{primary}</td>
                        <td className="py-3 px-2 text-slate-400">{code}</td>
                        <td className="py-3 px-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${item.is_active ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                            {item.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => { setEditingItem(item); setFormData(item); setShowAddModal(true); }}
                              className="text-slate-400 hover:text-white p-1"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(selectedDomain, id)}
                              className="text-red-400 hover:text-red-300 p-1"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
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

      {/* REUSABLE IMPORT CENTER */}
      {activeWorkspace === "import" && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-bold text-white">Import Configuration Center</h2>
              <p className="text-slate-400 text-sm">Map templates and run dry-run validation checks before committing data.</p>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => downloadCsvTemplate()}
                className="px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer shrink-0"
                title="Download sample CSV template for the selected profile"
              >
                <Download className="h-4 w-4" />
                <span>Download Sample CSV Template</span>
              </button>

              <select
                value={selectedProfileId}
                onChange={e => { setSelectedProfileId(e.target.value); setImportStep(1); }}
                className="bg-slate-950 border border-slate-850 px-4 py-2.5 rounded-lg text-sm text-white focus:outline-none"
              >
                <option value="">Select Target Profile...</option>
                {importProfiles.map(p => (
                  <option key={p.profile_id} value={p.profile_id}>
                    {p.profile_name} ({p.profile_version})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedProfileId ? (
            <div className="mt-4">
              {importStep === 1 && (
                <div className="space-y-6">
                  <div 
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center transition-all ${
                      dragActive ? "border-orange-500 bg-orange-500/5" : "border-slate-800 hover:border-slate-700 bg-slate-950/40"
                    }`}
                  >
                    <UploadCloud className="h-12 w-12 text-slate-500 mb-4 animate-bounce" />
                    <p className="text-white font-medium mb-1">Drag and drop your template file here</p>
                    <p className="text-slate-500 text-xs mb-4">Supports CSV, TSV, or standard TXT files</p>
                    
                    <div className="flex items-center gap-3">
                      <label className="bg-slate-900 hover:bg-slate-800 text-slate-200 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all">
                        Choose File
                        <input type="file" onChange={handleFileChange} className="hidden" accept=".csv,.tsv,.txt" />
                      </label>
                      
                      <button
                        onClick={() => downloadCsvTemplate()}
                        className="bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 border border-orange-500/30 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Download className="h-4 w-4" />
                        <span>Download Active Profile Template</span>
                      </button>
                    </div>
                  </div>

                  {/* Template Quick Download Section */}
                  <div className="bg-slate-950/60 border border-slate-850 p-4 rounded-xl">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4 text-orange-500" />
                      <span>Ready-to-Use Import CSV Templates</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {importProfiles.map(p => (
                        <div 
                          key={p.profile_id}
                          className="flex items-center justify-between p-3 bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-lg text-xs transition-all"
                        >
                          <div>
                            <span className="font-bold text-slate-200 block">{p.profile_name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">Profile Version: {p.profile_version}</span>
                          </div>
                          <button
                            onClick={() => downloadCsvTemplate(p.profile_id)}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-orange-400 font-bold rounded-md flex items-center gap-1 transition-all cursor-pointer"
                          >
                            <Download className="h-3.5 w-3.5" />
                            <span>CSV</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {importStep === 2 && (
                <div>
                  <h3 className="text-md font-bold text-white mb-4">Header Mapping UI Preview</h3>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    {detectedHeaders.map(h => (
                      <div key={h} className="bg-slate-950 border border-slate-850 p-4 rounded-lg flex items-center justify-between">
                        <span className="text-slate-300 text-sm font-medium">{h}</span>
                        <select
                          value={mappedHeaders[h] || ""}
                          onChange={e => setMappedHeaders({ ...mappedHeaders, [h]: e.target.value })}
                          className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded text-xs text-white"
                        >
                          <option value="">Do Not Import</option>
                          {activeProfile && Object.keys(activeProfile.mapping_json).map(key => {
                            const dbField = activeProfile.mapping_json[key];
                            return (
                              <option key={dbField} value={dbField}>
                                {dbField}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end gap-3">
                    <button onClick={() => setImportStep(1)} className="px-4 py-2 bg-slate-900 hover:bg-slate-800 rounded-lg text-sm">
                      Back
                    </button>
                    <button onClick={handleImportDryRun} className="px-4 py-2 bg-orange-600 hover:bg-orange-500 rounded-lg text-sm font-semibold">
                      Run Dry-Run Check
                    </button>
                  </div>
                </div>
              )}

              {importStep === 3 && dryRunReport && (
                <div>
                  <h3 className="text-md font-bold text-white mb-4">Dry-Run Validation Report</h3>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-slate-950 border border-slate-850 p-4 rounded-lg text-center">
                      <p className="text-slate-400 text-xs">Total Processed</p>
                      <p className="text-2xl font-bold text-white">{dryRunReport.totalProcessed}</p>
                    </div>
                    <div className="bg-slate-950 border border-slate-850 p-4 rounded-lg text-center">
                      <p className="text-slate-400 text-xs">Valid Records</p>
                      <p className="text-2xl font-bold text-green-400">{dryRunReport.totalProcessed - dryRunReport.errors.length}</p>
                    </div>
                    <div className="bg-slate-950 border border-slate-850 p-4 rounded-lg text-center">
                      <p className="text-slate-400 text-xs">Anomalies Detected</p>
                      <p className="text-2xl font-bold text-red-400">{dryRunReport.errors.length}</p>
                    </div>
                  </div>

                  {dryRunReport.errors.length > 0 ? (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
                      <div className="flex gap-2 items-center text-red-400 font-bold mb-2">
                        <AlertTriangle className="h-5 w-5" />
                        <span>Validation Anomalies Encountered</span>
                      </div>
                      <div className="max-h-40 overflow-y-auto text-xs text-red-300/80 flex flex-col gap-2">
                        {dryRunReport.errors.map((err: any, idx: number) => (
                          <div key={idx}>
                            Row {err.rowNumber}: {err.messages.join(", ")}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-6 flex gap-2 items-center text-green-400 font-bold">
                      <CheckCircle className="h-5 w-5" />
                      <span>All rows verified successfully. No anomalies detected!</span>
                    </div>
                  )}

                  <div className="flex justify-end gap-3">
                    <button onClick={() => setImportStep(2)} className="px-4 py-2 bg-slate-900 hover:bg-slate-800 rounded-lg text-sm">
                      Adjust Mapping
                    </button>
                    <button
                      onClick={executeBulkImport}
                      disabled={dryRunReport.errors.length > 0}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                        dryRunReport.errors.length > 0 
                          ? "bg-slate-800 text-slate-500 cursor-not-allowed" 
                          : "bg-orange-600 hover:bg-orange-500 text-white"
                      }`}
                    >
                      Commit to Production
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-10 text-slate-500 text-sm">
              Please choose a profile to begin.
            </div>
          )}
        </div>
      )}

      {/* PILOT READINESS WORKSPACE */}
      {activeWorkspace === "readiness" && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 max-w-2xl mx-auto">
          <h2 className="text-xl font-bold text-white mb-4">Pilot Readiness Scorecard</h2>
          
          <div className="flex items-center gap-6 mb-8 bg-slate-950 p-6 rounded-lg border border-slate-850">
            <div className="relative h-20 w-20 flex items-center justify-center">
              <span className="text-2xl font-bold text-white">{readinessStats.totalPercent}%</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Dealership Onboarding Health</h3>
              <p className="text-slate-400 text-sm">System checks verified for launching pilot at Devanand Automobiles Main Workshop.</p>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {[
              { label: "Dealer Master Configuration", status: readinessStats.dealers },
              { label: "Branch Master Registration", status: readinessStats.branches },
              { label: "Parts Catalog Uploaded", status: readinessStats.parts },
              { label: "Labour Operations Configured", status: readinessStats.labour },
              { label: "Employee Directory Synchronized", status: readinessStats.employees },
              { label: "Customer Master Configured", status: readinessStats.customers },
              { label: "Vehicle Registry Seeding", status: readinessStats.vehicles }
            ].map((check, idx) => (
              <div key={idx} className="flex justify-between items-center bg-slate-950 p-4 rounded-lg border border-slate-850/60">
                <span className="text-slate-300 text-sm">{check.label}</span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${check.status ? "bg-green-500/20 text-green-400" : "bg-orange-500/20 text-orange-400"}`}>
                  {check.status ? "Ready" : "Pending"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CRUD Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-white mb-4">
              {editingItem ? "Edit Master Record" : "Add Master Record"}
            </h3>
            
            <form onSubmit={handleSave} className="flex flex-col gap-4">
              {selectedDomain === "dealers" && (
                <>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Dealer Code</label>
                    <input
                      type="text"
                      required
                      value={formData.dealer_code || ""}
                      onChange={e => setFormData({ ...formData, dealer_code: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-850 px-3 py-2 rounded-lg text-sm text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Dealer Name</label>
                    <input
                      type="text"
                      required
                      value={formData.dealer_name || ""}
                      onChange={e => setFormData({ ...formData, dealer_name: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-850 px-3 py-2 rounded-lg text-sm text-white focus:outline-none"
                    />
                  </div>
                </>
              )}

              {selectedDomain === "branches" && (
                <>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Branch Code</label>
                    <input
                      type="text"
                      required
                      value={formData.branch_code || ""}
                      onChange={e => setFormData({ ...formData, branch_code: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-850 px-3 py-2 rounded-lg text-sm text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Branch Name</label>
                    <input
                      type="text"
                      required
                      value={formData.branch_name || ""}
                      onChange={e => setFormData({ ...formData, branch_name: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-850 px-3 py-2 rounded-lg text-sm text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Dealer ID Reference</label>
                    <select
                      value={formData.dealer_id || ""}
                      required
                      onChange={e => setFormData({ ...formData, dealer_id: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-850 px-3 py-2 rounded-lg text-sm text-white focus:outline-none"
                    >
                      <option value="">Choose Dealer...</option>
                      {dealers.map(d => (
                        <option key={d.dealer_id} value={d.dealer_id}>{d.dealer_name}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {selectedDomain === "parts" && (
                <>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Part Number</label>
                    <input
                      type="text"
                      required
                      value={formData.part_number || ""}
                      onChange={e => setFormData({ ...formData, part_number: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-850 px-3 py-2 rounded-lg text-sm text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Part Name</label>
                    <input
                      type="text"
                      required
                      value={formData.part_name || ""}
                      onChange={e => setFormData({ ...formData, part_name: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-850 px-3 py-2 rounded-lg text-sm text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Price (INR)</label>
                    <input
                      type="number"
                      required
                      value={formData.price || ""}
                      onChange={e => setFormData({ ...formData, price: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-850 px-3 py-2 rounded-lg text-sm text-white focus:outline-none"
                    />
                  </div>
                </>
              )}

              {selectedDomain === "labour" && (
                <>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Labour Operation Code</label>
                    <input
                      type="text"
                      required
                      value={formData.labour_code || ""}
                      onChange={e => setFormData({ ...formData, labour_code: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-850 px-3 py-2 rounded-lg text-sm text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Description</label>
                    <textarea
                      required
                      value={formData.description || ""}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-850 px-3 py-2 rounded-lg text-sm text-white focus:outline-none h-20"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Hourly Rate (INR)</label>
                    <input
                      type="number"
                      required
                      value={formData.rate_per_hour || ""}
                      onChange={e => setFormData({ ...formData, rate_per_hour: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-850 px-3 py-2 rounded-lg text-sm text-white focus:outline-none"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="text-xs text-slate-400 block mb-1">Status</label>
                <select
                  value={formData.is_active !== undefined ? formData.is_active : 1}
                  onChange={e => setFormData({ ...formData, is_active: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-850 px-3 py-2 rounded-lg text-sm text-white focus:outline-none"
                >
                  <option value={1}>Active</option>
                  <option value={0}>Inactive</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-750 rounded-lg text-sm text-slate-200">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-orange-600 hover:bg-orange-500 rounded-lg text-sm text-white font-semibold">
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
