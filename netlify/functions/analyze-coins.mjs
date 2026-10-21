/* POST /api/analyze-coins — the Altitude Exchange coin analyzer on Netlify.
 * Body: { image: <base64 JPEG/PNG/WebP>, mediaType }. Needs GEMINI_API_KEY on the project (Functions scope). */
import { analyzeCoins, AnalyzerError } from "../../lib/coin-analyzer.mjs";

export default async (req) => {
  const apiKey = Netlify.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    return Response.json({ code: "not_configured", error: "The coin analyzer needs GEMINI_API_KEY set on the Netlify project." }, { status: 503 });
  }
  let body;
  try { body = await req.json(); } catch (e) { return Response.json({ code: "bad_request", error: "Send JSON: { image, mediaType }." }, { status: 400 }); }
  try {
    return Response.json(await analyzeCoins({ image: body.image, mediaType: body.mediaType, apiKey }));
  } catch (e) {
    if (e instanceof AnalyzerError) return Response.json({ code: e.code, error: e.message }, { status: e.status });
    console.error(e);
    return Response.json({ code: "error", error: "The coin analyzer failed." }, { status: 500 });
  }
};

export const config = {
  path: "/api/analyze-coins",
  method: "POST",
  // every scan is a paid API call: cap each visitor at a kiosk's pace
  rateLimit: { action: "rate_limit", aggregateBy: ["ip", "domain"], windowSize: 60, windowLimit: 12 }
};
