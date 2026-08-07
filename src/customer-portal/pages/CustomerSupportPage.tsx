// ============================================================
// Customer Portal V2 — Customer Support Page
// ============================================================
// Direct contact, callback requests, complaint tickets, and FAQ.

import React, { useState } from "react";
import { requestCallback, raiseComplaint } from "../hooks/useCustomerApi";

const WORKSHOP_PHONE = "08022961234"; // Devanand Automobiles Main Workshop
const WORKSHOP_WHATSAPP = "919880012345";

const FAQ: { q: string; a: string }[] = [
  { q: "How do I track my vehicle's service status?", a: "Tap the Vehicles tab on the bottom navigation, then select your vehicle to see the real-time service timeline with step-by-step progress." },
  { q: "Can I approve an estimate online?", a: "Yes! When your estimate is ready, you'll receive a notification. Tap the notification or go to the active job card and tap 'Review & Approve Estimate'." },
  { q: "How do I pay my invoice online?", a: "Once the invoice is generated, tap 'Pay Online' in the job detail view. We accept UPI, Google Pay, PhonePe, Credit/Debit Cards, and Net Banking." },
  { q: "What is the Devanand AMC plan?", a: "Our Annual Maintenance Contract (AMC) covers routine maintenance, labour, and priority service for your vehicle. Tap the AMC tab to view plans and subscribe." },
  { q: "How do I get an emergency breakdown assist?", a: "Tap the red SOS button on your dashboard and share your location. Our breakdown team will reach you with an ETA." },
  { q: "What documents are available in the Vault?", a: "The Digital Vault stores all your Job Cards, Estimates, GST Invoices, Payment Receipts, Warranty Certificates, and AMC Contracts. You can view, print, and download them anytime." },
  { q: "How do I link my vehicle to my account?", a: "After login, you'll be shown all vehicles associated with your mobile number. Tap 'Verify & Link' and choose a verification method (OTP, chassis digits, invoice no., etc.)." },
  { q: "Can I add multiple vehicles to my account?", a: "Yes! You can verify and link all vehicles associated with your mobile number. Fleet owners can link an entire fleet and switch to Fleet Mode for bulk management." },
  { q: "Who is my Service Advisor?", a: "Your assigned advisor's name appears on each active job card. You can message or request a callback from them directly in the job detail view." },
  { q: "How do I get a warranty claim processed?", a: "Warranty claims are processed during your service visit. Go to Warranty Center to see the status of all past and current claims." },
];

export function CustomerSupportPage() {
  const [callbackForm, setCallbackForm] = useState({ name: "", mobile: "", time: "", note: "" });
  const [complaintForm, setComplaintForm] = useState({ subject: "", detail: "", severity: "medium" });
  const [activeSection, setActiveSection] = useState<"main" | "callback" | "complaint" | "faq">("main");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [error, setError] = useState("");

  const handleCallback = async () => {
    if (!callbackForm.name.trim() || !callbackForm.mobile.trim()) {
      setError("Please enter your name and mobile number.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await requestCallback(callbackForm.name, callbackForm.mobile, callbackForm.time, callbackForm.note);
      if (result.success) {
        setSuccessMsg(`✅ Callback requested! Ticket: ${result.ticketNo}. Our team will call you within 2 hours.`);
        setCallbackForm({ name: "", mobile: "", time: "", note: "" });
      } else {
        setError(result.error || "Failed to submit request.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleComplaint = async () => {
    if (!complaintForm.subject.trim()) {
      setError("Please enter a subject for your complaint.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await raiseComplaint(complaintForm.subject, complaintForm.detail, complaintForm.severity);
      if (result.success) {
        setSuccessMsg(`✅ Complaint registered! Ticket No: ${result.ticketNo}. Our team will respond within 24 hours.`);
        setComplaintForm({ subject: "", detail: "", severity: "medium" });
      } else {
        setError(result.error || "Failed to submit complaint.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      <h2 style={s.pageTitle}>💬 Customer Support</h2>

      {/* Success Message */}
      {successMsg && (
        <div style={s.successBanner}>
          <span>{successMsg}</span>
          <button style={s.dismissBtn} onClick={() => { setSuccessMsg(""); setActiveSection("main"); }}>✕</button>
        </div>
      )}

      {/* ---- Main Menu ---- */}
      {activeSection === "main" && (
        <>
          {/* Quick Contact */}
          <div style={s.card}>
            <h3 style={s.cardTitle}>📍 Devanand Automobiles Main Workshop</h3>
            <p style={s.cardSubtitle}>Authorized Tata Motors Commercial Vehicle Service Centre</p>
            <div style={s.contactBtns}>
              <a href={`tel:${WORKSHOP_PHONE}`} style={s.callBtn}>
                📞 Call Workshop
              </a>
              <a
                href={`https://wa.me/${WORKSHOP_WHATSAPP}?text=Hello,%20I%20need%20support`}
                target="_blank"
                rel="noreferrer"
                style={s.waBtn}
              >
                💬 WhatsApp
              </a>
            </div>
          </div>

          {/* Support Options */}
          <div style={s.optionsList}>
            <button style={s.optionBtn} onClick={() => { setActiveSection("callback"); setError(""); setSuccessMsg(""); }}>
              <span style={s.optionIcon}>📱</span>
              <div style={s.optionText}>
                <div style={s.optionTitle}>Request Callback</div>
                <div style={s.optionDesc}>Our team will call you back within 2 hours</div>
              </div>
              <span style={s.arrow}>›</span>
            </button>

            <button style={s.optionBtn} onClick={() => { setActiveSection("complaint"); setError(""); setSuccessMsg(""); }}>
              <span style={s.optionIcon}>📝</span>
              <div style={s.optionText}>
                <div style={s.optionTitle}>Raise a Complaint</div>
                <div style={s.optionDesc}>Register a complaint and get a resolution within 24 hrs</div>
              </div>
              <span style={s.arrow}>›</span>
            </button>

            <button style={s.optionBtn} onClick={() => setActiveSection("faq")}>
              <span style={s.optionIcon}>❓</span>
              <div style={s.optionText}>
                <div style={s.optionTitle}>Frequently Asked Questions</div>
                <div style={s.optionDesc}>Quick answers to common questions</div>
              </div>
              <span style={s.arrow}>›</span>
            </button>
          </div>
        </>
      )}

      {/* ---- Callback Form ---- */}
      {activeSection === "callback" && (
        <div style={s.formCard}>
          <button style={s.backBtn} onClick={() => setActiveSection("main")}>← Back</button>
          <h3 style={s.formTitle}>📱 Request Callback</h3>
          <p style={s.formSubtitle}>Our service advisor will call you back within 2 business hours.</p>
          {error && <div style={s.errorMsg}>⚠️ {error}</div>}
          <div style={s.fieldGroup}>
            <label style={s.label}>Your Name *</label>
            <input style={s.input} placeholder="Full name" value={callbackForm.name} onChange={(e) => setCallbackForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div style={s.fieldGroup}>
            <label style={s.label}>Mobile Number *</label>
            <input style={s.input} placeholder="+91 XXXXXXXXXX" type="tel" value={callbackForm.mobile} onChange={(e) => setCallbackForm((f) => ({ ...f, mobile: e.target.value }))} />
          </div>
          <div style={s.fieldGroup}>
            <label style={s.label}>Preferred Time</label>
            <select style={s.input} value={callbackForm.time} onChange={(e) => setCallbackForm((f) => ({ ...f, time: e.target.value }))}>
              <option value="">Any time (9 AM – 6 PM)</option>
              <option value="morning">Morning (9 AM – 12 PM)</option>
              <option value="afternoon">Afternoon (12 PM – 3 PM)</option>
              <option value="evening">Evening (3 PM – 6 PM)</option>
            </select>
          </div>
          <div style={s.fieldGroup}>
            <label style={s.label}>Message (Optional)</label>
            <textarea style={{ ...s.input, height: 80, resize: "none" }} placeholder="Brief description of your query…" value={callbackForm.note} onChange={(e) => setCallbackForm((f) => ({ ...f, note: e.target.value }))} />
          </div>
          <button style={{ ...s.submitBtn, opacity: loading ? 0.7 : 1 }} onClick={handleCallback} disabled={loading}>
            {loading ? "Submitting…" : "📱 Request Callback"}
          </button>
        </div>
      )}

      {/* ---- Complaint Form ---- */}
      {activeSection === "complaint" && (
        <div style={s.formCard}>
          <button style={s.backBtn} onClick={() => setActiveSection("main")}>← Back</button>
          <h3 style={s.formTitle}>📝 Raise a Complaint</h3>
          <p style={s.formSubtitle}>All complaints receive a response within 24 hours.</p>
          {error && <div style={s.errorMsg}>⚠️ {error}</div>}
          <div style={s.fieldGroup}>
            <label style={s.label}>Subject *</label>
            <input style={s.input} placeholder="Brief subject (e.g. 'Delay in delivery')" value={complaintForm.subject} onChange={(e) => setComplaintForm((f) => ({ ...f, subject: e.target.value }))} />
          </div>
          <div style={s.fieldGroup}>
            <label style={s.label}>Details</label>
            <textarea style={{ ...s.input, height: 100, resize: "none" }} placeholder="Describe your issue in detail…" value={complaintForm.detail} onChange={(e) => setComplaintForm((f) => ({ ...f, detail: e.target.value }))} />
          </div>
          <div style={s.fieldGroup}>
            <label style={s.label}>Priority</label>
            <select style={s.input} value={complaintForm.severity} onChange={(e) => setComplaintForm((f) => ({ ...f, severity: e.target.value }))}>
              <option value="low">Low — General feedback</option>
              <option value="medium">Medium — Needs attention</option>
              <option value="high">High — Urgent issue</option>
              <option value="critical">Critical — Blocking my operations</option>
            </select>
          </div>
          <button style={{ ...s.submitBtn, opacity: loading ? 0.7 : 1 }} onClick={handleComplaint} disabled={loading}>
            {loading ? "Submitting…" : "📝 Submit Complaint"}
          </button>
        </div>
      )}

      {/* ---- FAQ ---- */}
      {activeSection === "faq" && (
        <div>
          <button style={s.backBtn} onClick={() => setActiveSection("main")}>← Back</button>
          <h3 style={{ ...s.formTitle, margin: "0 0 14px" }}>❓ Frequently Asked Questions</h3>
          {FAQ.map((item, i) => (
            <div key={i} style={s.faqCard}>
              <button
                style={s.faqQuestion}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <span>{item.q}</span>
                <span style={s.faqChevron}>{openFaq === i ? "▲" : "▼"}</span>
              </button>
              {openFaq === i && (
                <div style={s.faqAnswer}>{item.a}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const c = { primary: "#1e3a5f", text: "#1a1a2e", textSecondary: "#64748b", border: "#e2e8f0", success: "#059669" };
const s: Record<string, React.CSSProperties> = {
  page: { paddingBottom: 32 },
  pageTitle: { fontFamily: "'Outfit', sans-serif", fontSize: 20, fontWeight: 700, color: c.text, margin: "0 0 16px" },
  successBanner: {
    background: "#dcfce7", color: "#166534", borderRadius: 12, padding: "12px 14px",
    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
    marginBottom: 16, fontSize: 14, lineHeight: 1.5,
  },
  dismissBtn: { background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#166534", flexShrink: 0 },
  card: {
    background: "#fff", borderRadius: 16, padding: 16,
    border: `1px solid ${c.border}`, marginBottom: 16,
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  },
  cardTitle: { fontFamily: "'Outfit', sans-serif", fontSize: 16, fontWeight: 700, color: c.text, margin: "0 0 4px" },
  cardSubtitle: { fontSize: 12, color: c.textSecondary, margin: "0 0 14px" },
  contactBtns: { display: "flex", gap: 8 },
  callBtn: {
    flex: 1, padding: "12px", textAlign: "center" as const,
    background: `linear-gradient(135deg, ${c.primary}, #2d5a8e)`,
    color: "#fff", borderRadius: 10, fontSize: 14, fontWeight: 700,
    textDecoration: "none", display: "block",
  },
  waBtn: {
    flex: 1, padding: "12px", textAlign: "center" as const,
    background: "linear-gradient(135deg, #25d366, #128c7e)",
    color: "#fff", borderRadius: 10, fontSize: 14, fontWeight: 700,
    textDecoration: "none", display: "block",
  },
  optionsList: { display: "flex", flexDirection: "column", gap: 8 },
  optionBtn: {
    display: "flex", alignItems: "center", gap: 12, padding: "14px 12px",
    background: "#fff", border: `1px solid ${c.border}`, borderRadius: 14,
    cursor: "pointer", textAlign: "left", width: "100%",
  },
  optionIcon: { fontSize: 26, flexShrink: 0 },
  optionText: { flex: 1 },
  optionTitle: { fontSize: 14, fontWeight: 700, color: c.text, marginBottom: 2 },
  optionDesc: { fontSize: 12, color: c.textSecondary },
  arrow: { fontSize: 22, color: c.textSecondary, flexShrink: 0 },
  formCard: { background: "#fff", borderRadius: 16, padding: 16, border: `1px solid ${c.border}` },
  backBtn: { background: "none", border: "none", color: c.primary, fontSize: 14, fontWeight: 600, cursor: "pointer", padding: "0 0 12px", display: "block" },
  formTitle: { fontFamily: "'Outfit', sans-serif", fontSize: 17, fontWeight: 700, color: c.text, margin: "0 0 6px" },
  formSubtitle: { fontSize: 13, color: c.textSecondary, margin: "0 0 16px" },
  errorMsg: { background: "#fff5f5", color: "#dc2626", borderRadius: 8, padding: "8px 12px", fontSize: 13, marginBottom: 12 },
  fieldGroup: { marginBottom: 12 },
  label: { display: "block", fontSize: 13, fontWeight: 600, color: c.text, marginBottom: 4 },
  input: {
    width: "100%", boxSizing: "border-box" as const, padding: "12px 14px",
    border: `1.5px solid ${c.border}`, borderRadius: 10, fontSize: 14, outline: "none",
    fontFamily: "'Inter', sans-serif",
  },
  submitBtn: {
    width: "100%", padding: "14px",
    background: `linear-gradient(135deg, ${c.primary}, #2d5a8e)`,
    color: "#fff", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: "pointer",
  },
  faqCard: { background: "#fff", borderRadius: 12, border: `1px solid ${c.border}`, marginBottom: 8, overflow: "hidden" },
  faqQuestion: {
    width: "100%", padding: "14px 16px", display: "flex", justifyContent: "space-between",
    alignItems: "flex-start", gap: 8, background: "none", border: "none",
    cursor: "pointer", fontSize: 14, fontWeight: 600, color: c.text, textAlign: "left",
  },
  faqChevron: { fontSize: 12, color: c.textSecondary, flexShrink: 0, marginTop: 2 },
  faqAnswer: {
    padding: "0 16px 14px", fontSize: 13, color: c.textSecondary,
    lineHeight: 1.6, borderTop: `1px solid ${c.border}`,
  },
};
