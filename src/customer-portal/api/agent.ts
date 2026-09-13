// ==========================================
// Customer Portal — AI Agent (Function Calling)
// ==========================================
// Engineered for security and token efficiency (NVIDIA Nemotron).
// Enforces:
// 1. Data Isolation: Tool results strictly scoped to customer_id.
// 2. Token Management: Short responses and JSON-only lookups.
// 3. Data Snippets: Uses specific context snippets for explanations.

import { callNemotron, isNemotronConfigured, parseJsonReply } from "../../config/nemotron";
import { sanitizeJobCard, verifyJobOwnership } from "./sanitizer";
import { getQueryCache, setQueryCache } from "./cache";
import type { CustomerJobView } from "../types";


// System Prompt ensuring short responses, JSON function triggers, and context compliance
const SYSTEM_PROMPT = `Act as a Service Assistant for Devanand Motors. 
Constraint 1: Never reveal internal staff names, profit margins, costs, or delays.
Constraint 2: Respond in < 50 words.
Constraint 3: For data lookups, use function calling. Output short responses.
Constraint 4: For explaining technical faults, trigger explain_technical_fault and reference the returned data snippets. Do not make up explanations.`;

// Tool definitions for function calling
const TOOLS = [
  {
    name: "get_vehicle_status",
    description: "Get the current live status of a vehicle by its registration number (VRN)",
    parameters: {
      type: "object",
      properties: {
        vrn: { type: "string", description: "Vehicle registration number like MH-12-AB-1234" },
      },
      required: ["vrn"],
    },
  },
  {
    name: "get_service_history",
    description: "Get past completed service records for a vehicle or all vehicles",
    parameters: {
      type: "object",
      properties: {
        vrn: { type: "string", description: "Optional vehicle registration number. If omitted, returns all vehicles." },
      },
    },
  },
  {
    name: "get_estimated_completion",
    description: "Get the estimated completion date/time for a specific job card",
    parameters: {
      type: "object",
      properties: {
        job_card_no: { type: "string", description: "Job card number like JC001" },
      },
      required: ["job_card_no"],
    },
  },
  {
    name: "get_invoice_status",
    description: "Get invoice and billing status for a specific job card",
    parameters: {
      type: "object",
      properties: {
        job_card_no: { type: "string", description: "Job card number like JC001" },
      },
      required: ["job_card_no"],
    },
  },
  {
    name: "explain_technical_fault",
    description: "Explain a technical fault, symptom, or repair description in simple customer-friendly language",
    parameters: {
      type: "object",
      properties: {
        description: { type: "string", description: "The technical fault description or symptom to explain" },
      },
      required: ["description"],
    },
  },
];

// Preserved Data Snippets for fault explanation (low cost, high accuracy)
const DATA_SNIPPETS: Record<string, string> = {
  "engine oil": "Engine oil lubricates the engine's moving parts and absorbs heat. Low or dirty oil increases friction and can cause engine wear or failure.",
  "oil leak": "An oil leak reduces engine lubrication. It can lead to low oil pressure, friction wear, and potential fire hazard if oil drops onto hot exhaust parts.",
  "brake pad": "Brake pads create friction against the brake disc to stop your vehicle. Thin or worn pads increase stopping distance and can damage the brake rotors.",
  "coolant": "Coolant keeps the engine running at normal operating temperature. Worn coolant hoses or low levels can lead to engine overheating and major damage.",
  "spark plug": "Spark plugs ignite the air-fuel mixture. Bad spark plugs cause engine misfires, rough idling, poor fuel economy, and lack of acceleration.",
  "ac service": "AC service restores cold airflow. Low refrigerant levels or clogged cabin filters prevent proper cooling and put strain on the compressor.",
  "suspension": "Suspension parts absorb bumps. Worn shock absorbers or struts cause unstable handling, uneven tyre wear, and bumpy ride comfort.",
  "battery": "The battery provides the electrical charge to start the engine. Worn battery plates or low fluid can leave you stranded or cause starter issues.",
};

/**
 * Execute a function call against the database.
 * All queries are scoped to the authenticated customer's mobile number.
 */
function executeFunctionCall(
  functionName: string,
  args: Record<string, string>,
  customerMobile: string,
  dbGetter: () => any
): string {
  const db = dbGetter();
  const allJobs = (db.jobCards || []).filter((j: any) =>
    verifyJobOwnership(j, customerMobile)
  );

  switch (functionName) {
    case "get_vehicle_status": {
      const vrn = (args.vrn || "").toUpperCase().replace(/\s+/g, "-");
      const jobs = allJobs.filter(
        (j: any) => j.vrn.toUpperCase().replace(/\s+/g, "-") === vrn
      );
      if (jobs.length === 0) return `No vehicle found with registration ${args.vrn}.`;

      const activeJob = jobs.find(
        (j: any) => j.status === "Active" || j.status === "Waiting"
      );
      if (activeJob) {
        const view = sanitizeJobCard(activeJob, db.srTypes);
        return `Vehicle ${view.vrn} (${view.vehicle_model}) is currently "${view.status}" for ${view.service_type}. ${view.progress_pct ? `Progress: ${view.progress_pct}%.` : ""} ${view.etd ? `Expected ready by: ${new Date(view.etd).toLocaleString("en-IN")}.` : ""}`;
      }

      const latest = jobs.sort(
        (a: any, b: any) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0];
      const view = sanitizeJobCard(latest, db.srTypes);
      return `Vehicle ${view.vrn} has no active service. Last service: ${view.service_type} (${view.status}). ${view.completed_at ? `Completed on ${new Date(view.completed_at).toLocaleDateString("en-IN")}.` : ""}`;
    }

    case "get_service_history": {
      const vrn = args.vrn
        ? (args.vrn || "").toUpperCase().replace(/\s+/g, "-")
        : null;
      const filtered = vrn
        ? allJobs.filter(
            (j: any) => j.vrn.toUpperCase().replace(/\s+/g, "-") === vrn
          )
        : allJobs;

      const completed = filtered.filter(
        (j: any) => j.status === "Completed" || j.status === "Invoiced"
      );
      if (completed.length === 0) return "No completed service records found.";

      const summaries = completed.slice(0, 5).map((j: any) => {
        const view = sanitizeJobCard(j, db.srTypes);
        return `• ${view.vrn} — ${view.service_type} (${view.status}) ${view.completed_at ? `on ${new Date(view.completed_at).toLocaleDateString("en-IN")}` : ""}`;
      });
      return `Recent service history:\n${summaries.join("\n")}`;
    }

    case "get_estimated_completion": {
      const jobNo = args.job_card_no;
      const job = allJobs.find(
        (j: any) => j.job_card_no === jobNo
      );
      if (!job) return `Job card ${jobNo} not found.`;

      const view = sanitizeJobCard(job, db.srTypes);
      if (view.status === "Completed" || view.status === "Invoiced") {
        return `Job ${jobNo} is already ${view.status}. ${view.completed_at ? `Completed on ${new Date(view.completed_at).toLocaleDateString("en-IN")}.` : ""}`;
      }
      return `Job ${jobNo}: Status "${view.status}". ${view.expected_date_out ? `Expected ready by ${view.expected_date_out}.` : view.etd ? `Estimated: ${new Date(view.etd).toLocaleString("en-IN")}.` : "No estimated time available yet."}`;
    }

    case "get_invoice_status": {
      const jobNo = args.job_card_no;
      const job = allJobs.find(
        (j: any) => j.job_card_no === jobNo
      );
      if (!job) return `Job card ${jobNo} not found.`;

      const view = sanitizeJobCard(job, db.srTypes);
      if (view.invoice_no) {
        return `Job ${jobNo}: Invoice #${view.invoice_no} generated. Status: ${view.status}.`;
      }
      return `Job ${jobNo}: Invoice not yet generated. Current status: ${view.status}.`;
    }

    case "explain_technical_fault": {
      const desc = (args.description || "").toLowerCase();
      let match = "";
      for (const [key, text] of Object.entries(DATA_SNIPPETS)) {
        if (desc.includes(key)) {
          match = text;
          break;
        }
      }
      if (!match) {
        match = "This maintenance item ensures the vehicle operates safely and meets manufacturer standards. Regular inspection prevents failures.";
      }
      return `Explanation: ${match}`;
    }

    default:
      return "I'm not sure how to help with that. Please try asking about your vehicle status or service history.";
  }
}

/**
 * Process a customer chat message through the AI agent.
 * Flow: Query Cache → LLM → Function Calling → Response
 */
export async function processCustomerChat(
  userMessage: string,
  customerMobile: string,
  customerName: string,
  dbGetter: () => any
): Promise<string> {
  // 1. Check vector cache first
  const cached = getQueryCache(customerMobile, userMessage);
  if (cached) {
    return cached;
  }

  // 2. No provider configured — the deterministic keyword handler below still
  // answers from real job-card data, so the portal stays useful without AI.
  if (!isNemotronConfigured()) {
    return handleFallbackChat(userMessage, customerMobile, dbGetter);
  }

  try {
    // NIM HAS NO GEMINI-STYLE functionDeclarations. The model is asked to pick
    // a tool as JSON instead, and the SAME executeFunctionCall path runs it —
    // so every answer still comes from the customer-scoped database lookup,
    // never from the model's own words about their vehicle.
    const toolSpec = TOOLS.map((t: any) =>
      `- ${t.name}: ${t.description} | args: ${JSON.stringify(t.parameters?.properties || {})}` +
      (t.parameters?.required?.length ? ` | required: ${t.parameters.required.join(", ")}` : "")
    ).join("\n");

    const instruction = [
      SYSTEM_PROMPT,
      "",
      "Available functions:",
      toolSpec,
      "",
      "If the question needs vehicle, service, invoice or fault data, reply with ONLY:",
      '{"function":"<name>","args":{...}}',
      "Otherwise reply with ONLY:",
      '{"reply":"<your short answer>"}',
      "Never state a vehicle status, date, or amount yourself — always call a function for it.",
    ].join("\n");

    const raw = await callNemotron(userMessage, {
      system: instruction,
      maxTokens: 700,
    });

    const decision = parseJsonReply<any>(raw);

    if (decision?.function) {
      const result = executeFunctionCall(
        String(decision.function),
        (decision.args as Record<string, string>) || {},
        customerMobile,
        dbGetter
      );
      setQueryCache(customerMobile, userMessage, result);
      return result;
    }

    const textResponse = String(decision?.reply || "").trim();
    if (textResponse) {
      setQueryCache(customerMobile, userMessage, textResponse);
      return textResponse;
    }

    // The model answered in an unexpected shape. Fall back to the deterministic
    // handler rather than forwarding free text that was never grounded in a
    // lookup — that is exactly how a customer gets told a wrong status.
    return handleFallbackChat(userMessage, customerMobile, dbGetter);
  } catch (err: any) {
    console.error("[CustomerPortal] AI agent error:", err.message);
    return handleFallbackChat(userMessage, customerMobile, dbGetter);
  }
}

/**
 * Keyword-based fallback when LLM is unavailable.
 */
function handleFallbackChat(
  message: string,
  customerMobile: string,
  dbGetter: () => any
): string {
  const lower = message.toLowerCase();

  if (
    lower.includes("status") ||
    lower.includes("where") ||
    lower.includes("truck") ||
    lower.includes("car") ||
    lower.includes("vehicle")
  ) {
    const db = dbGetter();
    const jobs = (db.jobCards || []).filter((j: any) =>
      verifyJobOwnership(j, customerMobile)
    );
    const active = jobs.filter(
      (j: any) => j.status === "Active" || j.status === "Waiting"
    );

    if (active.length > 0) {
      const views = active.map((j: any) => sanitizeJobCard(j, db.srTypes));
      const summaries = views
        .map(
          (v) =>
            `${v.vrn} (${v.vehicle_model}): ${v.status} — ${v.service_type}`
        )
        .join("; ");
      return `Your active vehicles: ${summaries}. Ask me for more details on any specific vehicle!`;
    }
    return "No active service found for your vehicles. Need to book a service?";
  }

  if (lower.includes("history") || lower.includes("past") || lower.includes("previous")) {
    return executeFunctionCall(
      "get_service_history",
      {},
      customerMobile,
      dbGetter
    );
  }

  if (lower.includes("invoice") || lower.includes("bill") || lower.includes("payment")) {
    return "Please provide your job card number (e.g., JC001) and I'll check the invoice status for you.";
  }

  if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey")) {
    return "Hello! 👋 I'm your DWIP Service Assistant. I can help you check vehicle status, service history, and invoices. What would you like to know?";
  }

  return "I can help you with: vehicle status, service history, estimated completion times, and invoice details. What would you like to know?";
}
