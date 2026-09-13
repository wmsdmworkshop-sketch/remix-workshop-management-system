/**
 * The Gemini model ids this application calls.
 *
 * WHY THIS EXISTS
 *
 * "gemini-2.5-flash" was hardcoded in 15 places, with "gemini-2.5-pro" and
 * "gemini-2.5-flash-lite" in three more. Google retired all three for new
 * users, and every call started failing:
 *
 *   404 — This model models/gemini-2.5-flash is no longer available to new
 *         users. Please update your code to use models/gemini-3.6-flash
 *
 * The visible symptom was job-card OCR reporting "Could not read the document",
 * which reads like a bad scan rather than a retired model. Eighteen separate
 * literals had to be found and changed to recover from one upstream decision.
 *
 * They are named here once so the next retirement is a one-line change, and so
 * a reader can see which model each job actually uses.
 *
 * Each can be overridden by environment variable without a code change, which
 * is the faster remedy when a model disappears mid-shift.
 */

/** Document and image reading: OCR, invoice and job-card extraction. */
export const GEMINI_VISION_MODEL =
  process.env.GEMINI_VISION_MODEL || "gemini-3.6-flash";

/** General text work: summaries, chat, classification. The default everywhere. */
export const GEMINI_TEXT_MODEL =
  process.env.GEMINI_TEXT_MODEL || "gemini-3.6-flash";

/** Harder reasoning where latency matters less than quality. */
export const GEMINI_PRO_MODEL =
  process.env.GEMINI_PRO_MODEL || "gemini-3.1-pro-preview";

/** Cheap, high-volume calls where a smaller model is sufficient. */
export const GEMINI_LITE_MODEL =
  process.env.GEMINI_LITE_MODEL || "gemini-3.5-flash-lite";
