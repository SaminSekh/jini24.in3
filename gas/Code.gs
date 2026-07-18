/**
 * ============================================================
 * HOME SERVICE PLATFORM — Google Apps Script Backend
 * Bongaon to Ranaghat Region
 * ============================================================
 * Deploy this as a Web App:
 *   Extensions > Apps Script > Deploy > New Deployment
 *   Type: Web App | Execute as: Me | Who has access: Anyone
 * Copy the Web App URL and paste it in js/api.js → SCRIPT_URL
 * ============================================================
 */

// ── Sheet Names ────────────────────────────────────────────
const SHEET_SERVICES  = "Services";
const SHEET_BOOKINGS  = "Bookings";
const SHEET_PARTNERS  = "Partners";
const SHEET_PAYMENTS  = "Payment_Settings";
const SHEET_CONTACTS  = "Contacts";
const SHEET_CONTENT   = "SiteContent";
const SHEET_FAQ       = "FAQ";
const SHEET_CATEGORIES = "Categories";
const SHEET_USERS     = "Users";
const SHEET_AREAS     = "Service_Areas";
const SHEET_COUPONS   = "Coupons";
const SHEET_WISHES    = "Wishes";
const SHEET_ADMINS    = "Admins";

// ── Admin Access Control ────────────────────────────────────
// Add or remove admin Gmail addresses here.
// This list is NEVER sent to the browser — only true/false is returned.
const ADMIN_EMAILS = [
  "sohojehelp@gmail.com",
  // "another-admin@gmail.com",  ← add more admins here
];

function getAdminInfo(ss, email) {
  const targetEmail = (email || "").toLowerCase().trim();
  if (ADMIN_EMAILS.map(e => e.toLowerCase().trim()).includes(targetEmail)) {
    return { isAdmin: true, type: "Master" };
  }
  
  const sheet = ss.getSheetByName(SHEET_ADMINS);
  if (sheet) {
    const values = sheet.getDataRange().getValues();
    const headers = values[0] || [];
    for (let i = 1; i < values.length; i++) {
      if ((values[i][1] || "").toLowerCase().trim() === targetEmail) {
        // [AdminID, Email, States, Districts, Cities, MenuAccess, AddedAt]
        return {
          isAdmin: true,
          type: "SubAdmin",
          permissions: {
            States: values[i][2] || "",
            Districts: values[i][3] || "",
            Cities: values[i][4] || "",
            MenuAccess: values[i][5] || ""
          }
        };
      }
    }
  }
  return { isAdmin: false };
}

// ── CORS Headers ───────────────────────────────────────────
function setCORSHeaders(output) {
  return output
    .setMimeType(ContentService.MimeType.JSON);
}

function jsonResponse(data) {
  return setCORSHeaders(
    ContentService.createTextOutput(JSON.stringify(data))
  );
}

// ── Setup: Run Once to Initialize Sheets ───────────────────
function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Services Sheet
  let srv = ss.getSheetByName(SHEET_SERVICES);
  if (!srv) srv = ss.insertSheet(SHEET_SERVICES);
  if (srv.getLastRow() === 0) {
    srv.appendRow(["ServiceID","ServiceName","Category","BasePrice","ImageURL","Description","Status"]);
  }

  // Bookings Sheet
  let bk = ss.getSheetByName(SHEET_BOOKINGS);
  if (!bk) bk = ss.insertSheet(SHEET_BOOKINGS);
  if (bk.getLastRow() === 0) {
    bk.appendRow(["BookingID","CustomerName","CustomerEmail","Phone","SelectedService","BookingDate","BookingTime","Area","SpecialNotes","AssignedPartner","FinalPrice","JobStatus","CreatedAt","Rating","Review","PaymentStatus","PaymentMethodUsed","TransactionRef","Lat","Lng","CouponCode","DiscountApplied"]);
  }

  // Partners Sheet
  let pt = ss.getSheetByName(SHEET_PARTNERS);
  if (!pt) pt = ss.insertSheet(SHEET_PARTNERS);
  if (pt.getLastRow() === 0) {
    pt.appendRow(["PartnerID","Name","Email","Phone","Skillset","ServiceableAreas","Rating","DocumentStatus","JoinedAt"]);
  }

  // Payment Settings Sheet
  let pay = ss.getSheetByName(SHEET_PAYMENTS);
  if (!pay) pay = ss.insertSheet(SHEET_PAYMENTS);
  if (pay.getLastRow() === 0) {
    pay.appendRow(["PaymentMethodID","Name","Details","QRCodeURL","Status"]);
  }

  // Contacts Sheet
  let ct = ss.getSheetByName(SHEET_CONTACTS);
  if (!ct) ct = ss.insertSheet(SHEET_CONTACTS);
  if (ct.getLastRow() === 0) {
    ct.appendRow(["ContactID","Label","Value","Icon","Type","Status"]);
  }

  // Users Sheet
  let usr = ss.getSheetByName(SHEET_USERS);
  if (!usr) usr = ss.insertSheet(SHEET_USERS);
  if (usr.getLastRow() === 0) {
    usr.appendRow(["Email","Name","Phone","Address","SelectedArea","Lat","Lng"]);
  }

  // Admins Sheet
  let adm = ss.getSheetByName(SHEET_ADMINS);
  if (!adm) adm = ss.insertSheet(SHEET_ADMINS);
  if (adm.getLastRow() === 0) {
    adm.appendRow(["AdminID", "Email", "States", "Districts", "Cities", "MenuAccess", "AddedAt"]);
  }

  // SiteContent Sheet
  let contentSheet = ss.getSheetByName(SHEET_CONTENT);
  if (!contentSheet) contentSheet = ss.insertSheet(SHEET_CONTENT);
  if (contentSheet.getLastRow() === 0) {
    contentSheet.appendRow(["Key","Value"]);
    contentSheet.appendRow(["platform_fee_percent","20"]);
    contentSheet.appendRow(["logo_image",""]);
    contentSheet.appendRow(["logo_text","SK Services"]);
    contentSheet.appendRow(["app_link",""]);
    contentSheet.appendRow(["app_pwa_enabled","false"]);
    contentSheet.appendRow(["imgbb_api_key",""]);
  } else {
    // Ensure required keys exist for backward compatibility
    const vals = contentSheet.getDataRange().getValues();
    const existingKeys = vals.slice(1).map(r => r[0]);
    if (!existingKeys.includes("platform_fee_percent")) contentSheet.appendRow(["platform_fee_percent","20"]);
    if (!existingKeys.includes("logo_image"))           contentSheet.appendRow(["logo_image",""]);
    if (!existingKeys.includes("logo_text"))            contentSheet.appendRow(["logo_text","SK Services"]);
    if (!existingKeys.includes("app_link"))             contentSheet.appendRow(["app_link",""]);
    if (!existingKeys.includes("app_pwa_enabled"))      contentSheet.appendRow(["app_pwa_enabled","false"]);
    if (!existingKeys.includes("imgbb_api_key"))        contentSheet.appendRow(["imgbb_api_key",""]);
  }

  // FAQ Sheet
  let faqSheet = ss.getSheetByName(SHEET_FAQ);
  if (!faqSheet) faqSheet = ss.insertSheet(SHEET_FAQ);
  if (faqSheet.getLastRow() === 0) {
    faqSheet.appendRow(["FAQID", "Question", "Answer", "Section", "Status"]);
  }

  // Categories Sheet
  let catSheet = ss.getSheetByName(SHEET_CATEGORIES);
  if (!catSheet) catSheet = ss.insertSheet(SHEET_CATEGORIES);
  if (catSheet.getLastRow() === 0) {
    catSheet.appendRow(["CategoryID", "CategoryName"]);
  }

  // Service Areas Sheet
  let areasSheet = ss.getSheetByName(SHEET_AREAS);
  if (!areasSheet) areasSheet = ss.insertSheet(SHEET_AREAS);
  if (areasSheet.getLastRow() === 0) {
    areasSheet.appendRow(["AreaID", "State", "District", "Cities"]);
  }

  // Coupons Sheet
  let cp = ss.getSheetByName(SHEET_COUPONS);
  if (!cp) cp = ss.insertSheet(SHEET_COUPONS);
  if (cp.getLastRow() === 0) {
    cp.appendRow(["CouponCode", "DiscountType", "DiscountValue", "MaxUses", "UsesCount", "ExpiryDate", "Status"]);
  }

  // Wishes Sheet
  let ws = ss.getSheetByName(SHEET_WISHES);
  if (!ws) ws = ss.insertSheet(SHEET_WISHES);
  if (ws.getLastRow() === 0) {
    ws.appendRow(["WishID","CustomerName","CustomerEmail","Phone","WishItem","BookingDate","Area","SpecialNotes","JobStatus","CreatedAt","Rating","Review","PaymentStatus","PaymentMethodUsed","TransactionRef","FinalPrice","DeliveryDate"]);
  }

  console.log("Setup complete! All sheets initialized with headers (clean slate).");
}

// ══════════════════════════════════════════════════════════
// GET HANDLER — Read Operations
// ══════════════════════════════════════════════════════════
function doGet(e) {
  try {
    const action = e.parameter.action || "";
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    switch (action) {
      case "getServices":
        return jsonResponse({ status: "ok", data: getSheetData(ss, SHEET_SERVICES) });

      case "getBookings":
        return jsonResponse({ status: "ok", data: getSheetData(ss, SHEET_BOOKINGS) });

      case "getPartners":
        return jsonResponse({ status: "ok", data: getSheetData(ss, SHEET_PARTNERS) });

      case "getPaymentSettings":
        return jsonResponse({ status: "ok", data: getSheetData(ss, SHEET_PAYMENTS) });

      case "getContacts":
        return jsonResponse({ status: "ok", data: getSheetData(ss, SHEET_CONTACTS) });

      case "getContent":
        return jsonResponse({ status: "ok", data: getDisplayData(ss, SHEET_CONTENT) });

      case "getFAQs":
        return jsonResponse({ status: "ok", data: getSheetData(ss, SHEET_FAQ) });

      case "getCategories":
        return jsonResponse({ status: "ok", data: getSheetData(ss, SHEET_CATEGORIES) });

      case "getUsers":
        return jsonResponse({ status: "ok", data: getSheetData(ss, SHEET_USERS) });

      case "getAreas":
        return jsonResponse({ status: "ok", data: getSheetData(ss, SHEET_AREAS) });

      case "getCoupons":
        return jsonResponse({ status: "ok", data: getSheetData(ss, SHEET_COUPONS) });

      case "checkAdmin":
        const reqEmail = e.parameter.email || "";
        return jsonResponse({ status: "ok", ...getAdminInfo(ss, reqEmail) });

      case "getAdmins":
        return jsonResponse({ status: "ok", data: getSheetData(ss, SHEET_ADMINS) });

      case "getBookingByPhone":
        const phone = e.parameter.phone || "";
        const bookings = getSheetData(ss, SHEET_BOOKINGS);
        const found = bookings.filter(b => b.Phone === phone);
        return jsonResponse({ status: "ok", data: found });

      case "getBookingByEmail":
        const email = e.parameter.email || "";
        const allBookings = getSheetData(ss, SHEET_BOOKINGS);
        const foundByEmail = allBookings.filter(b => b.CustomerEmail === email);
        return jsonResponse({ status: "ok", data: foundByEmail });

      case "getWishes":
        return jsonResponse({ status: "ok", data: getSheetData(ss, SHEET_WISHES) });

      case "getWishesByEmail":
        const wishEmail = e.parameter.email || "";
        const allWishes = getSheetData(ss, SHEET_WISHES);
        const foundWishes = allWishes.filter(w => w.CustomerEmail === wishEmail);
        return jsonResponse({ status: "ok", data: foundWishes });

      case "getStats":
        return jsonResponse({ status: "ok", data: getStats(ss) });

      default:
        return jsonResponse({ status: "error", message: "Unknown action: " + action });
    }
  } catch (err) {
    return jsonResponse({ status: "error", message: err.toString() });
  }
}

// ══════════════════════════════════════════════════════════
// POST HANDLER — Write Operations
// ══════════════════════════════════════════════════════════
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action || "";
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    switch (action) {
      case "addBooking":
        return jsonResponse(addBooking(ss, payload.data));

      case "updateBooking":
        return jsonResponse(updateBooking(ss, payload.data));
        
      case "updateProfile":
        return jsonResponse(updateUserProfile(ss, payload.data));
        
      case "acceptJob":
        return jsonResponse(acceptJob(ss, payload.data));

      case "addService":
        return jsonResponse(addService(ss, payload.data));

      case "updateService":
        return jsonResponse(updateService(ss, payload.data));

      case "addPartner":
        return jsonResponse(addPartner(ss, payload.data));

      case "updatePartner":
        return jsonResponse(updatePartner(ss, payload.data));

      case "addPaymentSetting":
        return jsonResponse(addPaymentSetting(ss, payload.data));

      case "updatePaymentSetting":
        return jsonResponse(updatePaymentSetting(ss, payload.data));

      case "deletePaymentSetting":
        return jsonResponse(deleteRow(ss, SHEET_PAYMENTS, "PaymentMethodID", payload.paymentMethodId));

      case "addCategory":
        return jsonResponse(addCategory(ss, payload.data));

      case "deleteCategory":
        return jsonResponse(deleteRow(ss, SHEET_CATEGORIES, "CategoryID", payload.categoryId));

      case "addCoupon":
        return jsonResponse(addCoupon(ss, payload.data));

      case "updateCoupon":
        return jsonResponse(updateCoupon(ss, payload.data));

      case "deleteCoupon":
        return jsonResponse(deleteRow(ss, SHEET_COUPONS, "CouponCode", payload.couponCode));

      case "addArea":
        return jsonResponse(addArea(ss, payload.data));

      case "updateArea":
        return jsonResponse(updateArea(ss, payload.data));

      case "deleteArea":
        return jsonResponse(deleteRow(ss, SHEET_AREAS, "AreaID", payload.areaId));

      case "deleteService":
        return jsonResponse(deactivateService(ss, payload.serviceId));

      case "deleteBooking":
        return jsonResponse(deleteRow(ss, SHEET_BOOKINGS, "BookingID", payload.bookingId));

      case "deletePartner":
        return jsonResponse(deleteRow(ss, SHEET_PARTNERS, "PartnerID", payload.partnerId));

      case "addContact":
        return jsonResponse(addContact(ss, payload.data));

      case "updateContact":
        return jsonResponse(updateContact(ss, payload.data));

      case "deleteContact":
        return jsonResponse(deleteRow(ss, SHEET_CONTACTS, "ContactID", payload.contactId));

      case "updateContent":
        return jsonResponse(updateContent(ss, payload.data));

      case "addFAQ":
        return jsonResponse(addFAQ(ss, payload.data));

      case "updateFAQ":
        return jsonResponse(updateFAQ(ss, payload.data));

      case "deleteFAQ":
        return jsonResponse(deleteRow(ss, SHEET_FAQ, "FAQID", payload.faqId));

      case "addWish":
        return jsonResponse(addWish(ss, payload.data));

      case "updateWish":
        return jsonResponse(updateWish(ss, payload.data));

      case "deleteWish":
        return jsonResponse(deleteRow(ss, SHEET_WISHES, "WishID", payload.wishId));

      case "addAdmin":
        return jsonResponse(addAdmin(ss, payload.data));

      case "updateAdmin":
        return jsonResponse(updateAdmin(ss, payload.data));

      case "deleteAdmin":
        return jsonResponse(deleteAdmin(ss, payload.data));

      default:
        return jsonResponse({ status: "error", message: "Unknown action: " + action });
    }
  } catch (err) {
    return jsonResponse({ status: "error", message: err.toString() });
  }
}

// Helper to delete row by ID
function deleteRow(ss, sheetName, idColName, idValue) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return { status: "error", message: "Sheet not found: " + sheetName };
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const colIdx = headers.indexOf(idColName);
  if (colIdx === -1) return { status: "error", message: "ID column not found: " + idColName };
  
  for (let i = 1; i < values.length; i++) {
    if (values[i][colIdx] === idValue) {
      sheet.deleteRow(i + 1);
      return { status: "ok", deleted: idValue };
    }
  }
  return { status: "error", message: "Record not found with ID: " + idValue };
}

// ══════════════════════════════════════════════════════════
// HELPER: Read sheet → array of objects
// ══════════════════════════════════════════════════════════
function getSheetData(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  const [headers, ...rows] = sheet.getDataRange().getValues();
  return rows.map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

function getDisplayData(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  const [headers, ...rows] = sheet.getDataRange().getDisplayValues();
  return rows.map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

// ══════════════════════════════════════════════════════════
// HELPER: Generate next sequential ID
// ══════════════════════════════════════════════════════════
function generateId(ss, sheetName, prefix) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error("Sheet '" + sheetName + "' not found. Please run the setupSheets function in Apps Script to initialize the database.");
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return prefix + "0001";
  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat().filter(v => v !== "");
  if (ids.length === 0) return prefix + "0001";
  const nums = ids.map(id => {
    const parts = id.toString().split("-");
    return parseInt(parts[parts.length - 1]) || 0;
  });
  const next = Math.max(...nums) + 1;
  return prefix + String(next).padStart(4, "0");
}

// ══════════════════════════════════════════════════════════
// BUSINESS LOGIC: Add Booking
// ══════════════════════════════════════════════════════════
function addBooking(ss, data) {
  const sheet = ss.getSheetByName(SHEET_BOOKINGS);
  if (!sheet) throw new Error("Sheet '" + SHEET_BOOKINGS + "' not found. Please run the setupSheets function in Apps Script.");
  const year = new Date().getFullYear();
  const id = generateId(ss, SHEET_BOOKINGS, `JOB-${year}-`);
  const now = Utilities.formatDate(new Date(), "Asia/Kolkata", "yyyy-MM-dd");
  // Check auto broadcast
  let assignedPartner = "";
  let jobStatus = "Pending";
  
  try {
    const cData = getSheetData(ss, SHEET_CONTENT);
    const autoBroadcast = cData.find(c => c.Key === "auto_broadcast_jobs");
    if (autoBroadcast && String(autoBroadcast.Value).toLowerCase() === "true") {
      const pData = getSheetData(ss, SHEET_PARTNERS);
      const eligible = pData.filter(p => p.DocumentStatus === "Verified" && (p.Skillset || "").split(",").map(s => s.trim()).includes(data.SelectedService));
      if (eligible.length > 0) {
        assignedPartner = eligible.map(p => p.PartnerID).join(",");
        jobStatus = "Partner_Assigned";
      }
    }
  } catch(err) {
    // ignore error, fallback to pending
  }

  // Handle Coupon Logic
  let couponCode = data.CouponCode || "";
  let discountApplied = data.DiscountApplied || 0;
  if (couponCode) {
    const cpSheet = ss.getSheetByName(SHEET_COUPONS);
    if (cpSheet) {
      const cpVals = cpSheet.getDataRange().getValues();
      for (let i = 1; i < cpVals.length; i++) {
        if (cpVals[i][0] === couponCode) {
          const usesCol = cpVals[0].indexOf("UsesCount");
          if (usesCol !== -1) {
            let currentUses = parseInt(cpVals[i][usesCol]) || 0;
            cpSheet.getRange(i + 1, usesCol + 1).setValue(currentUses + 1);
          }
          break;
        }
      }
    }
  }

  sheet.appendRow([
    id,
    data.CustomerName || "",
    data.CustomerEmail || "",
    data.Phone || "",
    data.SelectedService || "",
    data.BookingDate || "",
    data.BookingTime || "",
    data.Area || "",
    data.SpecialNotes || "",
    assignedPartner, // AssignedPartner
    "",           // FinalPrice
    jobStatus,    // JobStatus
    now,
    "",           // Rating
    "",           // Review
    "Unpaid",     // PaymentStatus
    "",           // PaymentMethodUsed
    "",           // TransactionRef
    data.Lat || "",
    data.Lng || "",
    couponCode,
    discountApplied
  ]);
  return { success: true, bookingId: id };
}

// ══════════════════════════════════════════════════════════
// BUSINESS LOGIC: Update Booking (status, partner, price)
// ══════════════════════════════════════════════════════════
function updateBooking(ss, data) {
  const sheet = ss.getSheetByName(SHEET_BOOKINGS);
  if (!sheet) throw new Error("Sheet '" + SHEET_BOOKINGS + "' not found. Please run the setupSheets function in Apps Script.");
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === data.BookingID) {
      if (data.CompletionImage && data.CompletionImage.startsWith("data:image")) {
        try {
          const folderIter = DriveApp.getFoldersByName("Jini24 Images");
          const folder = folderIter.hasNext() ? folderIter.next() : DriveApp.createFolder("Jini24 Images");
          
          const splitBase = data.CompletionImage.split(',');
          const type = splitBase[0].match(/:(.*?);/)[1];
          const bytes = Utilities.base64Decode(splitBase[1]);
          const blob = Utilities.newBlob(bytes, type, data.BookingID + "-completion.jpg");
          
          const file = folder.createFile(blob);
          file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          data.CompletionImage = file.getUrl();
        } catch (e) {
          data.CompletionImage = "Error uploading image: " + e.message;
        }
      }

      const fields = ["AssignedPartner", "FinalPrice", "JobStatus", "Rating", "Review", "PaymentStatus", "PaymentMethodUsed", "TransactionRef", "CompletionImage"];
      fields.forEach(field => {
        if (data[field] !== undefined) {
          let cIdx = headers.indexOf(field);
          if (cIdx === -1) {
            // Auto-add missing column header for older sheets
            cIdx = headers.length;
            headers.push(field);
            sheet.getRange(1, cIdx + 1).setValue(field);
          }
          sheet.getRange(i + 1, cIdx + 1).setValue(data[field]);
        }
      });
      const statusIdx = headers.indexOf("JobStatus");
      if (data.AssignedPartner && statusIdx !== -1 && values[i][statusIdx] === "Pending") {
        sheet.getRange(i + 1, statusIdx + 1).setValue("Partner_Assigned");
      }
      return { status: "ok", updated: data.BookingID };
    }
  }
  return { status: "error", message: "Booking not found: " + data.BookingID };
}

// ══════════════════════════════════════════════════════════
// BUSINESS LOGIC: Accept Job (Atomic Claim for Broadcast)
// ══════════════════════════════════════════════════════════
function acceptJob(ss, data) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    return { status: "error", message: "Could not acquire lock. System busy." };
  }

  try {
    const sheet = ss.getSheetByName(SHEET_BOOKINGS);
    if (!sheet) throw new Error("Sheet '" + SHEET_BOOKINGS + "' not found.");
    const values = sheet.getDataRange().getValues();
    const headers = values[0];
    
    for (let i = 1; i < values.length; i++) {
      if (values[i][0] === data.BookingID) {
        const assignedIdx = headers.indexOf("AssignedPartner");
        const statusIdx = headers.indexOf("JobStatus");
        
        const currentPartners = values[i][assignedIdx];
        if (!currentPartners || !currentPartners.includes(data.PartnerID)) {
          return { status: "error", message: "Job is no longer available to you." };
        }
        
        // If it includes commas, it's a broadcast.
        if (!currentPartners.includes(",")) {
          if (currentPartners === data.PartnerID) return { status: "ok", message: "Already claimed by you." };
          return { status: "error", message: "Job has already been claimed by another partner." };
        }
        
        sheet.getRange(i + 1, assignedIdx + 1).setValue(data.PartnerID);
        sheet.getRange(i + 1, statusIdx + 1).setValue("Partner_Assigned");
        
        return { status: "ok", updated: data.BookingID };
      }
    }
    return { status: "error", message: "Booking not found." };
  } finally {
    lock.releaseLock();
  }
}

// ══════════════════════════════════════════════════════════
// BUSINESS LOGIC: Add Service
// ══════════════════════════════════════════════════════════
function addService(ss, data) {
  const sheet = ss.getSheetByName(SHEET_SERVICES);
  if (!sheet) throw new Error("Sheet '" + SHEET_SERVICES + "' not found. Please run the setupSheets function in Apps Script.");
  const lastRow = sheet.getLastRow();
  const existing = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat() : [];
  const catCode = (data.Category || "SRV").substring(0, 2).toUpperCase();
  const num = existing.length + 1;
  const id = `SRV-${catCode}-${String(num).padStart(2, "0")}`;
  sheet.appendRow([
    id,
    data.ServiceName || "",
    data.Category || "",
    parseFloat(data.BasePrice) || 0,
    data.ImageURL || "",
    data.Description || "",
    "Active"
  ]);
  return { status: "ok", serviceId: id };
}

// ══════════════════════════════════════════════════════════
// BUSINESS LOGIC: Update Service (price, name, status, etc.)
// ══════════════════════════════════════════════════════════
function updateService(ss, data) {
  const sheet = ss.getSheetByName(SHEET_SERVICES);
  if (!sheet) throw new Error("Sheet '" + SHEET_SERVICES + "' not found. Please run the setupSheets function in Apps Script.");
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const colIdx = key => headers.indexOf(key);

  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === data.ServiceID) {
      const fields = ["ServiceName","Category","BasePrice","ImageURL","Description","Status"];
      fields.forEach(field => {
        if (data[field] !== undefined) {
          sheet.getRange(i + 1, colIdx(field) + 1).setValue(data[field]);
        }
      });
      return { status: "ok", updated: data.ServiceID };
    }
  }
  return { status: "error", message: "Service not found." };
}

// ══════════════════════════════════════════════════════════
// BUSINESS LOGIC: Add Category
// ══════════════════════════════════════════════════════════
function addCategory(ss, data) {
  if (!data.CategoryName) return { status: "error", message: "Category Name is required." };
  const sheet = ss.getSheetByName(SHEET_CATEGORIES);
  if (!sheet) return { status: "error", message: "Categories sheet not found." };
  const newId = "CAT-" + Date.now();
  sheet.appendRow([newId, data.CategoryName]);
  return { status: "ok", added: newId };
}

// ══════════════════════════════════════════════════════════
// BUSINESS LOGIC: Deactivate Service
// ══════════════════════════════════════════════════════════
function deactivateService(ss, serviceId) {
  return updateService(ss, { ServiceID: serviceId, Status: "Inactive" });
}

// ══════════════════════════════════════════════════════════
// BUSINESS LOGIC: Add Partner (onboarding)
// ══════════════════════════════════════════════════════════
function addPartner(ss, data) {
  const sheet = ss.getSheetByName(SHEET_PARTNERS);
  if (!sheet) throw new Error("Sheet '" + SHEET_PARTNERS + "' not found. Please run the setupSheets function in Apps Script.");
  const lastRow = sheet.getLastRow();
  const existing = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat() : [];
  const num = existing.length + 1;
  const id = `PTR-${String(num).padStart(3, "0")}`;
  const now = Utilities.formatDate(new Date(), "Asia/Kolkata", "yyyy-MM-dd");
  sheet.appendRow([
    id,
    data.Name || "",
    data.Email || "",
    data.Phone || "",
    data.Skillset || "",
    data.ServiceableAreas || "",
    0,              // Rating starts at 0
    "Pending Review",
    now
  ]);
  return { status: "ok", partnerId: id };
}

// ══════════════════════════════════════════════════════════
// BUSINESS LOGIC: Update Partner
// ══════════════════════════════════════════════════════════
function updatePartner(ss, data) {
  const sheet = ss.getSheetByName(SHEET_PARTNERS);
  if (!sheet) throw new Error("Sheet '" + SHEET_PARTNERS + "' not found. Please run the setupSheets function in Apps Script.");
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const colIdx = key => headers.indexOf(key);

  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === data.PartnerID) {
      const fields = ["Name","Email","Phone","Skillset","ServiceableAreas","Rating","DocumentStatus","Experience"];
      fields.forEach(field => {
        const cIdx = colIdx(field);
        if (cIdx !== -1 && data[field] !== undefined) {
          sheet.getRange(i + 1, cIdx + 1).setValue(data[field]);
        }
      });
      return { status: "ok", updated: data.PartnerID };
    }
  }
  return { status: "error", message: "Partner not found: " + data.PartnerID };
}

// ══════════════════════════════════════════════════════════
// STATS: Dashboard summary data
// ══════════════════════════════════════════════════════════
function getStats(ss) {
  const bookings = getSheetData(ss, SHEET_BOOKINGS);
  const partners = getSheetData(ss, SHEET_PARTNERS);
  const services = getSheetData(ss, SHEET_SERVICES);

  const activeBookings  = bookings.filter(b => b.JobStatus === "Pending" || b.JobStatus === "Partner_Assigned" || b.JobStatus === "Contacted").length;
  const completedJobs   = bookings.filter(b => b.JobStatus === "Completed").length;
  const verifiedPartners = partners.filter(p => p.DocumentStatus === "Verified").length;
  const totalPartners    = partners.length;

  // Commission = 20% of FinalPrice for completed jobs
  const totalRevenue = bookings
    .filter(b => b.JobStatus === "Completed" && b.FinalPrice)
    .reduce((sum, b) => sum + (parseFloat(b.FinalPrice) || 0), 0);
  const commission = Math.round(totalRevenue * 0.20);

  return {
    activeBookings,
    completedJobs,
    totalRevenue,
    commission,
    verifiedPartners,
    totalPartners,
    totalServices: services.filter(s => s.Status === "Active").length
  };
}

// ══════════════════════════════════════════════════════════
// BUSINESS LOGIC: Add Payment Setting
// ══════════════════════════════════════════════════════════
function addPaymentSetting(ss, data) {
  const sheet = ss.getSheetByName(SHEET_PAYMENTS);
  if (!sheet) throw new Error("Sheet '" + SHEET_PAYMENTS + "' not found. Please run the setupSheets function in Apps Script.");
  const id = generateId(ss, SHEET_PAYMENTS, "PAY-");
  sheet.appendRow([
    id,
    data.Name || "",
    data.Details || "",
    data.QRCodeURL || "",
    "Active"
  ]);
  return { status: "ok", paymentMethodId: id };
}

// ══════════════════════════════════════════════════════════
// BUSINESS LOGIC: Update Payment Setting
// ══════════════════════════════════════════════════════════
function updatePaymentSetting(ss, data) {
  const sheet = ss.getSheetByName(SHEET_PAYMENTS);
  if (!sheet) throw new Error("Sheet '" + SHEET_PAYMENTS + "' not found. Please run the setupSheets function in Apps Script.");
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const colIdx = key => headers.indexOf(key);

  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === data.PaymentMethodID) {
      const fields = ["Name", "Details", "QRCodeURL", "Status"];
      fields.forEach(field => {
        if (data[field] !== undefined) {
          sheet.getRange(i + 1, colIdx(field) + 1).setValue(data[field]);
        }
      });
      return { status: "ok", updated: data.PaymentMethodID };
    }
  }
  return { status: "error", message: "Payment method not found: " + data.PaymentMethodID };
}

// ══════════════════════════════════════════════════════════
// BUSINESS LOGIC: Add Contact
// ══════════════════════════════════════════════════════════
function addContact(ss, data) {
  let sheet = ss.getSheetByName(SHEET_CONTACTS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_CONTACTS);
    sheet.appendRow(["ContactID","Label","Value","Icon","Type","Status"]);
  }
  const id = generateId(ss, SHEET_CONTACTS, "CON-");
  sheet.appendRow([
    id,
    data.Label || "",
    data.Value || "",
    data.Icon || "phone",
    data.Type || "text",
    "Active"
  ]);
  return { status: "ok", contactId: id };
}

// ══════════════════════════════════════════════════════════
// BUSINESS LOGIC: Update Contact
// ══════════════════════════════════════════════════════════
function updateContact(ss, data) {
  const sheet = ss.getSheetByName(SHEET_CONTACTS);
  if (!sheet) return { status: "error", message: "Contacts sheet not found" };
  const values = sheet.getDataRange().getValues();
  const headers = values[0];

  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === data.ContactID) {
      const fields = ["Label", "Value", "Icon", "Type", "Status"];
      fields.forEach(field => {
        if (data[field] !== undefined) {
          const cIdx = headers.indexOf(field);
          if (cIdx !== -1) sheet.getRange(i + 1, cIdx + 1).setValue(data[field]);
        }
      });
      return { status: "ok", updated: data.ContactID };
    }
  }
  return { status: "error", message: "Contact not found: " + data.ContactID };
}

// ══════════════════════════════════════════════════════════
// BUSINESS LOGIC: Update Site Content
// ══════════════════════════════════════════════════════════
function updateContent(ss, dataList) {
  const sheet = ss.getSheetByName(SHEET_CONTENT);
  if (!sheet) throw new Error("Sheet not found: " + SHEET_CONTENT);
  const values = sheet.getDataRange().getValues();
  
  // dataList is array of {Key, Value}
  dataList.forEach(item => {
    let found = false;
    for (let i = 1; i < values.length; i++) {
      if (values[i][0] === item.Key) {
        sheet.getRange(i + 1, 2).setValue(item.Value);
        found = true;
        break;
      }
    }
    if (!found && item.Key) {
      sheet.appendRow([item.Key, item.Value || ""]);
    }
  });
  return { status: "ok", updated: dataList.length };
}

// ══════════════════════════════════════════════════════════
// BUSINESS LOGIC: FAQ CRUD
// ══════════════════════════════════════════════════════════
function addFAQ(ss, data) {
  let sheet = ss.getSheetByName(SHEET_FAQ);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_FAQ);
    sheet.appendRow(["FAQID", "Question", "Answer", "Section", "Status"]);
  }
  const id = generateId(ss, SHEET_FAQ, "FAQ-");
  sheet.appendRow([
    id,
    data.Question || "",
    data.Answer || "",
    data.Section || "Main",
    "Active"
  ]);
  return { status: "ok", faqId: id };
}

function updateFAQ(ss, data) {
  const sheet = ss.getSheetByName(SHEET_FAQ);
  if (!sheet) throw new Error("Sheet not found: " + SHEET_FAQ);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const colIdx = key => headers.indexOf(key);

  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === data.FAQID) {
      const fields = ["Question", "Answer", "Section", "Status"];
      fields.forEach(field => {
        if (data[field] !== undefined) {
          let cIdx = headers.indexOf(field);
          if (cIdx === -1) {
            cIdx = headers.length;
            headers.push(field);
            sheet.getRange(1, cIdx + 1).setValue(field);
          }
          sheet.getRange(i + 1, cIdx + 1).setValue(data[field]);
        }
      });
      return { status: "ok", updated: data.FAQID };
    }
  }
  return { status: "error", message: "FAQ not found: " + data.FAQID };
}

// ══════════════════════════════════════════════════════════
// USERS Logic
// ══════════════════════════════════════════════════════════
function updateUserProfile(ss, data) {
  const sheet = ss.getSheetByName(SHEET_USERS);
  if (!sheet) return { status: "error", message: "Users sheet not found" };

  const email = data.Email;
  if (!email) return { status: "error", message: "Email is required" };

  const values = sheet.getDataRange().getValues();
  let headers = values[0] || [];
  if (headers.length === 0) {
    headers = ["Email", "Name", "Phone", "Address", "SelectedArea", "Lat", "Lng", "State", "District", "City"];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  let rowIndex = -1;

  // Find user by email
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === email) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex === -1) {
    rowIndex = Math.max(2, sheet.getLastRow() + 1);
  }

  const updateField = (fieldName, value) => {
    let col = headers.indexOf(fieldName);
    if (col === -1) {
      col = headers.length;
      headers.push(fieldName);
      sheet.getRange(1, col + 1).setValue(fieldName);
    }
    if (value !== undefined) {
      sheet.getRange(rowIndex, col + 1).setValue(value);
    }
  };

  updateField("Email",        email);
  updateField("Name",         data.Name || "");
  updateField("Phone",        data.Phone || "");
  updateField("Address",      data.Address || "");
  updateField("State",        data.State || "");
  updateField("District",     data.District || "");
  updateField("City",         data.City || "");
  updateField("SelectedArea", data.SelectedArea || "");
  updateField("Lat",          data.Lat || "");
  updateField("Lng",          data.Lng || "");

  return { status: "ok", message: "Profile updated successfully" };
}

// ══════════════════════════════════════════════════════════
// SERVICE AREAS Logic
// ══════════════════════════════════════════════════════════
function addArea(ss, data) {
  const sheet = ss.getSheetByName(SHEET_AREAS);
  if (!sheet) return { status: "error", message: "Areas sheet not found" };
  const id = generateId(ss, SHEET_AREAS, "AREA-");
  sheet.appendRow([
    id,
    data.State || "",
    data.District || "",
    data.Cities || ""
  ]);
  return { status: "ok", added: id };
}

function updateArea(ss, data) {
  const sheet = ss.getSheetByName(SHEET_AREAS);
  if (!sheet) return { status: "error", message: "Areas sheet not found" };
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const colIdx = key => headers.indexOf(key);

  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === data.AreaID) {
      if (data.State !== undefined) sheet.getRange(i + 1, colIdx("State") + 1).setValue(data.State);
      if (data.District !== undefined) sheet.getRange(i + 1, colIdx("District") + 1).setValue(data.District);
      if (data.Cities !== undefined) sheet.getRange(i + 1, colIdx("Cities") + 1).setValue(data.Cities);
      return { status: "ok" };
    }
  }
  return { status: "error", message: "Area not found" };
}

// ══════════════════════════════════════════════════════════
// COUPONS Logic
// ══════════════════════════════════════════════════════════
function addCoupon(ss, data) {
  const sheet = ss.getSheetByName(SHEET_COUPONS);
  if (!sheet) return { status: "error", message: "Coupons sheet not found" };
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === data.CouponCode) {
      return { status: "error", message: "Coupon code already exists" };
    }
  }
  sheet.appendRow([
    data.CouponCode,
    data.DiscountType || "Flat",
    data.DiscountValue || 0,
    data.MaxUses || 0,
    0, // UsesCount
    data.ExpiryDate || "",
    data.Status || "Active"
  ]);
  return { status: "ok", couponCode: data.CouponCode };
}

function updateCoupon(ss, data) {
  const sheet = ss.getSheetByName(SHEET_COUPONS);
  if (!sheet) return { status: "error", message: "Coupons sheet not found" };
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const colIdx = key => headers.indexOf(key);

  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === data.CouponCode) {
      if (data.DiscountType !== undefined) sheet.getRange(i + 1, colIdx("DiscountType") + 1).setValue(data.DiscountType);
      if (data.DiscountValue !== undefined) sheet.getRange(i + 1, colIdx("DiscountValue") + 1).setValue(data.DiscountValue);
      if (data.MaxUses !== undefined) sheet.getRange(i + 1, colIdx("MaxUses") + 1).setValue(data.MaxUses);
      if (data.UsesCount !== undefined) sheet.getRange(i + 1, colIdx("UsesCount") + 1).setValue(data.UsesCount);
      if (data.ExpiryDate !== undefined) sheet.getRange(i + 1, colIdx("ExpiryDate") + 1).setValue(data.ExpiryDate);
      if (data.Status !== undefined) sheet.getRange(i + 1, colIdx("Status") + 1).setValue(data.Status);
      return { status: "ok" };
    }
  }
  return { status: "error", message: "Coupon not found" };
}

function addWish(ss, data) {
  const sheet = ss.getSheetByName(SHEET_WISHES);
  if (!sheet) throw new Error("Sheet '" + SHEET_WISHES + "' not found. Please run the setupSheets function in Apps Script.");
  const year = new Date().getFullYear();
  const id = generateId(ss, SHEET_WISHES, `WSH-${year}-`);
  const now = Utilities.formatDate(new Date(), "Asia/Kolkata", "yyyy-MM-dd");

  sheet.appendRow([
    id,
    data.CustomerName || "",
    data.CustomerEmail || "",
    data.Phone || "",
    data.WishItem || "",
    data.BookingDate || now,
    data.Area || "",
    data.SpecialNotes || "",
    "Pending", // JobStatus
    now, // CreatedAt
    "", // Rating
    "", // Review
    "Unpaid", // PaymentStatus
    "", // PaymentMethodUsed
    "", // TransactionRef
    "", // FinalPrice
    ""  // DeliveryDate
  ]);
  return { success: true, wishId: id };
}

function updateWish(ss, data) {
  const sheet = ss.getSheetByName(SHEET_WISHES);
  if (!sheet) throw new Error("Sheet '" + SHEET_WISHES + "' not found. Please run the setupSheets function in Apps Script.");
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === data.WishID) {
      const fields = ["JobStatus", "Rating", "Review", "PaymentStatus", "PaymentMethodUsed", "TransactionRef", "FinalPrice", "DeliveryDate"];
      fields.forEach(field => {
        if (data[field] !== undefined) {
          let cIdx = headers.indexOf(field);
          if (cIdx === -1) {
            cIdx = headers.length;
            headers.push(field);
            sheet.getRange(1, cIdx + 1).setValue(field);
          }
          sheet.getRange(i + 1, cIdx + 1).setValue(data[field]);
        }
      });
      return { status: "ok", updated: data.WishID };
    }
  }
  return { status: "error", message: "Wish not found: " + data.WishID };
}

// ══════════════════════════════════════════════════════════
// ADMINS Logic
// ══════════════════════════════════════════════════════════
function addAdmin(ss, data) {
  const sheet = ss.getSheetByName(SHEET_ADMINS);
  if (!sheet) return { status: "error", message: "Admins sheet not found" };
  const id = generateId(ss, SHEET_ADMINS, "ADM-");
  const now = Utilities.formatDate(new Date(), "Asia/Kolkata", "yyyy-MM-dd");
  sheet.appendRow([
    id,
    data.Email || "",
    data.States || "",
    data.Districts || "",
    data.Cities || "",
    data.MenuAccess || "",
    now
  ]);
  return { status: "ok", added: id };
}

function updateAdmin(ss, data) {
  const sheet = ss.getSheetByName(SHEET_ADMINS);
  if (!sheet) return { status: "error", message: "Admins sheet not found" };
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const colIdx = key => headers.indexOf(key);

  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === data.AdminID) {
      const rowIndex = i + 1;
      const updateIfPresent = (key) => {
        if (data[key] !== undefined) sheet.getRange(rowIndex, colIdx(key) + 1).setValue(data[key]);
      };
      updateIfPresent("Email");
      updateIfPresent("States");
      updateIfPresent("Districts");
      updateIfPresent("Cities");
      updateIfPresent("MenuAccess");
      return { status: "ok", message: "Admin updated successfully" };
    }
  }
  return { status: "error", message: "Admin not found" };
}

function deleteAdmin(ss, data) {
  const sheet = ss.getSheetByName(SHEET_ADMINS);
  if (!sheet) return { status: "error", message: "Admins sheet not found" };
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === data.AdminID) {
      sheet.deleteRow(i + 1);
      return { status: "ok", message: "Admin deleted successfully" };
    }
  }
  return { status: "error", message: "Admin not found" };
}

