import React, { useState, useEffect } from "react";
import { 
  FileSpreadsheet, 
  HardDrive, 
  CheckCircle, 
  ExternalLink, 
  RefreshCw, 
  Lock,
  UserCheck,
  LogOut,
  Sparkles,
  Mail,
  Users,
  Send,
  Plus,
  Search,
  Loader2,
  FileText,
  UserPlus,
  ArrowRight
} from "lucide-react";
import { User } from "../types";
import { JobCard } from "../types";

interface GoogleIntegrationProps {
  user: User | null;
  token: string | null;
  needsAuth: boolean;
  isLoggingIn: boolean;
  onLogin: () => void;
  onLogout: () => void;
  jobCards?: JobCard[];
}

interface GmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
}

interface GoogleContact {
  resourceName: string;
  fullName: string;
  email: string;
  phone: string;
}

export default function GoogleIntegration({
  user,
  token,
  needsAuth,
  isLoggingIn,
  onLogin,
  onLogout,
  jobCards = []
}: GoogleIntegrationProps) {
  // Tabs: backup, gmail, contacts
  const [activeSubTab, setActiveSubTab] = useState<"backup" | "gmail" | "contacts">("backup");

  // --- Backup States ---
  const [exportingSheets, setExportingSheets] = useState(false);
  const [sheetsUrl, setSheetsUrl] = useState<string | null>(null);
  const [exportingDrive, setExportingDrive] = useState(false);
  const [driveFileId, setDriveFileId] = useState<string | null>(null);

  // --- Gmail States ---
  const [emails, setEmails] = useState<GmailMessage[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{ success: boolean; msg: string } | null>(null);

  // Gmail Compose Form State
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [templateType, setTemplateType] = useState<"welcome" | "progress" | "ready" | "custom">("welcome");

  // --- Contacts States ---
  const [contacts, setContacts] = useState<GoogleContact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [savingContact, setSavingContact] = useState(false);
  const [contactStatus, setContactStatus] = useState<{ success: boolean; msg: string } | null>(null);

  // New Contact Form State
  const [newContactFirstName, setNewContactFirstName] = useState("");
  const [newContactLastName, setNewContactLastName] = useState("");
  const [newContactEmail, setNewContactEmail] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");

  // --- Effects ---
  useEffect(() => {
    if (token) {
      if (activeSubTab === "gmail") {
        fetchEmails();
      } else if (activeSubTab === "contacts") {
        fetchContacts();
      }
    }
  }, [token, activeSubTab]);

  // --- Google Sheets Sync ---
  const handleExportSheets = async () => {
    if (!token) {
      alert("Please sign in with Google to enable sheets export.");
      return;
    }
    setExportingSheets(true);
    setSheetsUrl(null);

    try {
      const response = await fetch("/api/google/export-sheets", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();
      if (data.success && data.url) {
        setSheetsUrl(data.url);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Export to Google Sheets failed: ${err.message || "Unknown error"}`);
    } finally {
      setExportingSheets(false);
    }
  };

  // --- Google Drive Backup ---
  const handleExportDrive = async () => {
    if (!token) {
      alert("Please sign in with Google to enable drive backup.");
      return;
    }
    setExportingDrive(true);
    setDriveFileId(null);

    try {
      const response = await fetch("/api/google/export-drive", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();
      if (data.success && data.fileId) {
        setDriveFileId(data.fileId);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Drive backup failed: ${err.message || "Unknown error"}`);
    } finally {
      setExportingDrive(false);
    }
  };

  // --- Gmail Handlers ---
  const fetchEmails = async () => {
    setLoadingEmails(true);
    try {
      const res = await fetch("/api/google/gmail/list", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEmails(data);
      } else {
        console.error("Failed to fetch emails", await res.text());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingEmails(false);
    }
  };

  const handleJobSelectForEmail = (jobIdStr: string) => {
    setSelectedJobId(jobIdStr);
    if (!jobIdStr) {
      setEmailTo("");
      setEmailSubject("");
      setEmailBody("");
      return;
    }

    const job = jobCards.find(j => j.job_id === parseInt(jobIdStr));
    if (job) {
      // Pre-populate customer info
      setEmailTo(""); // Since we don't have customer email, we let user type it
      updateEmailTemplate(templateType, job);
    }
  };

  const updateEmailTemplate = (type: typeof templateType, job: JobCard) => {
    setTemplateType(type);
    if (!job) return;

    if (type === "welcome") {
      setEmailSubject(`[WMS Repair Update] Job Card Received: ${job.job_card_no}`);
      setEmailBody(
        `Dear ${job.customer_name},\n\n` +
        `This is to update you that your vehicle ${job.vehicle_make} ${job.vehicle_model} [Reg No: ${job.vrn}] has been received at our workshop under Job Card Number ${job.job_card_no}.\n\n` +
        `Our team is starting the diagnosis/servicing based on the description: "${job.job_description}".\n` +
        `The priority of this repair is set to ${job.priority}.\n\n` +
        `We will keep you informed of our progress. If you have any immediate questions, feel free to contact us.\n\n` +
        `Best regards,\n` +
        `WMS Service Team`
      );
    } else if (type === "progress") {
      setEmailSubject(`[WMS Repair Update] Repair In Progress: ${job.job_card_no}`);
      setEmailBody(
        `Dear ${job.customer_name},\n\n` +
        `This is a quick update regarding your vehicle ${job.vehicle_make} ${job.vehicle_model} [Reg No: ${job.vrn}].\n\n` +
        `Our technicians are actively working on the repairs. Status is currently: "${job.status}".\n` +
        `The Estimated Time of Delivery (ETD) is scheduled for ${new Date(job.etd).toLocaleString()}.\n\n` +
        `We are working diligently to deliver your vehicle on time.\n\n` +
        `Best regards,\n` +
        `WMS Service Team`
      );
    } else if (type === "ready") {
      setEmailSubject(`[WMS Repair Update] Your vehicle is Ready! Job Card: ${job.job_card_no}`);
      setEmailBody(
        `Dear ${job.customer_name},\n\n` +
        `Excellent news! The service and repair work on your vehicle ${job.vehicle_make} ${job.vehicle_model} [Reg No: ${job.vrn}] has been successfully COMPLETED.\n\n` +
        `All specified concerns have been addressed. The vehicle is ready for pick up at your earliest convenience.\n\n` +
        `Thank you for choosing WMS Workshop!\n\n` +
        `Best regards,\n` +
        `WMS Service Team`
      );
    } else {
      setEmailSubject(`[WMS Workshop Update] Vehicle ${job.vrn}`);
      setEmailBody(`Dear ${job.customer_name},\n\n[Write your custom update message here]\n\nBest regards,\nWMS Service Team`);
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailTo || !emailSubject || !emailBody) {
      alert("Please fill in all email fields (To, Subject, Body).");
      return;
    }

    // MANDATORY USER CONFIRMATION DIALOG for sending emails/mutating user data!
    const confirmed = window.confirm(
      `Confirm Action:\nAre you sure you want to send this status update email to "${emailTo}" via Gmail?`
    );
    if (!confirmed) return;

    setSendingEmail(true);
    setEmailStatus(null);

    try {
      const res = await fetch("/api/google/gmail/send", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          to: emailTo,
          subject: emailSubject,
          body: emailBody
        })
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      setEmailStatus({ success: true, msg: "Status email sent successfully through Gmail!" });
      // Reset compose form
      setEmailTo("");
      setEmailSubject("");
      setEmailBody("");
      setSelectedJobId("");
      fetchEmails(); // Reload email list
    } catch (err: any) {
      console.error(err);
      setEmailStatus({ success: false, msg: `Failed to send email: ${err.message || "Unknown error"}` });
    } finally {
      setSendingEmail(false);
    }
  };

  // --- Google Contacts Handlers ---
  const fetchContacts = async () => {
    setLoadingContacts(true);
    try {
      const res = await fetch("/api/google/contacts/list", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setContacts(data);
      } else {
        console.error("Failed to fetch contacts", await res.text());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingContacts(false);
    }
  };

  const handlePrefillContactFromJob = (jobIdStr: string) => {
    if (!jobIdStr) return;
    const job = jobCards.find(j => j.job_id === parseInt(jobIdStr));
    if (job) {
      const nameParts = job.customer_name.trim().split(/\s+/);
      const first = nameParts[0] || "";
      const last = nameParts.slice(1).join(" ") || "";
      setNewContactFirstName(first);
      setNewContactLastName(last);
      setNewContactPhone(job.customer_mobile);
      setNewContactEmail("");
    }
  };

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactFirstName && !newContactLastName) {
      alert("Please provide at least a First Name or Last Name for the contact.");
      return;
    }

    // MANDATORY USER CONFIRMATION DIALOG for mutating/adding contact data!
    const confirmed = window.confirm(
      `Confirm Action:\nAre you sure you want to save "${newContactFirstName} ${newContactLastName}" to your Google Contacts list?`
    );
    if (!confirmed) return;

    setSavingContact(true);
    setContactStatus(null);

    try {
      const res = await fetch("/api/google/contacts/create", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          firstName: newContactFirstName,
          lastName: newContactLastName,
          email: newContactEmail,
          phone: newContactPhone
        })
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      setContactStatus({ success: true, msg: "Contact saved to Google Contacts successfully!" });
      // Reset form
      setNewContactFirstName("");
      setNewContactLastName("");
      setNewContactEmail("");
      setNewContactPhone("");
      fetchContacts(); // Reload contacts list
    } catch (err: any) {
      console.error(err);
      setContactStatus({ success: false, msg: `Failed to save contact: ${err.message || "Unknown error"}` });
    } finally {
      setSavingContact(false);
    }
  };

  const filteredContacts = contacts.filter(contact => {
    const query = contactSearch.toLowerCase();
    return (
      contact.fullName.toLowerCase().includes(query) ||
      contact.email.toLowerCase().includes(query) ||
      contact.phone.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-xl font-bold text-slate-900 uppercase tracking-tight flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-indigo-600 animate-pulse" />
          Google Workspace Hub
        </h1>
        <p className="text-xs text-slate-500 font-medium">
          Manage live repair update emails, keep contacts synced, and perform database/sheets syncs seamlessly.
        </p>
      </div>

      {/* Auth panel */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        <div className="md:col-span-2 space-y-2">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${user ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`}></span>
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              {user ? "Authenticated with Google" : "Google Integration Offline"}
            </h2>
          </div>
          <p className="text-xs text-slate-500 max-w-lg leading-relaxed font-medium">
            {user 
              ? "Your session is fully authorized to access Sheets, Drive, Gmail, and Google Contacts. Use the tabs below to manage your Workspace integrations."
              : "To sync workshop logs, send customer repair updates via Gmail, and manage contacts, please authorize the application using your Google Workspace account."
            }
          </p>
          {user && (
            <div className="text-[10px] text-slate-400 font-mono space-y-0.5 font-bold">
              <p>Operator: @{user.username}</p>
              <p>Active Scopes: sheets, drive.file, gmail.send, contacts</p>
            </div>
          )}
        </div>

        <div className="md:col-span-1 flex justify-center md:justify-end">
          {user ? (
            <button 
              onClick={onLogout}
              className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold px-4 py-2 rounded-lg transition-all shadow-xs cursor-pointer"
            >
              <LogOut className="h-4 w-4 text-slate-400" />
              Sign Out Session
            </button>
          ) : (
            <button 
              onClick={onLogin}
              disabled={isLoggingIn}
              className="gsi-material-button w-full sm:w-auto"
              style={{
                background: "white",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                padding: "8px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)",
                transition: "background .15s, box-shadow .15s"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: "block", width: "18px", height: "18px" }}>
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                </svg>
                <span style={{ fontSize: "13px", fontWeight: "600", fontFamily: "Inter, sans-serif", color: "#334155" }}>
                  {isLoggingIn ? "Signing in..." : "Sign in with Google"}
                </span>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Sub tabs navigation */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveSubTab("backup")}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeSubTab === "backup" 
              ? "border-indigo-600 text-indigo-600 bg-indigo-50/20" 
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <HardDrive className="h-4 w-4" />
            Sheets & Drive Backup
          </span>
        </button>
        <button
          onClick={() => setActiveSubTab("gmail")}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeSubTab === "gmail" 
              ? "border-indigo-600 text-indigo-600 bg-indigo-50/20" 
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Mail className="h-4 w-4" />
            Gmail Assistant
          </span>
        </button>
        <button
          onClick={() => setActiveSubTab("contacts")}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeSubTab === "contacts" 
              ? "border-indigo-600 text-indigo-600 bg-indigo-50/20" 
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            Contacts Manager
          </span>
        </button>
      </div>

      {/* Tab Panels */}
      <div>
        
        {/* BACKUP TAB */}
        {activeSubTab === "backup" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
            {/* Google Sheets Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between h-72">
              <div className="space-y-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Synchronize with Google Sheets</h3>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed font-medium">
                    Build and update spreadsheets dynamically. Export current active job card reports, parts summaries, and employee split shares directly with permission.
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-3">
                {sheetsUrl && (
                  <a 
                    href={sheetsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-bold text-emerald-600 hover:underline flex items-center gap-1.5"
                  >
                    Open Spreadsheet in Google Sheets
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}

                <button 
                  onClick={handleExportSheets}
                  disabled={!user || exportingSheets}
                  className={`w-full py-2.5 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 border shadow-xs ${
                    !user 
                      ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                      : exportingSheets
                        ? "bg-orange-500/10 text-orange-600 border-orange-500/20"
                        : "bg-emerald-600 hover:bg-emerald-700 border-emerald-700 text-white cursor-pointer"
                  }`}
                >
                  {exportingSheets ? (
                    <>
                      <FunnySpinner className="h-4 w-4" />
                      Generating Spreadsheet...
                    </>
                  ) : (
                    <>
                      {!user && <Lock className="h-3.5 w-3.5" />}
                      Export Logs to Google Sheets
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Google Drive Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between h-72">
              <div className="space-y-3">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-600 flex items-center justify-center">
                  <HardDrive className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Google Drive Secure Backup</h3>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed font-medium">
                    Save daily automated backups of your JSON database logs, technician timesheets, and DMS match tables securely in your personal Google Drive folder.
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-3">
                {driveFileId && (
                  <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1.5">
                    <CheckCircle className="h-4 w-4" />
                    Backup created in Google Drive! File ID: {driveFileId}
                  </span>
                )}

                <button 
                  onClick={handleExportDrive}
                  disabled={!user || exportingDrive}
                  className={`w-full py-2.5 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 border shadow-xs ${
                    !user 
                      ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                      : exportingDrive
                        ? "bg-orange-500/10 text-orange-600 border-orange-500/20"
                        : "bg-blue-600 hover:bg-blue-700 border-blue-700 text-white cursor-pointer"
                  }`}
                >
                  {exportingDrive ? (
                    <>
                      <FunnySpinner className="h-4 w-4" />
                      Creating Backup...
                    </>
                  ) : (
                    <>
                      {!user && <Lock className="h-3.5 w-3.5" />}
                      Backup Database to Drive
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* GMAIL TAB */}
        {activeSubTab === "gmail" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
            {!user ? (
              <div className="lg:col-span-12 bg-slate-50 border border-slate-200 rounded-xl p-10 text-center space-y-4">
                <Lock className="h-10 w-10 text-slate-300 mx-auto" />
                <h3 className="font-bold text-slate-800 text-sm uppercase">Gmail Integration Offline</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Please sign in with Google using the button at the top of the page to load recent workshop emails and enable automated customer repair updates.
                </p>
              </div>
            ) : (
              <>
                {/* Compose Form */}
                <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <Send className="h-4 w-4 text-indigo-600" />
                    <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Send Customer Repair Update</h3>
                  </div>

                  {emailStatus && (
                    <div className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 ${emailStatus.success ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-red-50 text-red-700 border border-red-100"}`}>
                      {emailStatus.success ? <CheckCircle className="h-4 w-4 shrink-0" /> : <Lock className="h-4 w-4 shrink-0" />}
                      <span>{emailStatus.msg}</span>
                    </div>
                  )}

                  <form onSubmit={handleSendEmail} className="space-y-4">
                    {/* Job Card Selection */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Select Active Job Card</label>
                      <select
                        value={selectedJobId}
                        onChange={(e) => handleJobSelectForEmail(e.target.value)}
                        className="w-full bg-slate-50 hover:bg-slate-100/50 border border-slate-200 rounded-lg p-2.5 text-xs font-semibold focus:outline-hidden focus:border-indigo-500 transition-all"
                      >
                        <option value="">-- Choose Job Card to Prefill --</option>
                        {jobCards.map(job => (
                          <option key={job.job_id} value={job.job_id}>
                            {job.job_card_no} - {job.customer_name} ({job.vrn})
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedJobId && (
                      <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100 rounded-lg">
                        <button
                          type="button"
                          onClick={() => updateEmailTemplate("welcome", jobCards.find(j => j.job_id === parseInt(selectedJobId))!)}
                          className={`py-1.5 text-[9px] font-bold uppercase rounded-md transition-all cursor-pointer ${templateType === "welcome" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
                        >
                          Received
                        </button>
                        <button
                          type="button"
                          onClick={() => updateEmailTemplate("progress", jobCards.find(j => j.job_id === parseInt(selectedJobId))!)}
                          className={`py-1.5 text-[9px] font-bold uppercase rounded-md transition-all cursor-pointer ${templateType === "progress" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
                        >
                          Progress
                        </button>
                        <button
                          type="button"
                          onClick={() => updateEmailTemplate("ready", jobCards.find(j => j.job_id === parseInt(selectedJobId))!)}
                          className={`py-1.5 text-[9px] font-bold uppercase rounded-md transition-all cursor-pointer ${templateType === "ready" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
                        >
                          Ready
                        </button>
                        <button
                          type="button"
                          onClick={() => setTemplateType("custom")}
                          className={`py-1.5 text-[9px] font-bold uppercase rounded-md transition-all cursor-pointer ${templateType === "custom" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
                        >
                          Custom
                        </button>
                      </div>
                    )}

                    {/* Recipient Email */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Customer Email Address</label>
                      <input
                        type="email"
                        required
                        placeholder="customer@example.com"
                        value={emailTo}
                        onChange={(e) => setEmailTo(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-semibold focus:outline-hidden focus:border-indigo-500 transition-all"
                      />
                    </div>

                    {/* Email Subject */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Subject</label>
                      <input
                        type="text"
                        required
                        placeholder="Subject of the email"
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-semibold focus:outline-hidden focus:border-indigo-500 transition-all"
                      />
                    </div>

                    {/* Email Body */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email Content</label>
                      <textarea
                        required
                        rows={7}
                        placeholder="Write your email details here..."
                        value={emailBody}
                        onChange={(e) => setEmailBody(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-semibold font-sans focus:outline-hidden focus:border-indigo-500 transition-all leading-relaxed"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={sendingEmail}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 rounded-lg flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                    >
                      {sendingEmail ? (
                        <>
                          <FunnySpinner className="h-4 w-4" />
                          Sending Email via Gmail...
                        </>
                      ) : (
                        <>
                          <Send className="h-3.5 w-3.5" />
                          Send Status Email
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* Email History/Inbox */}
                <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-indigo-600" />
                        <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Recent Gmail Messages</h3>
                      </div>
                      <button
                        onClick={fetchEmails}
                        disabled={loadingEmails}
                        className="text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        {loadingEmails ? <FunnySpinner className="h-3 w-3" /> : <RefreshCw className="h-3 w-3" />}
                        Reload Messages
                      </button>
                    </div>

                    {loadingEmails ? (
                      <div className="py-20 text-center space-y-2">
                        <FunnySpinner className="h-8 w-8 text-indigo-600  mx-auto" />
                        <p className="text-xs text-slate-500 font-medium">Loading messages from Gmail inbox...</p>
                      </div>
                    ) : emails.length === 0 ? (
                      <div className="py-20 text-center text-slate-400 font-medium text-xs">
                        No recent messages loaded.
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                        {emails.map((email) => (
                          <div key={email.id} className="bg-slate-50/50 hover:bg-slate-50 border border-slate-150 rounded-xl p-3.5 transition-all space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-indigo-600 max-w-[180px] truncate">{email.from}</span>
                              <span className="text-[9px] text-slate-400 font-mono font-medium">{new Date(email.date).toLocaleDateString()}</span>
                            </div>
                            <h4 className="font-bold text-slate-800 text-xs">{email.subject}</h4>
                            <p className="text-[11px] text-slate-500 font-medium line-clamp-2 leading-relaxed">{email.snippet}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="pt-4 border-t border-slate-100 text-[10px] text-slate-400 font-mono font-bold">
                    * Showing up to 10 most recent messages. All emails sent or listed are connected to your authorized Google Gmail profile.
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* CONTACTS TAB */}
        {activeSubTab === "contacts" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
            {!user ? (
              <div className="lg:col-span-12 bg-slate-50 border border-slate-200 rounded-xl p-10 text-center space-y-4">
                <Lock className="h-10 w-10 text-slate-300 mx-auto" />
                <h3 className="font-bold text-slate-800 text-sm uppercase">Google Contacts Integration Offline</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Please sign in with Google using the button at the top of the page to load your Google Contacts or save customers directly to Google Contacts.
                </p>
              </div>
            ) : (
              <>
                {/* Save Contact / Add Form */}
                <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <UserPlus className="h-4 w-4 text-indigo-600" />
                    <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Add to Google Contacts</h3>
                  </div>

                  {contactStatus && (
                    <div className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 ${contactStatus.success ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-red-50 text-red-700 border border-red-100"}`}>
                      {contactStatus.success ? <CheckCircle className="h-4 w-4 shrink-0" /> : <Lock className="h-4 w-4 shrink-0" />}
                      <span>{contactStatus.msg}</span>
                    </div>
                  )}

                  {/* Auto-Prefill Shortcut */}
                  <div className="bg-indigo-50/40 border border-indigo-100 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-700 uppercase tracking-wider">
                      <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                      Quick Prefill from Workshop Customers
                    </div>
                    <select
                      onChange={(e) => handlePrefillContactFromJob(e.target.value)}
                      defaultValue=""
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:outline-hidden"
                    >
                      <option value="">-- Choose Workshop Customer --</option>
                      {jobCards.map(job => (
                        <option key={job.job_id} value={job.job_id}>
                          {job.customer_name} ({job.customer_mobile})
                        </option>
                      ))}
                    </select>
                  </div>

                  <form onSubmit={handleCreateContact} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">First Name</label>
                        <input
                          type="text"
                          required
                          value={newContactFirstName}
                          onChange={(e) => setNewContactFirstName(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-semibold focus:outline-hidden focus:border-indigo-500 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Last Name</label>
                        <input
                          type="text"
                          value={newContactLastName}
                          onChange={(e) => setNewContactLastName(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-semibold focus:outline-hidden focus:border-indigo-500 transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email Address (Optional)</label>
                      <input
                        type="email"
                        value={newContactEmail}
                        onChange={(e) => setNewContactEmail(e.target.value)}
                        placeholder="e.g., customer@email.com"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-semibold focus:outline-hidden focus:border-indigo-500 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Phone Number (Optional)</label>
                      <input
                        type="tel"
                        value={newContactPhone}
                        onChange={(e) => setNewContactPhone(e.target.value)}
                        placeholder="e.g., +919999999999"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-semibold focus:outline-hidden focus:border-indigo-500 transition-all"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={savingContact}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 rounded-lg flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                    >
                      {savingContact ? (
                        <>
                          <FunnySpinner className="h-4 w-4" />
                          Saving Contact...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4" />
                          Save to Google Contacts
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* Contacts Directory List */}
                <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-3">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-indigo-600" />
                        <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Your Google Contacts Directory</h3>
                      </div>
                      <button
                        onClick={fetchContacts}
                        disabled={loadingContacts}
                        className="text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer self-end sm:self-auto"
                      >
                        {loadingContacts ? <FunnySpinner className="h-3 w-3" /> : <RefreshCw className="h-3 w-3" />}
                        Reload Connections
                      </button>
                    </div>

                    {/* Search Field */}
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search directory by name, email, or phone..."
                        value={contactSearch}
                        onChange={(e) => setContactSearch(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs font-semibold focus:outline-hidden focus:border-indigo-500 transition-all"
                      />
                    </div>

                    {loadingContacts ? (
                      <div className="py-20 text-center space-y-2">
                        <FunnySpinner className="h-8 w-8 text-indigo-600  mx-auto" />
                        <p className="text-xs text-slate-500 font-medium">Loading Google Contacts...</p>
                      </div>
                    ) : filteredContacts.length === 0 ? (
                      <div className="py-20 text-center text-slate-400 font-medium text-xs">
                        No contacts found. Use the form to add some!
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                        {filteredContacts.map((c) => (
                          <div key={c.resourceName} className="flex items-center justify-between bg-slate-50/50 hover:bg-slate-50 border border-slate-150 rounded-xl p-3 transition-all">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 font-bold text-xs flex items-center justify-center">
                                {c.fullName.charAt(0).toUpperCase()}
                              </div>
                              <div className="space-y-0.5">
                                <h4 className="font-bold text-slate-800 text-xs">{c.fullName}</h4>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-[10px] text-slate-400 font-bold">
                                  {c.email && <span>Email: <span className="font-mono">{c.email}</span></span>}
                                  {c.phone && <span>Phone: <span className="font-mono">{c.phone}</span></span>}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="pt-4 border-t border-slate-100 text-[10px] text-slate-400 font-mono font-bold">
                    * Total loaded: {contacts.length} contacts. Automatically synced to your authorized Google Account.
                  </div>
                </div>
              </>
            )}
          </div>
        )}

      </div>

    </div>
  );
}
