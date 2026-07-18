/**
 * ============================================================
 * Module B — Admin Panel
 * ============================================================
 * Dashboard metrics, Service CRUD, Job management with
 * partner assignment and status lifecycle control.
 * ============================================================
 */

let adminInited = false;
let currentAdminView = "dashboard";

window.viewBookingPhoto = function(bookingId) {
  const b = AppState.get("bookings").find(x => x.BookingID === bookingId);
  if (b && b.CompletionImage) {
    if (b.CompletionImage.startsWith("http")) {
      // It's a Google Drive or external URL, open directly
      window.open(b.CompletionImage, "_blank", "noopener,noreferrer");
    } else if (b.CompletionImage.startsWith("Error")) {
      // Drive upload failed and saved an error message
      Toast.show(b.CompletionImage, "error");
    } else {
      // It's a Base64 data URI, use custom popup viewer
      const w = window.open("");
      if (w) {
        w.document.write(`<body style="margin:0;display:flex;justify-content:center;align-items:center;background:#0f172a;height:100vh;"><img src="${b.CompletionImage}" style="max-width:100%;max-height:100%;object-fit:contain;"></body>`);
        w.document.close();
      } else {
        Toast.show("Please allow popups to view the photo", "error");
      }
    }
  } else {
    Toast.show("No photo found", "error");
  }
};

function initAdminModule() {
  if (AppState.get("userRole") !== "Admin") return;
  if (adminInited) { applyAdminPermissions(); switchAdminView(currentAdminView); return; }
  adminInited = true;

  applyAdminPermissions();
  initAdminSidebar();
  initServiceEditor();
  initJobManager();
  initDashboard();
  initPaymentModule();
  initContactModule();
  initFrontendModule();
  initAreasView();
  initCouponsView();
  initExtraWishesModule();
  initAdminsModule();
  document.addEventListener("dataLoaded", () => {
    if (AppState.get("currentPage") === "admin" && AppState.get("userRole") === "Admin") {
      applyAdminPermissions();
      refreshAdminView();
    }
  });
}

// â”€â”€ Sidebar Navigation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function initAdminSidebar() {
  document.querySelectorAll(".sidebar-link[data-view]").forEach(link => {
    link.addEventListener("click", () => switchAdminView(link.dataset.view));
  });
}

function switchAdminView(view) {
  currentAdminView = view;
  AppState.set("currentAdminView", view);

  document.querySelectorAll(".sidebar-link").forEach(l =>
    l.classList.toggle("active", l.dataset.view === view)
  );
  document.querySelectorAll(".admin-view").forEach(v =>
    v.classList.toggle("active", v.id === `admin-${view}`)
  );
  document.querySelector(".admin-topbar .page-title").textContent = {
    dashboard: "Dashboard Overview",
    services:  "Service Management",
    jobs:      "Job & Booking Control",
    partners:  "Service Partners",
    payments:  "Payment Management",
    areas:     "Service Areas",
    contacts:  "Contact Information",
    frontend:  "Front End Content",
    coupons:   "Coupon Management",
    extra:     "Extra Wishes Management",
    admins:    "Admin Management"
  }[view] || "Admin Panel";

  refreshAdminView();
}

function refreshAdminView() {
  const view = currentAdminView;
  if (view === "dashboard") {
    renderDashboard();
  } else if (view === "services") {
    renderServiceEditor();
  } else if (view === "jobs") {
    renderJobManager();
  } else if (view === "extra") {
    renderExtraWishesView();
  } else if (view === "partners") {
    renderPartnersView();
  } else if (view === "payments") {
    renderPaymentsView();
  } else if (view === "areas") {
    renderAreasView();
  } else if (view === "coupons") {
    renderCouponsView();
  } else if (view === "contacts") {
    renderContactsView();
  } else if (view === "frontend") {
    renderFrontendView();
  } else if (view === "admins") {
    renderAdminsView();
  }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// DASHBOARD
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function initDashboard() {
  document.getElementById("admin-refresh-btn")?.addEventListener("click", async () => {
    const btn = document.getElementById("admin-refresh-btn");
    Utils.showLoading(btn, "Refreshing...");
    await loadAllData();
    Utils.hideLoading(btn);
    Toast.show("Data refreshed!", "success");
  });
}

function renderDashboard() {
  const bookings = AppState.get("bookings") || [];
  const partners = AppState.get("partners") || [];
  const services = AppState.get("services") || [];

  const pendingTasks     = bookings.filter(b => b.JobStatus === "Pending").length;
  const activeBookings   = bookings.filter(b => ["Pending","Contacted","Partner_Assigned"].includes(b.JobStatus)).length;
  const completedJobs    = bookings.filter(b => b.JobStatus === "Completed").length;
  const verifiedPartners = partners.filter(p => p.DocumentStatus === "Verified").length;
  const totalRevenue     = bookings.filter(b => b.JobStatus === "Completed" && b.FinalPrice).reduce((s, b) => s + (parseFloat(b.FinalPrice) || 0), 0);
  const commission       = Math.round(totalRevenue * 0.20);

  const setMetric = (id, val, prefix = "") => {
    const el = document.getElementById(id);
    if (el) Utils.animateCount(el, val, prefix);
  };
  setMetric("metric-pending", pendingTasks);
  setMetric("metric-active", activeBookings);
  setMetric("metric-completed", completedJobs);
  setMetric("metric-partners", verifiedPartners);
  setMetric("metric-commission", commission, "₹");

  // Recent bookings table
  const tbody = document.getElementById("recent-bookings-tbody");
  if (!tbody) return;

  const recent = [...bookings].sort((a, b) => b.CreatedAt > a.CreatedAt ? 1 : -1).slice(0, 8);
  if (!recent.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted" style="padding:2rem">No bookings yet.</td></tr>`;
    return;
  }

  const svcMap = Object.fromEntries((AppState.get("services") || []).map(s => [s.ServiceID, s.ServiceName]));
  tbody.innerHTML = recent.map(b => `
    <tr>
      <td><strong style="color:var(--color-primary)">${b.BookingID}</strong></td>
      <td>${Utils.escapeHtml(b.CustomerName || "—")}</td>
      <td>${Utils.escapeHtml(svcMap[b.SelectedService] || b.SelectedService || "—")}</td>
      <td>${Utils.escapeHtml(b.Area || "—")}</td>
      <td>${Utils.statusBadge(b.JobStatus)}</td>
      <td><button class="btn btn-sm btn-secondary" onclick="switchAdminView('jobs')">Manage →</button></td>
    </tr>
  `).join("");
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// SERVICE EDITOR (CRUD)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function initServiceEditor() {
  // Add Service Modal
  document.getElementById("add-service-btn")?.addEventListener("click", () => {
    document.getElementById("svc-form").reset();
    populateCategoryDropdown();
    document.getElementById("svc-modal-title").textContent = "Add New Service";
    document.getElementById("svc-edit-id").value = "";
    Modal.open("service-modal");
  });

  document.getElementById("svc-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const editId  = document.getElementById("svc-edit-id").value;
    const data = {
      ServiceName:  document.getElementById("svc-name").value.trim(),
      Category:     document.getElementById("svc-category").value,
      BasePrice:    document.getElementById("svc-price").value,
      ImageURL:     document.getElementById("svc-image").value.trim(),
      Description:  document.getElementById("svc-desc").value.trim(),
    };

    if (!data.ServiceName || !data.Category || !data.BasePrice) {
      Toast.show("Please fill all required fields.", "error"); return;
    }

    const btn = document.getElementById("svc-save-btn");
    Utils.showLoading(btn, editId ? "Saving..." : "Adding...");

    try {
      if (editId) {
        await SheetsAPI.updateService({ ServiceID: editId, ...data });
        Toast.show("✅ Service updated successfully.", "success");
      } else {
        await SheetsAPI.addService(data);
        Toast.show("✅ New service added.", "success");
      }
      Modal.close("service-modal");
      const res = await SheetsAPI.getServices();
      AppState.set("services", res.data || []);
      renderServiceEditor();
    } catch (err) {
      Toast.show("Error: " + err.message, "error");
    } finally {
      Utils.hideLoading(btn);
    }
  });
}

function renderServiceEditor() {
  let services = AppState.get("services") || [];
  const tbody  = document.getElementById("services-admin-tbody");
  if (!tbody) return;

  if (!services.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding:2rem">No services found. Add one above.</td></tr>`;
    return;
  }
  
  const sortVal = document.getElementById("admin-services-sort")?.value || "newest";
  const searchVal = (document.getElementById("admin-services-search")?.value || "").toLowerCase();
  
  services = [...services];
  if (searchVal) {
    services = services.filter(s => 
      (s.ServiceID && s.ServiceID.toLowerCase().includes(searchVal)) ||
      (s.ServiceName && s.ServiceName.toLowerCase().includes(searchVal)) ||
      (s.Category && s.Category.toLowerCase().includes(searchVal))
    );
  }
  
  if (sortVal === "newest") {
    services.reverse();
  } else if (sortVal === "az") {
    services.sort((a, b) => (a.ServiceName || "").localeCompare(b.ServiceName || ""));
  } else if (sortVal === "za") {
    services.sort((a, b) => (b.ServiceName || "").localeCompare(a.ServiceName || ""));
  }

  tbody.innerHTML = services.map(s => `
    <tr id="svc-row-${s.ServiceID}">
      <td><code style="font-size:var(--text-xs);background:var(--slate-100);padding:2px 8px;border-radius:6px;color:var(--color-primary)">${s.ServiceID}</code></td>
      <td><strong>${Utils.escapeHtml(s.ServiceName)}</strong></td>
      <td>${Utils.escapeHtml(s.Category)}</td>
      <td>
        <span class="editable-cell" id="price-cell-${s.ServiceID}" data-service-id="${s.ServiceID}" data-value="${s.BasePrice}" title="Click to edit price"
          onclick="startInlineEdit('${s.ServiceID}', ${s.BasePrice})">
          ${Utils.formatPrice(s.BasePrice)}
        </span>
      </td>
      <td>${Utils.statusBadge(s.Status)}</td>
      <td class="text-sm text-muted" style="max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${Utils.escapeHtml(s.Description || "—")}</td>
      <td>
        <div class="action-btns">
          <button class="action-btn" title="Edit" onclick="editService('${s.ServiceID}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="action-btn danger" title="${s.Status === 'Active' ? 'Deactivate' : 'Activate'}" onclick="toggleServiceStatus('${s.ServiceID}', '${s.Status}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${s.Status === 'Active' ? '<path d="M18.36 6.64A9 9 0 0121 12a9 9 0 01-9 9 9 9 0 01-9-9 9 9 0 012.64-6.36M12 2v10"/>' : '<circle cx="12" cy="12" r="10"/><path d="M8 12h8"/>'}
            </svg>
          </button>
        </div>
      </td>
    </tr>
  `).join("");
}

// Inline Price Edit
window.startInlineEdit = function(serviceId, currentPrice) {
  const cell = document.getElementById(`price-cell-${serviceId}`);
  if (!cell || cell.querySelector("input")) return;

  const input = document.createElement("input");
  input.type  = "number";
  input.value = currentPrice;
  input.className = "inline-edit-input";
  input.min = "0";
  cell.innerHTML = "";
  cell.appendChild(input);
  input.focus();
  input.select();

  async function savePrice() {
    const newPrice = parseFloat(input.value);
    if (isNaN(newPrice) || newPrice < 0) { Toast.show("Invalid price.", "error"); return; }
    cell.innerHTML = `<svg class="spinner" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>`;
    try {
      await SheetsAPI.updateService({ ServiceID: serviceId, BasePrice: newPrice });
      const svcs = AppState.get("services") || [];
      const s = svcs.find(s => s.ServiceID === serviceId);
      if (s) s.BasePrice = newPrice;
      AppState.set("services", svcs);
      cell.innerHTML = `<span class="editable-cell" id="price-cell-${serviceId}" data-service-id="${serviceId}" data-value="${newPrice}" onclick="startInlineEdit('${serviceId}', ${newPrice})" title="Click to edit price">${Utils.formatPrice(newPrice)}</span>`;
      Toast.show("✅ Price updated to " + Utils.formatPrice(newPrice), "success");
    } catch (err) {
      cell.innerHTML = `<span class="editable-cell" id="price-cell-${serviceId}" onclick="startInlineEdit('${serviceId}', ${currentPrice})">${Utils.formatPrice(currentPrice)}</span>`;
      Toast.show("Failed to update price.", "error");
    }
  }

  input.addEventListener("blur", savePrice);
  input.addEventListener("keydown", e => {
    if (e.key === "Enter") { e.preventDefault(); savePrice(); }
    if (e.key === "Escape") {
      cell.innerHTML = `<span class="editable-cell" id="price-cell-${serviceId}" onclick="startInlineEdit('${serviceId}', ${currentPrice})">${Utils.formatPrice(currentPrice)}</span>`;
    }
  });
};

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// CATEGORY MANAGER
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

window.populateCategoryDropdown = function(selectedValue = "") {
  const catSelect = document.getElementById("svc-category");
  if (!catSelect) return;
  const categories = AppState.get("categories") || [];
  catSelect.innerHTML = `<option value="">Select category</option>` + 
    categories.map(c => `<option value="${Utils.escapeHtml(c.CategoryName)}" ${c.CategoryName === selectedValue ? "selected" : ""}>${Utils.escapeHtml(c.CategoryName)}</option>`).join("");
}

window.openCategoryManager = function() {
  renderCategoryList();
  Modal.open("category-manager-modal");
}

window.renderCategoryList = function() {
  const tbody = document.getElementById("category-list-tbody");
  if (!tbody) return;
  const categories = AppState.get("categories") || [];
  
  if (!categories.length) {
    tbody.innerHTML = `<tr><td class="text-center text-muted" style="padding:1rem">No categories found.</td></tr>`;
    return;
  }
  
  tbody.innerHTML = categories.map(c => `
    <tr>
      <td style="font-weight:500;padding:8px 12px">${Utils.escapeHtml(c.CategoryName)}</td>
      <td style="text-align:right;width:60px;padding:8px 12px">
        <button class="btn btn-sm btn-ghost" style="color:#ef4444;padding:4px" onclick="deleteCategory('${c.CategoryID}')" title="Delete">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </td>
    </tr>
  `).join("");
}

window.addNewCategory = async function() {
  const input = document.getElementById("new-category-name");
  const name = input.value.trim();
  if (!name) return;
  
  const btn = input.nextElementSibling;
  Utils.showLoading(btn, "Adding...");
  try {
    const res = await SheetsAPI.addCategory({ CategoryName: name });
    if (res.status === "ok") {
      Toast.show("Category added successfully", "success");
      input.value = "";
      // Refresh categories
      const newCats = await SheetsAPI.getCategories();
      AppState.set("categories", newCats.data || []);
      renderCategoryList();
    } else {
      Toast.show("Error adding category: " + res.message, "error");
    }
  } catch (err) {
    Toast.show("Error: " + err.message, "error");
  } finally {
    Utils.hideLoading(btn);
  }
}

window.deleteCategory = async function(id) {
  if (!confirm("Are you sure you want to delete this category?")) return;
  try {
    const res = await SheetsAPI.deleteCategory(id);
    if (res.status === "ok") {
      Toast.show("Category deleted", "success");
      const newCats = await SheetsAPI.getCategories();
      AppState.set("categories", newCats.data || []);
      renderCategoryList();
    } else {
      Toast.show("Error deleting category", "error");
    }
  } catch (err) {
    Toast.show("Error: " + err.message, "error");
  }
}

window.editService = function(serviceId) {
  const services = AppState.get("services") || [];
  const s = services.find(s => s.ServiceID === serviceId);
  if (!s) return;

  document.getElementById("svc-modal-title").textContent = "Edit Service";
  document.getElementById("svc-edit-id").value = s.ServiceID;
  document.getElementById("svc-name").value = s.ServiceName;
  populateCategoryDropdown(s.Category);
  document.getElementById("svc-price").value = s.BasePrice;
  document.getElementById("svc-image").value    = s.ImageURL || "";
  document.getElementById("svc-desc").value     = s.Description || "";
  Modal.open("service-modal");
};

window.toggleServiceStatus = async function(serviceId, currentStatus) {
  const newStatus = currentStatus === "Active" ? "Inactive" : "Active";
  const label = newStatus === "Inactive" ? "deactivate" : "activate";
  if (!confirm(`Are you sure you want to ${label} this service?`)) return;

  try {
    await SheetsAPI.updateService({ ServiceID: serviceId, Status: newStatus });
    const svcs = AppState.get("services") || [];
    const s = svcs.find(s => s.ServiceID === serviceId);
    if (s) s.Status = newStatus;
    AppState.set("services", svcs);
    renderServiceEditor();
    Toast.show(`✅ Service ${newStatus === "Active" ? "activated" : "deactivated"}.`, "success");
  } catch (err) {
    Toast.show("Error: " + err.message, "error");
  }
};

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// JOB MANAGER
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
let jobFilter = "All";
let wishFilter = "All";
window.jobPage = 1;
window.wishPage = 1;
window.jobPageSize = 50;
window.wishPageSize = 50;
window.partnerPage = 1;
window.partnerPageSize = 50;

function exportToCSV(dataArray, filename) {
  if (!dataArray || !dataArray.length) {
    Toast.show("No data to export", "error");
    return;
  }
  const headers = Object.keys(dataArray[0]);
  const csvRows = [];
  csvRows.push(headers.map(h => `"${h}"`).join(","));

  for (const row of dataArray) {
    const values = headers.map(h => {
      const val = row[h];
      const str = val === null || val === undefined ? "" : String(val);
      return `"${str.replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(","));
  }

  const csvData = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(csvData);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

window.exportJobs = function() {
  const bookings = AppState.get("bookings") || [];
  const filtered = jobFilter === "All" ? bookings : bookings.filter(b => b.JobStatus === jobFilter);
  // Re-apply sorting for export to match table
  const sortVal = document.getElementById("admin-jobs-sort")?.value || "newest";
  const sorted = [...filtered].sort((a, b) => {
    if (sortVal === "az") return (a.CustomerName || "").localeCompare(b.CustomerName || "");
    if (sortVal === "za") return (b.CustomerName || "").localeCompare(a.CustomerName || "");
    const order = ["Pending","Contacted","Partner_Assigned","Completed","Cancelled"];
    const diff = order.indexOf(a.JobStatus) - order.indexOf(b.JobStatus);
    if (diff !== 0) return diff;
    return b.BookingID.localeCompare(a.BookingID);
  });
  exportToCSV(sorted, `Jobs_Export_${new Date().toISOString().slice(0,10)}.csv`);
}

window.exportPartners = function() {
  let partners = AppState.get("partners") || [];
  const sortVal = document.getElementById("admin-partners-sort")?.value || "newest";
  partners = [...partners];
  if (sortVal === "newest") {
    partners.reverse();
  } else if (sortVal === "az") {
    partners.sort((a, b) => (a.Name || "").localeCompare(b.Name || ""));
  } else if (sortVal === "za") {
    partners.sort((a, b) => (b.Name || "").localeCompare(a.Name || ""));
  }
  exportToCSV(partners, `Partners_Export_${new Date().toISOString().slice(0,10)}.csv`);
}

function initJobManager() {
  document.querySelectorAll(".job-filter-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".job-filter-tab").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      jobFilter = btn.dataset.filter;
      window.jobPage = 1;
      renderJobManager();
    });
  });
}

window.toggleAutoBroadcast = async function(isChecked) {
  const cb = document.getElementById("admin-auto-broadcast");
  const orig = !isChecked;
  try {
    cb.disabled = true;
    await SheetsAPI.updateContent("auto_broadcast_jobs", String(isChecked));
    const content = AppState.get("content") || {};
    content["auto_broadcast_jobs"] = String(isChecked);
    AppState.set("content", content);
    Toast.show(isChecked ? "✅ Auto-Broadcast Enabled" : "âŒ Auto-Broadcast Disabled", "success");
  } catch (err) {
    cb.checked = orig;
    Toast.show("Error saving setting: " + err.message, "error");
  } finally {
    cb.disabled = false;
  }
}

function renderJobManager() {
  const content = AppState.get("content") || {};
  const autoCb = document.getElementById("admin-auto-broadcast");
  if (autoCb) {
    autoCb.checked = String(content["auto_broadcast_jobs"]).toLowerCase() === "true";
  }

  let bookings = AppState.get("bookings") || [];

  // Sub-Admin Area Filtering
  const adminType = AppState.get("adminType");
  const perms = AppState.get("adminPermissions");
  if (adminType === "SubAdmin" && perms) {
    const allowedStates = (perms.States || "").toLowerCase().split(",").map(s => s.trim()).filter(Boolean);
    const allowedDistricts = (perms.Districts || "").toLowerCase().split(",").map(s => s.trim()).filter(Boolean);
    const allowedCities = (perms.Cities || "").toLowerCase().split(",").map(s => s.trim()).filter(Boolean);
    
    bookings = bookings.filter(b => {
      const bArea = ((b.Area || "") + " " + (b.SelectedArea || "") + " " + (b.Address || "")).toLowerCase();
      if (allowedCities.length > 0) return allowedCities.some(c => bArea.includes(c));
      if (allowedDistricts.length > 0) return allowedDistricts.some(d => bArea.includes(d));
      if (allowedStates.length > 0) return allowedStates.some(s => bArea.includes(s));
      return false;
    });
  }

  const services = AppState.get("services") || [];
  const svcMap   = Object.fromEntries(services.map(s => [s.ServiceID, s.ServiceName]));
  const tbody    = document.getElementById("jobs-tbody");
  if (!tbody) return;

  let filtered = jobFilter === "All" ? bookings
    : bookings.filter(b => b.JobStatus === jobFilter);

  const searchVal = (document.getElementById("admin-jobs-search")?.value || "").toLowerCase();
  if (searchVal) {
    filtered = filtered.filter(b => 
      (b.BookingID && b.BookingID.toLowerCase().includes(searchVal)) ||
      (b.CustomerName && b.CustomerName.toLowerCase().includes(searchVal)) ||
      (b.Phone && b.Phone.toLowerCase().includes(searchVal)) ||
      (b.Area && b.Area.toLowerCase().includes(searchVal)) ||
      (b.AssignedPartner && b.AssignedPartner.toLowerCase().includes(searchVal))
    );
  }

  const sortVal = document.getElementById("admin-jobs-sort")?.value || "newest";
  
  const sorted = [...filtered].sort((a, b) => {
    if (sortVal === "az") {
      return (a.CustomerName || "").localeCompare(b.CustomerName || "");
    }
    if (sortVal === "za") {
      return (b.CustomerName || "").localeCompare(a.CustomerName || "");
    }
    // "newest" keeps default status sort + ID reverse tiebreaker
    const order = ["Pending","Contacted","Partner_Assigned","Completed","Cancelled"];
    const diff = order.indexOf(a.JobStatus) - order.indexOf(b.JobStatus);
    if (diff !== 0) return diff;
    return b.BookingID.localeCompare(a.BookingID);
  });
  
  // PAGINATION
  const totalItems = sorted.length;
  const totalPages = Math.ceil(totalItems / window.jobPageSize) || 1;
  if (window.jobPage > totalPages) window.jobPage = totalPages;
  const startIndex = (window.jobPage - 1) * window.jobPageSize;
  const endIndex = Math.min(startIndex + window.jobPageSize, totalItems);
  const paginated = sorted.slice(startIndex, endIndex);

  const pagWrap = document.getElementById("jobs-pagination");
  if (pagWrap) {
    if (totalItems > 0) {
      pagWrap.innerHTML = `
        <div style="font-size:0.875rem;color:var(--slate-500)">
          Showing <strong>${startIndex + 1} - ${endIndex}</strong> of <strong>${totalItems}</strong>
        </div>
        <div style="display:flex;align-items:center;gap:1rem">
          <select class="form-control" style="width:auto;padding:4px 8px;font-size:0.875rem" onchange="window.jobPageSize=parseInt(this.value); window.jobPage=1; renderJobManager()">
            <option value="50" ${window.jobPageSize===50?'selected':''}>50 / page</option>
            <option value="100" ${window.jobPageSize===100?'selected':''}>100 / page</option>
            <option value="500" ${window.jobPageSize===500?'selected':''}>500 / page</option>
            <option value="1000" ${window.jobPageSize===1000?'selected':''}>1000 / page</option>
          </select>
          <div style="display:flex;gap:4px">
            <button class="btn btn-secondary btn-sm" ${window.jobPage === 1 ? 'disabled' : ''} onclick="window.jobPage--; renderJobManager()">Prev</button>
            <button class="btn btn-secondary btn-sm" ${window.jobPage === totalPages ? 'disabled' : ''} onclick="window.jobPage++; renderJobManager()">Next</button>
          </div>
        </div>
      `;
    } else {
      pagWrap.innerHTML = "";
    }
  }

  if (!paginated.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted" style="padding:2rem">No jobs in this category.</td></tr>`;
    return;
  }

  tbody.innerHTML = paginated.map(b => {
    let latLngStr = "";
    if (b.Lat && b.Lng) {
      latLngStr = `${b.Lat},${b.Lng}`;
    } else if (b.Area) {
      const match = b.Area.match(/\(([\d.-]+),\s*([\d.-]+)\)/);
      if (match) latLngStr = `${match[1]},${match[2]}`;
    }
    const mapQuery = latLngStr ? latLngStr : encodeURIComponent(b.Area || "");
    
    return `
    <tr id="job-row-${b.BookingID}">
      <td><strong style="color:var(--color-primary);font-size:var(--text-xs)">${b.BookingID}</strong></td>
      <td>
        <div style="font-weight:600">${Utils.escapeHtml(b.CustomerName || "—")}</div>
        <div class="text-sm text-muted">${b.Phone || ""}</div>
      </td>
      <td>${Utils.escapeHtml(svcMap[b.SelectedService] || b.SelectedService || "—")}</td>
      <td>
        <div style="font-weight:600">${Utils.escapeHtml(b.Area || "—")}</div>
        <div class="text-sm text-muted">${Utils.formatDate(b.BookingDate)} · ${b.BookingTime || ""}</div>
        <div style="margin-top:4px">
          <a href="https://www.google.com/maps?q=${(() => { let s=''; if(b.Lat && b.Lng) s=`${b.Lat},${b.Lng}`; else if(b.Area){const m=b.Area.match(/\(([\d.-]+),\s*([\d.-]+)\)/); if(m) s=`${m[1]},${m[2]}`; } return s||encodeURIComponent(b.Area||''); })()}" target="_blank" style="font-size:0.75rem;color:var(--color-primary);text-decoration:none;display:inline-flex;align-items:center;gap:4px;background:var(--emerald-50);padding:2px 8px;border-radius:99px;border:1px solid var(--emerald-100)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg> 
            Open in Maps
          </a>
        </div>
      </td>
      <td>${Utils.statusBadge(b.JobStatus)}</td>
      <td>
        ${b.AssignedPartner
          ? `<span style="font-size:var(--text-xs);font-weight:600;color:var(--emerald-700);background:var(--emerald-50);padding:2px 10px;border-radius:99px">${b.AssignedPartner}</span>`
          : `<span class="text-muted text-sm">Unassigned</span>`}
      </td>
      <td>${b.FinalPrice ? `<strong>${Utils.formatPrice(b.FinalPrice)}</strong>` : `<span class="text-muted">—</span>`}</td>
      <td>
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:nowrap;white-space:nowrap">
          <button class="btn btn-sm btn-ghost" style="padding:4px;color:var(--slate-600)" title="View Details" onclick="viewJobDetails('${b.BookingID}')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
          ${b.JobStatus !== "Completed" && b.JobStatus !== "Cancelled"
            ? `<button class="btn btn-sm btn-ghost" style="padding:4px;color:var(--emerald-600)" title="Assign Partner" onclick="openAssignModal('${b.BookingID}', '${b.SelectedService}')">
                 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
               </button>`
            : ""}
          ${b.CompletionImage ? `<button class="btn btn-sm btn-ghost" style="padding:4px;color:var(--emerald-600)" title="View Photo" onclick="viewBookingPhoto('${b.BookingID}')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></button>` : ""}
          <button class="btn btn-sm btn-ghost" style="padding:4px;color:var(--color-primary)" title="Update Status" onclick="openStatusModal('${b.BookingID}', '${b.JobStatus}', '${b.FinalPrice || ""}')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn btn-sm btn-ghost" style="color:#ef4444;padding:4px" onclick="deleteBooking('${b.BookingID}')" aria-label="Delete booking">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `}).join("");
}

window.deleteBooking = async function(bookingId) {
  if (!confirm(`Are you sure you want to delete Booking ${bookingId}?`)) return;
  try {
    await SheetsAPI.deleteBooking(bookingId);
    const bks = AppState.get("bookings") || [];
    const updated = bks.filter(b => b.BookingID !== bookingId);
    AppState.set("bookings", updated);
    renderJobManager();
    Toast.show(`Booking ${bookingId} has been deleted.`, "success");
  } catch (err) {
    Toast.show("Error deleting booking: " + err.message, "error");
  }
};

window.viewJobDetails = function(bookingId) {
  const bookings = AppState.get("bookings") || [];
  const b = bookings.find(x => x.BookingID === bookingId);
  if (!b) return;

  const content = document.getElementById("job-details-content");
  if (!content) return;
  
  const fTime = b.BookingTime ? b.BookingTime : "—";
  const partner = b.AssignedPartner ? b.AssignedPartner : "Unassigned";
  
  content.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
      <div>
        <div class="text-xs text-muted" style="margin-bottom:2px">Booking ID</div>
        <div style="font-weight:600">${b.BookingID}</div>
      </div>
      <div>
        <div class="text-xs text-muted" style="margin-bottom:2px">Status</div>
        <div>${Utils.statusBadge(b.JobStatus)}</div>
      </div>
      <div>
        <div class="text-xs text-muted" style="margin-bottom:2px">Customer Name</div>
        <div style="font-weight:600">${Utils.escapeHtml(b.CustomerName || "—")}</div>
      </div>
      <div>
        <div class="text-xs text-muted" style="margin-bottom:2px">Phone Number</div>
        <div style="font-weight:600;color:var(--color-primary)"><a href="tel:${b.Phone}">${b.Phone || "—"}</a></div>
      </div>
      <div>
        <div class="text-xs text-muted" style="margin-bottom:2px">Service Needed</div>
        <div style="font-weight:600">${Utils.escapeHtml(b.SelectedService || "—")}</div>
      </div>
      <div>
        <div class="text-xs text-muted" style="margin-bottom:2px">Date & Time</div>
        <div style="font-weight:600">${Utils.formatDate(b.BookingDate)} · ${fTime}</div>
      </div>
      <div style="grid-column:1/-1">
        <div class="text-xs text-muted" style="margin-bottom:2px">Full Address / Location</div>
        <div style="font-weight:600;background:var(--slate-50);padding:8px;border-radius:6px;border:1px solid var(--color-border)">${Utils.escapeHtml(b.Address || b.Area || "—")}</div>
        <div style="margin-top:4px">
          <a href="https://www.google.com/maps?q=${(() => { let s=''; if(b.Lat && b.Lng) s=`${b.Lat},${b.Lng}`; else if(b.Area){const m=b.Area.match(/\(([\d.-]+),\s*([\d.-]+)\)/); if(m) s=`${m[1]},${m[2]}`; } return s||encodeURIComponent(b.Area||''); })()}" target="_blank" style="font-size:0.75rem;color:var(--color-primary);text-decoration:none;display:inline-flex;align-items:center;gap:4px;background:var(--emerald-50);padding:2px 8px;border-radius:99px;border:1px solid var(--emerald-100)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg> 
            Open in Maps
          </a>
        </div>
      </div>
      <div>
        <div class="text-xs text-muted" style="margin-bottom:2px">Assigned Partner</div>
        <div style="font-weight:600">${Utils.escapeHtml(partner)}</div>
      </div>
      <div>
        <div class="text-xs text-muted" style="margin-bottom:2px">Final Price</div>
        <div style="font-weight:600">${b.FinalPrice ? Utils.formatPrice(b.FinalPrice) : "—"}</div>
      </div>
      <div style="grid-column:1/-1">
        <div class="text-xs text-muted" style="margin-bottom:2px">Special Notes / Comments</div>
        <div style="background:var(--slate-50);padding:8px;border-radius:6px;font-size:0.9rem;border:1px solid var(--color-border);white-space:pre-wrap">${Utils.escapeHtml(b.SpecialNotes || "No additional comments.")}</div>
      </div>
    </div>
  `;

  Modal.open("job-details-modal");
}

// â”€â”€ Assign Partner Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
window.openAssignModal = function(bookingId, serviceId) {
  const allBookings = AppState.get("bookings") || [];
  const currentBooking = allBookings.find(b => b.BookingID === bookingId);
  const userCity = currentBooking ? (currentBooking.SelectedArea || currentBooking.Address || "").trim().toLowerCase() : "";

  const partners  = AppState.get("partners") || [];
  const eligible  = partners.filter(p => {
    const isVerified = p.DocumentStatus === "Verified";
    const hasSkill = (p.Skillset || "").split(",").map(s => s.trim()).includes(serviceId);
    const partnerAreas = (p.ServiceableAreas || "").split(",").map(a => a.trim().toLowerCase());
    const coversArea = userCity ? partnerAreas.includes(userCity) : true;
    return isVerified && hasSkill && coversArea;
  });
  const allVerified = partners.filter(p => p.DocumentStatus === "Verified");

  document.getElementById("assign-booking-id").textContent = bookingId;
  document.getElementById("assign-booking-id-input").value  = bookingId;
  const selectAllCb = document.getElementById("assign-select-all");
  if (selectAllCb) selectAllCb.checked = false;

  window._assignPool = eligible.length ? eligible : allVerified;
  
  // Calculate stats for pool
  window._assignPool.forEach(p => {
    const pJobs = allBookings.filter(b => b.AssignedPartner && b.AssignedPartner.includes(p.PartnerID) && b.JobStatus === "Completed");
    p._jobsDone = pJobs.length;
    p._earnings = pJobs.reduce((sum, b) => sum + (parseFloat(b.FinalPrice) || 0), 0);
  });

  document.getElementById("assign-search").value = "";
  document.getElementById("assign-sort").value = "rating";
  renderAssignList();

  if (eligible.length < allVerified.length) {
    document.getElementById("assign-skill-note").textContent =
      `⚠️ Showing all verified partners (${eligible.length} skill-matched, showing all ${allVerified.length}).`;
    document.getElementById("assign-skill-note").classList.remove("hidden");
  } else {
    document.getElementById("assign-skill-note").classList.add("hidden");
  }

  Modal.open("assign-modal");
};

window.renderAssignList = function() {
  const listEl = document.getElementById("assign-partner-list");
  let pool = [...(window._assignPool || [])];
  
  const searchVal = (document.getElementById("assign-search")?.value || "").toLowerCase();
  if (searchVal) {
    pool = pool.filter(p => 
      (p.Name && p.Name.toLowerCase().includes(searchVal)) ||
      (p.PartnerID && p.PartnerID.toLowerCase().includes(searchVal)) ||
      (p.ServiceableAreas && p.ServiceableAreas.toLowerCase().includes(searchVal))
    );
  }

  const sortVal = document.getElementById("assign-sort")?.value || "rating";
  pool.sort((a, b) => {
    if (sortVal === "rating") return (b.Rating || 0) - (a.Rating || 0);
    if (sortVal === "jobs") return (b._jobsDone || 0) - (a._jobsDone || 0);
    if (sortVal === "earning") return (b._earnings || 0) - (a._earnings || 0);
    if (sortVal === "az") return (a.Name || "").localeCompare(b.Name || "");
    if (sortVal === "za") return (b.Name || "").localeCompare(a.Name || "");
    return 0;
  });

  if (!pool.length) {
    listEl.innerHTML = `<p class="text-muted text-sm" style="padding:0.5rem">No partners found.</p>`;
  } else {
    listEl.innerHTML = pool.map(p => `
      <label style="display:flex;align-items:center;gap:8px;padding:8px;border-bottom:1px solid var(--slate-100);cursor:pointer;margin:0">
        <input type="checkbox" name="assign-partner-cb" value="${p.PartnerID}" style="width:16px;height:16px;cursor:pointer" />
        <span style="font-size:0.9rem;line-height:1.2">
          <strong>${p.Name}</strong> (${p.PartnerID}) 
          <br/><span style="color:var(--slate-500);font-size:0.8rem">
            ★ ${p.Rating} · 💼 ${p._jobsDone} jobs (₹${Utils.formatPrice(p._earnings)}) · 📍 ${p.ServiceableAreas || "Any"}
          </span>
        </span>
      </label>
    `).join("");
  }
  
  const selectAllCb = document.getElementById("assign-select-all");
  if (selectAllCb) selectAllCb.checked = false;
};

document.getElementById("assign-confirm-btn")?.addEventListener("click", async () => {
  const bookingId = document.getElementById("assign-booking-id-input").value;
  const selected = Array.from(document.querySelectorAll('input[name="assign-partner-cb"]:checked')).map(cb => cb.value);
  if (selected.length === 0) { Toast.show("Please select at least one partner.", "error"); return; }
  const partnerId = selected.join(",");

  const btn = document.getElementById("assign-confirm-btn");
  Utils.showLoading(btn, "Assigning...");
  try {
    await SheetsAPI.updateBooking({ BookingID: bookingId, AssignedPartner: partnerId, JobStatus: "Partner_Assigned" });
    const bks = AppState.get("bookings") || [];
    const b = bks.find(b => b.BookingID === bookingId);
    if (b) { b.AssignedPartner = partnerId; b.JobStatus = "Partner_Assigned"; }
    AppState.set("bookings", bks);
    Modal.close("assign-modal");
    renderJobManager();
    Toast.show(`✅ Broadcasted to ${selected.length} partner(s)!`, "success");
  } catch (err) {
    Toast.show("Error: " + err.message, "error");
  } finally {
    Utils.hideLoading(btn);
  }
});

// â”€â”€ Status Update Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const STATUS_OPTIONS = ["Pending","Contacted","Partner_Assigned","Completed","Cancelled"];

window.openStatusModal = function(bookingId, currentStatus, currentPrice) {
  document.getElementById("status-booking-id-input").value  = bookingId;
  document.getElementById("status-booking-label").textContent = bookingId;

  const sel = document.getElementById("status-select");
  sel.innerHTML = STATUS_OPTIONS.map(s =>
    `<option value="${s}"${s === currentStatus ? " selected" : ""}>${s.replace(/_/g, " ")}</option>`
  ).join("");

  const priceInput = document.getElementById("status-price-input");
  priceInput.value = currentPrice || "";

  Modal.open("status-modal");
};

document.getElementById("status-confirm-btn")?.addEventListener("click", async () => {
  const bookingId  = document.getElementById("status-booking-id-input").value;
  const newStatus  = document.getElementById("status-select").value;
  const finalPrice = document.getElementById("status-price-input").value;

  const btn = document.getElementById("status-confirm-btn");
  Utils.showLoading(btn, "Saving...");

  try {
    const updateData = { BookingID: bookingId, JobStatus: newStatus };
    if (finalPrice) updateData.FinalPrice = parseFloat(finalPrice);

    await SheetsAPI.updateBooking(updateData);

    const bks = AppState.get("bookings") || [];
    const b = bks.find(b => b.BookingID === bookingId);
    if (b) { b.JobStatus = newStatus; if (finalPrice) b.FinalPrice = parseFloat(finalPrice); }
    AppState.set("bookings", bks);

    Modal.close("status-modal");
    renderJobManager();
    if (newStatus === "Completed" && finalPrice) {
      const commission = Math.round(parseFloat(finalPrice) * 0.20);
      const payout     = parseFloat(finalPrice) - commission;
      Toast.show(`✅ Job completed! Commission: ${Utils.formatPrice(commission)} | Partner payout: ${Utils.formatPrice(payout)}`, "success", 5000);
    } else {
      Toast.show(`✅ Booking ${bookingId} updated.`, "success");
    }
  } catch (err) {
    Toast.show("Error: " + err.message, "error");
  } finally {
    Utils.hideLoading(btn);
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// PARTNERS VIEW
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
window.renderPartnerManager = function() { renderPartnersView(); }

function renderPartnersView() {
  let partners = AppState.get("partners") || [];
  const tbody  = document.getElementById("partners-admin-tbody");
  if (!tbody) return;

  if (!partners.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding:2rem">No partners yet.</td></tr>`;
    return;
  }
  
  const sortVal = document.getElementById("admin-partners-sort")?.value || "newest";
  const searchVal = (document.getElementById("admin-partners-search")?.value || "").toLowerCase();
  
  partners = [...partners];
  if (searchVal) {
    partners = partners.filter(p => 
      (p.PartnerID && p.PartnerID.toLowerCase().includes(searchVal)) ||
      (p.Name && p.Name.toLowerCase().includes(searchVal)) ||
      (p.Phone && p.Phone.toLowerCase().includes(searchVal)) ||
      (p.ServiceableAreas && p.ServiceableAreas.toLowerCase().includes(searchVal))
    );
  }

  if (sortVal === "newest") {
    partners.reverse();
  } else if (sortVal === "az") {
    partners.sort((a, b) => (a.Name || "").localeCompare(b.Name || ""));
  } else if (sortVal === "za") {
    partners.sort((a, b) => (b.Name || "").localeCompare(a.Name || ""));
  }

  // PAGINATION
  const totalItems = partners.length;
  const totalPages = Math.ceil(totalItems / window.partnerPageSize) || 1;
  if (window.partnerPage > totalPages) window.partnerPage = totalPages;
  const startIndex = (window.partnerPage - 1) * window.partnerPageSize;
  const endIndex = Math.min(startIndex + window.partnerPageSize, totalItems);
  const paginated = partners.slice(startIndex, endIndex);

  const pagWrap = document.getElementById("partners-pagination");
  if (pagWrap) {
    if (totalItems > 0) {
      pagWrap.innerHTML = `
        <div style="font-size:0.875rem;color:var(--slate-500)">
          Showing <strong>${startIndex + 1} - ${endIndex}</strong> of <strong>${totalItems}</strong>
        </div>
        <div style="display:flex;align-items:center;gap:1rem">
          <select class="form-control" style="width:auto;padding:4px 8px;font-size:0.875rem" onchange="window.partnerPageSize=parseInt(this.value); window.partnerPage=1; renderPartnerManager()">
            <option value="50" ${window.partnerPageSize===50?'selected':''}>50 / page</option>
            <option value="100" ${window.partnerPageSize===100?'selected':''}>100 / page</option>
            <option value="500" ${window.partnerPageSize===500?'selected':''}>500 / page</option>
            <option value="1000" ${window.partnerPageSize===1000?'selected':''}>1000 / page</option>
          </select>
          <div style="display:flex;gap:4px">
            <button class="btn btn-secondary btn-sm" ${window.partnerPage === 1 ? 'disabled' : ''} onclick="window.partnerPage--; renderPartnerManager()">Prev</button>
            <button class="btn btn-secondary btn-sm" ${window.partnerPage === totalPages ? 'disabled' : ''} onclick="window.partnerPage++; renderPartnerManager()">Next</button>
          </div>
        </div>
      `;
    } else {
      pagWrap.innerHTML = "";
    }
  }

  tbody.innerHTML = paginated.map(p => `
    <tr>
      <td><code style="font-size:var(--text-xs);background:var(--slate-100);padding:2px 8px;border-radius:6px;color:var(--color-primary)">${p.PartnerID}</code></td>
      <td>
        <div style="font-weight:600">${Utils.escapeHtml(p.Name || "—")}</div>
        <div class="text-sm text-muted">${p.Phone || ""}</div>
      </td>
      <td class="text-sm">${Utils.escapeHtml(p.ServiceableAreas || "—")}</td>
      <td>
        <div class="stars">${Utils.stars(p.Rating)}</div>
        <div class="text-sm text-muted">${p.Rating || "0"}/5</div>
      </td>
      <td>${Utils.statusBadge(p.DocumentStatus)}</td>
      <td class="text-sm text-muted">${Utils.formatDate(p.JoinedAt)}</td>
      <td>
        <div style="display:flex; gap:6px; flex-wrap:wrap; justify-content:center; align-items:center;">
          ${p.DocumentStatus === "Pending Review"
            ? `<button class="btn btn-sm btn-ghost" style="color:var(--emerald-600); padding:4px" title="Verify Partner" onclick="verifyPartner('${p.PartnerID}')">
                 <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
               </button>`
            : `<button class="btn btn-sm btn-ghost" style="color:var(--emerald-400); padding:4px; cursor:default" title="Verified" disabled>
                 <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
               </button>`}
          <button class="btn btn-sm btn-ghost" style="color:var(--blue-600); padding:4px" title="View & Edit Details" onclick="openPartnerEditModal('${p.PartnerID}')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
          <button class="btn btn-sm btn-ghost" style="color:#ef4444; padding:4px" title="Delete partner" onclick="deletePartner('${p.PartnerID}')" aria-label="Delete partner">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `).join("");
}

window.verifyPartner = async function(partnerId) {
  try {
    await SheetsAPI.updatePartner({ PartnerID: partnerId, DocumentStatus: "Verified" });
    const pts = AppState.get("partners") || [];
    const p = pts.find(p => p.PartnerID === partnerId);
    if (p) p.DocumentStatus = "Verified";
    AppState.set("partners", pts);
    renderPartnersView();
    Toast.show(`✅ Partner ${partnerId} verified!`, "success");
  } catch (err) {
    Toast.show("Error: " + err.message, "error");
  }
};

window.deletePartner = async function(partnerId) {
  if (!confirm(`Are you sure you want to delete Partner ${partnerId}?`)) return;
  try {
    await SheetsAPI.deletePartner(partnerId);
    const pts = AppState.get("partners") || [];
    const updated = pts.filter(p => p.PartnerID !== partnerId);
    AppState.set("partners", updated);
    renderPartnersView();
    Toast.show(`Partner ${partnerId} has been deleted.`, "success");
  } catch (err) {
    Toast.show("Error deleting partner: " + err.message, "error");
  }
};

window.openPartnerEditModal = function(partnerId) {
  const pts = AppState.get("partners") || [];
  const p = pts.find(p => p.PartnerID === partnerId);
  if (!p) return;

  document.getElementById("edit-partner-id").value = p.PartnerID;
  document.getElementById("edit-partner-label").textContent = p.PartnerID;
  document.getElementById("edit-partner-name").value = p.Name || "";
  document.getElementById("edit-partner-email").value = p.Email || "";
  document.getElementById("edit-partner-phone").value = p.Phone || "";
  document.getElementById("edit-partner-skills").value = p.Skillset || "";
  document.getElementById("edit-partner-areas").value = p.ServiceableAreas || "";
  document.getElementById("edit-partner-rating").value = p.Rating || "5";
  document.getElementById("edit-partner-status").value = p.DocumentStatus || "Pending Review";

  Modal.open("partner-edit-modal");
};

// Wire save event for edit partner
document.getElementById("edit-partner-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const partnerId = document.getElementById("edit-partner-id").value;
  const btn = document.getElementById("edit-partner-save-btn");

  const data = {
    PartnerID: partnerId,
    Name: document.getElementById("edit-partner-name").value.trim(),
    Email: document.getElementById("edit-partner-email").value.trim(),
    Phone: document.getElementById("edit-partner-phone").value.trim(),
    Skillset: document.getElementById("edit-partner-skills").value.trim(),
    ServiceableAreas: document.getElementById("edit-partner-areas").value.trim(),
    Rating: parseFloat(document.getElementById("edit-partner-rating").value) || 5,
    DocumentStatus: document.getElementById("edit-partner-status").value
  };

  if (!data.Name || !data.Phone || !data.Email) {
    Toast.show("Please fill all required fields.", "error");
    return;
  }

  Utils.showLoading(btn, "Saving...");
  try {
    await SheetsAPI.updatePartner(data);
    const pts = AppState.get("partners") || [];
    const pIdx = pts.findIndex(p => p.PartnerID === partnerId);
    if (pIdx !== -1) pts[pIdx] = { ...pts[pIdx], ...data };
    AppState.set("partners", pts);
    Modal.close("partner-edit-modal");
    renderPartnersView();
    Toast.show(`Partner ${partnerId} updated successfully.`, "success");
  } catch (err) {
    Toast.show("Error: " + err.message, "error");
  } finally {
    Utils.hideLoading(btn);
  }
});

// Event bindings for modals
document.addEventListener("DOMContentLoaded", () => {
  // Assign modal
  document.getElementById("assign-modal")?.querySelector(".modal-handle")?.addEventListener("click", () => Modal.close("assign-modal"));
  // Status modal
  document.getElementById("status-modal")?.querySelector(".modal-handle")?.addEventListener("click", () => Modal.close("status-modal"));
  // Service modal
  document.getElementById("service-modal")?.querySelector(".modal-handle")?.addEventListener("click", () => Modal.close("service-modal"));
  // Partner edit modal
  document.getElementById("partner-edit-modal")?.querySelector(".modal-handle")?.addEventListener("click", () => Modal.close("partner-edit-modal"));
  // Payment method modal
  document.getElementById("payment-method-modal")?.querySelector(".modal-handle")?.addEventListener("click", () => Modal.close("payment-method-modal"));
  // Pay now modal
  document.getElementById("pay-now-modal")?.querySelector(".modal-handle")?.addEventListener("click", () => Modal.close("pay-now-modal"));

  // Assign Select All Logic
  document.getElementById("assign-select-all")?.addEventListener("change", (e) => {
    const cbs = document.querySelectorAll('input[name="assign-partner-cb"]');
    cbs.forEach(cb => cb.checked = e.target.checked);
  });
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// PAYMENT MANAGEMENT MODULE
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
let _payVerifyFilter = "Pending_Payment";

function initPaymentModule() {
  // Add payment method button
  document.getElementById("add-payment-method-btn")?.addEventListener("click", () => {
    document.getElementById("payment-method-form").reset();
    document.getElementById("payment-method-modal-title").textContent = "Add Payment Method";
    document.getElementById("pm-edit-id").value = "";
    document.getElementById("pm-qr-preview").style.display = "none";
    Modal.open("payment-method-modal");
  });

  // QR live preview
  document.getElementById("pm-qr")?.addEventListener("input", (e) => {
    const url = e.target.value.trim();
    const preview = document.getElementById("pm-qr-preview");
    const img = document.getElementById("pm-qr-img");
    if (url.startsWith("http")) {
      img.src = url;
      preview.style.display = "block";
    } else {
      preview.style.display = "none";
    }
  });

  // Payment method form submission
  document.getElementById("payment-method-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const editId = document.getElementById("pm-edit-id").value;
    const data = {
      Name:      document.getElementById("pm-name").value.trim(),
      Details:   document.getElementById("pm-details").value.trim(),
      QRCodeURL: document.getElementById("pm-qr").value.trim(),
      Status:    document.getElementById("pm-status").value,
    };
    if (!data.Name || !data.Details) {
      Toast.show("Please fill in all required fields.", "error"); return;
    }
    const btn = document.getElementById("pm-save-btn");
    Utils.showLoading(btn, editId ? "Saving..." : "Adding...");
    try {
      if (editId) {
        await SheetsAPI.updatePaymentSetting({ PaymentMethodID: editId, ...data });
        const pays = AppState.get("paymentSettings") || [];
        const idx = pays.findIndex(p => p.PaymentMethodID === editId);
        if (idx !== -1) pays[idx] = { ...pays[idx], ...data };
        AppState.set("paymentSettings", pays);
        Toast.show("Payment method updated.", "success");
      } else {
        const res = await SheetsAPI.addPaymentSetting(data);
        const newMethod = { PaymentMethodID: res.paymentMethodId, ...data };
        AppState.set("paymentSettings", [...(AppState.get("paymentSettings") || []), newMethod]);
        Toast.show("Payment method added.", "success");
      }
      Modal.close("payment-method-modal");
      renderPaymentsView();
    } catch (err) {
      Toast.show("Error: " + err.message, "error");
    } finally {
      Utils.hideLoading(btn);
    }
  });

  // Payment verify filter tabs
  document.addEventListener("click", (e) => {
    const tab = e.target.closest(".pay-verify-tab");
    if (!tab) return;
    document.querySelectorAll(".pay-verify-tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    _payVerifyFilter = tab.dataset.pfilter;
    renderPaymentVerifyTable();
  });
}

function renderPaymentsView() {
  renderPaymentMethodsList();
  renderPaymentVerifyTable();
  // Update pending badge — include both bookings and wishes
  const bookings = AppState.get("bookings") || [];
  const wishes = AppState.get("wishes") || [];
  const pendingPayCount =
    bookings.filter(b => b.PaymentStatus === "Pending_Payment").length +
    wishes.filter(w => w.PaymentStatus === "Pending_Payment").length;
  const badge = document.getElementById("pending-payment-badge");
  if (badge) {
    badge.textContent = pendingPayCount;
    badge.style.display = pendingPayCount > 0 ? "inline-block" : "none";
  }
}

function renderPaymentMethodsList() {
  const container = document.getElementById("payment-methods-list");
  if (!container) return;
  const methods = (AppState.get("paymentSettings") || []).filter(m => m.PaymentMethodID);

  if (!methods.length) {
    container.innerHTML = `<p class="text-muted text-sm text-center" style="padding:1.5rem">No payment methods configured yet. Click 'Add Payment Method' above.</p>`;
    return;
  }

  container.innerHTML = methods.map(m => `
    <div style="display:flex;align-items:center;gap:1rem;padding:1rem;border:1px solid var(--slate-200);border-radius:12px;background:var(--slate-50)">
      ${m.QRCodeURL ? `<img src="${m.QRCodeURL}" alt="QR" style="width:60px;height:60px;object-fit:cover;border-radius:8px;border:1px solid var(--slate-200);flex-shrink:0" onerror="this.style.display='none'" />` : `<div style="width:60px;height:60px;border-radius:8px;background:var(--slate-200);display:flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--slate-400)"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg></div>`}
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;font-size:0.95rem;margin-bottom:4px">${Utils.escapeHtml(m.Name)}</div>
        <div style="font-family:monospace;font-size:0.85rem;color:var(--color-primary);font-weight:600;background:var(--emerald-50);display:inline-block;padding:2px 10px;border-radius:99px">${Utils.escapeHtml(m.Details)}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
        ${Utils.statusBadge(m.Status)}
        <div style="display:flex;gap:6px">
          <button class="btn btn-sm btn-secondary" onclick="editPaymentMethod('${m.PaymentMethodID}')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn btn-sm" style="background:#fee2e2;color:#b91c1c;border:none" onclick="deletePaymentMethod('${m.PaymentMethodID}','${Utils.escapeHtml(m.Name)}')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
          </button>
        </div>
      </div>
    </div>
  `).join("");
}

window.editPaymentMethod = function(id) {
  const methods = AppState.get("paymentSettings") || [];
  const m = methods.find(p => p.PaymentMethodID === id);
  if (!m) return;
  document.getElementById("pm-edit-id").value = id;
  document.getElementById("pm-name").value = m.Name || "";
  document.getElementById("pm-details").value = m.Details || "";
  document.getElementById("pm-qr").value = m.QRCodeURL || "";
  document.getElementById("pm-status").value = m.Status || "Active";
  document.getElementById("payment-method-modal-title").textContent = "Edit Payment Method";
  const preview = document.getElementById("pm-qr-preview");
  const img = document.getElementById("pm-qr-img");
  if (m.QRCodeURL) { img.src = m.QRCodeURL; preview.style.display = "block"; }
  else { preview.style.display = "none"; }
  Modal.open("payment-method-modal");
};

window.deletePaymentMethod = async function(id, name) {
  if (!confirm(`Delete payment method "${name}"? This cannot be undone.`)) return;
  try {
    await SheetsAPI.deletePaymentSetting(id);
    AppState.set("paymentSettings", (AppState.get("paymentSettings") || []).filter(m => m.PaymentMethodID !== id));
    renderPaymentMethodsList();
    Toast.show(`"${name}" removed.`, "success");
  } catch (err) {
    Toast.show("Delete failed: " + err.message, "error");
  }
};

function renderPaymentVerifyTable() {
  const tbody = document.getElementById("payment-verify-tbody");
  if (!tbody) return;
  let bookings = AppState.get("bookings") || [];
  let wishes   = AppState.get("wishes") || [];

  // Sub-Admin Area Filtering
  const adminType = AppState.get("adminType");
  const perms = AppState.get("adminPermissions");
  if (adminType === "SubAdmin" && perms) {
    const allowedStates = (perms.States || "").toLowerCase().split(",").map(s => s.trim()).filter(Boolean);
    const allowedDistricts = (perms.Districts || "").toLowerCase().split(",").map(s => s.trim()).filter(Boolean);
    const allowedCities = (perms.Cities || "").toLowerCase().split(",").map(s => s.trim()).filter(Boolean);
    
    const filterFn = item => {
      const area = (item.Area || "").toLowerCase();
      if (allowedCities.length > 0) return allowedCities.some(c => area.includes(c));
      if (allowedDistricts.length > 0) return allowedDistricts.some(d => area.includes(d));
      if (allowedStates.length > 0) return allowedStates.some(s => area.includes(s));
      return false;
    };
    bookings = bookings.filter(filterFn);
    wishes = wishes.filter(filterFn);
  }

  // Normalise wishes to look like booking rows
  const wishRows = wishes.map(w => ({
    ...w,
    BookingID: w.WishID,
    CustomerName: w.CustomerName,
    CustomerEmail: w.CustomerEmail,
    FinalPrice: w.FinalPrice,
    PaymentMethodUsed: w.PaymentMethodUsed,
    TransactionRef: w.TransactionRef,
    PaymentStatus: w.PaymentStatus,
    _isWish: true
  }));
  const allRows = [...bookings, ...wishRows];

  let filtered;
  if (_payVerifyFilter === "all") {
    filtered = allRows.filter(b => b.PaymentStatus && b.PaymentStatus !== "Unpaid" && b.PaymentStatus !== "");
  } else {
    filtered = allRows.filter(b => b.PaymentStatus === _payVerifyFilter);
  }

  // Apply Type Filter (Job / Wish)
  const typeFilterEl = document.getElementById("pay-verify-type-filter");
  if (typeFilterEl) {
    const typeVal = typeFilterEl.value;
    if (typeVal === "job") {
      filtered = filtered.filter(b => !b._isWish);
    } else if (typeVal === "wish") {
      filtered = filtered.filter(b => b._isWish);
    }
  }

  // Apply Search Filter
  const searchEl = document.getElementById("pay-verify-search");
  if (searchEl) {
    const query = searchEl.value.toLowerCase().trim();
    if (query) {
      filtered = filtered.filter(b => {
        return (b.BookingID || "").toLowerCase().includes(query) ||
               (b.CustomerName || "").toLowerCase().includes(query) ||
               (b.TransactionRef || "").toLowerCase().includes(query);
      });
    }
  }

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted" style="padding:2rem">No payments found matching the current filters.</td></tr>`;
    return;
  }

  const payBadge = (status) => {
    const map = {
      "Unpaid":          { cls: "badge-pending",  label: "Unpaid" },
      "Pending_Payment": { cls: "badge-contacted", label: "Awaiting Verify" },
      "Verified":        { cls: "badge-completed", label: "Verified ✓" },
      "Rejected":        { cls: "badge-cancelled", label: "Rejected 🚫" },
    };
    const b = map[status] || { cls: "", label: status };
    return `<span class="badge ${b.cls}">${b.label}</span>`;
  };

  tbody.innerHTML = filtered.map(b => `
    <tr>
      <td>
        <strong style="color:var(--color-primary)">${b.BookingID}</strong>
        ${b._isWish ? `<span class="badge" style="background:#fef3c7;color:#92400e;font-size:10px;margin-left:4px">Wish</span>` : ""}
      </td>
      <td><div style="font-weight:600">${Utils.escapeHtml(b.CustomerName || "—")}</div><div class="text-xs text-muted">${Utils.escapeHtml(b.CustomerEmail || "")}</div></td>
      <td style="font-weight:700">${b.FinalPrice ? Utils.formatPrice(b.FinalPrice) : "<span class='text-muted'>TBD</span>"}</td>
      <td>${Utils.escapeHtml(b.PaymentMethodUsed || "—")}</td>
      <td style="font-family:monospace;font-size:0.85rem;font-weight:600">${Utils.escapeHtml(b.TransactionRef || "—")}</td>
      <td>${payBadge(b.PaymentStatus)}</td>
      <td>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          ${b.PaymentStatus === "Pending_Payment" ? `
            <button class="btn btn-sm" style="background:#d1fae5;color:#065f46;border:none;font-weight:600" onclick="verifyPayment('${b.BookingID}','Verified')">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg> Approve
            </button>
            <button class="btn btn-sm" style="background:#fee2e2;color:#b91c1c;border:none;font-weight:600" onclick="verifyPayment('${b.BookingID}','Rejected')">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Reject
            </button>
          ` : ""}
          <button class="btn btn-sm btn-secondary" onclick="editPaymentRecord('${b.BookingID}')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn btn-sm" style="background:#fee2e2;color:#b91c1c;border:none" onclick="clearPaymentRecord('${b.BookingID}')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `).join("");
}

window.verifyPayment = async function(id, status) {
  try {
    if (id.startsWith("WSH-")) {
      await SheetsAPI.updateWish({ WishID: id, PaymentStatus: status });
      const wishes = AppState.get("wishes") || [];
      const w = wishes.find(x => x.WishID === id);
      if (w) w.PaymentStatus = status;
      AppState.set("wishes", wishes);
    } else {
      await SheetsAPI.updateBooking({ BookingID: id, PaymentStatus: status });
      const bks = AppState.get("bookings") || [];
      const b = bks.find(x => x.BookingID === id);
      if (b) b.PaymentStatus = status;
      AppState.set("bookings", bks);
    }
    renderPaymentsView();
    Toast.show(`Payment ${status === "Verified" ? "✅ approved" : "🚫 rejected"} for ${id}.`, status === "Verified" ? "success" : "error");
  } catch (err) {
    Toast.show("Error: " + err.message, "error");
  }
};

window.editPaymentRecord = function(id) {
  if (id.startsWith("WSH-")) {
    const wishes = AppState.get("wishes") || [];
    const w = wishes.find(x => x.WishID === id);
    if (!w) return;
    const newMethod = prompt("Payment method used:", w.PaymentMethodUsed || "");
    if (newMethod === null) return;
    const newRef = prompt("Transaction reference:", w.TransactionRef || "");
    if (newRef === null) return;
    const newStatus = prompt("Payment status (Unpaid / Pending_Payment / Verified / Rejected):", w.PaymentStatus || "Unpaid");
    if (newStatus === null) return;
    SheetsAPI.updateWish({ WishID: id, PaymentMethodUsed: newMethod, TransactionRef: newRef, PaymentStatus: newStatus })
      .then(() => {
        w.PaymentMethodUsed = newMethod;
        w.TransactionRef = newRef;
        w.PaymentStatus = newStatus;
        AppState.set("wishes", wishes);
        renderPaymentsView();
        Toast.show("Payment record updated.", "success");
      })
      .catch(err => Toast.show("Error: " + err.message, "error"));
  } else {
    const bks = AppState.get("bookings") || [];
    const b = bks.find(x => x.BookingID === id);
    if (!b) return;
    const newMethod = prompt("Payment method used:", b.PaymentMethodUsed || "");
    if (newMethod === null) return;
    const newRef = prompt("Transaction reference:", b.TransactionRef || "");
    if (newRef === null) return;
    const newStatus = prompt("Payment status (Unpaid / Pending_Payment / Verified / Rejected):", b.PaymentStatus || "Unpaid");
    if (newStatus === null) return;
    SheetsAPI.updateBooking({ BookingID: id, PaymentMethodUsed: newMethod, TransactionRef: newRef, PaymentStatus: newStatus })
      .then(() => {
        b.PaymentMethodUsed = newMethod;
        b.TransactionRef = newRef;
        b.PaymentStatus = newStatus;
        AppState.set("bookings", bks);
        renderPaymentsView();
        Toast.show("Payment record updated.", "success");
      })
      .catch(err => Toast.show("Error: " + err.message, "error"));
  }
};

window.clearPaymentRecord = async function(id) {
  if (!confirm(`Reset payment record for ${id}? This will set it back to Unpaid.`)) return;
  try {
    if (id.startsWith("WSH-")) {
      await SheetsAPI.updateWish({ WishID: id, PaymentStatus: "Unpaid", PaymentMethodUsed: "", TransactionRef: "" });
      const wishes = AppState.get("wishes") || [];
      const w = wishes.find(x => x.WishID === id);
      if (w) { w.PaymentStatus = "Unpaid"; w.PaymentMethodUsed = ""; w.TransactionRef = ""; }
      AppState.set("wishes", wishes);
    } else {
      await SheetsAPI.updateBooking({ BookingID: id, PaymentStatus: "Unpaid", PaymentMethodUsed: "", TransactionRef: "" });
      const bks = AppState.get("bookings") || [];
      const b = bks.find(x => x.BookingID === id);
      if (b) { b.PaymentStatus = "Unpaid"; b.PaymentMethodUsed = ""; b.TransactionRef = ""; }
      AppState.set("bookings", bks);
    }
    renderPaymentsView();
    Toast.show(`Payment record for ${id} reset.`, "success");
  } catch (err) {
    Toast.show("Error: " + err.message, "error");
  }
};

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// CONTACTS MANAGEMENT MODULE
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function initContactModule() {
  // Open modal for adding new contact
  document.getElementById("add-contact-btn")?.addEventListener("click", () => {
    document.getElementById("contact-form").reset();
    document.getElementById("contact-modal-title").textContent = "Add Contact";
    document.getElementById("contact-edit-id").value = "";
    Modal.open("contact-modal");
  });

  // Save contact form submit
  document.getElementById("contact-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const editId = document.getElementById("contact-edit-id").value;
    const data = {
      Label: document.getElementById("contact-label").value.trim(),
      Value: document.getElementById("contact-value").value.trim(),
      Icon:  document.getElementById("contact-icon").value,
      Type:  document.getElementById("contact-type").value,
    };
    if (!data.Label || !data.Value) {
      Toast.show("Please fill Label and Value.", "error"); return;
    }
    const btn = document.getElementById("contact-save-btn");
    Utils.showLoading(btn, editId ? "Saving..." : "Adding...");
    try {
      if (editId) {
        await SheetsAPI.updateContact({ ContactID: editId, ...data });
        const cts = AppState.get("contacts") || [];
        const idx = cts.findIndex(c => c.ContactID === editId);
        if (idx !== -1) cts[idx] = { ...cts[idx], ...data };
        AppState.set("contacts", cts);
        Toast.show("Contact updated!", "success");
      } else {
        const res = await SheetsAPI.addContact(data);
        const cts = AppState.get("contacts") || [];
        cts.push({ ContactID: res.contactId, ...data, Status: "Active" });
        AppState.set("contacts", cts);
        Toast.show("Contact added!", "success");
      }
      Modal.close("contact-modal");
      renderContactsView();
    } catch (err) {
      Toast.show("Error: " + err.message, "error");
    } finally {
      Utils.hideLoading(btn);
    }
  });

  // Wire close
  document.getElementById("contact-modal")?.querySelector(".modal-handle")?.addEventListener("click", () => Modal.close("contact-modal"));
}

function renderContactsView() {
  const contacts = AppState.get("contacts") || [];
  const tbody    = document.getElementById("contacts-admin-tbody");
  if (!tbody) return;

  if (!contacts.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted" style="padding:2rem">No contacts yet. Click "Add Contact" to get started.</td></tr>`;
    return;
  }

  tbody.innerHTML = contacts.map(c => `
    <tr>
      <td><strong>${Utils.escapeHtml(c.Label || "—")}</strong></td>
      <td style="max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${Utils.escapeHtml(c.Value || "—")}</td>
      <td><span style="font-size:0.8rem;background:var(--slate-100);padding:2px 10px;border-radius:99px">${c.Icon || "—"}</span></td>
      <td><span style="font-size:0.8rem;background:var(--slate-100);padding:2px 10px;border-radius:99px">${c.Type || "text"}</span></td>
      <td>${Utils.statusBadge(c.Status || "Active")}</td>
      <td>
        <div class="action-btns">
          <button class="action-btn" title="Edit" onclick="editContact('${c.ContactID}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="action-btn danger" title="Delete" onclick="deleteContact('${c.ContactID}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `).join("");
}

window.editContact = function(contactId) {
  const contacts = AppState.get("contacts") || [];
  const c = contacts.find(x => x.ContactID === contactId);
  if (!c) return;
  document.getElementById("contact-modal-title").textContent = "Edit Contact";
  document.getElementById("contact-edit-id").value  = c.ContactID;
  document.getElementById("contact-label").value    = c.Label || "";
  document.getElementById("contact-value").value    = c.Value || "";
  document.getElementById("contact-icon").value     = c.Icon  || "phone";
  document.getElementById("contact-type").value     = c.Type  || "text";
  Modal.open("contact-modal");
};

window.deleteContact = async function(contactId) {
  if (!confirm(`Delete contact ${contactId}?`)) return;
  try {
    await SheetsAPI.deleteContact(contactId);
    const cts = AppState.get("contacts") || [];
    AppState.set("contacts", cts.filter(c => c.ContactID !== contactId));
    renderContactsView();
    Toast.show("Contact deleted.", "success");
  } catch (err) {
    Toast.show("Error: " + err.message, "error");
  }
};

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// FRONT END CONTENT & FAQ
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function initFrontendModule() {
  // Save Content Text
  document.getElementById("save-content-btn")?.addEventListener("click", async () => {
    const btn = document.getElementById("save-content-btn");
    Utils.showLoading(btn, "Saving...");
    try {
      const inputs = document.querySelectorAll(".content-edit-input");
      const updates = Array.from(inputs).map(inp => ({
        Key:   inp.dataset.key,
        Value: inp.dataset.type === "checkbox" ? String(inp.checked) : inp.value.trim()
      }));
      // send to api
      await SheetsAPI.updateContent(updates);
      // update state immediately with the saved values
      AppState.set("content", updates);
      Toast.show("✅ Content updated successfully", "success");
      // Re-render to reflect saved state (especially checkboxes)
      renderFrontendView();
    } catch (err) {
      Toast.show("Error saving content: " + err.message, "error");
    } finally {
      Utils.hideLoading(btn);
    }
  });

  // FAQ Add Modal
  document.getElementById("add-faq-btn")?.addEventListener("click", () => {
    document.getElementById("faq-form").reset();
    document.getElementById("faq-modal-title").textContent = "Add FAQ";
    document.getElementById("faq-edit-id").value = "";
    Modal.open("faq-modal");
  });

  document.getElementById("faq-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const editId = document.getElementById("faq-edit-id").value;
    const data = {
      Question: document.getElementById("faq-question").value.trim(),
      Answer:   document.getElementById("faq-answer").value.trim(),
      Status:   document.getElementById("faq-status").value,
      Section:  document.getElementById("faq-form-section").value || "Main"
    };

    if (!data.Question || !data.Answer) {
      Toast.show("Please fill all required fields.", "error"); return;
    }

    const btn = document.getElementById("faq-save-btn");
    Utils.showLoading(btn, editId ? "Saving..." : "Adding...");
    try {
      if (editId) {
        await SheetsAPI.updateFAQ({ FAQID: editId, ...data });
        Toast.show("✅ FAQ updated.", "success");
      } else {
        await SheetsAPI.addFAQ(data);
        Toast.show("✅ New FAQ added.", "success");
      }
      Modal.close("faq-modal");
      const res = await SheetsAPI.getFAQs();
      AppState.set("faqs", res.data || []);
      renderFrontendView();
    } catch (err) {
      Toast.show("Error: " + err.message, "error");
    } finally {
      Utils.hideLoading(btn);
    }
  });
}

function renderFrontendView() {
  const content = AppState.get("content") || [];
  const container = document.getElementById("content-form-container");

  // Special branding keys handled in dedicated card
  const brandingKeys = ["logo_image", "logo_text", "app_link", "app_pwa_enabled", "imgbb_api_key"];

  if (container) {
    // Build live-preview branding card first
    const logoItem   = content.find(c => c.Key === "logo_image")     || { Key: "logo_image",     Value: "" };
    const textItem   = content.find(c => c.Key === "logo_text")      || { Key: "logo_text",      Value: "" };
    const appLinkItem = content.find(c => c.Key === "app_link")      || { Key: "app_link",       Value: "" };
    const appPwaItem  = content.find(c => c.Key === "app_pwa_enabled") || { Key: "app_pwa_enabled", Value: "" };
    const imgbbItem   = content.find(c => c.Key === "imgbb_api_key")   || { Key: "imgbb_api_key",   Value: "" };
    const otherItems = content.filter(c => !brandingKeys.includes(c.Key));

    const brandingCard = `
      <div style="grid-column:1/-1;background:var(--slate-50);border:1px solid var(--color-border);border-radius:var(--r-lg);padding:1.5rem;margin-bottom:0.5rem">
        <h4 style="margin:0 0 1rem;font-size:1rem;font-weight:700;color:var(--slate-800)">🎨 Logo & Site Name</h4>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;align-items:start">
          <!-- Logo Preview -->
          <div>
            <label class="form-label">Logo Image URL</label>
            <input type="text" id="admin-logo-url-input" class="form-control content-edit-input" data-key="logo_image"
              value="${Utils.escapeHtml(logoItem.Value || "")}"
              placeholder="https://yoursite.com/log✅png"
              oninput="document.getElementById('admin-logo-preview').src=this.value; document.getElementById('admin-logo-preview').style.display=this.value?'block':'none'; document.getElementById('admin-logo-placeholder').style.display=this.value?'none':'flex';" />
            <p class="text-sm text-muted" style="margin-top:4px">Paste a public image URL. Leave blank to use the default icon.</p>
            <div style="margin-top:12px;width:80px;height:80px;border-radius:12px;border:2px dashed var(--color-border);overflow:hidden;display:flex;align-items:center;justify-content:center;background:#fff">
              <img id="admin-logo-preview" src="${Utils.escapeHtml(logoItem.Value || "")}" alt="Logo Preview"
                style="max-width:100%;max-height:100%;object-fit:contain;display:${logoItem.Value ? 'block' : 'none'}" />
              <div id="admin-logo-placeholder" style="display:${logoItem.Value ? 'none' : 'flex'};flex-direction:column;align-items:center;gap:4px;color:var(--slate-400)">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                <span style="font-size:0.65rem">No logo</span>
              </div>
            </div>
          </div>
          <!-- Site Name -->
          <div>
            <label class="form-label">Site Name (Navbar Text)</label>
            <input type="text" class="form-control content-edit-input" data-key="logo_text"
              value="${Utils.escapeHtml(textItem.Value || "")}"
              placeholder="e.g. Jini24 Services"
              oninput="document.getElementById('admin-sitename-preview').textContent=this.value||'Your Site Name'" />
            <p class="text-sm text-muted" style="margin-top:4px">This text appears next to the logo in the top navbar.</p>
            <div style="margin-top:12px;padding:8px 14px;background:#fff;border:1px solid var(--color-border);border-radius:8px;display:inline-flex;align-items:center;gap:8px">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              <span id="admin-sitename-preview" style="font-weight:700;font-size:0.95rem;color:var(--slate-800)">${Utils.escapeHtml(textItem.Value || "Your Site Name")}</span>
            </div>
          </div>
        </div>
      </div>
    `;

    // App Download card
    const appCard = `
      <div style="grid-column:1/-1;background:var(--slate-50);border:1px solid var(--color-border);border-radius:var(--r-lg);padding:1.5rem;margin-bottom:0.5rem">
        <h4 style="margin:0 0 1rem;font-size:1rem;font-weight:700;color:var(--slate-800)">📲 App Download</h4>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;align-items:start">
          <div>
            <label class="form-label">External App Link</label>
            <input type="text" class="form-control content-edit-input" data-key="app_link"
              value="${Utils.escapeHtml(appLinkItem.Value || "")}"
              placeholder="https://play.google.com/store/apps/... or App Store link" />
            <p class="text-sm text-muted" style="margin-top:4px">
              When set, "Download App" appears in the profile menu and opens this URL.<br>
              Leave blank to use PWA install instead (if enabled below).
            </p>
          </div>
          <div>
            <label class="form-label">PWA Install Option</label>
            <label style="display:flex;align-items:center;gap:10px;cursor:pointer;margin-top:6px;padding:12px 14px;background:#fff;border:1px solid var(--color-border);border-radius:8px">
              <input type="checkbox" class="content-edit-input" data-key="app_pwa_enabled" data-type="checkbox"
                ${String(appPwaItem.Value).toLowerCase() === "true" ? "checked" : ""}
                style="width:18px;height:18px;accent-color:var(--color-primary);cursor:pointer" />
              <span style="font-size:0.9rem;font-weight:600;color:var(--slate-700)">Enable PWA install prompt</span>
            </label>
            <p class="text-sm text-muted" style="margin-top:6px">
              If no external app link is set, ticking this shows "Download App" which triggers the browser's built-in PWA install prompt.
            </p>
          </div>
        </div>
      </div>
    `;

    const otherHtml = otherItems.length ? otherItems.map(item => `
      <div class="form-group">
        <label class="form-label">${item.Key.replace(/_/g, ' ').toUpperCase()}</label>
        <input type="text" class="form-control content-edit-input" data-key="${item.Key}" value="${Utils.escapeHtml(item.Value || "")}" />
      </div>
    `).join("") : "";

    const intCard = `
      <div style="grid-column:1/-1;background:var(--slate-50);border:1px solid var(--color-border);border-radius:var(--r-lg);padding:1.5rem;margin-bottom:0.5rem">
        <h4 style="margin:0 0 1rem;font-size:1rem;font-weight:700;color:var(--slate-800)">🔌 Integrations</h4>
        <div>
          <label class="form-label">ImgBB API Key (Image Hosting)</label>
          <input type="text" class="form-control content-edit-input" data-key="imgbb_api_key"
            value="${Utils.escapeHtml(imgbbItem.Value || "")}"
            placeholder="e.g. 1a2b3c..." />
          <p class="text-sm text-muted" style="margin-top:4px">
            Get a free API key from <a href="https://api.imgbb.com/" target="_blank" style="color:var(--color-primary)">api.imgbb.com</a>. Used to permanently host large images like job completion photos without breaking Google Sheets.
          </p>
        </div>
      </div>
    `;

    container.innerHTML = brandingCard + appCard + intCard + otherHtml;
  }

  // FAQs
  const faqs = AppState.get("faqs") || [];
  const tbody = document.getElementById("faqs-admin-tbody");
  if (tbody) {
    if (!faqs.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted" style="padding:2rem">No FAQs found.</td></tr>`;
    } else {
      tbody.innerHTML = faqs.map(f => {
        const sec = f.Section || "Main";
        const secLabel = sec === "Extra"
          ? `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 10px;border-radius:12px;font-size:0.8rem;font-weight:600;background:#fef3c7;color:#92400e;">⭐ Extra</span>`
          : `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 10px;border-radius:12px;font-size:0.8rem;font-weight:600;background:#dbeafe;color:#1e40af;">🏠 Home</span>`;
        return `
        <tr>
          <td><strong>${Utils.escapeHtml(f.Question)}</strong></td>
          <td><div style="max-width:300px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${Utils.escapeHtml(f.Answer)}">${Utils.escapeHtml(f.Answer)}</div></td>
          <td>${secLabel}</td>
          <td>${Utils.statusBadge(f.Status)}</td>
          <td>
            <div class="action-btns">
              <button class="btn btn-sm btn-secondary" onclick="editFAQ('${f.FAQID}')">Edit</button>
              <button class="btn btn-sm btn-ghost text-red" onclick="deleteFAQ('${f.FAQID}')">Delete</button>
            </div>
          </td>
        </tr>`;
      }).join("");
    }
  }
}

window.editFAQ = function(faqId) {
  const faqs = AppState.get("faqs") || [];
  const f = faqs.find(x => x.FAQID === faqId);
  if (!f) return;
  document.getElementById("faq-modal-title").textContent = "Edit FAQ";
  document.getElementById("faq-edit-id").value = f.FAQID;
  document.getElementById("faq-question").value = f.Question || "";
  document.getElementById("faq-answer").value   = f.Answer || "";
  document.getElementById("faq-status").value   = f.Status || "Active";
  document.getElementById("faq-form-section").value  = f.Section || "Main";
  Modal.open("faq-modal");
};

window.deleteFAQ = async function(faqId) {
  if (!confirm(`Delete FAQ?`)) return;
  try {
    await SheetsAPI.deleteFAQ(faqId);
    const faqs = AppState.get("faqs") || [];
    AppState.set("faqs", faqs.filter(f => f.FAQID !== faqId));
    renderFrontendView();
    Toast.show("FAQ deleted.", "success");
  } catch (err) {
    Toast.show("Error: " + err.message, "error");
  }
};

// ----------------------------------------------------------
// SERVICE AREAS
// ----------------------------------------------------------

function initAreasView() {
  document.getElementById("add-area-btn")?.addEventListener("click", () => {
    document.getElementById("area-form").reset();
    document.getElementById("area-id").value = "";
    document.getElementById("area-modal-title").textContent = "Add Area";
    Modal.open("area-manager-modal");
  });
}


function renderAreasView() {
  const tbody = document.getElementById("areas-admin-tbody");
  if (!tbody) return;
  const areas = AppState.get("areas") || [];
  
  if (areas.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted" style="padding:2rem">No areas found.</td></tr>`;
    return;
  }
  
  tbody.innerHTML = areas.map(a => `
    <tr>
      <td><span class="badge" style="background:var(--slate-100);color:var(--slate-700)">${a.AreaID}</span></td>
      <td>${Utils.escapeHtml(a.State || "")}</td>
      <td>${Utils.escapeHtml(a.District || "")}</td>
      <td style="max-width:300px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${Utils.escapeHtml(a.Cities || "")}">${Utils.escapeHtml(a.Cities || "")}</td>
      <td>
        <div style="display:flex;gap:8px">
          <button class="btn btn-secondary btn-sm" onclick='editArea(${JSON.stringify(a)})'>Edit</button>
          <button class="btn btn-secondary btn-sm" style="color:var(--red-600)" onclick="deleteArea('${a.AreaID}')">Delete</button>
        </div>
      </td>
    </tr>
  `).join("");
}

window.editArea = function(area) {
  document.getElementById("area-id").value = area.AreaID;
  document.getElementById("area-state").value = area.State || "";
  document.getElementById("area-district").value = area.District || "";
  document.getElementById("area-cities").value = area.Cities || "";
  Modal.open("area-manager-modal");
};

window.saveArea = async function() {
  const btn = document.getElementById("save-area-btn");
  const origText = btn.textContent;
  btn.textContent = "Saving...";
  btn.disabled = true;
  
  const id = document.getElementById("area-id").value;
  const state = document.getElementById("area-state").value.trim();
  const district = document.getElementById("area-district").value.trim();
  const cities = document.getElementById("area-cities").value.trim();
  
  try {
    if (!state || !district || !cities) {
      throw new Error("Please fill out all required fields.");
    }

    let res;
    if (id) {
      res = await SheetsAPI.updateArea({ AreaID: id, State: state, District: district, Cities: cities });
    } else {
      res = await SheetsAPI.addArea({ State: state, District: district, Cities: cities });
    }
    
    if (res && res.status === "ok") {
      Toast.show(id ? "Area updated!" : "Area added!", "success");
      Modal.close("area-manager-modal");
      const refreshRes = await SheetsAPI.getAreas();
      AppState.set("areas", refreshRes.data || []);
      if (currentAdminView === "areas") renderAreasView();
    } else {
      throw new Error(res?.message || "Failed to save area");
    }
  } catch (err) {
    Toast.show(err.message, "error");
  } finally {
    btn.textContent = origText;
    btn.disabled = false;
  }
};

window.deleteArea = async function(id) {
  if (!confirm("Are you sure you want to delete this area?")) return;
  try {
    const res = await SheetsAPI.deleteArea(id);
    if (res && res.status === "ok") {
      Toast.show("Area deleted", "success");
      const refreshRes = await SheetsAPI.getAreas();
      AppState.set("areas", refreshRes.data || []);
      if (currentAdminView === "areas") renderAreasView();
    } else {
      throw new Error(res?.message || "Failed to delete area");
    }
  } catch (err) {
    Toast.show(err.message, "error");
  }
};

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// COUPON MANAGEMENT
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function initCouponsView() {
  document.getElementById("add-coupon-btn")?.addEventListener("click", () => {
    document.getElementById("coupon-form").reset();
    document.getElementById("coupon-code").readOnly = false;
    document.getElementById("coupon-is-edit").value = "";
    document.getElementById("coupon-modal-title").textContent = "Add Coupon";
    Modal.open("coupon-manager-modal");
  });
}

function renderCouponsView() {
  const tbody = document.getElementById("coupons-admin-tbody");
  if (!tbody) return;
  const coupons = AppState.get("coupons") || [];
  
  if (coupons.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted" style="padding:2rem">No coupons found.</td></tr>`;
    return;
  }
  
  tbody.innerHTML = coupons.map(c => `
    <tr>
      <td><span style="font-weight:700; background:var(--slate-100); padding:4px 8px; border-radius:4px">${c.CouponCode}</span></td>
      <td>${c.DiscountType === "Flat" ? "₹" : ""}${c.DiscountValue}${c.DiscountType === "Percentage" ? "%" : ""}</td>
      <td>${c.UsesCount} / ${c.MaxUses == 0 ? "&infin;" : c.MaxUses}</td>
      <td>${c.ExpiryDate ? new Date(c.ExpiryDate).toLocaleDateString() : "Never"}</td>
      <td>
        <span style="font-size:12px; font-weight:600; padding:4px 8px; border-radius:99px; background:${c.Status === 'Active' ? '#dcfce7' : '#fee2e2'}; color:${c.Status === 'Active' ? '#166534' : '#991b1b'}">
          ${c.Status}
        </span>
      </td>
      <td>
        <div style="display:flex;gap:4px;justify-content:center">
          <button class="btn btn-secondary btn-sm" onclick="window.editCoupon('${c.CouponCode}')" title="Edit">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn btn-secondary btn-sm" onclick="window.deleteCoupon('${c.CouponCode}')" style="color:var(--color-danger)" title="Delete">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `).join("");
}

window.editCoupon = function(code) {
  const coupons = AppState.get("coupons") || [];
  const c = coupons.find(x => x.CouponCode === code);
  if (!c) return;
  document.getElementById("coupon-is-edit").value = "true";
  document.getElementById("coupon-code").value = c.CouponCode;
  document.getElementById("coupon-code").readOnly = true;
  document.getElementById("coupon-type").value = c.DiscountType;
  document.getElementById("coupon-value").value = c.DiscountValue;
  document.getElementById("coupon-maxuses").value = c.MaxUses;
  document.getElementById("coupon-expiry").value = c.ExpiryDate || "";
  document.getElementById("coupon-status").value = c.Status;
  document.getElementById("coupon-modal-title").textContent = "Edit Coupon";
  Modal.open("coupon-manager-modal");
};

window.saveCoupon = async function() {
  const isEdit = !!document.getElementById("coupon-is-edit").value;
  const data = {
    CouponCode: document.getElementById("coupon-code").value.trim().toUpperCase(),
    DiscountType: document.getElementById("coupon-type").value,
    DiscountValue: document.getElementById("coupon-value").value,
    MaxUses: document.getElementById("coupon-maxuses").value,
    ExpiryDate: document.getElementById("coupon-expiry").value,
    Status: document.getElementById("coupon-status").value
  };
  if (!data.CouponCode) return Toast.show("Coupon Code is required", "error");
  
  const btn = document.getElementById("save-coupon-btn");
  Utils.showLoading(btn, "Saving...");
  try {
    const res = isEdit ? await SheetsAPI.updateCoupon(data) : await SheetsAPI.addCoupon(data);
    if (res && res.status === "ok") {
      Toast.show(isEdit ? "Coupon updated" : "Coupon added", "success");
      Modal.close("coupon-manager-modal");
      const refreshRes = await SheetsAPI.getCoupons();
      AppState.set("coupons", refreshRes.data || []);
      if (currentAdminView === "coupons") renderCouponsView();
    } else {
      throw new Error(res?.message || "Failed to save coupon");
    }
  } catch (err) {
    Toast.show(err.message, "error");
  } finally {
    Utils.hideLoading(btn);
  }
};

window.deleteCoupon = async function(code) {
  if (!confirm("Are you sure you want to delete this coupon?")) return;
  try {
    const res = await SheetsAPI.deleteCoupon(code);
    if (res && res.status === "ok") {
      Toast.show("Coupon deleted", "success");
      const refreshRes = await SheetsAPI.getCoupons();
      AppState.set("coupons", refreshRes.data || []);
      if (currentAdminView === "coupons") renderCouponsView();
    } else {
      throw new Error(res?.message || "Failed to delete coupon");
    }
  } catch (err) {
    Toast.show(err.message, "error");
  }
};

function initExtraWishesModule() {
  document.querySelectorAll(".wish-filter-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".wish-filter-tab").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      window.wishFilter = btn.dataset.filter;
      renderExtraWishesView();
    });
  });
}

function renderExtraWishesView() {
  const tbody = document.getElementById("extra-admin-tbody");
  if (!tbody) return;

  let wishes = AppState.get("wishes") || [];

  // Sub-Admin Area Filtering
  const adminType = AppState.get("adminType");
  const perms = AppState.get("adminPermissions");
  if (adminType === "SubAdmin" && perms) {
    const allowedStates = (perms.States || "").toLowerCase().split(",").map(s => s.trim()).filter(Boolean);
    const allowedDistricts = (perms.Districts || "").toLowerCase().split(",").map(s => s.trim()).filter(Boolean);
    const allowedCities = (perms.Cities || "").toLowerCase().split(",").map(s => s.trim()).filter(Boolean);
    
    wishes = wishes.filter(w => {
      const wArea = (w.Area || "").toLowerCase();
      if (allowedCities.length > 0) return allowedCities.some(c => wArea.includes(c));
      if (allowedDistricts.length > 0) return allowedDistricts.some(d => wArea.includes(d));
      if (allowedStates.length > 0) return allowedStates.some(s => wArea.includes(s));
      return false;
    });
  }

  if (window.wishFilter && window.wishFilter !== "All") {
    wishes = wishes.filter(w => w.JobStatus === window.wishFilter);
  }

  // SEARCH
  const searchVal = (document.getElementById("admin-wishes-search")?.value || "").toLowerCase();
  if (searchVal) {
    wishes = wishes.filter(w => {
      return (w.BookingID || w.WishID || "").toLowerCase().includes(searchVal) ||
             (w.CustomerName || "").toLowerCase().includes(searchVal) ||
             (w.Phone || "").toLowerCase().includes(searchVal) ||
             (w.CustomerEmail || "").toLowerCase().includes(searchVal) ||
             (w.WishItem || "").toLowerCase().includes(searchVal);
    });
  }

  // SORT
  const sortVal = document.getElementById("admin-wishes-sort")?.value || "newest";
  if (sortVal === "newest") {
    wishes.sort((a,b) => new Date(b.DateAdded || 0) - new Date(a.DateAdded || 0));
  } else if (sortVal === "az") {
    wishes.sort((a,b) => (a.CustomerName || "").localeCompare(b.CustomerName || ""));
  } else if (sortVal === "za") {
    wishes.sort((a,b) => (b.CustomerName || "").localeCompare(a.CustomerName || ""));
  }

  // PAGINATION
  const totalItems = wishes.length;
  const totalPages = Math.ceil(totalItems / window.wishPageSize) || 1;
  if (window.wishPage > totalPages) window.wishPage = totalPages;
  const startIndex = (window.wishPage - 1) * window.wishPageSize;
  const endIndex = Math.min(startIndex + window.wishPageSize, totalItems);
  const paginated = wishes.slice(startIndex, endIndex);

  const pagWrap = document.getElementById("wishes-pagination");
  if (pagWrap) {
    if (totalItems > 0) {
      pagWrap.innerHTML = `
        <div style="font-size:0.875rem;color:var(--slate-500)">
          Showing <strong>${startIndex + 1} - ${endIndex}</strong> of <strong>${totalItems}</strong>
        </div>
        <div style="display:flex;align-items:center;gap:1rem">
          <select class="form-control" style="width:auto;padding:4px 8px;font-size:0.875rem" onchange="window.wishPageSize=parseInt(this.value); window.wishPage=1; renderExtraWishesView()">
            <option value="50" ${window.wishPageSize===50?'selected':''}>50 / page</option>
            <option value="100" ${window.wishPageSize===100?'selected':''}>100 / page</option>
            <option value="500" ${window.wishPageSize===500?'selected':''}>500 / page</option>
            <option value="1000" ${window.wishPageSize===1000?'selected':''}>1000 / page</option>
          </select>
          <div style="display:flex;gap:4px">
            <button class="btn btn-secondary btn-sm" ${window.wishPage === 1 ? 'disabled' : ''} onclick="window.wishPage--; renderExtraWishesView()">Prev</button>
            <button class="btn btn-secondary btn-sm" ${window.wishPage === totalPages ? 'disabled' : ''} onclick="window.wishPage++; renderExtraWishesView()">Next</button>
          </div>
        </div>
      `;
    } else {
      pagWrap.innerHTML = "";
    }
  }

  if (!paginated.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted" style="padding:2rem">No wishes found.</td></tr>`;
    return;
  }

  tbody.innerHTML = paginated.map(w => {
    const rawWishItem = w.WishItem || "-";
    const wishItem = rawWishItem.replace(/\[WISH_PHOTO:.+?\]/, "").trim();
    const expectation = w.SpecialNotes ? w.SpecialNotes.replace("Delivery Expectation: ", "") : "—";
    const deliveryDate = w.DeliveryDate || "";
    const finalPrice   = w.FinalPrice ? Utils.formatPrice(w.FinalPrice) : "";
    
    return `
      <tr>
        <td><code style="font-size:var(--text-xs);background:var(--slate-100);padding:2px 8px;border-radius:6px;color:var(--color-primary)">${w.WishID}</code></td>
        <td>
          <div style="font-weight:600;color:var(--slate-800);">${Utils.escapeHtml(w.CustomerName || "—")}</div>
          <div class="text-xs text-muted">${Utils.escapeHtml(w.CustomerEmail || "—")}</div>
        </td>
        <td>
          <div style="max-width:180px;word-break:break-word;font-weight:500;">
            ${Utils.escapeHtml(wishItem)}
            ${rawWishItem && rawWishItem.includes("[WISH_PHOTO:") ? `
              <div style="margin-top:8px;">
                <img src="${rawWishItem.match(/\[WISH_PHOTO:(.+?)\]/)[1]}" style="max-width:100%; border-radius:8px; border:1px solid #e2e8f0; cursor:pointer;" onclick="window.open(this.src, '_blank')" alt="Wish Photo">
              </div>
            ` : ""}
          </div>
        </td>
        <td><a href="https://wa.me/${String(w.Phone || '').replace(/[^0-9]/g, '')}" target="_blank" class="text-emerald-600" style="display:inline-flex;align-items:center;gap:4px;font-weight:600;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.96 9.96 0 001.37 5.054L2 22l5.106-1.341a9.9 9.9 0 004.902 1.3c5.508 0 9.99-4.478 9.993-9.985A9.997 9.997 0 0012.012 2zm5.82 14.161c-.266.753-1.545 1.488-2.148 1.583-.538.085-1.24.162-3.7-.852-3.14-1.296-5.138-4.512-5.295-4.721-.157-.21-1.258-1.684-1.258-3.211 0-1.527.799-2.277 1.084-2.583.284-.306.621-.383.827-.383.208 0 .414.001.595.01.187.009.439-.071.688.531.253.612.868 2.12.943 2.273.076.153.127.332.025.534-.1.203-.152.332-.303.508-.152.176-.319.392-.455.526-.153.152-.313.318-.135.626.177.306.789 1.306 1.692 2.115.903.809 1.662 1.06 1.966 1.213.304.153.481.127.66-.076.177-.203.759-.884.962-1.188.203-.306.406-.255.684-.153.279.102 1.769.835 2.073.987.304.153.507.23.583.357.076.128.076.74-.19 1.493z"/></svg>
          ${Utils.escapeHtml(String(w.Phone || ''))}
        </a></td>
        <td>
          <div style="max-width:200px;font-size:0.85rem;white-space:pre-wrap;color:var(--slate-600);margin-bottom:4px">${Utils.escapeHtml(w.Area || "N/A")}</div>
          <a href="https://www.google.com/maps?q=${(() => { let s=''; if(w.Lat && w.Lng) s=`${w.Lat},${w.Lng}`; else if(w.Area){const m=w.Area.match(/\(([\d.-]+),\s*([\d.-]+)\)/); if(m) s=`${m[1]},${m[2]}`; } return s||encodeURIComponent(w.Area||''); })()}" target="_blank" style="font-size:0.75rem;color:var(--color-primary);text-decoration:none;display:inline-flex;align-items:center;gap:4px;background:var(--emerald-50);padding:2px 8px;border-radius:99px;border:1px solid var(--emerald-100)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg> 
            Open in Maps
          </a>
        </td>
        <td>
          <div style="font-size:0.85rem;color:var(--slate-600);margin-bottom:4px"><em>Exp: ${Utils.escapeHtml(expectation)}</em></div>
          ${deliveryDate ? `<div style="font-weight:600;color:var(--slate-800);font-size:0.85rem">${Utils.escapeHtml(deliveryDate)}</div>` : `<span class="text-muted text-xs">Not set</span>`}
          ${finalPrice ? `<div style="color:var(--color-primary);font-weight:700;font-size:0.85rem;margin-top:2px">₹${Utils.escapeHtml(String(finalPrice))}</div>` : ""}
        </td>
        <td>${Utils.statusBadge(w.JobStatus)}</td>
        <td>
          <div style="display:flex;gap:5px;align-items:center;flex-wrap:nowrap;">
            <!-- Set Price & Date -->
            <button title="Set Price &amp; Delivery Date" class="wish-icon-btn" style="background:#fef3c7;color:#92400e;border:1px solid #fde68a;" onclick="setWishPriceDate('${w.WishID}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
            </button>
            <!-- Confirm -->
            <button title="Confirm" class="wish-icon-btn" style="background:#d1fae5;color:#065f46;border:1px solid #6ee7b7;" onclick="updateWishStatus('${w.WishID}', 'Confirmed', this)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>
            </button>
            <!-- Schedule -->
            <button title="Schedule" class="wish-icon-btn" style="background:#ede9fe;color:#5b21b6;border:1px solid #c4b5fd;" onclick="updateWishStatus('${w.WishID}', 'Scheduled', this)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            </button>
            <!-- Mark Done -->
            <button title="Mark Done" class="wish-icon-btn" style="background:#ccfbf1;color:#0f766e;border:1px solid #5eead4;" onclick="updateWishStatus('${w.WishID}', 'Done', this)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </button>
            <!-- Reject -->
            <button title="Reject" class="wish-icon-btn" style="background:#fee2e2;color:#b91c1c;border:1px solid #fca5a5;" onclick="updateWishStatus('${w.WishID}', 'Rejected', this)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            <!-- Delete -->
            <button title="Delete Wish" class="wish-icon-btn" style="background:#1e293b;color:#f8fafc;border:1px solid #334155;" onclick="deleteWish('${w.WishID}', this)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

window.setWishPriceDate = function(wishId) {
  const wishes = AppState.get("wishes") || [];
  const w = wishes.find(x => x.WishID === wishId);
  if (!w) return;

  // Show a modal-style overlay
  let existingModal = document.getElementById("wish-price-date-modal");
  if (!existingModal) {
    existingModal = document.createElement("div");
    existingModal.id = "wish-price-date-modal";
    existingModal.style.cssText = "position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;padding:1rem";
    existingModal.innerHTML = `
      <div style="background:#fff;border-radius:20px;padding:2rem;max-width:420px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
        <h3 style="font-size:1.1rem;font-weight:700;margin-bottom:1.25rem;color:var(--slate-900)">Set Delivery Date &amp; Payment Amount</h3>
        <input type="hidden" id="wpdm-wish-id" />
        <div class="form-group" style="margin-bottom:1rem">
          <label class="form-label" style="font-size:0.82rem">Payment Amount (₹)</label>
          <input type="number" id="wpdm-price" class="form-control" placeholder="e.g. 1500" min="0" step="1" style="font-size:1rem;font-weight:600" />
        </div>
        <div class="form-group" style="margin-bottom:1.5rem">
          <label class="form-label" style="font-size:0.82rem">Delivery / Fulfilment Date</label>
          <input type="date" id="wpdm-date" class="form-control" style="font-size:1rem" />
        </div>
        <div style="display:flex;gap:10px;justify-content:flex-end">
          <button class="btn btn-secondary" onclick="document.getElementById('wish-price-date-modal').remove()">Cancel</button>
          <button class="btn btn-primary" id="wpdm-save-btn" onclick="saveWishPriceDate()">Save &amp; Notify</button>
        </div>
      </div>
    `;
    document.body.appendChild(existingModal);
  }

  document.getElementById("wpdm-wish-id").value = wishId;
  document.getElementById("wpdm-price").value = w.FinalPrice || "";
  document.getElementById("wpdm-date").value  = w.DeliveryDate || "";
  existingModal.style.display = "flex";
};

window.saveWishPriceDate = async function() {
  const wishId       = document.getElementById("wpdm-wish-id").value;
  const finalPrice   = document.getElementById("wpdm-price").value.trim();
  const deliveryDate = document.getElementById("wpdm-date").value.trim();
  const btn          = document.getElementById("wpdm-save-btn");

  Utils.showLoading(btn, "Saving...");
  try {
    await SheetsAPI.updateWish({ WishID: wishId, FinalPrice: finalPrice, DeliveryDate: deliveryDate });
    const wishes = AppState.get("wishes") || [];
    const w = wishes.find(x => x.WishID === wishId);
    if (w) { w.FinalPrice = finalPrice; w.DeliveryDate = deliveryDate; }
    AppState.set("wishes", wishes);
    document.getElementById("wish-price-date-modal")?.remove();
    renderExtraWishesView();
    Toast.show(`✅ Price & delivery date set for ${wishId}.`, "success");
  } catch (err) {
    Toast.show("Error: " + err.message, "error");
  } finally {
    Utils.hideLoading(btn);
  }
};

window.updateWishStatus = async function(wishId, newStatus, btn) {
  if (!confirm(`Are you sure you want to set wish ${wishId} to "${newStatus}"?`)) return;
  Utils.showLoading(btn, "");
  try {
    await SheetsAPI.updateWish({ WishID: wishId, JobStatus: newStatus });
    Toast.show(`Wish status updated to ${newStatus}!`, "success");
    
    // Update local AppState
    const wishes = AppState.get("wishes") || [];
    const w = wishes.find(b => b.WishID === wishId);
    if (w) w.JobStatus = newStatus;
    AppState.set("wishes", wishes);
    
    renderExtraWishesView();
  } catch (err) {
    Toast.show("Error updating wish status: " + err.message, "error");
  } finally {
    if (btn) Utils.hideLoading(btn);
  }
};

window.deleteWish = async function(wishId, btn) {
  if (!confirm(`Delete wish ${wishId}? This cannot be undone.`)) return;
  Utils.showLoading(btn, "");
  try {
    await SheetsAPI.deleteWish(wishId);
    const wishes = (AppState.get("wishes") || []).filter(w => w.WishID !== wishId);
    AppState.set("wishes", wishes);
    renderExtraWishesView();
    Toast.show(`Wish ${wishId} deleted.`, "success");
  } catch (err) {
    Toast.show("Error deleting wish: " + err.message, "error");
  } finally {
    if (btn) Utils.hideLoading(btn);
  }
};

// Inject wish icon button styles
(function() {
  if (document.getElementById("wish-icon-btn-style")) return;
  const s = document.createElement("style");
  s.id = "wish-icon-btn-style";
  s.textContent = `
    .wish-icon-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      border-radius: 8px;
      cursor: pointer;
      transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
      flex-shrink: 0;
    }
    .wish-icon-btn:hover {
      transform: scale(1.12);
      box-shadow: 0 3px 10px rgba(0,0,0,0.18);
    }
    .wish-icon-btn:active {
      transform: scale(0.95);
      opacity: 0.8;
    }
  `;
  document.head.appendChild(s);
})();


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ADMINS PERMISSIONS & MODULE
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function applyAdminPermissions() {
  const adminType = AppState.get("adminType");
  const perms = AppState.get("adminPermissions");

  if (adminType === "SubAdmin" && perms) {
    const access = (perms.MenuAccess || "").toLowerCase().split(",").map(s => s.trim()).filter(Boolean);
    const links = document.querySelectorAll(".sidebar-link");
    
    links.forEach(link => {
      const view = link.dataset.view;
      if (view === "logout") return; // Always keep logout

      if (!access.includes(view)) {
        link.style.display = "none";
      } else {
        link.style.display = "flex";
      }
    });

    // If current view is not allowed, switch to the first allowed one or dashboard
    if (!access.includes(currentAdminView) && currentAdminView !== "logout") {
      if (access.length > 0) {
        switchAdminView(access[0]);
      } else {
        // Fallback if they have NO access (which is weird but handle it)
        const content = document.querySelector(".admin-content");
        if (content) content.innerHTML = `<div style="padding:2rem;text-align:center;color:var(--slate-500);">You do not have access to any modules.</div>`;
      }
    }
  } else {
    // Master admin: make sure all are visible
    document.querySelectorAll(".sidebar-link").forEach(link => link.style.display = "flex");
  }
}

function initAdminsModule() {
  document.addEventListener("dataLoaded", () => {
    if (currentAdminView === "admins") renderAdminsView();
  });
}

window.openAdminModal = function(adminId = null) {
  if (typeof adminId === "object") adminId = null; // Ignore DOM event object
  document.getElementById("admin-edit-id").value = adminId || "";
  document.getElementById("admin-modal-title").textContent = adminId ? "Edit Sub-Admin" : "Add Sub-Admin";
  document.getElementById("admin-email").value = "";
  
  // Get all unique areas
  const areas = AppState.get("areas") || [];
  const uniqueStates = [...new Set(areas.map(a => (a.State || "").trim()).filter(Boolean))];
  const uniqueDistricts = [...new Set(areas.map(a => (a.District || "").trim()).filter(Boolean))];
  
  // Cities is a comma-separated string in the areas sheet
  const uniqueCities = [...new Set(areas.flatMap(a => (a.Cities || "").split(",").map(c => c.trim()).filter(Boolean)))];

  const statesContainer = document.getElementById("admin-states-container");
  const districtsContainer = document.getElementById("admin-districts-container");
  const citiesContainer = document.getElementById("admin-cities-container");

  let selectedStates = [];
  let selectedDistricts = [];
  let selectedCities = [];
  let selectedMenus = [];

  if (adminId) {
    const admins = AppState.get("admins") || [];
    const adm = admins.find(a => a.AdminID === adminId);
    if (adm) {
      document.getElementById("admin-email").value = adm.Email || "";
      selectedStates = (adm.States || "").split(",").map(s => s.trim()).filter(Boolean);
      selectedDistricts = (adm.Districts || "").split(",").map(s => s.trim()).filter(Boolean);
      selectedCities = (adm.Cities || "").split(",").map(s => s.trim()).filter(Boolean);
      selectedMenus = (adm.MenuAccess || "").split(",").map(s => s.trim()).filter(Boolean);
    }
  }

  // Populate States
  statesContainer.innerHTML = uniqueStates.length ? uniqueStates.map(s => `
    <label class="modern-cb-label">
      <input type="checkbox" class="admin-state-cb" value="${Utils.escapeHtml(s)}" onchange="handleAdminStateChange()" ${selectedStates.includes(s) ? 'checked' : ''} /> ${Utils.escapeHtml(s)}
    </label>
  `).join("") : '<span class="text-muted text-sm">No states defined in Service Areas.</span>';

  // Trigger cascading logic to populate districts and cities
  handleAdminStateChange(selectedDistricts, selectedCities);

  // Check menus
  document.querySelectorAll(".admin-menu-cb").forEach(cb => {
    cb.checked = selectedMenus.includes(cb.value);
  });

  Modal.open("admin-modal");
};

window.handleAdminStateChange = function(presetDistricts = [], presetCities = []) {
  const selectedStates = Array.from(document.querySelectorAll(".admin-state-cb:checked")).map(cb => cb.value);
  const areas = AppState.get("areas") || [];
  
  const filteredAreas = selectedStates.length 
    ? areas.filter(a => selectedStates.includes((a.State || "").trim()))
    : areas;

  const uniqueDistricts = [...new Set(filteredAreas.map(a => (a.District || "").trim()).filter(Boolean))];
  
  let currentCheckedDistricts = Array.from(document.querySelectorAll(".admin-district-cb:checked")).map(cb => cb.value);
  if (presetDistricts && presetDistricts.length) currentCheckedDistricts = [...new Set([...currentCheckedDistricts, ...presetDistricts])];
  
  const districtsContainer = document.getElementById("admin-districts-container");
  districtsContainer.innerHTML = uniqueDistricts.length ? uniqueDistricts.map(d => `
    <label class="modern-cb-label">
      <input type="checkbox" class="admin-district-cb" value="${Utils.escapeHtml(d)}" onchange="handleAdminDistrictChange()" ${currentCheckedDistricts.includes(d) ? 'checked' : ''} /> ${Utils.escapeHtml(d)}
    </label>
  `).join("") : '<span class="text-muted text-sm">No districts found for selected states.</span>';
  
  handleAdminDistrictChange(presetCities);
};

window.handleAdminDistrictChange = function(presetCities = []) {
  const selectedStates = Array.from(document.querySelectorAll(".admin-state-cb:checked")).map(cb => cb.value);
  const selectedDistricts = Array.from(document.querySelectorAll(".admin-district-cb:checked")).map(cb => cb.value);
  const areas = AppState.get("areas") || [];
  
  let filteredAreas = areas;
  if (selectedStates.length) {
    filteredAreas = filteredAreas.filter(a => selectedStates.includes((a.State || "").trim()));
  }
  if (selectedDistricts.length) {
    filteredAreas = filteredAreas.filter(a => selectedDistricts.includes((a.District || "").trim()));
  }

  const uniqueCities = [...new Set(filteredAreas.flatMap(a => (a.Cities || "").split(",").map(c => c.trim()).filter(Boolean)))];
  
  let currentCheckedCities = Array.from(document.querySelectorAll(".admin-city-cb:checked")).map(cb => cb.value);
  if (presetCities && presetCities.length) currentCheckedCities = [...new Set([...currentCheckedCities, ...presetCities])];
  
  const citiesContainer = document.getElementById("admin-cities-container");
  citiesContainer.innerHTML = uniqueCities.length ? uniqueCities.map(c => `
    <label class="modern-cb-label">
      <input type="checkbox" class="admin-city-cb" value="${Utils.escapeHtml(c)}" ${currentCheckedCities.includes(c) ? 'checked' : ''} /> ${Utils.escapeHtml(c)}
    </label>
  `).join("") : '<span class="text-muted text-sm">No cities found for selected areas.</span>';
};

window.saveAdmin = async function() {
  const id = document.getElementById("admin-edit-id").value;
  const email = document.getElementById("admin-email").value.trim();
  
  const states = Array.from(document.querySelectorAll(".admin-state-cb:checked")).map(cb => cb.value).join(",");
  const districts = Array.from(document.querySelectorAll(".admin-district-cb:checked")).map(cb => cb.value).join(",");
  const cities = Array.from(document.querySelectorAll(".admin-city-cb:checked")).map(cb => cb.value).join(",");
  
  const checkedBoxes = Array.from(document.querySelectorAll(".admin-menu-cb:checked")).map(cb => cb.value);
  const menuAccess = checkedBoxes.join(",");

  if (!email) {
    Toast.show("Email is required", "error");
    return;
  }

  const btn = document.getElementById("save-admin-btn");
  Utils.showLoading(btn);

  try {
    const data = {
      Email: email,
      States: states,
      Districts: districts,
      Cities: cities,
      MenuAccess: menuAccess
    };

    let res;
    if (id) {
      data.AdminID = id;
      res = await SheetsAPI.updateAdmin(data);
    } else {
      res = await SheetsAPI.addAdmin(data);
    }

    if (res.status === "ok") {
      Toast.show(id ? "Admin updated!" : "Admin added!", "success");
      Modal.close("admin-modal");
      // Refresh admins
      const refreshRes = await SheetsAPI.getAdmins();
      AppState.set("admins", refreshRes.data || []);
      if (currentAdminView === "admins") renderAdminsView();
    } else {
      throw new Error(res.message || "Failed to save admin");
    }
  } catch (err) {
    Toast.show("Error: " + err.message, "error");
  } finally {
    Utils.hideLoading(btn);
  }
};

window.deleteAdmin = async function(id) {
  if (!confirm("Are you sure you want to delete this sub-admin?")) return;
  try {
    const res = await SheetsAPI.deleteAdmin(id);
    if (res.status === "ok") {
      Toast.show("Admin deleted", "success");
      const refreshRes = await SheetsAPI.getAdmins();
      AppState.set("admins", refreshRes.data || []);
      if (currentAdminView === "admins") renderAdminsView();
    } else {
      throw new Error(res.message || "Failed to delete");
    }
  } catch (err) {
    Toast.show("Error: " + err.message, "error");
  }
};

function renderAdminsView() {
  const tbody = document.getElementById("admins-tbody");
  if (!tbody) return;

  const admins = AppState.get("admins") || [];
  
  if (!admins.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding:2rem">No sub-admins found.</td></tr>`;
    return;
  }

  tbody.innerHTML = admins.map(a => `
    <tr>
      <td><strong>${a.Email || ""}</strong></td>
      <td>${a.States || "—"}</td>
      <td>${a.Districts || "—"}</td>
      <td>${a.Cities || "—"}</td>
      <td style="max-width:200px; white-space:normal; font-size:12px; color:var(--slate-500);">${(a.MenuAccess || "").replace(/,/g, ", ")}</td>
      <td>${Utils.formatDate(a.AddedAt) || "—"}</td>
      <td>
        <div style="display:flex;gap:4px;">
          <button class="btn btn-outline btn-sm" onclick="openAdminModal('${a.AdminID}')" title="Edit Admin">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>
          <button class="btn btn-outline btn-sm" style="color:#ef4444;border-color:#fca5a5" onclick="deleteAdmin('${a.AdminID}')" title="Delete Admin">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </td>
    </tr>
  `).join("");
}


window.exportWishes = function() {
  let wishes = AppState.get("wishes") || [];
  
  // Apply status filter
  if (window.wishFilter && window.wishFilter !== "All") {
    wishes = wishes.filter(w => w.JobStatus === window.wishFilter);
  }

  // Apply search filter
  const searchVal = (document.getElementById("admin-wishes-search")?.value || "").toLowerCase();
  if (searchVal) {
    wishes = wishes.filter(w => {
      return (w.BookingID || w.WishID || "").toLowerCase().includes(searchVal) ||
             (w.CustomerName || "").toLowerCase().includes(searchVal) ||
             (w.Phone || "").toLowerCase().includes(searchVal) ||
             (w.CustomerEmail || "").toLowerCase().includes(searchVal) ||
             (w.WishItem || "").toLowerCase().includes(searchVal);
    });
  }

  // Apply sorting
  const sortVal = document.getElementById("admin-wishes-sort")?.value || "newest";
  if (sortVal === "newest") {
    wishes.sort((a,b) => new Date(b.DateAdded || 0) - new Date(a.DateAdded || 0));
  } else if (sortVal === "az") {
    wishes.sort((a,b) => (a.CustomerName || "").localeCompare(b.CustomerName || ""));
  } else if (sortVal === "za") {
    wishes.sort((a,b) => (b.CustomerName || "").localeCompare(a.CustomerName || ""));
  }

  exportToCSV(wishes, "Extra_Wishes_Export_" + new Date().toISOString().slice(0,10) + ".csv");
};
