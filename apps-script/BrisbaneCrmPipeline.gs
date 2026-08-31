// ============================================================
// 🔄 BRISBANE TIME TRIGGER SCHEDULER
// ============================================================
// Standalone Google Apps Script for the CRM Pipeline
// Project: https://script.google.com/d/1gxltftciFLtCNOTow_dH294GWtHdPPIej221Hyc4CM0mZzvPnZKTzjPW/edit
//
// Pipeline Schedule (Australia/Brisbane AEST = UTC+10):
//   7:00 AM AEST  → syncSheetToZohoCRM()         — Read Sheet → Push leads to Zoho CRM
//   9:00 AM AEST  → triggerZohoCampaignEmail()    — Add leads to Campaigns → Email auto-send
//  10:30 AM AEST  → sendCampaignStatsViaSMS()     — Fetch stats → SMS digest via Twilio
//
// Source Sheet: https://docs.google.com/spreadsheets/d/1QY8hbycY-gdOWRch52SKoUS975U-t3EgZ0JrtdhPCoM/edit
// Zoho CRM:     https://crm.zoho.in/
// Zoho Campaigns: https://campaigns.zoho.in/campaigns/org60070673440/home.do#automation/advworkflows
// Zoho Flow:    https://flow.zoho.in/#/workspace/default/flows/scrapper_python_script/
// Twilio Dialer: https://twilliodialer.infogenx.com/
// ============================================================

// --- CONFIGURATION ---
const SOURCE_SHEET_ID = "1QY8hbycY-gdOWRch52SKoUS975U-t3EgZ0JrtdhPCoM";
const SOURCE_TAB_NAME = "Leads";

const ZOHO_ACCOUNTS_URL = "https://accounts.zoho.in";
const ZOHO_CRM_API_URL = "https://www.zohoapis.in/crm/v2";
const ZOHO_CAMPAIGNS_API_URL = "https://campaigns.zoho.in/api/v1.1";

const TWILIO_DIALER_DIGEST_URL = "https://twilliodialer.infogenx.com/dialer/api/trigger-daily-digest/";
const DIALER_API_KEY = "infogenx-secret-2026";

// Zoho Campaigns credentials (fallback defaults from .env)
const DEFAULT_CAMPAIGNS_CLIENT_ID = "1000.I8BXR1U9XEX0TGSSBBS969PUAQDDCO";
const DEFAULT_CAMPAIGNS_CLIENT_SECRET = "f0b12ded0b82b34eca1aa52f3a4e688ac43603755b";
const DEFAULT_CAMPAIGNS_REFRESH_TOKEN = "1000.6818a1993384a74811b3d1b587b31368.b38f5b6af4a0d23d66185f1ce04e7cb4";


// ============================================================
// 📋 MENU (shows when spreadsheet is opened)
// ============================================================

function onOpen() {
  try {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu("🇦🇺 Brisbane CRM Pipeline")
      .addItem("🔄 Sync Sheet → Zoho CRM", "syncSheetToZohoCRM")
      .addItem("📧 Trigger Zoho Campaign Email", "triggerZohoCampaignEmail")
      .addItem("📱 Send Campaign Stats SMS", "sendCampaignStatsViaSMS")
      .addSeparator()
      .addItem("🚀 Run Full Pipeline (All 3 Steps)", "runFullCrmPipelineManual")
      .addSeparator()
      .addItem("⏰ Setup Daily AEST Triggers", "setupCrmPipelineTriggers")
      .addItem("🗑️ Remove All Pipeline Triggers", "removeAllPipelineTriggers")
      .addSeparator()
      .addItem("🔑 Configure Zoho CRM Credentials", "configureZohoCrmFromMenu")
      .addItem("🔑 Configure Zoho Campaigns Credentials", "configureZohoCampaignsFromMenu")
      .addItem("📱 Configure SMS Recipient Number", "configureSmsRecipientFromMenu")
      .addItem("📋 View Current Configuration", "showCurrentConfig")
      .addToUi();
  } catch (e) {
    Logger.log("Menu not available (running from trigger): " + e.message);
  }
}


// ============================================================
// 🔐 ZOHO OAUTH TOKEN MANAGEMENT
// ============================================================

function getZohoCrmAccessToken_() {
  const props = PropertiesService.getScriptProperties();
  const cachedToken = props.getProperty("ZOHO_CRM_ACCESS_TOKEN");
  const cachedExpiry = parseInt(props.getProperty("ZOHO_CRM_TOKEN_EXPIRY") || "0");
  
  if (cachedToken && cachedExpiry > new Date().getTime()) {
    Logger.log("🔑 Using cached Zoho CRM token.");
    return cachedToken;
  }

  const clientId = props.getProperty("ZOHO_CRM_CLIENT_ID");
  const clientSecret = props.getProperty("ZOHO_CRM_CLIENT_SECRET");
  const refreshToken = props.getProperty("ZOHO_CRM_REFRESH_TOKEN");
  
  if (!clientId || !clientSecret || !refreshToken) {
    if (cachedToken) return cachedToken;
    throw new Error("Zoho CRM OAuth credentials not configured. Set ZOHO_CRM_CLIENT_ID, ZOHO_CRM_CLIENT_SECRET, ZOHO_CRM_REFRESH_TOKEN in Script Properties.");
  }
  
  try {
    const response = UrlFetchApp.fetch(ZOHO_ACCOUNTS_URL + "/oauth/v2/token", {
      method: "post",
      payload: { refresh_token: refreshToken, client_id: clientId, client_secret: clientSecret, grant_type: "refresh_token" },
      muteHttpExceptions: true
    });
    
    const result = JSON.parse(response.getContentText());
    
    if (response.getResponseCode() === 200 && result.access_token) {
      props.setProperty("ZOHO_CRM_ACCESS_TOKEN", result.access_token);
      props.setProperty("ZOHO_CRM_TOKEN_EXPIRY", String(new Date().getTime() + 3000000));
      Logger.log("✅ Zoho CRM access token refreshed.");
      return result.access_token;
    } else {
      if (cachedToken) return cachedToken;
      throw new Error("Zoho CRM token refresh failed: " + (result.error || response.getContentText()));
    }
  } catch (err) {
    if (cachedToken) {
      Logger.log("⚠️ Token fetch error (" + err.message + "), fallback to cached token.");
      return cachedToken;
    }
    throw err;
  }
}

function getZohoCampaignsAccessToken_() {
  const props = PropertiesService.getScriptProperties();
  const cachedToken = props.getProperty("ZOHO_CAMP_ACCESS_TOKEN");
  const cachedExpiry = parseInt(props.getProperty("ZOHO_CAMP_TOKEN_EXPIRY") || "0");
  
  if (cachedToken && cachedExpiry > new Date().getTime()) {
    Logger.log("🔑 Using cached Zoho Campaigns token.");
    return cachedToken;
  }

  const clientId = props.getProperty("ZOHO_CAMPAIGNS_CLIENT_ID") || DEFAULT_CAMPAIGNS_CLIENT_ID;
  const clientSecret = props.getProperty("ZOHO_CAMPAIGNS_CLIENT_SECRET") || DEFAULT_CAMPAIGNS_CLIENT_SECRET;
  const refreshToken = props.getProperty("ZOHO_CAMPAIGNS_REFRESH_TOKEN") || DEFAULT_CAMPAIGNS_REFRESH_TOKEN;
  
  try {
    const response = UrlFetchApp.fetch(ZOHO_ACCOUNTS_URL + "/oauth/v2/token", {
      method: "post",
      payload: { refresh_token: refreshToken, client_id: clientId, client_secret: clientSecret, grant_type: "refresh_token" },
      muteHttpExceptions: true
    });
    
    const result = JSON.parse(response.getContentText());
    
    if (response.getResponseCode() === 200 && result.access_token) {
      props.setProperty("ZOHO_CAMP_ACCESS_TOKEN", result.access_token);
      props.setProperty("ZOHO_CAMP_TOKEN_EXPIRY", String(new Date().getTime() + 3000000));
      Logger.log("✅ Zoho Campaigns access token refreshed.");
      return result.access_token;
    } else {
      if (cachedToken) return cachedToken;
      throw new Error("Zoho Campaigns token refresh failed: " + (result.error || response.getContentText()));
    }
  } catch (err) {
    if (cachedToken) {
      Logger.log("⚠️ Token fetch error (" + err.message + "), fallback to cached token.");
      return cachedToken;
    }
    throw err;
  }
}


// ============================================================
// STEP 1: SYNC GOOGLE SHEET → ZOHO CRM (7:00 AM AEST)
// ============================================================

function syncSheetToZohoCRM() {
  const startTime = new Date().getTime();
  Logger.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  Logger.log("🚀 [STEP 1 — CRM SYNC] Sheet → Zoho CRM");
  Logger.log("📅 " + new Date().toISOString());
  Logger.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  
  try {
    const ss = SpreadsheetApp.openById(SOURCE_SHEET_ID);
    const sheet = ss.getSheetByName(SOURCE_TAB_NAME) || ss.getSheets()[0];
    
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    if (lastRow <= 1) { Logger.log("ℹ️ No data rows."); return; }
    
    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    const allData = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
    Logger.log("📊 " + allData.length + " rows | Headers: " + JSON.stringify(headers));
    
    // Dynamic column mapping
    const colMap = {};
    headers.forEach((h, i) => {
      const k = h.toString().toLowerCase().trim();
      if (k.includes("date") && !k.includes("update")) colMap.date = i;
      if (k.includes("lead source") || k === "lead_source") colMap.leadSource = i;
      if (k.includes("company") || k.includes("page_name") || k.includes("page name")) colMap.company = i;
      if (k.includes("email")) colMap.email = i;
      if (k.includes("phone") || k.includes("mobile")) colMap.phone = i;
      if (k.includes("industry")) colMap.industry = i;
      if (k.includes("customer name") || (k.includes("name") && !k.includes("company") && !k.includes("page"))) colMap.name = i;
      if (k === "status" || k === "lead_status" || k === "lead status") colMap.status = i;
      if (k.includes("lead added by") || k.includes("added by")) colMap.addedBy = i;
      if (k.includes("notes") || k.includes("description")) colMap.notes = i;
      if (k.includes("website")) colMap.website = i;
      if (k.includes("facebook") || k.includes("fb")) colMap.facebook = i;
      if (k.includes("location") || k.includes("address")) colMap.location = i;
    });
    Logger.log("🗂️ Columns: " + JSON.stringify(colMap));
    
    // Setup CRM_Synced marker column
    let syncCol = -1;
    for (let i = 0; i < headers.length; i++) {
      if (headers[i].toString().trim() === "CRM_Synced") { syncCol = i + 1; break; }
    }
    if (syncCol === -1) {
      syncCol = lastCol + 1;
      const hdr = sheet.getRange(1, syncCol);
      hdr.setValue("CRM_Synced").setBackground("#4CAF50").setFontColor("#fff").setFontWeight("bold");
      Logger.log("📝 Added CRM_Synced column at col " + syncCol);
    }
    
    let syncMarkers = [];
    try { syncMarkers = sheet.getRange(2, syncCol, lastRow - 1, 1).getValues().map(r => r[0].toString().trim()); }
    catch (e) { syncMarkers = new Array(lastRow - 1).fill(""); }
    
    // Validate leads
    const currentYear = String(new Date().getFullYear());
    const validLeads = [];
    let skipContact = 0, skipDate = 0, skipSynced = 0;
    
    const getVal = (row, field) => (colMap[field] !== undefined ? row[colMap[field]] : "").toString().trim();
    
    allData.forEach((row, idx) => {
      if (syncMarkers[idx] && syncMarkers[idx].startsWith("✅")) { skipSynced++; return; }
      
      const email = getVal(row, "email"), phone = getVal(row, "phone");
      // User Directive: BOTH Email ID AND Mobile/Phone Number are MANDATORY!
      if (!email || !phone) { skipContact++; return; }
      
      const leadDate = getVal(row, "date");
      if (leadDate && !leadDate.includes(currentYear)) { skipDate++; return; }
      
      const company = getVal(row, "company") || ("Lead - " + email);
      const name = getVal(row, "name");
      const parts = name ? name.split(" ") : [];
      
      const desc = [getVal(row,"notes"), getVal(row,"facebook") ? "FB:"+getVal(row,"facebook") : "",
                     getVal(row,"location") ? "Loc:"+getVal(row,"location") : "",
                     getVal(row,"addedBy") ? "By:"+getVal(row,"addedBy") : ""].filter(Boolean).join(" | ");
      
      validLeads.push({
        payload: {
          "Company": company, "First_Name": parts[0] || "Lead",
          "Last_Name": parts.length > 1 ? parts.slice(1).join(" ") : company,
          "Email": email, "Phone": phone, "Mobile": phone,
          "Industry": getVal(row, "industry") || "Technology",
          "Lead_Source": getVal(row, "leadSource") || "Google Sheet Sync",
          "Lead_Status": getVal(row, "status") || "New",
          "Description": desc,
          ...(getVal(row, "website") ? {"Website": getVal(row, "website")} : {})
        },
        rowIdx: idx + 2
      });
    });
    
    Logger.log("✅ Valid: " + validLeads.length + " | Skip(contact): " + skipContact + " | Skip(date): " + skipDate + " | Skip(synced): " + skipSynced);
    if (validLeads.length === 0) { Logger.log("ℹ️ Nothing to sync."); return; }
    
    // Batch upsert to Zoho CRM
    const token = getZohoCrmAccessToken_();
    let inserted = 0, updated = 0, failed = 0;
    
    for (let i = 0; i < validLeads.length; i += 100) {
      const batch = validLeads.slice(i, i + 100);
      try {
        const resp = UrlFetchApp.fetch(ZOHO_CRM_API_URL + "/Leads", {
          method: "post",
          headers: { "Authorization": "Zoho-oauthtoken " + token, "Content-Type": "application/json" },
          payload: JSON.stringify({ data: batch.map(l=>l.payload), duplicate_check_fields: ["Email","Phone"], trigger: [] }),
          muteHttpExceptions: true
        });
        const rd = JSON.parse(resp.getContentText());
        if (rd.data) {
          rd.data.forEach((r, j) => {
            const now = Utilities.formatDate(new Date(), "Australia/Brisbane", "dd/MM/yyyy HH:mm");
            if (r.status === "success") {
              if (r.action === "update" || r.code === "DUPLICATE_DATA") { updated++; sheet.getRange(batch[j].rowIdx, syncCol).setValue("✅ Updated " + now); }
              else { inserted++; sheet.getRange(batch[j].rowIdx, syncCol).setValue("✅ Inserted " + now); }
            } else { failed++; sheet.getRange(batch[j].rowIdx, syncCol).setValue("❌ " + (r.message||r.code||"Error")); }
          });
        }
        if (i + 100 < validLeads.length) Utilities.sleep(500);
      } catch (e) { batch.forEach(b => { sheet.getRange(b.rowIdx, syncCol).setValue("❌ "+e.message.substring(0,40)); failed++; }); }
    }
    
    Logger.log("━━━ Results ━━━  Inserted:" + inserted + " Updated:" + updated + " Failed:" + failed + " Time:" + ((new Date().getTime()-startTime)/1000).toFixed(1) + "s");
    PropertiesService.getScriptProperties().setProperty("LAST_CRM_SYNC", JSON.stringify({timestamp:new Date().toISOString(), inserted, updated, failed, total:validLeads.length}));
    
  } catch (err) { Logger.log("❌ FATAL: " + err.message + "\n" + err.stack); }
}


// ============================================================
// STEP 2: TRIGGER ZOHO CAMPAIGNS EMAIL (9:00 AM AEST)
// ============================================================

function triggerZohoCampaignEmail() {
  Logger.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  Logger.log("🚀 [STEP 2 — CAMPAIGNS] Zoho Campaigns email trigger");
  Logger.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  
  try {
    // 🔄 Always sync sheet to Zoho CRM first to ensure leads added or updated
    // before 9:00 AM Australia/Brisbane time are captured and timestamped today.
    Logger.log("🔄 Pre-syncing Google Sheet to Zoho CRM to catch all leads added/updated before 9:00 AM AEST...");
    syncSheetToZohoCRM();
    
    const ss = SpreadsheetApp.openById(SOURCE_SHEET_ID);
    const sheet = ss.getSheetByName(SOURCE_TAB_NAME) || ss.getSheets()[0];
    if (!sheet || sheet.getLastRow() <= 1) { Logger.log("ℹ️ No data."); return; }
    
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const allData = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
    
    const findCol = (fn) => headers.findIndex(h => fn(h.toString().toLowerCase().trim()));
    const emailCol = findCol(k => k.includes("email"));
    const nameCol = findCol(k => k.includes("customer name") || (k.includes("name") && !k.includes("company")));
    const companyCol = findCol(k => k.includes("company") || k.includes("page"));
    const phoneCol = findCol(k => k.includes("phone") || k.includes("mobile"));
    const industryCol = findCol(k => k.includes("industry"));
    const syncCol = findCol(k => k === "crm_synced");
    
    if (emailCol === -1) { Logger.log("❌ No email column!"); return; }
    
    const todayStr = Utilities.formatDate(new Date(), "Australia/Brisbane", "dd/MM/yyyy");
    const subs = [];
    
    allData.forEach(row => {
      const sync = syncCol >= 0 ? row[syncCol].toString() : "";
      if (!sync.includes("✅") || !sync.includes(todayStr)) return;
      const email = (emailCol >= 0 ? row[emailCol] : "").toString().trim();
      if (!email) return;
      const name = (nameCol >= 0 ? row[nameCol] : "").toString().trim();
      const parts = name.split(" ");
      subs.push({
        "Contact Email": email,
        "First Name": parts[0] || "Lead",
        "Last Name": parts.length > 1 ? parts.slice(1).join(" ") : ((companyCol >= 0 ? row[companyCol] : "") || "Lead").toString().trim(),
        "Company": (companyCol >= 0 ? row[companyCol] : "").toString().trim(),
        "Phone": (phoneCol >= 0 ? row[phoneCol] : "").toString().trim(),
        "Industry": (industryCol >= 0 ? row[industryCol] : "").toString().trim()
      });
    });
    
    Logger.log("📧 " + subs.length + " leads synced today (added/updated before 9:00 AM AEST).");
    if (subs.length === 0) { Logger.log("ℹ️ No new leads for campaign."); return; }
    
    const token = getZohoCampaignsAccessToken_();
    const props = PropertiesService.getScriptProperties();
    let listKey = props.getProperty("ZOHO_CAMPAIGNS_LIST_KEY");
    
    if (!listKey) {
      const lr = UrlFetchApp.fetch(ZOHO_CAMPAIGNS_API_URL + "/getmailinglists?resfmt=JSON&range=50", {
        headers: { "Authorization": "Zoho-oauthtoken " + token }, muteHttpExceptions: true
      });
      const lrd = JSON.parse(lr.getContentText());
      if (lrd.status === "success" && lrd.list_of_details) {
        const target = lrd.list_of_details.find(l => l.listname && (l.listname.toLowerCase().includes("sheet") || l.listname.toLowerCase().includes("auto") || l.listname.toLowerCase().includes("crm"))) || lrd.list_of_details[0];
        if (target) { listKey = target.listkey; props.setProperty("ZOHO_CAMPAIGNS_LIST_KEY", listKey); Logger.log("📋 Using list: " + target.listname); }
        Logger.log("📋 Lists: " + lrd.list_of_details.map(l => l.listname).join(", "));
      }
    }
    if (!listKey) { Logger.log("❌ No list key! Set ZOHO_CAMPAIGNS_LIST_KEY."); return; }
    
    let added = 0, skipped = 0;
    for (let i = 0; i < subs.length; i += 50) {
      const batch = subs.slice(i, i + 50);
      try {
        const r = UrlFetchApp.fetch(ZOHO_CAMPAIGNS_API_URL + "/json/listsubscribe?resfmt=JSON", {
          method: "post", headers: { "Authorization": "Zoho-oauthtoken " + token },
          payload: { listkey: listKey, contactinfo: JSON.stringify(batch) }, muteHttpExceptions: true
        });
        const rd = JSON.parse(r.getContentText());
        if (rd.status === "success") { added += batch.length; Logger.log("  ✅ Added " + batch.length); }
        else { skipped += batch.length; Logger.log("  ⚠️ " + r.getContentText()); }
        if (i + 50 < subs.length) Utilities.sleep(500);
      } catch (e) { skipped += batch.length; Logger.log("  ❌ " + e.message); }
    }
    
    Logger.log("━━━ Results ━━━  Added:" + added + " Skipped:" + skipped + " → Advanced Workflow will auto-send emails.");
    props.setProperty("LAST_CAMPAIGN_TRIGGER", JSON.stringify({timestamp:new Date().toISOString(), added, skipped, listKey}));
    
  } catch (err) { Logger.log("❌ FATAL: " + err.message + "\n" + err.stack); }
}


// ============================================================
// STEP 3: SEND CAMPAIGN STATS VIA SMS (10:30 AM AEST)
// ============================================================

function sendCampaignStatsViaSMS() {
  Logger.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  Logger.log("🚀 [STEP 3 — SMS] Campaign Stats → SMS Digest");
  Logger.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  
  let sent=0, delivered=0, opened=0, skipped=0, unsub=0, count=0;
  
  try {
    let token = "";
    try {
      token = getZohoCampaignsAccessToken_();
    } catch (tokenErr) {
      Logger.log("⚠️ Could not refresh Zoho Campaigns token: " + tokenErr.message);
    }

    if (token) {
      try {
        const rr = UrlFetchApp.fetch(ZOHO_CAMPAIGNS_API_URL + "/recentcampaigns?resfmt=JSON&range=5", {
          headers: { "Authorization": "Zoho-oauthtoken " + token }, muteHttpExceptions: true
        });
        
        if (rr.getResponseCode() === 200) {
          const rd = JSON.parse(rr.getContentText());
          if (rd.status === "success" && rd.recent_campaigns) {
            const now = new Date();
            const today = Utilities.formatDate(now, "Australia/Brisbane", "yyyy-MM-dd");
            const cutoff = now.getTime() - 48*3600*1000;
            
            for (const c of rd.recent_campaigns) {
              if (!["Sent","Active","Completed","Delivered"].includes((c.campaign_status||"").trim())) continue;
              const ts = c.created_time || c.sent_time;
              if (!ts) continue;
              try {
                const ms = parseFloat(ts);
                const cd = Utilities.formatDate(new Date(ms), "Australia/Brisbane", "yyyy-MM-dd");
                if (cd !== today && ms < cutoff) continue;
                count++;
                const rpt = UrlFetchApp.fetch(ZOHO_CAMPAIGNS_API_URL + "/campaignreports?resfmt=JSON&campaignkey=" + c.campaign_key, {
                  headers: { "Authorization": "Zoho-oauthtoken " + token }, muteHttpExceptions: true
                });
                if (rpt.getResponseCode() === 200) {
                  const rd2 = JSON.parse(rpt.getContentText());
                  if (rd2.status === "success" && rd2["campaign-reports"]) {
                    const r = rd2["campaign-reports"][0];
                    const s = parseInt(r.emails_sent_count||r.sent_count||0);
                    const b = parseInt(r.bounces_count||r.bounce_count||0);
                    sent += s; delivered += parseInt(r.delivered_count||Math.max(0,s-b));
                    opened += parseInt(r.opens_count||r.open_count||0);
                    skipped += parseInt(r.unopened||0)+parseInt(r.unsent_count||0);
                    unsub += parseInt(r.unsubscribes_count||r.unsubscribe_count||0);
                    Logger.log("  📊 '" + (c.campaign_name||c.campaign_key) + "' S:"+s+" D:"+parseInt(r.delivered_count||Math.max(0,s-b))+" O:"+parseInt(r.opens_count||r.open_count||0));
                  }
                }
              } catch (e) { Logger.log("  ⚠️ Report fetch error: " + e.message); }
            }
          }
        }
      } catch (fetchErr) {
        Logger.log("⚠️ Zoho Campaigns API fetch failed (possible quota limit): " + fetchErr.message);
      }
    }
    
    Logger.log("📊 Actual Campaign Totals: Campaigns:" + count + " Sent:" + sent + " Del:" + delivered + " Open:" + opened + " Skip:" + skipped + " Unsub:" + unsub);
    
    const props = PropertiesService.getScriptProperties();
    let crm = {}; try { crm = JSON.parse(props.getProperty("LAST_CRM_SYNC")||"{}"); } catch(e) {}
    const crmLeads = (crm.inserted||0) + (crm.updated||0);
    const smsRecipient = props.getProperty("SMS_RECIPIENT_NUMBER") || "";
    
    const payload = {
      api_key: DIALER_API_KEY,
      recipient_number: smsRecipient,
      zoho_crm: { 
        leads: crmLeads, 
        sources: "Google Sheet Sync", 
        industries: "Software, Healthcare" 
      },
      zoho_campaigns: { 
        sent: sent, 
        delivered: delivered, 
        opened: opened, 
        skipped: skipped, 
        unsubscribed: unsub 
      },
      automation_scraper: { 
        scraped: crm.total||0, 
        converted: crm.inserted||0, 
        industries: "IT / Software, Healthcare" 
      }
    };
    
    // Logger.log("📤 Posting to Twilio Dialer: " + TWILIO_DIALER_DIGEST_URL);
    // try {
    //   const dr = UrlFetchApp.fetch(TWILIO_DIALER_DIGEST_URL, {
    //     method: "post", headers: { "Content-Type": "application/json" },
    //     payload: JSON.stringify(payload), muteHttpExceptions: true
    //   });
    //   const drd = JSON.parse(dr.getContentText());
    //   
    //   if (drd.success) { Logger.log("✅ SMS Digest sent to: " + JSON.stringify(drd.recipients||[])); }
    //   else { Logger.log("⚠️ Digest API response: " + dr.getContentText()); }
    // } catch (smsErr) {
    //   Logger.log("❌ SMS Digest POST failed: " + smsErr.message);
    // }
    
  } catch (err) { Logger.log("❌ FATAL: " + err.message + "\n" + err.stack); }
}


// ============================================================
// ⏰ TRIGGER MANAGEMENT
// ============================================================

function setupCrmPipelineTriggers() {
  Logger.log("⏰ Setting up CRM Pipeline AEST triggers...");
  
  const fns = ["syncSheetToZohoCRM", "triggerZohoCampaignEmail", "sendCampaignStatsViaSMS"];
  let removed = 0;
  ScriptApp.getProjectTriggers().forEach(t => { if (fns.includes(t.getHandlerFunction())) { ScriptApp.deleteTrigger(t); removed++; } });
  if (removed) Logger.log("🗑️ Removed " + removed + " old trigger(s).");
  
  // 7 AM AEST ≈ 2 AM IST | 9 AM AEST ≈ 4 AM IST
  ScriptApp.newTrigger("syncSheetToZohoCRM").timeBased().everyDays(1).atHour(2).create();
  ScriptApp.newTrigger("triggerZohoCampaignEmail").timeBased().everyDays(1).atHour(4).create();
  
  // sendCampaignStatsViaSMS is REMOVED (Daily digest is now scheduled in Zoho CRM at 1:00 PM IST)
  
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty("ZOHO_CAMPAIGNS_CLIENT_ID")) {
    props.setProperty("ZOHO_CAMPAIGNS_CLIENT_ID", DEFAULT_CAMPAIGNS_CLIENT_ID);
    props.setProperty("ZOHO_CAMPAIGNS_CLIENT_SECRET", DEFAULT_CAMPAIGNS_CLIENT_SECRET);
    props.setProperty("ZOHO_CAMPAIGNS_REFRESH_TOKEN", DEFAULT_CAMPAIGNS_REFRESH_TOKEN);
  }
  
  const msg = "✅ 2 Triggers Set!\n\n~7 AM AEST → syncSheetToZohoCRM\n~9 AM AEST → triggerZohoCampaignEmail\n(sendCampaignStatsViaSMS is disabled/removed)\n\n⚠️ Set CRM creds in Script Properties:\nZOHO_CRM_CLIENT_ID, ZOHO_CRM_CLIENT_SECRET, ZOHO_CRM_REFRESH_TOKEN";
  Logger.log(msg);
  try { SpreadsheetApp.getUi().alert("✅ Triggers Set!", msg, SpreadsheetApp.getUi().ButtonSet.OK); } catch(e) {}
}

function removeAllPipelineTriggers() {
  const fns = ["syncSheetToZohoCRM", "triggerZohoCampaignEmail", "sendCampaignStatsViaSMS"];
  let n = 0;
  ScriptApp.getProjectTriggers().forEach(t => { if (fns.includes(t.getHandlerFunction())) { ScriptApp.deleteTrigger(t); n++; } });
  Logger.log("🗑️ Removed " + n + " trigger(s).");
  try { SpreadsheetApp.getUi().alert("Removed " + n + " trigger(s)."); } catch(e) {}
}


// ============================================================
// 🚀 MANUAL FULL PIPELINE RUN
// ============================================================

function runFullCrmPipelineManual() {
  Logger.log("╔══════════════════════════════════════╗");
  Logger.log("║  🚀 FULL CRM PIPELINE — MANUAL RUN  ║");
  Logger.log("╚══════════════════════════════════════╝\n");
  
  Logger.log("▶ STEP 1/3: Sheet → Zoho CRM\n");
  syncSheetToZohoCRM();
  
  Utilities.sleep(5000);
  Logger.log("\n▶ STEP 2/3: Zoho Campaigns Email\n");
  triggerZohoCampaignEmail();
  
  Utilities.sleep(5000);
  Logger.log("\n▶ STEP 3/3: Campaign Stats SMS\n");
  sendCampaignStatsViaSMS();
  
  Logger.log("\n🏁 FULL PIPELINE COMPLETE!");
}


// ============================================================
// 🔧 CONFIGURATION UI
// ============================================================

function configureZohoCrmFromMenu() {
  try {
    const ui = SpreadsheetApp.getUi(), props = PropertiesService.getScriptProperties();
    const r1 = ui.prompt("🔑 Zoho CRM (1/3)", "Client ID:", ui.ButtonSet.OK_CANCEL);
    if (r1.getSelectedButton() !== ui.Button.OK) return;
    const r2 = ui.prompt("🔑 Zoho CRM (2/3)", "Client Secret:", ui.ButtonSet.OK_CANCEL);
    if (r2.getSelectedButton() !== ui.Button.OK) return;
    const r3 = ui.prompt("🔑 Zoho CRM (3/3)", "Refresh Token:", ui.ButtonSet.OK_CANCEL);
    if (r3.getSelectedButton() !== ui.Button.OK) return;
    props.setProperty("ZOHO_CRM_CLIENT_ID", r1.getResponseText().trim());
    props.setProperty("ZOHO_CRM_CLIENT_SECRET", r2.getResponseText().trim());
    props.setProperty("ZOHO_CRM_REFRESH_TOKEN", r3.getResponseText().trim());
    props.deleteProperty("ZOHO_CRM_ACCESS_TOKEN");
    props.deleteProperty("ZOHO_CRM_TOKEN_EXPIRY");
    ui.alert("✅ Zoho CRM configured!");
  } catch(e) { Logger.log("Error: " + e.message); }
}

function configureZohoCampaignsFromMenu() {
  try {
    const ui = SpreadsheetApp.getUi(), props = PropertiesService.getScriptProperties();
    const r1 = ui.prompt("🔑 Campaigns (1/4)", "Client ID (default: "+DEFAULT_CAMPAIGNS_CLIENT_ID+"):", ui.ButtonSet.OK_CANCEL);
    if (r1.getSelectedButton() !== ui.Button.OK) return;
    const r2 = ui.prompt("🔑 Campaigns (2/4)", "Client Secret:", ui.ButtonSet.OK_CANCEL);
    if (r2.getSelectedButton() !== ui.Button.OK) return;
    const r3 = ui.prompt("🔑 Campaigns (3/4)", "Refresh Token:", ui.ButtonSet.OK_CANCEL);
    if (r3.getSelectedButton() !== ui.Button.OK) return;
    const r4 = ui.prompt("🔑 Campaigns (4/4)", "Mailing List Key (blank=auto):", ui.ButtonSet.OK_CANCEL);
    if (r4.getSelectedButton() !== ui.Button.OK) return;
    props.setProperty("ZOHO_CAMPAIGNS_CLIENT_ID", r1.getResponseText().trim() || DEFAULT_CAMPAIGNS_CLIENT_ID);
    props.setProperty("ZOHO_CAMPAIGNS_CLIENT_SECRET", r2.getResponseText().trim() || DEFAULT_CAMPAIGNS_CLIENT_SECRET);
    props.setProperty("ZOHO_CAMPAIGNS_REFRESH_TOKEN", r3.getResponseText().trim() || DEFAULT_CAMPAIGNS_REFRESH_TOKEN);
    if (r4.getResponseText().trim()) props.setProperty("ZOHO_CAMPAIGNS_LIST_KEY", r4.getResponseText().trim());
    props.deleteProperty("ZOHO_CAMP_ACCESS_TOKEN");
    props.deleteProperty("ZOHO_CAMP_TOKEN_EXPIRY");
    ui.alert("✅ Zoho Campaigns configured!");
  } catch(e) { Logger.log("Error: " + e.message); }
}

function configureSmsRecipientFromMenu() {
  try {
    const ui = SpreadsheetApp.getUi(), props = PropertiesService.getScriptProperties();
    const currentNum = props.getProperty("SMS_RECIPIENT_NUMBER") || "+919025943184";
    const res = ui.prompt("📱 Configure SMS Recipient", "Enter target mobile number with country code (current: " + currentNum + "):", ui.ButtonSet.OK_CANCEL);
    if (res.getSelectedButton() !== ui.Button.OK) return;
    const phone = res.getResponseText().trim();
    if (phone) {
      props.setProperty("SMS_RECIPIENT_NUMBER", phone);
      ui.alert("✅ SMS recipient set to: " + phone);
    }
  } catch(e) { Logger.log("Error: " + e.message); }
}

function showCurrentConfig() {
  const props = PropertiesService.getScriptProperties();
  const hasCrm = !!(props.getProperty("ZOHO_CRM_CLIENT_ID") && props.getProperty("ZOHO_CRM_REFRESH_TOKEN"));
  const hasCamp = !!(props.getProperty("ZOHO_CAMPAIGNS_CLIENT_ID") || DEFAULT_CAMPAIGNS_CLIENT_ID);
  const listKey = props.getProperty("ZOHO_CAMPAIGNS_LIST_KEY") || "(auto-detect)";
  const smsRecipient = props.getProperty("SMS_RECIPIENT_NUMBER") || "(default backend list)";
  const fns = ["syncSheetToZohoCRM","triggerZohoCampaignEmail","sendCampaignStatsViaSMS"];
  const trigs = ScriptApp.getProjectTriggers().filter(t => fns.includes(t.getHandlerFunction()));
  
  const cfg = "📋 BRISBANE CRM PIPELINE CONFIG\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n" +
    "📊 Sheet: " + SOURCE_SHEET_ID + "\n📄 Tab: " + SOURCE_TAB_NAME + "\n\n" +
    "🔑 Zoho CRM: " + (hasCrm ? "✅" : "❌ NOT SET") + "\n" +
    "🔑 Campaigns: " + (hasCamp ? "✅" : "❌") + "\n" +
    "📋 List Key: " + listKey + "\n" +
    "📱 SMS Recipient: " + smsRecipient + "\n\n" +
    "⏰ Triggers: " + trigs.length + "/3\n" +
    trigs.map(t => "  • " + t.getHandlerFunction()).join("\n") + "\n\n" +
    "📅 Last Sync: " + (props.getProperty("LAST_CRM_SYNC") || "Never") + "\n" +
    "📅 Last Campaign: " + (props.getProperty("LAST_CAMPAIGN_TRIGGER") || "Never");
  
  Logger.log(cfg);
  try { SpreadsheetApp.getUi().alert("📋 Config", cfg, SpreadsheetApp.getUi().ButtonSet.OK); } catch(e) {}
}
