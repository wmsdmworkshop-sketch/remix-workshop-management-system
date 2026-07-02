// app/routes/diagnostics.tsx
import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import { useState } from "react";
import { db } from "~/utils/db.server";

// Fetch open job cards so the user can select which car they are working on
export async function loader({ request }: LoaderFunctionArgs) {
    const jobCards = await db.jobCardMaster.findMany({
        take: 10,
        orderBy: { created_at: "desc" },
        select: {
            job_card_id: true,
            job_card_no: true,
            vehicle_reg: true,
            customer_name: true,
        }
    });
    return json({ jobCards });
}

export default function DiagnosticsPanel() {
    const { jobCards } = useLoaderData<typeof loader>();
    const fetcher = useFetcher<{ success: boolean; error?: string; updatedJobCard?: any }>();

    const [selectedId, setSelectedId] = useState("");
    const [notes, setNotes] = useState("");

    const isLoading = fetcher.state !== "idle";

    return (
        <div style={{ maxWidth: "800px", margin: "40px auto", fontFamily: "sans-serif", padding: "20px" }}>
            <div style={{ background: "#1e293b", color: "white", padding: "20px", borderRadius: "12px", marginBottom: "24px" }}>
                <h1 style={{ margin: 0, fontSize: "24px" }}>🤖 DWIP AI Diagnostic Assistant</h1>
                <p style={{ margin: "5px 0 0 0", color: "#94a3b8" }}>
                    Powered by Google Gemma 2 • Real-Time Semantic Database Injection
                </p>
            </div>

            <div style={{ display: "grid", gap: "20px" }}>
                {/* Step 1: Select Vehicle */}
                <div>
                    <label style={{ display: "block", fontWeight: "bold", marginBottom: "8px" }}>
                        1. Select Active Vehicle Job Card:
                    </label>
                    <select
                        value={selectedId}
                        onChange={(e) => setSelectedId(e.target.value)}
                        style={{ width: "100%", padding: "12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "16px" }}
                    >
                        <option value="">-- Choose a Vehicle / Job Card --</option>
                        {jobCards.map((jc) => (
                            <option key={jc.job_card_id} value={jc.job_card_id}>
                                {jc.vehicle_reg} - {jc.customer_name} ({jc.job_card_no})
                            </option>
                        ))}
                    </select>
                </div>

                {/* Step 2: Unstructured Notes */}
                <div>
                    <label style={{ display: "block", fontWeight: "bold", marginBottom: "8px" }}>
                        2. Type Raw Diagnostic Shorthand:
                    </label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="e.g., customer complaining about squeaking sound from front wheels. inspect front disc pads, probably worn down. estimate 45m labor. client wants it urgent high priority."
                        rows={5}
                        style={{ width: "100%", padding: "12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "16px", fontFamily: "sans-serif" }}
                    />
                </div>

                {/* Step 3: Trigger Parsing Action */}
                <button
                    onClick={() => {
                        if (!selectedId || !notes) {
                            alert("Please select a vehicle and enter diagnostic notes first!");
                            return;
                        }
                        fetcher.submit(
                            { jobCardId: selectedId, notes },
                            { method: "POST", action: "/api/parse-diagnostics" }
                        );
                    }}
                    disabled={isLoading || !selectedId || !notes}
                    style={{
                        background: isLoading ? "#94a3b8" : "#2563eb",
                        color: "white",
                        padding: "14px",
                        border: "none",
                        borderRadius: "6px",
                        fontSize: "16px",
                        fontWeight: "bold",
                        cursor: isLoading ? "not-allowed" : "pointer",
                        transition: "background 0.2s"
                    }}
                >
                    {isLoading ? "🔄 Gemma 2 Processing Notes..." : "⚡ Run AI Parse & Inject to Database"}
                </button>

                {/* Step 4: Display Output Logs */}
                {fetcher.data && (
                    <div style={{ marginTop: "24px", padding: "20px", borderRadius: "8px", border: "1px solid", borderColor: fetcher.data.success ? "#bbf7d0" : "#fecaca", background: fetcher.data.success ? "#f0fdf4" : "#fef2f2" }}>
                        <h3 style={{ margin: "0 0 10px 0", color: fetcher.data.success ? "#16a34a" : "#dc2626" }}>
                            {fetcher.data.success ? "✅ Database Updated Successfully" : "❌ Processing Error"}
                        </h3>

                        {fetcher.data.success && fetcher.data.updatedJobCard ? (
                            <div>
                                <p><strong>Updated DB Record Details:</strong></p>
                                <ul style={{ margin: "0", paddingLeft: "20px" }}>
                                    <li><strong>Service Type:</strong> {fetcher.data.updatedJobCard.service_type}</li>
                                    <li><strong>Priority Status:</strong> {fetcher.data.updatedJobCard.priority}</li>
                                    <li><strong>Extracted Delay Notes:</strong> {fetcher.data.updatedJobCard.delay_notes}</li>
                                </ul>
                            </div>
                        ) : (
                            <p>{fetcher.data.error || "Details are unavailable."}</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}