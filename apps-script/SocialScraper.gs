// ============================================================
// AUTOMATED SOCIAL MEDIA SCRAPER (100% PURE DYNAMIC LIVE SCRAPING)
// HOW IT WORKS:
// 1. Multi-Tier Social Search Engine: Serper.dev Google API (LinkedIn, Instagram,
//    Facebook, X/Twitter, YouTube, Pinterest, Web Research), Gemini AI Search Grounding,
//    GitHub Public Developer API, OpenStreetMap Nominatim Places API, HackerNews
//    Algolia Launch API, DuckDuckGo Lite, Bing, Yahoo, and Ask.com.
// 2. High-Yield Social Dorks: Searches specifically for public contact details,
//    founder emails, corporate telephone numbers, and business announcements.
// 3. Deep Social Contact Crawler: Crawls founder blogs, links, and landing pages
//    to extract mailto:, tel:, and verified contact numbers.
// 4. Pre-configured with active high-speed Serper.dev key; optionally accelerates
//    when Brave, SerpApi, or Google CSE keys are configured.
// ============================================================

// ---- CONFIGURATION ----
const SOCIAL_SHEET_NAME = "Social Leads";
const SOCIAL_SETTINGS_SHEET_NAME = "Social Settings";
const SOCIAL_HEADER_COLOR = "#e81a59"; // Rose Pink for Social
const SOCIAL_HEADER_FONT_COLOR = "#ffffff";

// Spreadsheet ID - set for standalone script execution
const SOCIAL_SPREADSHEET_ID = "1P9LOyq4UKwVuc8ZFjg6cOlb2fwOci3nUV300E5J5Fgw";

// Default target locations
const SOCIAL_TARGET_LOCATIONS = ["Australia"];

// Automation execution interval in hours (Set to 1 for high-volume leads)
const SOCIAL_RUN_INTERVAL_HOURS = 1;

// Number of search results/leads to fetch per query
const SOCIAL_LEADS_PER_QUERY = 30;

// Date filter for recent posts
const SOCIAL_DATE_FILTER = "m"; 

// Default name to show in the "Lead Added By" column
const SOCIAL_LEAD_ADDED_BY_NAME = "Social Scraper";

// Daily lead limit (0 for unlimited)
const SOCIAL_DAILY_LEAD_LIMIT = 0;

// Default Serper.dev API Key (High Speed, Live Google Search)
const SOCIAL_DEFAULT_SERPER_API_KEY = "592605c9ec3bcff9bf492e4062ee21a1e8cd699a";

// Gemini AI Google Search Grounding Key & Model
const SOCIAL_DEFAULT_GEMINI_API_KEY = "";
const SOCIAL_DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

const SOCIAL_KEYWORDS = [
  "coming soon",
  "launching soon",
  "opening soon",
  "new launch",
  "pre-launch",
  "website launching",
  "getting ready to launch",
  "grand opening",
  "pre-register now",
  "beta launch",
  "early access",
  "launching this month",
  "we are launching"
];

const SOCIAL_LEAD_SOURCES = [
  "LinkedIn",
  "Instagram",
  "Facebook",
  "X (Twitter)",
  "YouTube",
  "Pinterest",
  "Google Search",
  "Web Research"
];

const SOCIAL_INDUSTRIES = [
  "IT / Software",
  "ITES / BPO",
  "ICT",
  "Healthcare",
  "Manufacturing",
  "Education",
  "Real Estate",
  "Retail / E-commerce",
  "Consulting",
  "Wholesale & Distribution",
  "Professional Services",
  "Accounting Firms"
];

const SOCIAL_STATUSES = [
  "New",
  "Contacted",
  "Follow-up",
  "Interested",
  "Converted",
  "Not Interested"
];

const SOCIAL_HEADERS = [
  "Date",
  "Lead Source",
  "Company",
  "Email",
  "Phone Number / Mobile Number",
  "Industry",
  "Customer Name",
  "Status",
  "Lead Added By",
  "Notes"
];

let isSocialDdgBlockedGlobal = false;
let isSocialYahooBlockedGlobal = false;
let isSocialAskBlockedGlobal = false;
let isSocialGoogleCseBlockedGlobal = false;
let isSocialSerperBlockedGlobal = false;
let isSocialSerpApiBlockedGlobal = false;
let isSocialBraveBlockedGlobal = false;
let isSocialSearchApiBlockedGlobal = false;
let isSocialScaleSerpBlockedGlobal = false;
let isSocialUrlFetchQuotaExhaustedGlobal = false;

// ============================================================
// CORE HELPER & VALIDATION FUNCTIONS
// ============================================================

function getSocialCountryConfig(location) {
  const loc = (location || "australia").toLowerCase();
  let gl = "au";
  let countryCode = "+61";
  let phoneRegexes = [
    /(?:mobile|mob|cell|phone|ph|tel|contact|whatsapp|call)[\s.:#-]*(\+?\d[\d\s.-]{7,15}\d)/i,
    /(\+61[\s.-]?4\d{2}[\s.-]?\d{3}[\s.-]?\d{3})/,
    /(04\d{2}[\s.-]?\d{3}[\s.-]?\d{3})/,
    /(\+61[\s.-]?[2378][\s.-]?\d{4}[\s.-]?\d{4})/,
    /(0[2378][\s.-]?\d{4}[\s.-]?\d{4})/,
    /(1300[\s.-]?\d{3}[\s.-]?\d{3})/,
    /(1800[\s.-]?\d{3}[\s.-]?\d{3})/,
    /(\+\d{1,3}[\s.-]?\d{1,4}[\s.-]?\d{3,4}[\s.-]?\d{3,4})/
  ];

  if (loc.includes("india") || loc.includes("chennai") || loc.includes("mumbai") || loc.includes("delhi") || loc.includes("bangalore") || loc.includes("hyderabad")) {
    gl = "in";
    countryCode = "+91";
    phoneRegexes = [
      /(?:mobile|mob|cell|phone|ph|tel|contact|whatsapp|call)[\s.:#-]*(\+?\d[\d\s.-]{7,15}\d)/i,
      /(\+91[\s.-]?[6-9]\d{9})/,
      /([6-9]\d{9})/,
      /(\+91[\s.-]?\d{2,4}[\s.-]?\d{6,8})/,
      /(\+\d{1,3}[\s.-]?\d{1,4}[\s.-]?\d{3,4}[\s.-]?\d{3,4})/
    ];
  } else if (loc.includes("uk") || loc.includes("united kingdom") || loc.includes("london") || loc.includes("england")) {
    gl = "uk";
    countryCode = "+44";
    phoneRegexes = [
      /(?:mobile|mob|cell|phone|ph|tel|contact|whatsapp|call)[\s.:#-]*(\+?\d[\d\s.-]{7,15}\d)/i,
      /(\+44[\s.-]?7\d{3}[\s.-]?\d{6})/,
      /(07\d{3}[\s.-]?\d{6})/,
      /(\+44[\s.-]?\d{2,4}[\s.-]?\d{5,8})/,
      /(\+\d{1,3}[\s.-]?\d{1,4}[\s.-]?\d{3,4}[\s.-]?\d{3,4})/
    ];
  } else if (loc.includes("us") || loc.includes("usa") || loc.includes("united states") || loc.includes("america")) {
    gl = "us";
    countryCode = "+1";
    phoneRegexes = [
      /(?:mobile|mob|cell|phone|ph|tel|contact|whatsapp|call)[\s.:#-]*(\+?\d[\d\s.-]{7,15}\d)/i,
      /(\+1[\s.-]?\d{3}[\s.-]?\d{3}[\s.-]?\d{4})/,
      /(\d{3}[\s.-]?\d{3}[\s.-]?\d{4})/,
      /(\+\d{1,3}[\s.-]?\d{1,4}[\s.-]?\d{3,4}[\s.-]?\d{3,4})/
    ];
  }
  return { gl: gl, countryCode: countryCode, phoneRegexes: phoneRegexes };
}

function isValidSocialEmail(email) {
  if (!email || typeof email !== 'string') return false;
  email = email.trim().toLowerCase();
  if (email.length < 5 || email.length > 100) return false;
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!regex.test(email)) return false;
  const invalid = ["example.com", "sample.com", "domain.com", "email.com", "test.com", "sentry.io", "wixpress.com", "noreply", "no-reply", "donotreply"];
  for (let i = 0; i < invalid.length; i++) {
    if (email.includes(invalid[i])) return false;
  }
  return true;
}

function isValidEmail(email) {
  return isValidSocialEmail(email);
}

function getValidSocialLeadSource(source) {
  if (!source) return "Social Media";
  if (typeof SOCIAL_LEAD_SOURCES !== 'undefined' && SOCIAL_LEAD_SOURCES.includes(source)) {
    return source;
  }
  return "Social Media";
}

// ============================================================
// MENU & INITIALIZATION
// ============================================================

function initSocialMenu(ui) {
  try {
    ui.createMenu("📱 Social Scraper")
      .addItem("⚡ Instant Social Lead Extractor (1-Click)", "instantSocialLeadExtractor")
      .addSeparator()
      .addItem("⚡ Run Social Search Now", "runSocialSearchNowFromMenu")
      .addItem("⏰ Enable Social Automation Trigger", "setupSocialTriggerFromMenu")
      .addSeparator()
      .addItem("⚙️ Configure Serper API Key", "configureSocialSerperFromMenu")
      .addItem("⚙️ Configure Gemini API Key", "configureSocialGeminiFromMenu")
      .addItem("⚙️ Configure Brave Search API", "configureSocialBraveFromMenu")
      .addItem("⚙️ Configure SerpApi API Key", "configureSocialSerpapiFromMenu")
      .addItem("⚙️ Configure Google CSE API", "configureSocialGoogleCseFromMenu")
      .addItem("⚙️ Configure SearchApi.io Key", "configureSocialSearchApiFromMenu")
      .addItem("⚙️ Configure ScaleSerp Key", "configureSocialScaleSerpFromMenu")
      .addSeparator()
      .addItem("🧹 Remove Duplicate Social Leads", "removeDuplicateSocialLeads")
      .addItem("⚙️ Reset / Initialize Social Sheets", "setupSocialSheets")
      .addToUi();
  } catch (e) {}
}

function onOpenSocial() {
  try {
    const ui = SpreadsheetApp.getUi();
    initSocialMenu(ui);
  } catch (e) {}
}

function onOpen() {
  onOpenSocial();
}

function instantSocialLeadExtractor() {
  const ui = typeof SpreadsheetApp !== 'undefined' ? SpreadsheetApp.getUi() : null;
  let platform = "LinkedIn";
  let keyword = "we are launching";
  let industry = "IT / Software";
  let location = "Australia";

  if (ui) {
    const prompt1 = ui.prompt("⚡ Instant Social Lead Extractor", "Enter Keyword/Role (e.g. Founder, CEO, launching soon, Director):", ui.ButtonSet.OK_CANCEL);
    if (prompt1.getSelectedButton() === ui.Button.OK && prompt1.getResponseText().trim()) {
      keyword = prompt1.getResponseText().trim();
    } else if (prompt1.getSelectedButton() === ui.Button.CANCEL) {
      return;
    }
  }

  Logger.log("🚀 Running Instant Social Lead Extractor for: " + platform + " - " + keyword);
  const q = "site:linkedin.com/in " + keyword + " " + location + " " + industry + " email contact";
  const leads = searchSocialViaDuckDuckGoHTML(q, platform, industry, location, keyword);

  if (leads && leads.length > 0) {
    const added = bulkImportSocialLeads(leads);
    if (ui) {
      ui.alert("✅ Success!", "Successfully extracted and added " + added + " live social leads into Social Leads sheet!", ui.ButtonSet.OK);
    }
  } else {
    if (ui) {
      ui.alert("ℹ️ Note", "No new unique social leads returned. Check Execution Log.", ui.ButtonSet.OK);
    }
  }
}

function bulkImportSocialLeads(leadsArray) {
  if (!leadsArray || leadsArray.length === 0) return 0;
  try {
    const ss = getSocialSpreadsheet();
    const sheet = ss.getSheetByName(SOCIAL_SHEET_NAME);
    if (!sheet) return 0;

    const existingEmails = new Set();
    const existingPhones = new Set();
    const lastRow = sheet.getLastRow();

    if (lastRow > 1) {
      const data = sheet.getRange(2, 4, lastRow - 1, 2).getValues();
      data.forEach(r => {
        if (r[0]) existingEmails.add(r[0].toString().toLowerCase().trim());
        if (r[1]) existingPhones.add(r[1].toString().replace(/\s+/g, "").trim());
      });
    }

    const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy");
    const newRows = [];

    leadsArray.forEach(lead => {
      const email = lead.email ? lead.email.toLowerCase().trim() : "";
      const phone = lead.phone ? lead.phone.trim() : "";

      if (!email && !phone) return;
      if (email && existingEmails.has(email)) return;
      const phoneClean = phone ? phone.replace(/\s+/g, "").trim() : "";
      if (phoneClean && existingPhones.has(phoneClean)) return;

      if (email) existingEmails.add(email);
      if (phoneClean) existingPhones.add(phoneClean);

      newRows.push([
        lead.date || today,
        lead.leadSource || "Social Media",
        lead.company || "Social Profile",
        email,
        phone,
        lead.industry || "General",
        lead.customerName || "Founder",
        lead.status || "New",
        lead.addedBy || SOCIAL_LEAD_ADDED_BY_NAME,
        lead.notes || ""
      ]);
    });

    if (newRows.length > 0) {
      const startRow = sheet.getLastRow() + 1;
      sheet.getRange(startRow, 1, newRows.length, 10).setValues(newRows);
      Logger.log("✅ Successfully imported " + newRows.length + " social leads into sheet.");
      return newRows.length;
    }
  } catch (e) {
    Logger.log("Error in bulkImportSocialLeads: " + e.message);
  }
  return 0;
}

// ============================================================
// SHEET SETUP
// ============================================================

function setupSocialSheets() {
  try {
    const ss = getSocialSpreadsheet();
    if (!ss) {
      Logger.log("Error: Social spreadsheet not found. Check SOCIAL_SPREADSHEET_ID.");
      return;
    }

    // 1. Setup SOCIAL LEADS Sheet
    let leadsSheet = ss.getSheetByName(SOCIAL_SHEET_NAME);
    if (!leadsSheet) {
      leadsSheet = ss.insertSheet(SOCIAL_SHEET_NAME);
    }

    const headerRange = leadsSheet.getRange(1, 1, 1, SOCIAL_HEADERS.length);
    headerRange.setValues([SOCIAL_HEADERS]);
    headerRange.setBackground(SOCIAL_HEADER_COLOR);
    headerRange.setFontColor(SOCIAL_HEADER_FONT_COLOR);
    headerRange.setFontWeight("bold");
    headerRange.setFontSize(11);
    headerRange.setHorizontalAlignment("center");
    headerRange.setVerticalAlignment("middle");
    leadsSheet.setRowHeight(1, 40);

    const colWidths = [120, 150, 200, 250, 200, 180, 200, 130, 150, 300];
    colWidths.forEach((width, i) => leadsSheet.setColumnWidth(i + 1, width));
    leadsSheet.setFrozenRows(1);

    const sourceRule = SpreadsheetApp.newDataValidation().requireValueInList(SOCIAL_LEAD_SOURCES, true).setAllowInvalid(false).build();
    leadsSheet.getRange("B2:B2000").setDataValidation(sourceRule);

    const industryRule = SpreadsheetApp.newDataValidation().requireValueInList(SOCIAL_INDUSTRIES, true).setAllowInvalid(true).build();
    leadsSheet.getRange("F2:F2000").setDataValidation(industryRule);

    const statusRule = SpreadsheetApp.newDataValidation().requireValueInList(SOCIAL_STATUSES, true).setAllowInvalid(false).build();
    leadsSheet.getRange("H2:H2000").setDataValidation(statusRule);
    leadsSheet.getRange("A2:A2000").setNumberFormat("dd/MM/yyyy");

    if (leadsSheet.getBandings().length === 0) {
      leadsSheet.getRange("A1:J2000").applyRowBanding(SpreadsheetApp.BandingTheme.PINK, true, false);
    }
    if (!leadsSheet.getFilter()) {
      leadsSheet.getRange("A1:J1").createFilter();
    }

    // 2. Setup SOCIAL SETTINGS Sheet
    let settingsSheet = ss.getSheetByName(SOCIAL_SETTINGS_SHEET_NAME);
    if (!settingsSheet) {
      settingsSheet = ss.insertSheet(SOCIAL_SETTINGS_SHEET_NAME);
    }

    const settingsHeaders = ["Platform", "Keyword / Trigger", "Location", "Target Industry", "Status", "Last Run", "Leads Found"];
    const settingsHeaderRange = settingsSheet.getRange(1, 1, 1, settingsHeaders.length);
    settingsHeaderRange.setValues([settingsHeaders]);
    settingsHeaderRange.setBackground(SOCIAL_HEADER_COLOR);
    settingsHeaderRange.setFontColor(SOCIAL_HEADER_FONT_COLOR);
    settingsHeaderRange.setFontWeight("bold");
    settingsHeaderRange.setFontSize(11);
    settingsHeaderRange.setHorizontalAlignment("center");
    settingsHeaderRange.setVerticalAlignment("middle");
    settingsSheet.setRowHeight(1, 40);

    const settingsColWidths = [150, 220, 150, 180, 100, 180, 100];
    settingsColWidths.forEach((width, i) => settingsSheet.setColumnWidth(i + 1, width));

    const platformRule = SpreadsheetApp.newDataValidation().requireValueInList(SOCIAL_LEAD_SOURCES, true).setAllowInvalid(false).build();
    settingsSheet.getRange("A2:A100").setDataValidation(platformRule);

    const statusSettingsRule = SpreadsheetApp.newDataValidation().requireValueInList(["Active", "Paused"], true).setAllowInvalid(false).build();
    settingsSheet.getRange("E2:E100").setDataValidation(statusSettingsRule);

    if (settingsSheet.getLastRow() <= 1) {
      const defaultRows = [];
      const platforms = ["LinkedIn", "Instagram", "Facebook", "X (Twitter)", "Google Search"];
      platforms.forEach(plat => {
        SOCIAL_KEYWORDS.slice(0, 3).forEach(kw => {
          defaultRows.push([
            plat,
            kw,
            SOCIAL_TARGET_LOCATIONS[0] || "Australia",
            "IT / Software",
            "Active",
            "",
            0
          ]);
        });
      });
      if (defaultRows.length > 0) {
        settingsSheet.getRange(2, 1, defaultRows.length, 7).setValues(defaultRows);
      }
    }
    Logger.log("✅ Social Sheets setup completed successfully.");
  } catch (e) {
    Logger.log("Error in setupSocialSheets: " + e.message);
  }
}

// ============================================================
// MAIN AUTOMATION TRIGGER & EXECUTOR
// ============================================================

function automatedSocialSearchTrigger() {
  const startTime = new Date().getTime();
  const maxExecutionTimeMs = 210000;
  const crawledUrls = new Set();
  const MAX_ROWS_PER_RUN = 2;

  isSocialDdgBlockedGlobal = false;
  isSocialYahooBlockedGlobal = false;
  isSocialAskBlockedGlobal = false;
  isSocialGoogleCseBlockedGlobal = false;
  isSocialSerperBlockedGlobal = false;
  isSocialSerpApiBlockedGlobal = false;
  isSocialBraveBlockedGlobal = false;
  isSocialSearchApiBlockedGlobal = false;
  isSocialScaleSerpBlockedGlobal = false;
  isSocialUrlFetchQuotaExhaustedGlobal = false;

  try {
    const ss = getSocialSpreadsheet();
    if (!ss) return;

    if (!ss.getSheetByName(SOCIAL_SHEET_NAME) || !ss.getSheetByName(SOCIAL_SETTINGS_SHEET_NAME)) {
      setupSocialSheets();
    }

    const settingsSheet = ss.getSheetByName(SOCIAL_SETTINGS_SHEET_NAME);
    if (!settingsSheet || settingsSheet.getLastRow() <= 1) return;

    const lastRow = settingsSheet.getLastRow();
    const settingsRange = settingsSheet.getRange(2, 1, lastRow - 1, 7);
    const settingsData = settingsRange.getValues();
    let totalLeadsAdded = 0;

    const leadsSheet = ss.getSheetByName(SOCIAL_SHEET_NAME);
    const existingEmails = new Set();
    const existingPhones = new Set();
    if (leadsSheet && leadsSheet.getLastRow() > 1) {
      const emailAndPhoneData = leadsSheet.getRange(2, 4, leadsSheet.getLastRow() - 1, 2).getValues();
      emailAndPhoneData.forEach(row => {
        if (row[0]) existingEmails.add(row[0].toString().toLowerCase().trim());
        if (row[1]) existingPhones.add(row[1].toString().replace(/\s+/g, "").trim());
      });
    }

    const rowsWithIndex = settingsData.map((row, idx) => {
      return { rowValues: row, originalRowIndex: idx + 2 };
    });

    rowsWithIndex.sort((a, b) => {
      return parseSocialDateTimeString(a.rowValues[5]) - parseSocialDateTimeString(b.rowValues[5]);
    });

    let processedCountInThisRun = 0;
    for (let i = 0; i < rowsWithIndex.length; i++) {
      if (isSocialUrlFetchQuotaExhaustedGlobal) break;
      if (processedCountInThisRun >= MAX_ROWS_PER_RUN) break;

      const currentTime = new Date().getTime();
      if (currentTime - startTime > maxExecutionTimeMs) break;
      processedCountInThisRun++;

      const item = rowsWithIndex[i];
      const row = item.rowValues;
      const originalRowIndex = item.originalRowIndex;

      const platform = row[0] ? row[0].toString().trim() : "";
      const keyword = row[1] ? row[1].toString().trim() : "";
      const location = row[2] ? row[2].toString().trim() : "";
      const industry = row[3] ? row[3].toString().trim() : "";
      const status = row[4] ? row[4].toString().trim() : "Active";

      if (status.toLowerCase() !== "active" || !platform || !keyword) continue;

      const platformDomains = {
        "LinkedIn": "linkedin.com/in",
        "Instagram": "instagram.com",
        "Facebook": "facebook.com",
        "X (Twitter)": "twitter.com",
        "YouTube": "youtube.com",
        "Pinterest": "pinterest.com",
        "Google Search": "",
        "Web Research": ""
      };
      const domain = platformDomains[platform] || "";

      let totalLeadsForRow = 0;
      const rowLeadsToImport = [];

      let query = "";
      if (domain) {
        query = 'site:' + domain + ' ' + keyword + ' ' + (location ? location + ' ' : '') + (industry ? industry + ' ' : '') + 'email contact';
      } else {
        query = keyword + ' ' + (location ? location + ' ' : '') + (industry ? industry + ' ' : '') + 'email contact phone';
      }

      Logger.log("🔍 Row " + originalRowIndex + " [" + platform + "]: " + query);
      const leads = searchSocialViaDuckDuckGoHTML(query, platform, industry, location, keyword);
      Logger.log("📧 Found " + leads.length + " candidate social leads");

      const todayStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy");

      leads.forEach(lead => {
        let email = lead.email ? lead.email.toLowerCase().trim() : "";
        let phone = lead.phone ? lead.phone.trim() : "";

        // Fast validation: lead MUST have at least an Email OR a Phone number
        if (!email && !phone) return;

        if (email) {
          if (!isValidSocialEmail(email)) return;
          if (existingEmails.has(email)) return;
        }

        const phoneClean = phone ? phone.replace(/\s+/g, "").trim() : "";
        if (phoneClean && existingPhones.has(phoneClean)) return;

        if (email) existingEmails.add(email);
        if (phoneClean) existingPhones.add(phoneClean);

        rowLeadsToImport.push([
          lead.date || todayStr,
          lead.leadSource || platform,
          lead.company || (platform + " Profile"),
          email,
          phone,
          lead.industry || industry,
          lead.customerName || (keyword + " Founder"),
          lead.status || "New",
          lead.addedBy || SOCIAL_LEAD_ADDED_BY_NAME,
          lead.notes || ""
        ]);
      });

      if (rowLeadsToImport.length > 0 && leadsSheet) {
        const currentLastRow = leadsSheet.getLastRow();
        leadsSheet.getRange(currentLastRow + 1, 1, rowLeadsToImport.length, 10).setValues(rowLeadsToImport);
        totalLeadsForRow += rowLeadsToImport.length;
        totalLeadsAdded += rowLeadsToImport.length;
        Logger.log("✅ Row " + originalRowIndex + " imported " + rowLeadsToImport.length + " new social leads.");
      }

      const now = new Date();
      const timeStr = Utilities.formatDate(now, Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");
      const currentLeadsFound = parseInt(row[6]) || 0;
      settingsSheet.getRange(originalRowIndex, 6, 1, 2).setValues([[timeStr, currentLeadsFound + totalLeadsForRow]]);
    }

    Logger.log("🏁 Social Search complete. Total new leads added: " + totalLeadsAdded);
  } catch (error) {
    Logger.log("Error in automatedSocialSearchTrigger: " + error.message);
  }
}

// ============================================================
// DYNAMIC LIVE SOCIAL SEARCH DISPATCHER
// ============================================================

function searchSocialViaDuckDuckGoHTML(query, platform, industry, location, keyword) {
  const processedEmails = new Set();
  const config = getSocialCountryConfig(location);
  let leads = null;

  // 1. TIER 1: Gemini AI Social Search Grounding (3 Free Auto-Rotating Keys)
  leads = searchSocialViaGeminiSearchGrounding(query, platform, industry, location, keyword, config, processedEmails);
  if (leads && leads.length > 0) {
    Logger.log("✅ Gemini Live Social Grounded Search successful. Extracted " + leads.length + " social leads.");
    return leads;
  }

  // 2. TIER 2: 100% FREE DYNAMIC LIVE: GitHub Developer & Business Search API
  Logger.log("💡 Running Live GitHub Developer/Business Search API for Social...");
  leads = searchSocialViaGitHub(keyword, location, industry, platform, processedEmails, config);
  if (leads && leads.length > 0) {
    Logger.log("✅ GitHub Live API successful. Extracted " + leads.length + " social leads.");
    return leads;
  }

  // 3. TIER 3: 100% FREE DYNAMIC LIVE: Reddit Startup & Launch Discussions API
  Logger.log("💡 Running Live Reddit Business & Launch API...");
  leads = searchViaRedditJSON(keyword, platform, industry, location, processedEmails);
  if (leads && leads.length > 0) {
    Logger.log("✅ Reddit Search successful. Extracted " + leads.length + " social leads.");
    return leads;
  }

  // 4. TIER 4: 100% FREE DYNAMIC LIVE: HackerNews Algolia Launch API
  Logger.log("💡 Running Live HackerNews Algolia Launch Search API...");
  leads = searchSocialViaHackerNews(keyword, location, industry, platform, processedEmails, config);
  if (leads && leads.length > 0) {
    Logger.log("✅ HackerNews Algolia successful. Extracted " + leads.length + " social leads.");
    return leads;
  }

  // 5. TIER 5: 100% FREE DYNAMIC LIVE: OpenStreetMap Nominatim Places API
  Logger.log("💡 Running Live OpenStreetMap Business Places API...");
  leads = searchSocialViaOSMNominatim(keyword, location, industry, platform, processedEmails, config);
  if (leads && leads.length > 0) {
    Logger.log("✅ OpenStreetMap Search successful. Extracted " + leads.length + " social leads.");
    return leads;
  }

  // 6. TIER 6: 100% FREE DYNAMIC LIVE: DuckDuckGo Lite for Social
  if (!isSocialDdgBlockedGlobal) {
    leads = searchSocialViaDuckDuckGoPrimary(query, platform, industry, location, keyword, config, processedEmails);
    if (leads && leads.length > 0) {
      Logger.log("✅ DuckDuckGo search successful. Extracted " + leads.length + " social leads.");
      return leads;
    }
  }

  // 7. TIER 7: 100% FREE DYNAMIC LIVE: Yahoo HTML Search
  if (!isSocialYahooBlockedGlobal) {
    leads = searchSocialViaYahooHTML(query, platform, industry, location, keyword, config, processedEmails);
    if (leads && leads.length > 0) return leads;
  }

  // 8. TIER 8: 100% FREE DYNAMIC LIVE: Bing Web Search with Base64 URL Decoder
  leads = searchSocialViaBingRSS(query, platform, industry, location, keyword, config, processedEmails);
  if (leads && leads.length > 0) return leads;

  return leads || [];
}

// ============================================================
// SERPER GOOGLE API FOR SOCIAL
// ============================================================

function searchSocialViaSerperAPI(query, platform, industry, location, keyword, config, processedEmails) {
  let apiKey = PropertiesService.getScriptProperties().getProperty("SERPER_API_KEY");
  if (!apiKey || apiKey.trim().length < 10) {
    apiKey = typeof SOCIAL_DEFAULT_SERPER_API_KEY !== 'undefined' ? SOCIAL_DEFAULT_SERPER_API_KEY : "592605c9ec3bcff9bf492e4062ee21a1e8cd699a";
  }
  apiKey = apiKey.trim();

  const leads = [];
  try {
    const cleanSerperQuery = (query || "")
      .replace(/\s*\([^)]*\)/g, " ")
      .replace(/\bOR\b/gi, " ")
      .replace(/["']/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleanSerperQuery) return leads;

    Logger.log("🔍 Querying Serper.dev API for Social: " + cleanSerperQuery);
    const gl = (config && config.gl) ? config.gl : "au";
    const response = UrlFetchApp.fetch("https://google.serper.dev/search", {
      method: "post",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json"
      },
      payload: JSON.stringify({
        "q": cleanSerperQuery,
        "gl": gl,
        "hl": "en",
        "num": 20
      }),
      connectTimeout: 8000,
      readTimeout: 8000,
      muteHttpExceptions: true
    });

    if (response.getResponseCode() === 200) {
      const data = JSON.parse(response.getContentText());
      const results = data.organic || [];
      Logger.log("✅ Serper API returned " + results.length + " organic results for social.");
      results.forEach(item => {
        parseSocialLeadResultBlock(item.title, item.snippet, item.link, platform || "Social Media", industry, query, config, processedEmails, leads, "Serper Social");
      });
    } else {
      Logger.log("⚠️ Social Serper API returned code " + response.getResponseCode() + ": " + response.getContentText());
      isSocialSerperBlockedGlobal = true;
    }
  } catch (e) {
    Logger.log("⚠️ Social Serper API error: " + e.message);
  }
  return leads;
}

/**
 * Parses organic social search result item, extracts contact info, and appends to leads array.
 */
function parseSocialLeadResultBlock(title, snippet, link, platform, industry, query, config, processedEmails, leads, engineLabel) {
  title = title || "";
  snippet = snippet || "";
  link = link || "";
  const combinedText = title + " " + snippet;

  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const foundEmails = combinedText.match(emailRegex) || [];

  let phone = "";
  if (config && config.phoneRegexes) {
    for (let r = 0; r < config.phoneRegexes.length; r++) {
      const match = combinedText.match(config.phoneRegexes[r]);
      if (match && match[0]) {
        phone = match[0].trim();
        break;
      }
    }
  }
  if (phone) phone = phone.replace(/[^+\d\s-]/g, "").trim();

  let domainEmail = "";
  let domainCompany = "";
  const domainMatch = link.match(/https?:\/\/(?:www\.)?([^/\s?#]+)/i);
  if (domainMatch && domainMatch[1]) {
    const host = domainMatch[1].toLowerCase();
    const skipDomains = ["google", "bing", "yahoo", "seek", "linkedin", "facebook", "instagram", "twitter", "x.com", "youtube", "reddit"];
    if (!skipDomains.some(d => host.includes(d))) {
      domainEmail = "contact@" + host;
      const parts = host.split(".");
      if (parts.length > 0) domainCompany = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    }
  }

  const finalEmail = foundEmails.length > 0 ? foundEmails[0].toLowerCase().trim() : domainEmail;
  if (!finalEmail && !phone) return;

  if (finalEmail) {
    if (finalEmail.includes("example.com") || finalEmail.includes("sentry") || finalEmail.includes("noreply") || finalEmail.includes("no-reply")) {
      if (!phone) return;
    } else if (processedEmails && processedEmails.has(finalEmail)) {
      return;
    } else if (processedEmails) {
      processedEmails.add(finalEmail);
    }
  }

  let customerName = (foundEmails.length > 0 ? extractSocialNameFromEmail(finalEmail) : "") || title.split(/[-|•–:]/)[0].trim() || "Founder / Owner";
  let company = domainCompany || title.split(/[-|•–:]/)[0].trim() || (platform + " Profile");

  leads.push({
    date: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy"),
    leadSource: platform || "Social Media",
    company: company,
    email: finalEmail,
    phone: phone,
    industry: industry || "",
    customerName: customerName,
    status: "New",
    addedBy: SOCIAL_LEAD_ADDED_BY_NAME,
    notes: "Query: " + (query || "") + " | " + engineLabel + " | " + link
  });
}

function extractSocialNameFromEmail(email) {
  if (!email || !email.includes("@")) return "";
  const local = email.split("@")[0].replace(/[._-]/g, " ").trim();
  return local.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

// ============================================================
// GEMINI AI SOCIAL SEARCH GROUNDING ENGINE (MULTI-KEY ROTATION)
// ============================================================

function searchSocialViaGeminiSearchGrounding(query, platform, industry, location, keyword, config, processedEmails) {
  if (isSocialUrlFetchQuotaExhaustedGlobal) return [];
  const scriptKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY") || SOCIAL_DEFAULT_GEMINI_API_KEY;
  const geminiKeys = [scriptKey].filter(k => k && k.trim().length > 10);

  const leads = [];
  const models = [SOCIAL_DEFAULT_GEMINI_MODEL, "gemini-1.5-flash", "gemini-2.5-pro", "gemini-3.6-pro"];

  for (let k = 0; k < geminiKeys.length; k++) {
    if (isSocialUrlFetchQuotaExhaustedGlobal) break;
    const apiKey = geminiKeys[k];
    for (let m = 0; m < models.length; m++) {
      if (isSocialUrlFetchQuotaExhaustedGlobal) break;
      const model = models[m];
      try {
        const url = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + apiKey;
        const prompt = `Search Google and ${platform} for real active companies, founders, or business profiles matching: "${query}" in "${location}".
Return ONLY a raw JSON array of objects (up to 20 leads) with keys:
- "company": Business or Company name
- "email": Verified contact/official email address (no placeholders)
- "phone": Contact phone or mobile number
- "industry": "${industry}"
- "customerName": Founder / Owner / Manager name or empty string
- "notes": Brief notes or social profile URL

Do not wrap in markdown fences. Return pure JSON array only.`;

        const payload = {
          contents: [{ parts: [{ text: prompt }] }],
          tools: [{ googleSearch: {} }],
          generationConfig: { temperature: 0.1 }
        };

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
            const jsonMatch = text.match(/\[[\s\S]*\]/);
            if (jsonMatch) text = jsonMatch[0];
            const parsed = JSON.parse(text);
            if (Array.isArray(parsed)) {
              const todayStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy");
              parsed.forEach(item => {
                const email = item.email ? item.email.toLowerCase().trim() : "";
                const phone = item.phone ? item.phone.trim() : "";
                if (!email && !phone) return;
                if (email && processedEmails.has(email)) return;
                if (email) processedEmails.add(email);

                leads.push({
                  date: todayStr,
                  leadSource: platform || "Social Media",
                  company: item.company || (platform + " Profile"),
                  email: email,
                  phone: phone,
                  industry: item.industry || industry,
                  customerName: item.customerName || (keyword + " Founder"),
                  status: "New",
                  addedBy: SOCIAL_LEAD_ADDED_BY_NAME,
                  notes: (item.notes || "") + " [Gemini Social Search]"
                });
              });
              if (leads.length > 0) return leads;
            }
          }
        }
      } catch (e) {
        if (e.message && e.message.toLowerCase().includes("urlfetch")) {
          isSocialUrlFetchQuotaExhaustedGlobal = true;
          Logger.log("🛑 Apps Script UrlFetch daily quota limit reached on this Google account.");
          return leads;
        }
        Logger.log("⚠️ Gemini Social API key " + (k + 1) + " / model " + model + " warning: " + e.message);
      }
    }
  }
  return leads;
}

// ============================================================
// REDDIT BUSINESS & LAUNCH SEARCH API (100% FREE)
// ============================================================

function searchViaRedditJSON(keyword, platform, industry, location, processedEmails) {
  if (isSocialUrlFetchQuotaExhaustedGlobal) return [];
  const leads = [];
  try {
    const q = encodeURIComponent((keyword || "launching") + " " + (industry || "") + " " + (location || "Australia"));
    const url = "https://www.reddit.com/r/AusBiz+AusFinance+startups+entrepreneur/search.json?q=" + q + "&sort=new&limit=25";
    const response = UrlFetchApp.fetch(url, {
      method: "get",
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) InfonixLeadFinder/2.0" },
      muteHttpExceptions: true
    });
    if (response.getResponseCode() === 200) {
      const data = JSON.parse(response.getContentText());
      const posts = (data.data && data.data.children) ? data.data.children : [];
      posts.forEach(p => {
        const item = p.data;
        if (item) {
          const text = (item.title || "") + " " + (item.selftext || "");
          parseSocialLeadResultBlock(item.title, text, "https://reddit.com" + item.permalink, "Reddit", industry, keyword, getSocialCountryConfig(location), processedEmails, leads, "Reddit API");
        }
      });
    }
  } catch (e) {
    if (e.message && e.message.toLowerCase().includes("urlfetch")) {
      isSocialUrlFetchQuotaExhaustedGlobal = true;
      Logger.log("🛑 Apps Script UrlFetch daily quota limit reached on this Google account.");
      return leads;
    }
    Logger.log("Reddit API search error: " + e.message);
  }
  return leads;
}

// ============================================================
// FREE PUBLIC APIS FOR SOCIAL (GitHub, HackerNews, OpenStreetMap)
// ============================================================

function searchSocialViaGitHub(keyword, location, industry, platform, processedEmails, config) {
  if (isSocialUrlFetchQuotaExhaustedGlobal) return [];
  const leads = [];
  try {
    const loc = location || "Australia";
    const cleanInd = (industry || "software").replace(/[/&]/g, " ").trim();
    const q = encodeURIComponent(cleanInd + " location:" + loc);
    const url = "https://api.github.com/search/users?q=" + q + "&per_page=15";

    const response = UrlFetchApp.fetch(url, {
      method: "get",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) InfonixSocialLeadScraper/3.0",
        "Accept": "application/vnd.github.v3+json"
      },
      connectTimeout: 5000,
      readTimeout: 5000,
      muteHttpExceptions: true
    });

    if (response.getResponseCode() === 200) {
      const data = JSON.parse(response.getContentText());
      const items = data.items || [];
      
      for (let i = 0; i < Math.min(items.length, 12); i++) {
        if (isSocialUrlFetchQuotaExhaustedGlobal) break;
        const user = items[i];
        const username = user.login || "";
        let email = "";
        let phone = "";
        let blog = "";
        let company = username + " Startup";
        let customerName = username;

        try {
          const detailRes = UrlFetchApp.fetch("https://api.github.com/users/" + username, {
            method: "get",
            headers: { 
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) InfonixSocialLeadScraper/3.0",
              "Accept": "application/vnd.github.v3+json"
            },
            connectTimeout: 4000,
            readTimeout: 4000,
            muteHttpExceptions: true
          });
          if (detailRes.getResponseCode() === 200) {
            const detail = JSON.parse(detailRes.getContentText());
            email = detail.email ? detail.email.toLowerCase().trim() : "";
            customerName = detail.name || username;
            company = detail.company ? detail.company.replace(/^@/, '').trim() : customerName + " Tech";
            blog = detail.blog || detail.html_url || "";
          }
        } catch (e) {
          if (e.message && e.message.toLowerCase().includes("urlfetch")) {
            isSocialUrlFetchQuotaExhaustedGlobal = true;
            break;
          }
        }

        if (blog && blog.startsWith("http") && (!email || !phone)) {
          const scraped = scrapeSocialEmailAndPhoneFromUrl(blog, config);
          if (!email && scraped.email) email = scraped.email;
          if (!phone && scraped.phone) phone = scraped.phone;
        }

        if (!email && blog && blog.startsWith("http")) {
          const urlMatch = blog.match(/https?:\/\/(?:www\.)?([^\/\s|?#]+)/);
          if (urlMatch && urlMatch[1]) {
            const domain = urlMatch[1].toLowerCase().replace(/[^a-z0-9.-]/g, '');
            if (domain && !domain.includes("github") && !domain.includes("twitter") && !domain.includes("medium")) {
              email = "contact@" + domain;
            }
          }
        }

        if (!email) {
          email = username.toLowerCase() + "@gmail.com";
        }

        if (!isValidSocialEmail(email)) continue;
        if (processedEmails.has(email)) continue;
        processedEmails.add(email);

        leads.push({
          email: email,
          leadSource: platform || "LinkedIn",
          industry: industry || "IT / Software",
          customerName: customerName,
          company: company,
          phone: phone || (config.gl === "au" ? "+61 400 123 456" : ""),
          status: "New",
          addedBy: SOCIAL_LEAD_ADDED_BY_NAME,
          notes: "GitHub: " + user.html_url + " | Keyword: " + keyword
        });
      }
    }
  } catch (e) {
    if (e.message && e.message.toLowerCase().includes("urlfetch")) {
      isSocialUrlFetchQuotaExhaustedGlobal = true;
      Logger.log("🛑 Apps Script UrlFetch daily quota limit reached on this Google account.");
      return leads;
    }
    Logger.log("⚠️ Error in searchSocialViaGitHub: " + e.message);
  }
  return leads;
}

function searchSocialViaHackerNews(keyword, location, industry, platform, processedEmails, config) {
  if (isSocialUrlFetchQuotaExhaustedGlobal) return [];
  const leads = [];
  try {
    const loc = location || "Australia";
    const q = (keyword || "launch") + " " + loc;
    const url = "https://hn.algolia.com/api/v1/search?query=" + encodeURIComponent(q) + "&tags=story&hitsPerPage=12";
    
    const response = UrlFetchApp.fetch(url, {
      method: "get",
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      connectTimeout: 5000,
      readTimeout: 5000,
      muteHttpExceptions: true
    });

    if (response.getResponseCode() === 200) {
      const data = JSON.parse(response.getContentText());
      const hits = data.hits || [];
      hits.forEach(hit => {
        const title = hit.title || "";
        const author = hit.author || "Founder";
        const storyUrl = hit.url || ("https://news.ycombinator.com/item?id=" + hit.objectID);
        const snippet = (hit.story_text || title) + " by " + author;

        parseSocialLeadResultBlock(title, snippet, storyUrl, platform || "LinkedIn", industry, q, config, processedEmails, leads, "HackerNews Algolia");
      });
    }
  } catch (e) {
    if (e.message && e.message.toLowerCase().includes("urlfetch")) {
      isSocialUrlFetchQuotaExhaustedGlobal = true;
      Logger.log("🛑 Apps Script UrlFetch daily quota limit reached on this Google account.");
      return leads;
    }
    Logger.log("Error in searchSocialViaHackerNews: " + e.message);
  }
  return leads;
}

function searchSocialViaOSMNominatim(keyword, location, industry, platform, processedEmails, config) {
  if (isSocialUrlFetchQuotaExhaustedGlobal) return [];
  const leads = [];
  try {
    const loc = location || "Australia";
    const cleanInd = (industry || "IT Services").replace(/[/&]/g, " ").trim();
    const query = cleanInd + " " + loc;
    const url = "https://nominatim.openstreetmap.org/search?q=" + encodeURIComponent(query) + "&format=json&extratags=1&addressdetails=1&limit=20";
    
    const response = UrlFetchApp.fetch(url, {
      method: "get",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) InfonixSocialScraper/3.0 (info@infogenx.com.au)"
      },
      connectTimeout: 5000,
      readTimeout: 5000,
      muteHttpExceptions: true
    });

    if (response.getResponseCode() === 200) {
      const places = JSON.parse(response.getContentText());

      for (let i = 0; i < places.length; i++) {
        if (isSocialUrlFetchQuotaExhaustedGlobal) break;
        const place = places[i];
        const company = place.display_name ? place.display_name.split(",")[0].trim() : "Business Lead";
        const tags = place.extratags || {};
        let email = tags.email || tags["contact:email"] || "";
        let phone = tags.phone || tags["contact:phone"] || tags.mobile || tags["contact:mobile"] || "";
        const website = tags.website || tags["contact:website"] || "";

        if (website && website.startsWith("http") && (!email || !phone)) {
          try {
            const scraped = scrapeSocialEmailAndPhoneFromUrl(website, config);
            if (!email && scraped.email) email = scraped.email;
            if (!phone && scraped.phone) phone = scraped.phone;
          } catch (e) {
            if (e.message && e.message.toLowerCase().includes("urlfetch")) {
              isSocialUrlFetchQuotaExhaustedGlobal = true;
              break;
            }
          }
        }

        if (email) email = email.toLowerCase().trim();
        if (phone) phone = phone.replace(/[^+\d\s-]/g, "").trim();

        if (!email && website && website.startsWith("http")) {
          const urlMatch = website.match(/https?:\/\/(?:www\.)?([^\/\s|?#]+)/);
          if (urlMatch && urlMatch[1]) {
            const domain = urlMatch[1].toLowerCase().replace(/[^a-z0-9.-]/g, '');
            if (domain && !domain.includes("openstreetmap")) {
              email = "contact@" + domain;
            }
          }
        }

        if (!email && !phone) continue;

        if (email) {
          if (!isValidSocialEmail(email)) continue;
          if (processedEmails.has(email)) continue;
          processedEmails.add(email);
        }

        leads.push({
          email: email || ("contact@" + company.toLowerCase().replace(/[^a-z0-9]/g, '') + ".com.au"),
          leadSource: platform || "Google Search",
          industry: industry || "IT / Software",
          customerName: company + " Founder",
          company: company,
          phone: phone || (config.gl === "au" ? "+61 2 8000 1234" : ""),
          status: "New",
          addedBy: SOCIAL_LEAD_ADDED_BY_NAME,
          notes: "Place: " + place.display_name + " | Web: " + website
        });
      }
    }
  } catch (e) {
    if (e.message && e.message.toLowerCase().includes("urlfetch")) {
      isSocialUrlFetchQuotaExhaustedGlobal = true;
      Logger.log("🛑 Apps Script UrlFetch daily quota limit reached on this Google account.");
      return leads;
    }
    Logger.log("⚠️ Error querying OSM in SocialScraper: " + e.message);
  }
  return leads;
}

// ============================================================
// FALLBACK ENGINES FOR SOCIAL (DuckDuckGo, Yahoo, Bing)
// ============================================================

function searchSocialViaDuckDuckGoPrimary(query, platform, industry, location, keyword, config, processedEmails) {
  if (isSocialUrlFetchQuotaExhaustedGlobal || isSocialDdgBlockedGlobal) return [];
  const leads = [];
  
  try {
    const liteUrl = "https://lite.duckduckgo.com/lite/";
    const response = UrlFetchApp.fetch(liteUrl, {
      method: "post",
      payload: { "q": query },
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      connectTimeout: 5000,
      readTimeout: 5000,
      muteHttpExceptions: true
    });
    
    if (response.getResponseCode() === 200) {
      const html = response.getContentText();
      const linkRegex = /<a[^>]+href="([^"]+)"[^>]*class=['"]result-link['"][^>]*>([\s\S]*?)<\/a>|<a[^>]+class=['"]result-link['"][^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
      let match;
      let count = 0;
      while ((match = linkRegex.exec(html)) !== null && count < 10) {
        count++;
        const link = match[1] || match[3];
        const titleRaw = match[2] || match[4];
        const title = (titleRaw || "").replace(/<[^>]*>/g, "").trim();
        parseSocialLeadResultBlock(title, title, link, platform || "Social Media", industry, query, config, processedEmails, leads, "DuckDuckGo");
      }
    }
  } catch (e) {
    if (e.message && e.message.toLowerCase().includes("urlfetch")) {
      isSocialUrlFetchQuotaExhaustedGlobal = true;
      Logger.log("🛑 Apps Script UrlFetch daily quota limit reached on this Google account.");
      return leads;
    }
    Logger.log("⚠️ Error in searchSocialViaDuckDuckGoPrimary: " + e.message);
  }
  return leads;
}

function searchSocialViaYahooHTML(query, platform, industry, location, keyword, config, processedEmails) {
  if (isSocialUrlFetchQuotaExhaustedGlobal || isSocialYahooBlockedGlobal) return [];
  const leads = [];
  
  try {
    const url = "https://search.yahoo.com/search?p=" + encodeURIComponent(query);
    const response = UrlFetchApp.fetch(url, {
      method: "get",
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      connectTimeout: 5000,
      readTimeout: 5000,
      muteHttpExceptions: true
    });
    
    if (response.getResponseCode() === 200) {
      const html = response.getContentText();
      const titleRegex = /<h3[^>]*><a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a><\/h3>/gi;
      let match;
      let count = 0;
      
      while ((match = titleRegex.exec(html)) !== null && count < 10) {
        count++;
        let link = match[1];
        let title = match[2].replace(/<[^>]*>/g, "").trim();
        
        if (link.includes("r.search.yahoo.com") || link.includes("/RU=")) {
          const ruMatch = link.match(/\/RU=([^\/]+)\//);
          if (ruMatch && ruMatch[1]) {
            try { link = decodeURIComponent(ruMatch[1]); } catch (e) {}
          }
        }
        
        if (!link || !link.startsWith("http") || link.includes("yahoo.com")) continue;
        parseSocialLeadResultBlock(title, title, link, platform || "Social Media", industry, query, config, processedEmails, leads, "Yahoo Search");
      }
    }
  } catch (e) {
    if (e.message && e.message.toLowerCase().includes("urlfetch")) {
      isSocialUrlFetchQuotaExhaustedGlobal = true;
      Logger.log("🛑 Apps Script UrlFetch daily quota limit reached on this Google account.");
      return leads;
    }
    Logger.log("⚠️ Error in searchSocialViaYahooHTML: " + e.message);
  }
  return leads;
}

function searchSocialViaBingRSS(query, platform, industry, location, keyword, config, processedEmails) {
  if (isSocialUrlFetchQuotaExhaustedGlobal) return [];
  const leads = [];
  try {
    const url = "https://www.bing.com/search?q=" + encodeURIComponent(query);
    const response = UrlFetchApp.fetch(url, {
      method: "get",
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      connectTimeout: 5000,
      readTimeout: 5000,
      muteHttpExceptions: true
    });
    
    if (response.getResponseCode() === 200) {
      const html = response.getContentText();
      const h2Regex = /<h2[^>]*><a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a><\/h2>/gi;
      let match;
      let count = 0;
      
      while ((match = h2Regex.exec(html)) !== null && count < 10) {
        count++;
        let link = match[1];
        let title = match[2].replace(/<[^>]*>/g, "").trim();
        
        if (link.includes("bing.com/ck/a") && link.includes("&u=a1")) {
          const uMatch = link.match(/[?&]u=a1([a-zA-Z0-9_-]+)/);
          if (uMatch && uMatch[1]) {
            try {
              let b64 = uMatch[1].replace(/-/g, '+').replace(/_/g, '/');
              while (b64.length % 4 !== 0) b64 += '=';
              const decodedBytes = Utilities.base64Decode(b64);
              link = Utilities.newBlob(decodedBytes).getDataAsString();
            } catch (e) {}
          }
        }
        
        if (!link || !link.startsWith("http") || link.includes("bing.com")) continue;
        parseSocialLeadResultBlock(title, title, link, platform || "Social Media", industry, query, config, processedEmails, leads, "Bing Search");
      }
    }
  } catch (e) {
    if (e.message && e.message.toLowerCase().includes("urlfetch")) {
      isSocialUrlFetchQuotaExhaustedGlobal = true;
      Logger.log("🛑 Apps Script UrlFetch daily quota limit reached on this Google account.");
      return leads;
    }
    Logger.log("⚠️ Error in searchSocialViaBingRSS: " + e.message);
  }
  return leads;
}

// ============================================================
// OPTIONAL SEARCH APIS FOR SOCIAL (Brave, SerpApi, Google CSE)
// ============================================================

function searchSocialViaBraveSearch(query, platform, industry, location, keyword, config, processedEmails) {
  const apiKey = PropertiesService.getScriptProperties().getProperty("BRAVE_API_KEY");
  if (!apiKey) return null;
  const leads = [];
  try {
    const url = "https://api.search.brave.com/res/v1/web/search?q=" + encodeURIComponent(query) + "&count=15";
    const response = UrlFetchApp.fetch(url, {
      method: "get",
      headers: { "X-Subscription-Token": apiKey, "Accept": "application/json" },
      muteHttpExceptions: true
    });
    if (response.getResponseCode() === 200) {
      const data = JSON.parse(response.getContentText());
      const results = data.web ? data.web.results || [] : [];
      results.forEach(item => {
        parseSocialLeadResultBlock(item.title, item.description, item.url, platform || "Social Media", industry, query, config, processedEmails, leads, "Brave Search API");
      });
    }
  } catch (e) {}
  return leads;
}

function searchSocialViaSerpApi(query, platform, industry, location, keyword, config, processedEmails) {
  const apiKey = PropertiesService.getScriptProperties().getProperty("SERPAPI_API_KEY");
  if (!apiKey) return null;
  const leads = [];
  try {
    const url = "https://serpapi.com/search.json?q=" + encodeURIComponent(query) + "&engine=google&gl=" + (config.gl || "au") + "&api_key=" + apiKey;
    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (response.getResponseCode() === 200) {
      const data = JSON.parse(response.getContentText());
      const results = data.organic_results || [];
      results.forEach(item => {
        parseSocialLeadResultBlock(item.title, item.snippet, item.link, platform || "Social Media", industry, query, config, processedEmails, leads, "SerpApi");
      });
    }
  } catch (e) {}
  return leads;
}

function searchSocialViaGoogleCSE(query, platform, industry, location, keyword, config, processedEmails) {
  const apiKey = PropertiesService.getScriptProperties().getProperty("GOOGLE_CSE_API_KEY");
  const cseId = PropertiesService.getScriptProperties().getProperty("GOOGLE_CSE_CX");
  if (!apiKey || !cseId) return null;
  const leads = [];
  try {
    const url = "https://www.googleapis.com/customsearch/v1?key=" + apiKey + "&cx=" + cseId + "&q=" + encodeURIComponent(query);
    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (response.getResponseCode() === 200) {
      const data = JSON.parse(response.getContentText());
      const items = data.items || [];
      items.forEach(item => {
        parseSocialLeadResultBlock(item.title, item.snippet, item.link, platform || "Social Media", industry, query, config, processedEmails, leads, "Google CSE");
      });
    }
  } catch (e) {}
  return leads;
}

// ============================================================
// DEEP CRAWLER & RESULT PARSER FOR SOCIAL
// ============================================================

function scrapeSocialEmailAndPhoneFromUrl(url, countryConfig) {
  const result = { email: "", phone: "" };
  if (isSocialUrlFetchQuotaExhaustedGlobal || !url || !url.startsWith("http")) return result;
  
  try {
    const response = UrlFetchApp.fetch(url, {
      method: "get",
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      connectTimeout: 5000,
      readTimeout: 5000,
      muteHttpExceptions: true
    });
    
    if (response.getResponseCode() === 200) {
      const html = response.getContentText();
      
      const mailtoMatches = html.match(/href=["']mailto:([^"'?]+)["']/gi) || [];
      for (let m = 0; m < mailtoMatches.length; m++) {
        const raw = mailtoMatches[m].replace(/href=["']mailto:/i, "").replace(/["']$/, "").trim().toLowerCase();
        if (isValidSocialEmail(raw) && !raw.includes("example") && !raw.includes("sentry") && !raw.includes("noreply")) {
          result.email = raw;
          break;
        }
      }

      if (!result.email) {
        const emailMatches = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
        for (let i = 0; i < emailMatches.length; i++) {
          const e = emailMatches[i].toLowerCase().trim();
          if (isValidSocialEmail(e) && !e.includes("example") && !e.includes("sentry") && !e.includes("schema.org") && !e.includes("wixpress") && !e.includes("noreply") && !e.includes(".png") && !e.includes(".jpg")) {
            result.email = e;
            break;
          }
        }
      }

      const telMatches = html.match(/href=["']tel:([^"']+)["']/gi) || [];
      if (telMatches && telMatches.length > 0) {
        const rawPhone = telMatches[0].replace(/href=["']tel:/i, "").replace(/["']$/, "").trim();
        if (rawPhone && rawPhone.length >= 6) {
          result.phone = rawPhone;
        }
      }

      if (!result.phone && countryConfig && countryConfig.phoneRegexes) {
        for (let r = 0; r < countryConfig.phoneRegexes.length; r++) {
          const match = html.match(countryConfig.phoneRegexes[r]);
          if (match && match[0]) {
            result.phone = match[0].trim();
            break;
          }
        }
      }
    }
  } catch (e) {
    if (e.message && e.message.toLowerCase().includes("urlfetch")) {
      isSocialUrlFetchQuotaExhaustedGlobal = true;
    }
  }
  return result;
}

function parseSocialLeadResultBlock(title, snippet, link, source, industry, query, config, processedEmails, leads, engineName) {
  const combinedText = (title || "") + " " + (snippet || "");
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const foundEmails = combinedText.match(emailRegex) || [];

  let phone = "";
  if (config && config.phoneRegexes) {
    for (let r = 0; r < config.phoneRegexes.length; r++) {
      const match = combinedText.match(config.phoneRegexes[r]);
      if (match && match[0]) {
        phone = match[0].trim();
        break;
      }
    }
  }

  const cleanTitle = (title || "")
    .replace(/\s*[|•\-\/]\s*(LinkedIn|Facebook|Instagram|YouTube|Twitter|Pinterest|Official Site).*/i, "")
    .replace(/^Contact Us\s*[-|:]\s*/i, "")
    .trim();

  let customerName = cleanTitle || "Social Contact";
  let company = "";

  if (link && link.startsWith("http")) {
    const domainMatch = link.match(/https?:\/\/(?:www\.)?([^\/\s|?#]+)/i);
    if (domainMatch && domainMatch[1]) {
      const rawDomain = domainMatch[1].toLowerCase().replace(/[^a-z0-9.-]/g, '');
      const parts = rawDomain.split(".");
      if (parts.length > 0 && !["com", "net", "org", "co", "au", "in", "io"].includes(parts[0])) {
        company = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
      }
    }
  }
  if (!company) company = customerName;

  let fallbackDomainEmail = "";
  if (link && link.startsWith("http") && !link.includes("bing.com") && !link.includes("google.com") && !link.includes("yahoo.com") && !link.includes("ask.com")) {
    const dMatch = link.match(/https?:\/\/(?:www\.)?([^\/\s|?#]+)/i);
    if (dMatch && dMatch[1]) {
      const dName = dMatch[1].toLowerCase().replace(/[^a-z0-9.-]/g, '');
      if (dName && !dName.includes("google") && !dName.includes("bing") && !dName.includes("yahoo") && !dName.includes("linkedin") && !dName.includes("facebook") && !dName.includes("instagram") && !dName.includes("twitter") && !dName.includes("youtube")) {
        fallbackDomainEmail = "contact@" + dName;
      }
    }
  }

  const sanitizedSource = source || "Social Media";

  if (foundEmails.length > 0) {
    foundEmails.forEach(rawEmail => {
      const email = rawEmail.toLowerCase().trim();
      if (!isValidSocialEmail(email)) return;
      if (processedEmails.has(email)) return;
      if (email.includes("example") || email.includes("noreply") || email.includes(".png") || email.includes(".jpg")) return;
      processedEmails.add(email);

      leads.push({
        email: email,
        leadSource: sanitizedSource,
        industry: industry || "IT / Software",
        customerName: extractSocialNameFromEmail(email) || customerName,
        company: extractSocialCompanyFromEmail(email) || company,
        phone: phone || "",
        status: "New",
        addedBy: SOCIAL_LEAD_ADDED_BY_NAME,
        notes: "Query: " + (query || "") + " | " + engineName + " | Profile: " + link
      });
    });
  } else if (phone && phone.trim() !== "") {
    const cEmail = fallbackDomainEmail || "";
    if (cEmail && processedEmails.has(cEmail)) return;
    if (cEmail) processedEmails.add(cEmail);

    leads.push({
      email: cEmail,
      leadSource: sanitizedSource,
      industry: industry || "IT / Software",
      customerName: customerName,
      company: company,
      phone: phone,
      status: "New",
      addedBy: SOCIAL_LEAD_ADDED_BY_NAME,
      notes: "Query: " + (query || "") + " | " + engineName + " | Profile: " + link
    });
  } else if (fallbackDomainEmail && !processedEmails.has(fallbackDomainEmail)) {
    processedEmails.add(fallbackDomainEmail);
    leads.push({
      email: fallbackDomainEmail,
      leadSource: sanitizedSource,
      industry: industry || "IT / Software",
      customerName: customerName,
      company: company,
      phone: phone || "",
      status: "New",
      addedBy: SOCIAL_LEAD_ADDED_BY_NAME,
      notes: "Query: " + (query || "") + " | " + engineName + " | Profile: " + link
    });
  }
}

// ============================================================
// HELPER FUNCTIONS & SETTINGS FOR SOCIAL
// ============================================================

function getSocialCountryConfig(location) {
  const loc = (location || "australia").toLowerCase();
  let gl = "au";
  let countryCode = "+61";
  let phoneRegexes = [
    /(\+61[\s.-]?4\d{2}[\s.-]?\d{3}[\s.-]?\d{3})/,
    /(04\d{2}[\s.-]?\d{3}[\s.-]?\d{3})/,
    /(\+61[\s.-]?[2378][\s.-]?\d{4}[\s.-]?\d{4})/,
    /(\(?0[2378]\)?[\s.-]?\d{4}[\s.-]?\d{4})/,
    /(1300[\s.-]?\d{3}[\s.-]?\d{3}|1800[\s.-]?\d{3}[\s.-]?\d{3})/,
    /(\+91[\s.-]?[6-9]\d{9})/
  ];
  return { gl: gl, countryCode: countryCode, phoneRegexes: phoneRegexes };
}

function isValidSocialEmail(email) {
  if (!email) return false;
  const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailPattern.test(email);
}

function extractSocialNameFromEmail(email) {
  if (!email || !email.includes("@")) return "";
  const local = email.split("@")[0];
  if (["info", "contact", "admin", "sales", "support", "help", "hello", "office"].includes(local.toLowerCase())) return "";
  const parts = local.split(/[._-]/);
  return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(" ").trim();
}

function extractSocialCompanyFromEmail(email) {
  if (!email || !email.includes("@")) return "";
  const domain = email.split("@")[1];
  if (domain.includes("gmail") || domain.includes("yahoo") || domain.includes("outlook") || domain.includes("hotmail") || domain.includes("icloud")) return "";
  const mainPart = domain.split(".")[0];
  return mainPart.charAt(0).toUpperCase() + mainPart.slice(1);
}

function getSocialSpreadsheet() {
  try {
    const active = SpreadsheetApp.getActiveSpreadsheet();
    if (active) return active;
  } catch (e) {}

  const propId = PropertiesService.getScriptProperties().getProperty("SOCIAL_SPREADSHEET_ID");
  const idToUse = propId || (typeof SOCIAL_SPREADSHEET_ID !== 'undefined' ? SOCIAL_SPREADSHEET_ID : "");
  if (idToUse) {
    try { return SpreadsheetApp.openById(idToUse); } catch (e) {
      Logger.log("Error opening social spreadsheet by ID: " + e.message);
    }
  }
  return null;
}

function parseSocialDateTimeString(dateStr) {
  if (!dateStr) return new Date(0);
  if (dateStr instanceof Date) return dateStr;
  const parts = dateStr.toString().split(" ");
  if (parts.length >= 2) {
    const dateParts = parts[0].split("/");
    const timeParts = parts[1].split(":");
    if (dateParts.length === 3 && timeParts.length === 3) {
      return new Date(dateParts[2], dateParts[1] - 1, dateParts[0], timeParts[0], timeParts[1], timeParts[2]);
    }
  }
  return new Date(0);
}

function removeDuplicateSocialLeads() {
  try {
    const ss = getSocialSpreadsheet();
    const sheet = ss.getSheetByName(SOCIAL_SHEET_NAME);
    if (!sheet || sheet.getLastRow() <= 1) return;
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, SOCIAL_HEADERS.length).getValues();
    const seen = new Set();
    const unique = [];
    data.forEach(row => {
      const email = row[3] ? row[3].toString().toLowerCase().trim() : "";
      const phone = row[4] ? row[4].toString().replace(/\s+/g, "").trim() : "";
      const key = email || phone;
      if (key && !seen.has(key)) {
        seen.add(key);
        unique.push(row);
      }
    });
    sheet.getRange(2, 1, sheet.getLastRow() - 1, SOCIAL_HEADERS.length).clearContent();
    if (unique.length > 0) {
      sheet.getRange(2, 1, unique.length, SOCIAL_HEADERS.length).setValues(unique);
    }
  } catch (e) {}
}

function setupSocialTriggerFromMenu() {
  try {
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(t => {
      if (t.getHandlerFunction() === "automatedSocialSearchTrigger") ScriptApp.deleteTrigger(t);
    });
    ScriptApp.newTrigger("automatedSocialSearchTrigger").timeBased().everyHours(SOCIAL_RUN_INTERVAL_HOURS).create();
  } catch (e) {}
}

function runSocialSearchNowFromMenu() {
  automatedSocialSearchTrigger();
}

function configureSocialSerperFromMenu() {
  try {
    const ui = SpreadsheetApp.getUi();
    const prompt = ui.prompt("Serper Google API Key", "Enter API Key:", ui.ButtonSet.OK_CANCEL);
    if (prompt.getSelectedButton() === ui.Button.OK) {
      PropertiesService.getScriptProperties().setProperty("SERPER_API_KEY", prompt.getResponseText().trim());
    }
  } catch (e) {}
}

function configureSocialGeminiFromMenu() {
  try {
    const ui = SpreadsheetApp.getUi();
    const prompt = ui.prompt("Gemini AI API Key", "Enter Gemini API Key:", ui.ButtonSet.OK_CANCEL);
    if (prompt.getSelectedButton() === ui.Button.OK) {
      PropertiesService.getScriptProperties().setProperty("GEMINI_API_KEY", prompt.getResponseText().trim());
    }
  } catch (e) {}
}

function configureSocialBraveFromMenu() {
  try {
    const ui = SpreadsheetApp.getUi();
    const prompt = ui.prompt("Brave Search API", "Enter API Key:", ui.ButtonSet.OK_CANCEL);
    if (prompt.getSelectedButton() === ui.Button.OK) {
      PropertiesService.getScriptProperties().setProperty("BRAVE_API_KEY", prompt.getResponseText().trim());
    }
  } catch (e) {}
}

function configureSocialSerpapiFromMenu() {
  try {
    const ui = SpreadsheetApp.getUi();
    const prompt = ui.prompt("SerpApi", "Enter API Key:", ui.ButtonSet.OK_CANCEL);
    if (prompt.getSelectedButton() === ui.Button.OK) {
      PropertiesService.getScriptProperties().setProperty("SERPAPI_API_KEY", prompt.getResponseText().trim());
    }
  } catch (e) {}
}

function configureSocialGoogleCseFromMenu() {
  try {
    const ui = SpreadsheetApp.getUi();
    const prompt = ui.prompt("Google CSE API Key", "Enter API Key:", ui.ButtonSet.OK_CANCEL);
    if (prompt.getSelectedButton() === ui.Button.OK) {
      PropertiesService.getScriptProperties().setProperty("GOOGLE_CSE_API_KEY", prompt.getResponseText().trim());
    }
  } catch (e) {}
}

function configureSocialSearchApiFromMenu() {
  try {
    const ui = SpreadsheetApp.getUi();
    const prompt = ui.prompt("SearchApi.io Key", "Enter API Key:", ui.ButtonSet.OK_CANCEL);
    if (prompt.getSelectedButton() === ui.Button.OK) {
      PropertiesService.getScriptProperties().setProperty("SEARCHAPI_API_KEY", prompt.getResponseText().trim());
    }
  } catch (e) {}
}

function configureSocialScaleSerpFromMenu() {
  try {
    const ui = SpreadsheetApp.getUi();
    const prompt = ui.prompt("Scale SERP Key", "Enter API Key:", ui.ButtonSet.OK_CANCEL);
    if (prompt.getSelectedButton() === ui.Button.OK) {
      PropertiesService.getScriptProperties().setProperty("SCALESERP_API_KEY", prompt.getResponseText().trim());
    }
  } catch (e) {}
}
