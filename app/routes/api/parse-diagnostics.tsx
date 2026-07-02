import { json, type ActionFunctionArgs } from "@remix-run/node";
import { db } from "~/utils/db.server";

// Defining the structured payload interface for compiler safety
interface DiagnosticPayload {
    primary_issue_category: string;
    parts_required: string[];
    estimated_labor_hours: number;
    urgency_level: "High" | "Medium" | "Low";
}

export async function action({ request }: ActionFunctionArgs) {
    // Validate incoming request method
    if (request.method !== "POST") {
        return json({ error: "Method Not Allowed" }, { status: 455 });
    }

    const formData = await request.formData();
    const jobCardIdStr = formData.get("jobCardId");
    const rawNotes = formData.get("notes") as string;

    if (!jobCardIdStr || !rawNotes) {
        return json({ error: "Missing required parameters" }, { status: 400 });
    }

    const jobCardId = Number(jobCardIdStr);

    try {
        // Constructing the structured system prompt to restrict LLM hallucination
        const systemPrompt = `You are a database parser for an automotive workshop. 
    Analyze these raw mechanic notes: "${rawNotes}".
    You must output a single, raw JSON object matching this schema:
    {
      "primary_issue_category": "string (e.g., Brake System, Engine Electrical, Suspension)",
      "parts_required": ["array of strings"],
      "estimated_labor_hours": number,
      "urgency_level": "High" | "Medium" | "Low"
    }
    Do not include any introductory text, markdown backticks, or explanation. Output only valid JSON.`;

        // Dispatch request to the local Gemma 2 engine
        const response = await fetch("http://localhost:11434/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "gemma2",
                prompt: systemPrompt,
                stream: false,
                options: {
                    temperature: 0.1 // Low temperature forces deterministic outputs
                }
            }),
        });

        if (!response.ok) {
            throw new Error("Failed to communicate with LLM execution layer.");
        }

        const responseData = await response.json();
        const rawResultText = responseData.response.trim();

        // Parse and sanitize LLM output
        const parsedPayload: DiagnosticPayload = JSON.parse(rawResultText);

        // Apply the structured output to update the job card record
        const updatedJobCard = await db.jobCardMaster.update({
            where: { job_card_id: jobCardId },
            data: {
                // Mapping structured fields to target database schema columns
                delay_notes: `Estimated Labor: ${parsedPayload.estimated_labor_hours} hours. Required Parts: ${parsedPayload.parts_required.join(", ")}`,
                priority: parsedPayload.urgency_level,
                service_type: parsedPayload.primary_issue_category
            }
        });

        return json({ success: true, updatedJobCard });

    } catch (error) {
        const systemError = error as Error;
        return json(
            {
                success: false,
                error: "Failed to parse diagnostic data",
                details: systemError.message
            },
            { status: 500 }
        );
    }
}