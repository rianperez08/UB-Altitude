/* Coin analyzer — identifies every coin in a photo of the Altitude Exchange tray with Gemini's vision.
 * Shared by the Netlify function (netlify/functions/analyze-coins.mjs) and the venue server (server.js).
 *
 *   analyzeCoins({ image, mediaType, apiKey }) → { coins: [{ country, currency, value, label, confidence }], notes, model }
 *
 * `image` is base64 without the data: prefix; `apiKey` is a Gemini API key (GEMINI_API_KEY). Valuing the coins
 * (rates, FX cost, miles) happens on the kiosk, from idea2/js/config.js — this module only says what is in the tray. */
import { GoogleGenAI } from "@google/genai";

export const MODEL = "gemini-3.8-flash";
const THINKING = "low";                       // a kiosk guest is waiting; coin recognition doesn't need long reasoning
const MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_BYTES = 4.5 * 1024 * 1024;    // decoded; the kiosk sends ~150–400 KB

const SYSTEM = `You are the coin recognition engine inside UnionBank's Altitude Exchange kiosk. A camera looks down into a copper tray where travellers place the foreign coins left over from their trips. Identify every coin in the photo.

For each physical coin report:
- country: the issuing country or territory in English, e.g. "United States", "Japan", "South Korea", "United Kingdom", "Mexico". For euro coins name the country of the national side when it is visible (e.g. "Germany"); use "Euro area" when only the common side shows.
- currency: the ISO 4217 code, e.g. USD, EUR, JPY, KRW, GBP, CAD, MXN, PHP.
- value: the face value in the currency's main unit, as a number. A US quarter is 0.25, a 10 euro cent coin is 0.1, a 500 won coin is 500.
- label: the face value the way a traveller would say it, e.g. "25¢", "€1", "¥100", "₩500", "£2", "$10".
- confidence: from 0 to 1.

Count each coin exactly once, including coins that overlap or are partly cut off at the edge when you can still identify them. Use the size, colour, bimetal rings, edge shape, numerals, inscriptions and designs. If you can see a coin but cannot identify it, list it with currency "UNKNOWN", value 0 and a low confidence. Banknotes, cards, receipts, hands and other objects are not coins: leave them out. Use notes for anything the attendant should know (glare, coins lying face down, objects that are not coins); otherwise leave notes empty.`;

const SCHEMA = {
  type: "object",
  properties: {
    coins: {
      type: "array",
      items: {
        type: "object",
        properties: {
          country: { type: "string" },
          currency: { type: "string" },
          value: { type: "number" },
          label: { type: "string" },
          confidence: { type: "number", minimum: 0, maximum: 1 }
        },
        required: ["country", "currency", "value", "label", "confidence"],
        additionalProperties: false
      }
    },
    notes: { type: "string" }
  },
  required: ["coins", "notes"],
  additionalProperties: false
};

export class AnalyzerError extends Error {
  constructor(code, message, status) { super(message); this.code = code; this.status = status; }
}

export async function analyzeCoins({ image, mediaType = "image/jpeg", apiKey } = {}) {
  if (typeof image !== "string" || !image) throw new AnalyzerError("bad_request", "No image was sent.", 400);
  if (!MEDIA_TYPES.includes(mediaType)) throw new AnalyzerError("bad_request", "The image must be JPEG, PNG or WebP.", 400);
  if (image.length * 0.75 > MAX_IMAGE_BYTES) throw new AnalyzerError("too_large", "The image is too large.", 413);
  if (!apiKey) throw new AnalyzerError("not_configured", "The coin analyzer has no API key. Set GEMINI_API_KEY.", 503);

  let interaction;
  try {
    const ai = new GoogleGenAI({ apiKey });
    interaction = await ai.interactions.create({
      model: MODEL,
      system_instruction: SYSTEM,
      input: [
        { type: "text", text: "Identify every coin in this tray." },
        { type: "image", data: image, mime_type: mediaType, resolution: "high" }
      ],
      response_format: { type: "text", mime_type: "application/json", schema: SCHEMA },
      generation_config: { thinking_level: THINKING },   // Gemini 3 models are tuned for the default temperature
      store: false                              // guests' photos are not kept by the API
    });
  } catch (e) {
    const status = e && (e.status || e.statusCode);
    if (status === 401 || status === 403) throw new AnalyzerError("not_configured", "The coin analyzer's API key was rejected.", 503);
    if (status === 429) throw new AnalyzerError("busy", "The coin analyzer is busy. Try again in a moment.", 429);
    if (status === 400) throw new AnalyzerError("bad_request", "The coin analyzer couldn't read this image.", 400);
    throw new AnalyzerError("upstream", "The coin analyzer is unavailable (" + (status || "network") + ").", 502);
  }

  if (!interaction.output_text) {
    throw new AnalyzerError("bad_output", "The coin analyzer returned no answer (" + (interaction.status || "empty") + ").", 502);
  }
  let out;
  try { out = JSON.parse(interaction.output_text); } catch (e) { throw new AnalyzerError("bad_output", "The coin analyzer returned an unreadable answer.", 502); }

  const coins = (out.coins || []).map((c) => ({
    country: String(c.country || "").trim(),
    currency: String(c.currency || "UNKNOWN").trim().toUpperCase(),
    value: Number(c.value) > 0 ? Number(c.value) : 0,
    label: String(c.label || "").trim(),
    confidence: Math.max(0, Math.min(1, Number(c.confidence) || 0))
  }));
  return { coins, notes: String(out.notes || ""), model: interaction.model || MODEL };
}
