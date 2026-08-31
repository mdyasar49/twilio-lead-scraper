/**
 * =========================================================================
 * 🤖 INFOGENX UNIVERSAL GEMINI AI SERVICE (GOOGLE APPS SCRIPT)
 * =========================================================================
 * Future-Proof & Plug-and-Play:
 * To change the API Key, simply update the Script Property "GEMINI_API_KEY"
 * or the default constant below. No code logic ever needs to be modified!
 * =========================================================================
 */

const DEFAULT_GLOBAL_GEMINI_KEY = "";
const DEFAULT_GLOBAL_GEMINI_MODEL = "gemini-2.5-flash";

const GeminiService = {
  /**
   * Retrieves active Gemini API key from Script Properties or default fallback.
   */
  getApiKey: function() {
    return PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY") || DEFAULT_GLOBAL_GEMINI_KEY;
  },

  /**
   * Universal Live Google Search Grounding for Leads/Candidates
   */
  searchGrounding: function(query, location, count) {
    const apiKey = this.getApiKey();
    const maxItems = count || 20;
    const loc = location || "Australia";
    const models = [DEFAULT_GLOBAL_GEMINI_MODEL, "gemini-1.5-flash", "gemini-2.5-pro", "gemini-3.6-pro"];

    for (let m = 0; m < models.length; m++) {
      const model = models[m];
      const url = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + apiKey;

      const prompt = `Search Google and public directories for real active business leads matching: "${query}" in "${loc}".
Return ONLY a raw JSON array of objects (up to ${maxItems} items) with keys:
- "name": Full name of person or company
- "email": Valid public contact email
- "phone": Valid phone number or empty string
- "location": "${loc}"
- "notes": Short notes or link

Do not wrap in markdown code fences. Return pure JSON array only.`;

      const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ googleSearch: {} }],
        generationConfig: { temperature: 0.1 }
      };

      try {
        const response = UrlFetchApp.fetch(url, {
          method: "post",
          contentType: "application/json",
          payload: JSON.stringify(payload),
          connectTimeout: 8000,
          readTimeout: 8000,
          muteHttpExceptions: true
        });

        if (response.getResponseCode() === 200) {
          const data = JSON.parse(response.getContentText());
          if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts) {
            let text = data.candidates[0].content.parts[0].text.trim().replace(/^```json/i, "").replace(/^```/i, "").replace(/```$/i, "").trim();
            const parsed = JSON.parse(text);
            if (Array.isArray(parsed) && parsed.length > 0) {
              return parsed;
            }
          }
        }
      } catch (e) {
        if (e.message && (e.message.toLowerCase().includes("urlfetch") || e.message.toLowerCase().includes("too many times"))) {
          Logger.log("🛑 Apps Script UrlFetch daily quota limit reached on this Google account.");
          return [];
        }
        Logger.log("⚠️ GeminiService (" + model + ") error: " + e.message);
      }
    }
    return [];
  }
};

/**
 * Quick Test Function for Apps Script Editor Dropdown
 */
function testGeminiService() {
  Logger.log("🧪 Testing Gemini AI Search Grounding...");
  const results = GeminiService.searchGrounding("Software companies", "Australia", 3);
  Logger.log("✅ Results Found: " + results.length);
  Logger.log(JSON.stringify(results, null, 2));
}
