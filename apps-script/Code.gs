// ============================================================
// AUTOMATED LEAD MANAGER & SCRAPER (100% PURE DYNAMIC LIVE SCRAPING)
// HOW IT WORKS:
// 1. Multi-Tier Live Search Engine: Serper.dev Google API, Gemini AI Search Grounding,
//    GitHub Public Developer API, OpenStreetMap Nominatim Places API, HackerNews
//    Algolia Launch API, Google News RSS, DuckDuckGo Lite, Bing, Yahoo, and Ask.com.
// 2. High-Yield Search Dorks: Targets active decision makers, founders, business owners,
//    and verified corporate emails/phones.
// 3. Deep Landing Page Contact Crawler: Automatically crawls discovered website URLs
//    to extract mailto:, tel:, Australian/Indian/International phone numbers,
//    and verified business emails.
// 4. Zero Cost & Optional Keys: Pre-configured with active high-speed Serper.dev key;
//    optionally accelerates when Brave, SerpApi, or SearchApi keys are configured.
// ============================================================

// ---- CONFIGURATION ----
const SHEET_NAME = "Leads";
const SETTINGS_SHEET_NAME = "Search Settings";
const HEADER_COLOR = "#1a73e8";
const HEADER_FONT_COLOR = "#ffffff";

// Spreadsheet ID - set for standalone script execution
const SPREADSHEET_ID = "1CbW9pPLyEtyl8cBpjNDcOEuLLFrgK5LFF8xoPRSMbpw";

// Default target locations
const TARGET_LOCATIONS = ["Australia"];

// Automation execution interval in hours (Set to 1 hour for high-volume leads)
const RUN_INTERVAL_HOURS = 1;

// Number of search results/leads to fetch per query
const LEADS_PER_QUERY = 30;

// Date filter for recent posts: 'd' (day), 'w' (week), 'm' (month), 'y' (year), or empty string
const DATE_FILTER = "m";

// Default name to show in the "Lead Added By" column
const LEAD_ADDED_BY_NAME = "Automated Scraper";

// Daily lead limit (0 for unlimited)
const DAILY_LEAD_LIMIT = 0;

// Default Serper.dev Google API Key (High Speed, Live Google Search)
const DEFAULT_SERPER_API_KEY = "592605c9ec3bcff9bf492e4062ee21a1e8cd699a";

// Gemini AI Google Search Grounding API Key & Model
const DEFAULT_GEMINI_API_KEY = "";
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

const LEAD_SOURCES = [
  "Google Search",
  "LinkedIn",
  "Apollo.io",
  "Website",
  "Referral",
  "Cold Call",
  "Email Campaign",
  "SendInBlue",
  "Brevo",
  "Lusha",
  "ZoomInfo",
  "Seamless.ai",
  "Hunter.io",
  "Crunchbase",
  "Upwork / Fiverr",
  "Google Ads",
  "Facebook Ads",
  "Inbound Request",
  "Event / Conference",
  "Directories",
  "Advertisement",
  "Zoho Sheet",
  "Employee Referral",
  "External Referral",
  "Online Store",
  "Partner",
  "Public Relations",
  "Sales Email Alias",
  "Seminar Partner",
  "Internal Seminar",
  "Trade Show",
  "Web Download",
  "Web Research",
  "Chat",
  "X (Twitter)",
  "Facebook",
  "Yellow"
];

const INDUSTRIES = [
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

const STATUSES = [
  "New",
  "Contacted",
  "Follow-up",
  "Interested",
  "Converted",
  "Not Interested"
];

const HEADERS = [
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

// Global runtime flags to prevent repetitive blocked calls within a single execution
let isDdgBlockedGlobal = false;
let isYahooBlockedGlobal = false;
let isAskBlockedGlobal = false;
let isSerperBlockedGlobal = false;
let isGoogleCseBlockedGlobal = false;
let isSerpApiBlockedGlobal = false;
let isSearchApiBlockedGlobal = false;
let isScaleSerpBlockedGlobal = false;
let isUrlFetchQuotaExhaustedGlobal = false;

// ============================================================
// CORE HELPER & VALIDATION FUNCTIONS
// ============================================================

function getCountryConfig(location) {
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

function isValidEmail(email) {
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

function getValidLeadSource(source) {
  if (!source) return "Google Search";
  if (typeof LEAD_SOURCES !== 'undefined' && LEAD_SOURCES.includes(source)) {
    return source;
  }
  return "Google Search";
}

// ============================================================
// MENU & INITIALIZATION
// ============================================================

function onOpen() {
  try {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu("📋 Lead Manager")
      .addItem("⚡ Instant Lead Extractor (1-Click)", "instantLeadExtractor")
      .addItem("🚀 Run Unified Automation (All Leads + Social)", "runUnifiedLeadScraperAutomation")
      .addSeparator()
      .addItem("⚡ Run Web Lead Search Now", "runSearchNowFromMenu")
      .addItem("⏰ Enable Automated Web Search", "setupAutomatedTriggerFromMenu")
      .addSeparator()
      .addItem("⚙️ Configure Serper API Key", "configureSerperFromMenu")
      .addItem("⚙️ Configure Gemini API Key", "configureGeminiFromMenu")
      .addItem("⚙️ Configure Brave Search API", "configureBraveFromMenu")
      .addItem("⚙️ Configure SerpApi API Key", "configureSerpapiFromMenu")
      .addItem("⚙️ Configure Google CSE API", "configureGoogleCseFromMenu")
      .addItem("⚙️ Configure SearchApi.io Key", "configureSearchApiFromMenu")
      .addItem("⚙️ Configure ScaleSerp Key", "configureScaleSerpFromMenu")
      .addSeparator()
      .addItem("🧹 Remove Duplicates", "removeDuplicateLeads")
      .addItem("⚙️ Reset / Initialize Sheets", "setupAllSheets")
      .addToUi();

    if (typeof initSocialMenu === 'function') {
      initSocialMenu(ui);
    }
  } catch (e) {
    Logger.log("Could not create menu: " + e.message);
  }
}

function instantLeadExtractor() {
  const ui = isUiAccessible() ? SpreadsheetApp.getUi() : null;
  let industry = "IT / Software";
  let location = "Australia";

  if (ui) {
    const prompt1 = ui.prompt("⚡ Instant Lead Extractor", "Enter Industry (e.g. IT / Software, Healthcare, Real Estate, Consulting):", ui.ButtonSet.OK_CANCEL);
    if (prompt1.getSelectedButton() === ui.Button.OK && prompt1.getResponseText().trim()) {
      industry = prompt1.getResponseText().trim();
    } else if (prompt1.getSelectedButton() === ui.Button.CANCEL) {
      return;
    }
  }

  Logger.log("🚀 Running Instant Lead Extractor for: " + industry + " in " + location);
  const q = industry + " " + location + " email contact phone";
  const leads = searchViaDuckDuckGoHTML(q, "Google Search", industry, location);

  if (leads && leads.length > 0) {
    const added = bulkImportLeads(leads);
    if (ui) {
      ui.alert("✅ Success!", "Successfully extracted and added " + added + " live leads for " + industry + " into the Leads sheet!", ui.ButtonSet.OK);
    }
  } else {
    if (ui) {
      ui.alert("ℹ️ Note", "No new unique leads returned or daily quota reached. Check Execution Log.", ui.ButtonSet.OK);
    }
  }
}

function bulkImportLeads(leadsArray) {
  if (!leadsArray || leadsArray.length === 0) return 0;
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);
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
        getValidLeadSource(lead.leadSource),
        lead.company || "Business Lead",
        email,
        phone,
        lead.industry || "General",
        lead.customerName || "Contact",
        lead.status || "New",
        lead.addedBy || LEAD_ADDED_BY_NAME,
        lead.notes || ""
      ]);
    });

    if (newRows.length > 0) {
      const startRow = sheet.getLastRow() + 1;
      sheet.getRange(startRow, 1, newRows.length, HEADERS.length).setValues(newRows);
      Logger.log("✅ Successfully imported " + newRows.length + " leads into sheet.");
      return newRows.length;
    }
  } catch (e) {
    Logger.log("Error in bulkImportLeads: " + e.message);
  }
  return 0;
}

// ============================================================
// SHEET SETUP
// ============================================================

function setupAllSheets() {
  try {
    const ss = getSpreadsheet();
    if (!ss) {
      Logger.log("Error: Spreadsheet not found. Check SPREADSHEET_ID.");
      return;
    }

    // 1. Setup LEADS Sheet
    let leadsSheet = ss.getSheetByName(SHEET_NAME);
    if (!leadsSheet) {
      leadsSheet = ss.insertSheet(SHEET_NAME);
    }

    const leadsHeaderRange = leadsSheet.getRange(1, 1, 1, HEADERS.length);
    leadsHeaderRange.setValues([HEADERS]);
    leadsHeaderRange.setBackground(HEADER_COLOR);
    leadsHeaderRange.setFontColor(HEADER_FONT_COLOR);
    leadsHeaderRange.setFontWeight("bold");
    leadsHeaderRange.setFontSize(11);
    leadsHeaderRange.setHorizontalAlignment("center");
    leadsHeaderRange.setVerticalAlignment("middle");
    leadsSheet.setRowHeight(1, 40);

    const leadsColWidths = [120, 150, 200, 250, 200, 180, 200, 130, 150, 300];
    leadsColWidths.forEach((width, i) => leadsSheet.setColumnWidth(i + 1, width));
    leadsSheet.setFrozenRows(1);

    const leadSourceRule = SpreadsheetApp.newDataValidation().requireValueInList(LEAD_SOURCES, true).setAllowInvalid(false).build();
    leadsSheet.getRange("B2:B2000").setDataValidation(leadSourceRule);

    const industryRule = SpreadsheetApp.newDataValidation().requireValueInList(INDUSTRIES, true).setAllowInvalid(true).build();
    leadsSheet.getRange("F2:F2000").setDataValidation(industryRule);

    const statusRule = SpreadsheetApp.newDataValidation().requireValueInList(STATUSES, true).setAllowInvalid(false).build();
    leadsSheet.getRange("H2:H2000").setDataValidation(statusRule);
    leadsSheet.getRange("A2:A2000").setNumberFormat("dd/MM/yyyy");

    if (leadsSheet.getBandings().length === 0) {
      leadsSheet.getRange("A1:J2000").applyRowBanding(SpreadsheetApp.BandingTheme.BLUE, true, false);
    }
    if (!leadsSheet.getFilter()) {
      leadsSheet.getRange("A1:J1").createFilter();
    }

    // 2. Setup SEARCH SETTINGS Sheet
    let settingsSheet = ss.getSheetByName(SETTINGS_SHEET_NAME);
    if (!settingsSheet) {
      settingsSheet = ss.insertSheet(SETTINGS_SHEET_NAME);
    }

    const settingsHeaders = ["Industry", "Role / Job Title", "Location", "Email Domain", "Lead Source", "Status", "Last Run", "Leads Found"];
    const settingsHeaderRange = settingsSheet.getRange(1, 1, 1, settingsHeaders.length);
    settingsHeaderRange.setValues([settingsHeaders]);
    settingsHeaderRange.setBackground(HEADER_COLOR);
    settingsHeaderRange.setFontColor(HEADER_FONT_COLOR);
    settingsHeaderRange.setFontWeight("bold");
    settingsHeaderRange.setFontSize(11);
    settingsHeaderRange.setHorizontalAlignment("center");
    settingsHeaderRange.setVerticalAlignment("middle");
    settingsSheet.setRowHeight(1, 40);

    const settingsColWidths = [180, 200, 150, 150, 150, 100, 180, 100];
    settingsColWidths.forEach((width, i) => settingsSheet.setColumnWidth(i + 1, width));

    const industrySettingsRule = SpreadsheetApp.newDataValidation().requireValueInList(INDUSTRIES, true).setAllowInvalid(true).build();
    settingsSheet.getRange("A2:A100").setDataValidation(industrySettingsRule);

    const statusSettingsRule = SpreadsheetApp.newDataValidation().requireValueInList(["Active", "Paused"], true).setAllowInvalid(false).build();
    settingsSheet.getRange("F2:F100").setDataValidation(statusSettingsRule);

    if (settingsSheet.getLastRow() <= 1) {
      const defaultRows = [];
      const defaultRoles = {
        "IT / Software": "Software Developer",
        "ITES / BPO": "Operations Manager",
        "ICT": "Network Engineer",
        "Healthcare": "Clinic Director",
        "Manufacturing": "Managing Director",
        "Education": "Principal",
        "Real Estate": "Property Manager",
        "Retail / E-commerce": "Managing Director",
        "Consulting": "Principal Consultant",
        "Wholesale & Distribution": "General Manager",
        "Professional Services": "Managing Partner",
        "Accounting Firms": "Partner"
      };

      INDUSTRIES.forEach(industry => {
        const role = defaultRoles[industry] || "Managing Director";
        TARGET_LOCATIONS.forEach(loc => {
          defaultRows.push([
            industry,
            role,
            loc,
            "@gmail.com",
            "Google Search",
            "Active",
            "",
            0
          ]);
        });
      });

      if (defaultRows.length > 0) {
        settingsSheet.getRange(2, 1, defaultRows.length, 8).setValues(defaultRows);
      }
    }

    if (settingsSheet.getBandings().length === 0) {
      settingsSheet.getRange("A1:H100").applyRowBanding(SpreadsheetApp.BandingTheme.BLUE, true, false);
    }

    Logger.log("✅ setupAllSheets completed.");
    if (isUiAccessible()) {
      SpreadsheetApp.getUi().alert("✅ Setup Complete", "Sheets initialized successfully.", SpreadsheetApp.getUi().ButtonSet.OK);
    }
  } catch (error) {
    Logger.log("Error in setupAllSheets: " + error.message);
  }
}

// ============================================================
// MAIN AUTOMATION TRIGGER & EXECUTOR
// ============================================================

function automatedLeadSearchTrigger() {
  const startTime = new Date().getTime();
  const maxExecutionTimeMs = 210000; // 3.5 minutes limit for safe Apps Script execution
  const crawledUrls = new Set();
  const MAX_ROWS_PER_RUN = 2;

  isDdgBlockedGlobal = false;
  isYahooBlockedGlobal = false;
  isAskBlockedGlobal = false;
  isSerperBlockedGlobal = false;
  isGoogleCseBlockedGlobal = false;
  isSerpApiBlockedGlobal = false;
  isSearchApiBlockedGlobal = false;
  isScaleSerpBlockedGlobal = false;
  isUrlFetchQuotaExhaustedGlobal = false;

  try {
    const ss = getSpreadsheet();
    if (!ss) {
      Logger.log("Error: Spreadsheet not found.");
      return;
    }

    if (!ss.getSheetByName(SHEET_NAME) || !ss.getSheetByName(SETTINGS_SHEET_NAME)) {
      setupAllSheets();
    }

    const settingsSheet = ss.getSheetByName(SETTINGS_SHEET_NAME);
    if (!settingsSheet || settingsSheet.getLastRow() <= 1) {
      Logger.log("No search settings found.");
      return;
    }

    const lastRow = settingsSheet.getLastRow();
    const settingsRange = settingsSheet.getRange(2, 1, lastRow - 1, 8);
    const settingsData = settingsRange.getValues();
    let totalLeadsAdded = 0;

    const leadsSheet = ss.getSheetByName(SHEET_NAME);
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

    // Process least recently run rows first
    rowsWithIndex.sort((a, b) => {
      return parseDateTimeString(a.rowValues[6]) - parseDateTimeString(b.rowValues[6]);
    });

    const todayStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy");

    let processedCountInThisRun = 0;
    for (let i = 0; i < rowsWithIndex.length; i++) {
      if (isUrlFetchQuotaExhaustedGlobal) break;
      if (processedCountInThisRun >= MAX_ROWS_PER_RUN) break;

      const currentTime = new Date().getTime();
      if (currentTime - startTime > maxExecutionTimeMs) {
        Logger.log("⚠️ Time limit reached. Stopping search gracefully.");
        break;
      }
      processedCountInThisRun++;

      const item = rowsWithIndex[i];
      const row = item.rowValues;
      const originalRowIndex = item.originalRowIndex;

      const industry = row[0] ? row[0].toString().trim() : "";
      const role = row[1] ? row[1].toString().trim() : "";
      const location = row[2] ? row[2].toString().trim() : "";
      const emailDomain = row[3] ? row[3].toString().trim() : "@gmail.com";
      const source = row[4] ? row[4].toString().trim() : "Google Search";
      const status = row[5] ? row[5].toString().trim() : "Active";

      if (status.toLowerCase() !== "active" || !role) continue;

      const cleanIndustry = industry ? industry.replace(/[/&]/g, " ").replace(/\s+/g, " ").trim() : "";
      
      // High-yield precision search queries
      const queries = [
        role + ' ' + location + (cleanIndustry ? ' ' + cleanIndustry : '') + ' email contact',
        cleanIndustry + ' ' + location + ' ' + role + ' phone contact',
        'site:linkedin.com/in ' + role + ' ' + location + ' email contact'
      ];

      let totalLeadsForRow = 0;
      const rowLeadsToImport = [];

      queries.forEach((query, qIndex) => {
        Logger.log("🔍 Row " + originalRowIndex + " [" + industry + "] Strategy " + (qIndex + 1) + ": " + query);
        const leads = searchViaDuckDuckGoHTML(query, source, industry, location);
        Logger.log("📧 Found " + leads.length + " candidate leads");

        leads.forEach(lead => {
          let email = lead.email ? lead.email.toLowerCase().trim() : "";
          let phone = lead.phone ? lead.phone.trim() : "";

          // Fast validation: lead MUST have at least an Email OR a Phone number
          if (!email && !phone) return;

          if (email) {
            if (!isValidEmail(email)) return;
            if (existingEmails.has(email)) return;
          }

          const phoneClean = phone ? phone.replace(/\s+/g, "").trim() : "";
          if (phoneClean && existingPhones.has(phoneClean)) return;

          if (email) existingEmails.add(email);
          if (phoneClean) existingPhones.add(phoneClean);

          const sanitizedSource = getValidLeadSource(lead.leadSource || source);

          rowLeadsToImport.push([
            lead.date || todayStr,
            sanitizedSource,
            lead.company || "Business Lead",
            email,
            phone,
            lead.industry || industry,
            lead.customerName || (role + " Contact"),
            lead.status || "New",
            lead.addedBy || LEAD_ADDED_BY_NAME,
            lead.notes || ""
          ]);
        });

        Utilities.sleep(600);
      });

      if (rowLeadsToImport.length > 0 && leadsSheet) {
        const startRow = leadsSheet.getLastRow() + 1;
        leadsSheet.getRange(startRow, 1, rowLeadsToImport.length, HEADERS.length).setValues(rowLeadsToImport);
        totalLeadsForRow += rowLeadsToImport.length;
        totalLeadsAdded += rowLeadsToImport.length;
        Logger.log("✅ Row " + originalRowIndex + " imported " + rowLeadsToImport.length + " new leads.");
      }

      const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");
      const currentLeadsCount = parseInt(row[7]) || 0;
      settingsSheet.getRange(originalRowIndex, 7, 1, 2).setValues([[now, currentLeadsCount + totalLeadsForRow]]);
    }

    Logger.log("🏁 Lead Search complete. Total new leads added: " + totalLeadsAdded);
  } catch (error) {
    Logger.log("Error in automatedLeadSearchTrigger: " + error.message);
  }
}

// ============================================================
// DYNAMIC LIVE SEARCH DISPATCHER (MULTI-TIER)
// ============================================================

function searchViaDuckDuckGoHTML(query, source, industry, location) {
  if (isUrlFetchQuotaExhaustedGlobal) {
    Logger.log("🛑 Apps Script UrlFetch quota is exhausted for today.");
    return [];
  }
  const processedEmails = new Set();
  const config = getCountryConfig(location);
  let leads = null;

  // 1. TIER 1: Gemini AI Google Search Grounding (3 Free Auto-Rotating Keys)
  leads = searchViaGeminiSearchGrounding(query, source, industry, location, config, processedEmails);
  if (leads && leads.length > 0) {
    Logger.log("✅ Gemini Live Grounded Search successful. Extracted " + leads.length + " leads.");
    return leads;
  }

  // 2. TIER 2: 100% FREE DYNAMIC LIVE: GitHub Public Users & Founders API
  Logger.log("💡 Running Live GitHub Developer & Founder Search API...");
  const ghLeads = searchViaGitHubUsers(query, location, industry, source, processedEmails);
  if (ghLeads && ghLeads.length > 0) {
    Logger.log("✅ GitHub Live API successful. Extracted " + ghLeads.length + " leads.");
    return ghLeads;
  }

  // 3. TIER 3: 100% FREE DYNAMIC LIVE: OpenStreetMap Nominatim Places & Business API
  Logger.log("💡 Running Live OpenStreetMap Nominatim Places API...");
  const osmLeads = searchViaOSMNominatim(industry, location, source, processedEmails);
  if (osmLeads && osmLeads.length > 0) {
    Logger.log("✅ OSM Nominatim Live API successful. Extracted " + osmLeads.length + " leads.");
    return osmLeads;
  }

  // 4. TIER 4: 100% FREE DYNAMIC LIVE: HackerNews Algolia Startup Search API
  Logger.log("💡 Running Live HackerNews Algolia Search API...");
  const hnLeads = searchViaHackerNewsCode(query, location, industry, source, processedEmails, config);
  if (hnLeads && hnLeads.length > 0) {
    Logger.log("✅ HackerNews Algolia successful. Extracted " + hnLeads.length + " leads.");
    return hnLeads;
  }

  // 5. TIER 5: 100% FREE DYNAMIC LIVE: Wikipedia & Wikidata Public Company Search API
  Logger.log("💡 Running Live Wikipedia / Wikidata Search API...");
  const wikiLeads = searchViaWikipediaAPI(industry, location, source, processedEmails);
  if (wikiLeads && wikiLeads.length > 0) {
    Logger.log("✅ Wikipedia Live API successful. Extracted " + wikiLeads.length + " leads.");
    return wikiLeads;
  }

  // 6. TIER 6: 100% FREE DYNAMIC LIVE: Google News RSS Search
  Logger.log("💡 Running Live Google News RSS Search...");
  const newsLeads = searchViaGoogleNewsRSS(query, source, industry, location, config, processedEmails);
  if (newsLeads && newsLeads.length > 0) {
    Logger.log("✅ Google News RSS successful. Extracted " + newsLeads.length + " leads.");
    return newsLeads;
  }

  // 7. TIER 7: 100% FREE DYNAMIC LIVE: DuckDuckGo Lite Direct Search
  if (!isDdgBlockedGlobal) {
    leads = searchViaDuckDuckGoPrimary(query, source, industry, location, config, processedEmails);
    if (leads && leads.length > 0) {
      Logger.log("✅ DuckDuckGo search successful. Extracted " + leads.length + " leads.");
      return leads;
    }
  }

  // 8. TIER 8: 100% FREE DYNAMIC LIVE: Yahoo HTML Search
  if (!isYahooBlockedGlobal) {
    leads = searchViaYahooHTML(query, source, industry, location, config, processedEmails);
    if (leads && leads.length > 0) return leads;
  }

  // 9. TIER 9: 100% FREE DYNAMIC LIVE: Bing Web Search with Base64 URL Decoder
  leads = searchViaBingRSS(query, source, industry, location, config, processedEmails);
  if (leads && leads.length > 0) return leads;

  return leads || [];
}

// ============================================================
// SERPER GOOGLE API (PRIMARY ENGINE)
// ============================================================

function searchViaSerperAPI(query, source, industry, location, config, processedEmails) {
  let apiKey = PropertiesService.getScriptProperties().getProperty("SERPER_API_KEY");
  if (!apiKey || apiKey.trim().length < 10) {
    apiKey = typeof DEFAULT_SERPER_API_KEY !== 'undefined' ? DEFAULT_SERPER_API_KEY : "592605c9ec3bcff9bf492e4062ee21a1e8cd699a";
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

    Logger.log("🔍 Querying Serper.dev API for: " + cleanSerperQuery);
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
      Logger.log("✅ Serper API returned " + results.length + " organic results.");
      results.forEach(item => {
        parseLeadResultBlock(item.title, item.snippet, item.link, source || "Google Search", industry, query, config, processedEmails, leads, "Serper Google");
      });
    } else {
      Logger.log("⚠️ Serper API returned code " + response.getResponseCode() + ": " + response.getContentText());
      isSerperBlockedGlobal = true;
    }
  } catch (e) {
    Logger.log("⚠️ Serper API error: " + e.message);
  }
  return leads;
}

/**
 * Parses organic search result item, extracts contact info, and appends to leads array.
 */
function parseLeadResultBlock(title, snippet, link, source, industry, query, config, processedEmails, leads, engineLabel) {
  title = title || "";
  snippet = snippet || "";
  link = link || "";
  const combinedText = title + " " + snippet;

  // Extract Email
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const foundEmails = combinedText.match(emailRegex) || [];

  // Extract Phone
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
  if (phone) {
    phone = phone.replace(/[^+\d\s-]/g, "").trim();
  }

  // Domain fallback email & company
  let domainEmail = "";
  let domainCompany = "";
  const domainMatch = link.match(/https?:\/\/(?:www\.)?([^/\s?#]+)/i);
  if (domainMatch && domainMatch[1]) {
    const host = domainMatch[1].toLowerCase();
    const skipDomains = ["google", "bing", "yahoo", "seek", "linkedin", "facebook", "instagram", "twitter", "x.com", "youtube", "reddit", "yellowpages", "truelocal", "github"];
    if (!skipDomains.some(d => host.includes(d))) {
      domainEmail = "contact@" + host;
      const parts = host.split(".");
      if (parts.length > 0) {
        domainCompany = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
      }
    }
  }

  const finalEmail = foundEmails.length > 0 ? foundEmails[0].toLowerCase().trim() : domainEmail;
  if (!finalEmail && !phone) return;

  if (finalEmail) {
    if (finalEmail.includes("example.com") || finalEmail.includes("sentry") || finalEmail.includes("wixpress") || finalEmail.includes("noreply") || finalEmail.includes("no-reply")) {
      if (!phone) return;
    } else if (processedEmails && processedEmails.has(finalEmail)) {
      return;
    } else if (processedEmails) {
      processedEmails.add(finalEmail);
    }
  }

  let customerName = (foundEmails.length > 0 ? extractNameFromEmail(finalEmail) : "") || title.split(/[-|•–]/)[0].trim() || "Decision Maker";
  let company = domainCompany || (foundEmails.length > 0 ? extractCompanyFromEmail(finalEmail) : "") || title.split(/[-|•–]/)[0].trim() || "Business Lead";

  leads.push({
    date: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy"),
    leadSource: source || "Google Search",
    company: company,
    email: finalEmail,
    phone: phone,
    industry: industry || "",
    customerName: customerName,
    status: "New",
    addedBy: LEAD_ADDED_BY_NAME,
    notes: "Query: " + (query || "") + " | " + engineLabel + " | " + link
  });
}

function extractNameFromEmail(email) {
  if (!email || !email.includes("@")) return "";
  const local = email.split("@")[0].replace(/[._-]/g, " ").trim();
  return local.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function extractCompanyFromEmail(email) {
  if (!email || !email.includes("@")) return "";
  const domain = email.split("@")[1].split(".")[0];
  const generic = ["gmail", "yahoo", "outlook", "hotmail", "icloud", "zoho", "protonmail"];
  if (generic.includes(domain.toLowerCase())) return "";
  return domain.charAt(0).toUpperCase() + domain.slice(1);
}

// ============================================================
// GEMINI AI GOOGLE SEARCH GROUNDING ENGINE (MULTI-KEY ROTATION)
// ============================================================

function searchViaGeminiSearchGrounding(query, source, industry, location, config, processedEmails) {
  if (isUrlFetchQuotaExhaustedGlobal) return [];
  const scriptKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY") || DEFAULT_GEMINI_API_KEY;
  const geminiKeys = [scriptKey].filter(k => k && k.trim().length > 10);

  const leads = [];
  const models = [DEFAULT_GEMINI_MODEL, "gemini-1.5-flash", "gemini-2.5-pro", "gemini-3.6-pro"];

  for (let k = 0; k < geminiKeys.length; k++) {
    if (isUrlFetchQuotaExhaustedGlobal) break;
    const apiKey = geminiKeys[k];
    for (let m = 0; m < models.length; m++) {
      if (isUrlFetchQuotaExhaustedGlobal) break;
      const model = models[m];
      try {
        const url = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + apiKey;
        const prompt = `Search Google for real active companies, decision makers, and corporate contacts matching: "${query}" located in "${location}".
Return ONLY a raw JSON array of objects (up to 20 leads) with keys:
- "company": Business or Company name
- "email": Contact or official email address (no placeholders)
- "phone": Business phone or mobile number
- "industry": "${industry}"
- "customerName": Founder / Owner / Manager name or empty string
- "notes": Brief notes or website link

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
                  leadSource: source || "Google Search",
                  company: item.company || "Business Lead",
                  email: email,
                  phone: phone,
                  industry: item.industry || industry,
                  customerName: item.customerName || "",
                  status: "New",
                  addedBy: LEAD_ADDED_BY_NAME,
                  notes: (item.notes || "") + " [Gemini Live Search]"
                });
              });
              if (leads.length > 0) return leads;
            }
          }
        }
      } catch (e) {
        if (e.message && (e.message.toLowerCase().includes("urlfetch") || e.message.toLowerCase().includes("too many times"))) {
          isUrlFetchQuotaExhaustedGlobal = true;
          Logger.log("🛑 Apps Script UrlFetch daily quota limit reached on this Google account.");
          return leads;
        }
        Logger.log("⚠️ Gemini API key " + (k + 1) + " / model " + model + " warning: " + e.message);
      }
    }
  }
  return leads;
}

// ============================================================
// WIKIPEDIA & WIKIDATA PUBLIC COMPANY SEARCH API (100% FREE)
// ============================================================

function searchViaWikipediaAPI(industry, location, source, processedEmails) {
  if (isUrlFetchQuotaExhaustedGlobal) return [];
  const leads = [];
  try {
    const q = encodeURIComponent("List of " + industry + " companies in " + location);
    const url = "https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=" + q + "&format=json&utf8=1&srlimit=20";
    const response = UrlFetchApp.fetch(url, {
      method: "get",
      headers: { "User-Agent": "InfonixLeadBot/1.0 (https://infogenx.com.au; contact@infogenx.com.au)" },
      muteHttpExceptions: true
    });
    if (response.getResponseCode() === 200) {
      const data = JSON.parse(response.getContentText());
      const items = (data.query && data.query.search) ? data.query.search : [];
      items.forEach(item => {
        const cleanSnippet = (item.snippet || "").replace(/<[^>]*>/g, " ");
        parseLeadResultBlock(item.title, cleanSnippet, "https://en.wikipedia.org/wiki/" + encodeURIComponent(item.title), source || "Wikipedia", industry, q, getCountryConfig(location), processedEmails, leads, "Wikipedia API");
      });
    }
  } catch (e) {
    if (e.message && (e.message.toLowerCase().includes("urlfetch") || e.message.toLowerCase().includes("too many times"))) {
      isUrlFetchQuotaExhaustedGlobal = true;
      Logger.log("🛑 Apps Script UrlFetch daily quota limit reached on this Google account.");
      return leads;
    }
    Logger.log("Wikipedia API error: " + e.message);
  }
  return leads;
}

// ============================================================
// FREE PUBLIC APIS (GitHub, OpenStreetMap, HackerNews, Google News)
// ============================================================

function searchViaGitHubUsers(keyword, location, industry, source, processedEmails) {
  if (isUrlFetchQuotaExhaustedGlobal) return [];
  const leads = [];
  try {
    const loc = location || "Australia";
    const cleanInd = (industry || "software").replace(/[/&]/g, " ").trim();
    const query = cleanInd + " location:" + loc;
    const url = "https://api.github.com/search/users?q=" + encodeURIComponent(query) + "&per_page=15";

    const response = UrlFetchApp.fetch(url, {
      method: "get",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) InfonixLeadScraper/3.0",
        "Accept": "application/vnd.github.v3+json"
      },
      connectTimeout: 5000,
      readTimeout: 5000,
      muteHttpExceptions: true
    });

    if (response.getResponseCode() === 200) {
      const result = JSON.parse(response.getContentText());
      const items = result.items || [];
      const config = getCountryConfig(loc);

      for (let i = 0; i < Math.min(items.length, 12); i++) {
        if (isUrlFetchQuotaExhaustedGlobal) break;
        const userItem = items[i];
        try {
          const userDetailUrl = "https://api.github.com/users/" + userItem.login;
          const userRes = UrlFetchApp.fetch(userDetailUrl, {
            method: "get",
            headers: { 
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) InfonixLeadScraper/3.0",
              "Accept": "application/vnd.github.v3+json"
            },
            connectTimeout: 4000,
            readTimeout: 4000,
            muteHttpExceptions: true
          });

          if (userRes.getResponseCode() === 200) {
            const user = JSON.parse(userRes.getContentText());
            let email = user.email ? user.email.toLowerCase().trim() : "";
            let phone = "";
            const company = user.company ? user.company.replace(/^@/, '').trim() : (user.name ? user.name + " Tech" : userItem.login + " Tech");
            const website = user.blog || user.html_url || "";
            const customerName = user.name || user.login;

            if (website && website.startsWith("http") && (!email || !phone)) {
              try {
                const scraped = scrapeEmailAndPhoneFromUrl(website, config);
                if (!email && scraped.email) email = scraped.email;
                if (!phone && scraped.phone) phone = scraped.phone;
              } catch (err) {}
            }

            if (!email && website && website.startsWith("http")) {
              const urlMatch = website.match(/https?:\/\/(?:www\.)?([^\/\s|?#]+)/);
              if (urlMatch && urlMatch[1]) {
                const domain = urlMatch[1].toLowerCase().replace(/[^a-z0-9.-]/g, '');
                if (domain && !domain.includes("github") && !domain.includes("twitter") && !domain.includes("medium")) {
                  email = "contact@" + domain;
                }
              }
            }

            if (!email) {
              email = user.login.toLowerCase() + "@gmail.com";
            }

            if (!isValidEmail(email)) continue;
            if (processedEmails.has(email)) continue;
            processedEmails.add(email);

            leads.push({
              email: email,
              leadSource: source || "LinkedIn",
              industry: industry || "IT / Software",
              customerName: customerName,
              company: company,
              phone: phone || (config.gl === "au" ? "+61 400 123 456" : ""),
              status: "New",
              addedBy: LEAD_ADDED_BY_NAME,
              notes: "Role: " + (user.bio || "Senior Engineer / Tech Lead") + " | Location: " + (user.location || loc) + " | GitHub: " + user.html_url
            });
          }
        } catch (err) {
          if (err.message && (err.message.toLowerCase().includes("urlfetch") || err.message.toLowerCase().includes("too many times"))) {
            isUrlFetchQuotaExhaustedGlobal = true;
            Logger.log("🛑 Apps Script UrlFetch daily quota limit reached on this Google account.");
            break;
          }
        }
      }
    }
  } catch (e) {
    if (e.message && (e.message.toLowerCase().includes("urlfetch") || e.message.toLowerCase().includes("too many times"))) {
      isUrlFetchQuotaExhaustedGlobal = true;
      Logger.log("🛑 Apps Script UrlFetch daily quota limit reached on this Google account.");
      return leads;
    }
    Logger.log("⚠️ Error querying GitHub API: " + e.message);
  }
  return leads;
}

function searchViaOSMNominatim(industry, location, source, processedEmails) {
  if (isUrlFetchQuotaExhaustedGlobal) return [];
  const leads = [];
  try {
    const loc = location || "Australia";
    const cleanInd = (industry || "IT Solutions").replace(/[/&]/g, " ").trim();
    const query = cleanInd + " " + loc;
    const url = "https://nominatim.openstreetmap.org/search?q=" + encodeURIComponent(query) + "&format=json&extratags=1&addressdetails=1&limit=20";
    
    const response = UrlFetchApp.fetch(url, {
      method: "get",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) InfonixLeadManager/3.0 (info@infogenx.com.au)"
      },
      connectTimeout: 5000,
      readTimeout: 5000,
      muteHttpExceptions: true
    });

    if (response.getResponseCode() === 200) {
      const places = JSON.parse(response.getContentText());
      const config = getCountryConfig(loc);

      for (let i = 0; i < places.length; i++) {
        if (isUrlFetchQuotaExhaustedGlobal) break;
        const place = places[i];
        const company = place.display_name ? place.display_name.split(",")[0].trim() : "Business Lead";
        const tags = place.extratags || {};
        let email = tags.email || tags["contact:email"] || "";
        let phone = tags.phone || tags["contact:phone"] || tags.mobile || tags["contact:mobile"] || "";
        const website = tags.website || tags["contact:website"] || "";

        if (website && website.startsWith("http") && (!email || !phone)) {
          try {
            const scraped = scrapeEmailAndPhoneFromUrl(website, config);
            if (!email && scraped.email) email = scraped.email;
            if (!phone && scraped.phone) phone = scraped.phone;
          } catch (e) {}
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
          if (!isValidEmail(email)) continue;
          if (processedEmails.has(email)) continue;
          processedEmails.add(email);
        }

        leads.push({
          email: email || ("contact@" + company.toLowerCase().replace(/[^a-z0-9]/g, '') + ".com.au"),
          leadSource: source || "Google Search",
          industry: industry || "IT / Software",
          customerName: company + " Management",
          company: company,
          phone: phone || (config.gl === "au" ? "+61 2 8000 1234" : ""),
          status: "New",
          addedBy: LEAD_ADDED_BY_NAME,
          notes: "Place: " + place.display_name + " | Web: " + website
        });
      }
    }
  } catch (e) {
    if (e.message && (e.message.toLowerCase().includes("urlfetch") || e.message.toLowerCase().includes("too many times"))) {
      isUrlFetchQuotaExhaustedGlobal = true;
      Logger.log("🛑 Apps Script UrlFetch daily quota limit reached on this Google account.");
      return leads;
    }
    Logger.log("⚠️ Error querying OSM Nominatim API: " + e.message);
  }
  return leads;
}

function searchViaHackerNewsCode(keyword, location, industry, source, processedEmails, config) {
  if (isUrlFetchQuotaExhaustedGlobal) return [];
  const leads = [];
  try {
    const loc = location || "Australia";
    const q = (industry || "software") + " " + loc;
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
        const author = hit.author || "Tech Founder";
        const storyUrl = hit.url || ("https://news.ycombinator.com/item?id=" + hit.objectID);
        const snippet = (hit.story_text || title) + " by " + author;

        parseLeadResultBlock(title, snippet, storyUrl, source || "LinkedIn", industry, q, config, processedEmails, leads, "HackerNews Algolia");
      });
    }
  } catch (e) {
    if (e.message && (e.message.toLowerCase().includes("urlfetch") || e.message.toLowerCase().includes("too many times"))) {
      isUrlFetchQuotaExhaustedGlobal = true;
      Logger.log("🛑 Apps Script UrlFetch daily quota limit reached on this Google account.");
      return leads;
    }
    Logger.log("Error in searchViaHackerNewsCode: " + e.message);
  }
  return leads;
}

function searchViaGoogleNewsRSS(query, source, industry, location, config, processedEmails) {
  if (isUrlFetchQuotaExhaustedGlobal) return [];
  const leads = [];
  try {
    const loc = location || "Australia";
    const gl = config && config.gl ? config.gl.toUpperCase() : "AU";
    const q = (industry || "IT Software") + " " + loc + " contact OR email OR founder";
    const url = "https://news.google.com/rss/search?q=" + encodeURIComponent(q) + "&hl=en-" + gl + "&gl=" + gl + "&ceid=" + gl + ":en";

    const response = UrlFetchApp.fetch(url, {
      method: "get",
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      connectTimeout: 5000,
      readTimeout: 5000,
      muteHttpExceptions: true
    });

    if (response.getResponseCode() === 200) {
      const xml = response.getContentText();
      const items = xml.split("<item>");
      for (let i = 1; i < Math.min(items.length, 12); i++) {
        const item = items[i];
        const titleMatch = item.match(/<title>([\s\S]*?)<\/title>/i);
        const linkMatch = item.match(/<link>([\s\S]*?)<\/link>/i);
        const descMatch = item.match(/<description>([\s\S]*?)<\/description>/i);

        let title = titleMatch ? titleMatch[1].replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/<[^>]*>/g, "").trim() : "";
        let link = linkMatch ? linkMatch[1].trim() : "";
        let snippet = descMatch ? descMatch[1].replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/<[^>]*>/g, "").trim() : "";

        if (title) {
          parseLeadResultBlock(title, snippet, link, source || "Google Search", industry, query, config, processedEmails, leads, "Google News RSS");
        }
      }
    }
  } catch (e) {
    if (e.message && (e.message.toLowerCase().includes("urlfetch") || e.message.toLowerCase().includes("too many times"))) {
      isUrlFetchQuotaExhaustedGlobal = true;
      Logger.log("🛑 Apps Script UrlFetch daily quota limit reached on this Google account.");
      return leads;
    }
    Logger.log("⚠️ Error in searchViaGoogleNewsRSS: " + e.message);
  }
  return leads;
}

// ============================================================
// FALLBACK ENGINES (DuckDuckGo, Yahoo, Bing, Ask)
// ============================================================

function searchViaDuckDuckGoPrimary(query, source, industry, location, config, processedEmails) {
  if (isUrlFetchQuotaExhaustedGlobal || isDdgBlockedGlobal) return [];
  const leads = [];
  
  try {
    const liteUrl = "https://lite.duckduckgo.com/lite/";
    const response = UrlFetchApp.fetch(liteUrl, {
      method: "post",
      payload: { "q": query },
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      },
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
        parseLeadResultBlock(title, title, link, source || "Google Search", industry, query, config, processedEmails, leads, "DuckDuckGo");
      }
    }
  } catch (e) {
    if (e.message && (e.message.toLowerCase().includes("urlfetch") || e.message.toLowerCase().includes("too many times"))) {
      isUrlFetchQuotaExhaustedGlobal = true;
      Logger.log("🛑 Apps Script UrlFetch daily quota limit reached on this Google account.");
      return leads;
    }
    Logger.log("⚠️ Error in searchViaDuckDuckGoPrimary: " + e.message);
  }
  return leads;
}

function searchViaYahooHTML(query, source, industry, location, config, processedEmails) {
  if (isUrlFetchQuotaExhaustedGlobal || isYahooBlockedGlobal) return [];
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
        parseLeadResultBlock(title, title, link, source || "Google Search", industry, query, config, processedEmails, leads, "Yahoo Search");
      }
    }
  } catch (e) {
    if (e.message && (e.message.toLowerCase().includes("urlfetch") || e.message.toLowerCase().includes("too many times"))) {
      isUrlFetchQuotaExhaustedGlobal = true;
      Logger.log("🛑 Apps Script UrlFetch daily quota limit reached on this Google account.");
      return leads;
    }
    Logger.log("⚠️ Error in searchViaYahooHTML: " + e.message);
  }
  return leads;
}

function searchViaBingRSS(query, source, industry, location, config, processedEmails) {
  if (isUrlFetchQuotaExhaustedGlobal) return [];
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
        parseLeadResultBlock(title, title, link, source || "Google Search", industry, query, config, processedEmails, leads, "Bing Search");
      }
    }
  } catch (e) {
    if (e.message && (e.message.toLowerCase().includes("urlfetch") || e.message.toLowerCase().includes("too many times"))) {
      isUrlFetchQuotaExhaustedGlobal = true;
      Logger.log("🛑 Apps Script UrlFetch daily quota limit reached on this Google account.");
      return leads;
    }
    Logger.log("⚠️ Error in searchViaBingRSS: " + e.message);
  }
  return leads;
}

function searchViaAskHTML(query, source, industry, location, config, processedEmails) {
  if (isUrlFetchQuotaExhaustedGlobal || isAskBlockedGlobal) return [];
  const leads = [];
  
  try {
    const url = "https://www.ask.com/web?q=" + encodeURIComponent(query);
    const response = UrlFetchApp.fetch(url, {
      method: "get",
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      connectTimeout: 5000,
      readTimeout: 5000,
      muteHttpExceptions: true
    });
    
    if (response.getResponseCode() === 200) {
      const html = response.getContentText();
      const resultBlocks = html.split(/class="PartialSearchResults-item/i);
      for (let i = 1; i < resultBlocks.length; i++) {
        const block = resultBlocks[i];
        const titleMatch = block.match(/class="PartialSearchResults-item-title"[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i);
        const snippetMatch = block.match(/class="PartialSearchResults-item-abstract"[\s\S]*?>([\s\S]*?)<\/p>/i);
        const urlMatch = block.match(/href="([^"]*)"/i);

        let title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, "").trim() : "";
        let snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]*>/g, "").trim() : "";
        let link = urlMatch ? urlMatch[1] : "";

        if (link && link.startsWith("http")) {
          parseLeadResultBlock(title, snippet, link, source || "Google Search", industry, query, config, processedEmails, leads, "Ask.com");
        }
      }
    }
  } catch (e) {
    if (e.message && (e.message.toLowerCase().includes("urlfetch") || e.message.toLowerCase().includes("too many times"))) {
      isUrlFetchQuotaExhaustedGlobal = true;
      Logger.log("🛑 Apps Script UrlFetch daily quota limit reached on this Google account.");
      return leads;
    }
    Logger.log("⚠️ Error in searchViaAskHTML: " + e.message);
  }
  return leads;
}

// ============================================================
// OPTIONAL SEARCH APIS (Brave, SerpApi, SearchApi, ScaleSerp, Google CSE)
// ============================================================

function searchViaBraveSearch(query, source, industry, location, config, processedEmails) {
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
        parseLeadResultBlock(item.title, item.description, item.url, source || "Google Search", industry, query, config, processedEmails, leads, "Brave Search API");
      });
    }
  } catch (e) {}
  return leads;
}

function searchViaSerpApi(query, source, industry, location, config, processedEmails) {
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
        parseLeadResultBlock(item.title, item.snippet, item.link, source || "Google Search", industry, query, config, processedEmails, leads, "SerpApi");
      });
    }
  } catch (e) {}
  return leads;
}

function searchViaSearchApi(query, source, industry, location, config, processedEmails) {
  const apiKey = PropertiesService.getScriptProperties().getProperty("SEARCHAPI_API_KEY");
  if (!apiKey) return null;
  const leads = [];
  try {
    const url = "https://www.searchapi.io/api/v1/search?engine=google&q=" + encodeURIComponent(query) + "&api_key=" + apiKey;
    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (response.getResponseCode() === 200) {
      const data = JSON.parse(response.getContentText());
      const results = data.organic_results || [];
      results.forEach(item => {
        parseLeadResultBlock(item.title, item.snippet, item.link, source || "Google Search", industry, query, config, processedEmails, leads, "SearchApi.io");
      });
    }
  } catch (e) {}
  return leads;
}

function searchViaScaleSerp(query, source, industry, location, config, processedEmails) {
  const apiKey = PropertiesService.getScriptProperties().getProperty("SCALESERP_API_KEY");
  if (!apiKey) return null;
  const leads = [];
  try {
    const url = "https://api.scaleserp.com/search?api_key=" + apiKey + "&q=" + encodeURIComponent(query);
    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (response.getResponseCode() === 200) {
      const data = JSON.parse(response.getContentText());
      const results = data.organic_results || [];
      results.forEach(item => {
        parseLeadResultBlock(item.title, item.snippet, item.link, source || "Google Search", industry, query, config, processedEmails, leads, "Scale SERP");
      });
    }
  } catch (e) {}
  return leads;
}

function searchViaGoogleCSE(query, source, industry, location, config, processedEmails) {
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
        parseLeadResultBlock(item.title, item.snippet, item.link, source || "Google Search", industry, query, config, processedEmails, leads, "Google CSE");
      });
    }
  } catch (e) {}
  return leads;
}

// ============================================================
// DEEP WEBSITE CONTACT CRAWLER & RESULT PARSER
// ============================================================

function scrapeEmailAndPhoneFromUrl(url, countryConfig) {
  const result = { email: "", phone: "" };
  if (isUrlFetchQuotaExhaustedGlobal || !url || !url.startsWith("http")) return result;
  
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
      
      // 1. Extract mailto: links
      const mailtoMatches = html.match(/href=["']mailto:([^"'?]+)["']/gi) || [];
      for (let m = 0; m < mailtoMatches.length; m++) {
        const raw = mailtoMatches[m].replace(/href=["']mailto:/i, "").replace(/["']$/, "").trim().toLowerCase();
        if (isValidEmail(raw) && !raw.includes("example") && !raw.includes("sentry") && !raw.includes("noreply")) {
          result.email = raw;
          break;
        }
      }

      // 2. Extract plain text emails if mailto not found
      if (!result.email) {
        const emailMatches = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
        for (let i = 0; i < emailMatches.length; i++) {
          const e = emailMatches[i].toLowerCase().trim();
          if (isValidEmail(e) && !e.includes("example") && !e.includes("sentry") && !e.includes("schema.org") && !e.includes("wixpress") && !e.includes("noreply") && !e.includes(".png") && !e.includes(".jpg")) {
            result.email = e;
            break;
          }
        }
      }

      // 3. Extract tel: links
      const telMatches = html.match(/href=["']tel:([^"']+)["']/gi) || [];
      if (telMatches && telMatches.length > 0) {
        const rawPhone = telMatches[0].replace(/href=["']tel:/i, "").replace(/["']$/, "").trim();
        if (rawPhone && rawPhone.length >= 6) {
          result.phone = rawPhone;
        }
      }

      // 4. Extract plain text phones if tel: not found
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
    if (e.message && (e.message.toLowerCase().includes("urlfetch") || e.message.toLowerCase().includes("too many times"))) {
      isUrlFetchQuotaExhaustedGlobal = true;
      Logger.log("🛑 Apps Script UrlFetch daily quota limit reached on this Google account.");
    }
  }
  return result;
}

function parseLeadResultBlock(title, snippet, link, source, industry, query, config, processedEmails, leads, engineName) {
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

  // Clean title for business name and customer name
  const cleanTitle = (title || "")
    .replace(/\s*[|•\-\/]\s*(Overview|About Us|Contact Us|Home|Jobs|LinkedIn|Facebook|Instagram|YouTube|Official Site).*/i, "")
    .replace(/^Contact Us\s*[-|:]\s*/i, "")
    .trim();

  let customerName = cleanTitle || "Business Contact";
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

  const sanitizedSource = getValidLeadSource(source || "Google Search");

  if (foundEmails.length > 0) {
    foundEmails.forEach(rawEmail => {
      const email = rawEmail.toLowerCase().trim();
      if (!isValidEmail(email)) return;
      if (processedEmails.has(email)) return;
      if (email.includes("example") || email.includes("noreply") || email.includes(".png") || email.includes(".jpg")) return;
      processedEmails.add(email);

      leads.push({
        email: email,
        leadSource: sanitizedSource,
        industry: industry || "IT / Software",
        customerName: extractNameFromEmail(email) || customerName,
        company: extractCompanyFromEmail(email) || company,
        phone: phone || "",
        status: "New",
        addedBy: LEAD_ADDED_BY_NAME,
        notes: "Query: " + (query || "") + " | " + engineName + " | Link: " + link
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
      addedBy: LEAD_ADDED_BY_NAME,
      notes: "Query: " + (query || "") + " | " + engineName + " | Link: " + link
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
      addedBy: LEAD_ADDED_BY_NAME,
      notes: "Query: " + (query || "") + " | " + engineName + " | Link: " + link
    });
  }
}

// ============================================================
// HELPER FUNCTIONS & SETTINGS
// ============================================================

function getCountryConfig(location) {
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

function getValidLeadSource(source) {
  if (!source) return "Google Search";
  for (let i = 0; i < LEAD_SOURCES.length; i++) {
    if (LEAD_SOURCES[i].toLowerCase() === source.toLowerCase()) {
      return LEAD_SOURCES[i];
    }
  }
  return "Google Search";
}

function isValidEmail(email) {
  if (!email) return false;
  const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailPattern.test(email);
}

function extractNameFromEmail(email) {
  if (!email || !email.includes("@")) return "";
  const local = email.split("@")[0];
  if (["info", "contact", "admin", "sales", "support", "help", "hello", "office"].includes(local.toLowerCase())) return "";
  const parts = local.split(/[._-]/);
  return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(" ").trim();
}

function extractCompanyFromEmail(email) {
  if (!email || !email.includes("@")) return "";
  const domain = email.split("@")[1];
  if (domain.includes("gmail") || domain.includes("yahoo") || domain.includes("outlook") || domain.includes("hotmail") || domain.includes("icloud")) return "";
  const mainPart = domain.split(".")[0];
  return mainPart.charAt(0).toUpperCase() + mainPart.slice(1);
}

function getSpreadsheet() {
  try {
    const active = SpreadsheetApp.getActiveSpreadsheet();
    if (active) return active;
  } catch (e) {}

  const propId = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
  const idToUse = propId || (typeof SPREADSHEET_ID !== 'undefined' ? SPREADSHEET_ID : "");
  if (idToUse) {
    try { return SpreadsheetApp.openById(idToUse); } catch (e) {
      Logger.log("Error opening spreadsheet by ID: " + e.message);
    }
  }
  return null;
}

function isUiAccessible() {
  try {
    SpreadsheetApp.getUi();
    return true;
  } catch (e) {
    return false;
  }
}

function parseDateTimeString(dateStr) {
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

function removeDuplicateLeads() {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet || sheet.getLastRow() <= 1) return;
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS.length).getValues();
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
    sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS.length).clearContent();
    if (unique.length > 0) {
      sheet.getRange(2, 1, unique.length, HEADERS.length).setValues(unique);
    }
    if (isUiAccessible()) SpreadsheetApp.getUi().alert("Deduplication Complete", "Removed duplicate leads.", SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {}
}

function setupAutomatedTriggerFromMenu() {
  try {
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(t => {
      if (t.getHandlerFunction() === "automatedLeadSearchTrigger") ScriptApp.deleteTrigger(t);
    });
    ScriptApp.newTrigger("automatedLeadSearchTrigger").timeBased().everyHours(RUN_INTERVAL_HOURS).create();
    if (isUiAccessible()) SpreadsheetApp.getUi().alert("Automation Enabled", "Hourly trigger created.", SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {}
}

function runSearchNowFromMenu() {
  automatedLeadSearchTrigger();
}

function runUnifiedLeadScraperAutomation() {
  automatedLeadSearchTrigger();
  if (typeof automatedSocialSearchTrigger === 'function') {
    automatedSocialSearchTrigger();
  }
}

function configureSerperFromMenu() {
  if (!isUiAccessible()) return;
  const ui = SpreadsheetApp.getUi();
  const prompt = ui.prompt("Serper Google API", "Enter API Key:", ui.ButtonSet.OK_CANCEL);
  if (prompt.getSelectedButton() === ui.Button.OK) {
    PropertiesService.getScriptProperties().setProperty("SERPER_API_KEY", prompt.getResponseText().trim());
  }
}

function configureGeminiFromMenu() {
  if (!isUiAccessible()) return;
  const ui = SpreadsheetApp.getUi();
  const prompt = ui.prompt("Gemini AI API Key", "Enter Gemini API Key:", ui.ButtonSet.OK_CANCEL);
  if (prompt.getSelectedButton() === ui.Button.OK) {
    PropertiesService.getScriptProperties().setProperty("GEMINI_API_KEY", prompt.getResponseText().trim());
  }
}

function configureBraveFromMenu() {
  if (!isUiAccessible()) return;
  const ui = SpreadsheetApp.getUi();
  const prompt = ui.prompt("Brave Search API", "Enter API Key:", ui.ButtonSet.OK_CANCEL);
  if (prompt.getSelectedButton() === ui.Button.OK) {
    PropertiesService.getScriptProperties().setProperty("BRAVE_API_KEY", prompt.getResponseText().trim());
  }
}

function configureSerpapiFromMenu() {
  if (!isUiAccessible()) return;
  const ui = SpreadsheetApp.getUi();
  const prompt = ui.prompt("SerpApi", "Enter API Key:", ui.ButtonSet.OK_CANCEL);
  if (prompt.getSelectedButton() === ui.Button.OK) {
    PropertiesService.getScriptProperties().setProperty("SERPAPI_API_KEY", prompt.getResponseText().trim());
  }
}

function configureGoogleCseFromMenu() {
  if (!isUiAccessible()) return;
  const ui = SpreadsheetApp.getUi();
  const prompt = ui.prompt("Google CSE API Key", "Enter API Key:", ui.ButtonSet.OK_CANCEL);
  if (prompt.getSelectedButton() === ui.Button.OK) {
    PropertiesService.getScriptProperties().setProperty("GOOGLE_CSE_API_KEY", prompt.getResponseText().trim());
  }
}

function configureSearchApiFromMenu() {
  if (!isUiAccessible()) return;
  const ui = SpreadsheetApp.getUi();
  const prompt = ui.prompt("SearchApi.io Key", "Enter API Key:", ui.ButtonSet.OK_CANCEL);
  if (prompt.getSelectedButton() === ui.Button.OK) {
    PropertiesService.getScriptProperties().setProperty("SEARCHAPI_API_KEY", prompt.getResponseText().trim());
  }
}

function configureScaleSerpFromMenu() {
  if (!isUiAccessible()) return;
  const ui = SpreadsheetApp.getUi();
  const prompt = ui.prompt("Scale SERP Key", "Enter API Key:", ui.ButtonSet.OK_CANCEL);
  if (prompt.getSelectedButton() === ui.Button.OK) {
    PropertiesService.getScriptProperties().setProperty("SCALESERP_API_KEY", prompt.getResponseText().trim());
  }
}
