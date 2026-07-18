/**
 * ============================================================
 * Module A — Customer Portal
 * ============================================================
 * Handles: Hero, Service Grid, Multi-Step Booking Modal,
 *          Category Filters, and Booking Tracker.
 * ============================================================
 */

let customerInited = false;

window.refreshCustomerTracker = async function(btn) {
  if (btn) Utils.showLoading(btn, "");
  try {
    await loadAllData();
    Toast.show("Tracker refreshed!", "success");
  } catch (err) {
    Toast.show("Error refreshing tracker", "error");
  } finally {
    if (btn) Utils.hideLoading(btn);
  }
};

function initCustomerModule() {
  if (customerInited) { renderServiceGrid(); return; }
  customerInited = true;
  renderServiceGrid();
  initBookingModal();
  initTrackerPage();
  initExtraPage();
}

// ── Service Grid Rendering ───────────────────────────────────
function renderServiceGrid(filterCategory = "All", searchQuery = "") {
  const container = document.getElementById("services-grid");
  if (!container) return;

  const services = AppState.get("services") || [];
  const active   = services.filter(s => s.Status === "Active");
  let filtered = filterCategory === "All" ? active : active.filter(s => s.Category === filterCategory);
  
  if (searchQuery.trim() !== "") {
    const q = searchQuery.toLowerCase().trim();
    filtered = filtered.filter(s => 
      (s.ServiceName && s.ServiceName.toLowerCase().includes(q)) || 
      (s.Description && s.Description.toLowerCase().includes(q)) ||
      (s.Category && s.Category.toLowerCase().includes(q))
    );
  }

  if (!filtered.length) {
    container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--color-text-2)">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin:0 auto 1rem;display:block;color:var(--slate-300)"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></svg>
      <p>No services found in this category.</p></div>`;
    return;
  }

  container.innerHTML = filtered.map(s => serviceCardHTML(s)).join("");

  // Bind buttons
  container.querySelectorAll(".service-card").forEach(card => {
    const detailsBtn = card.querySelector('.details-btn');
    if (detailsBtn) {
      detailsBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        document.getElementById('details-modal-title').textContent = card.dataset.serviceName;
        document.getElementById('details-modal-desc').textContent = card.dataset.serviceDesc || 'No details available for this service.';
        const imgEl = document.getElementById('details-modal-image');
        if (imgEl) {
          imgEl.src = card.dataset.serviceImage || '';
          imgEl.style.display = imgEl.src ? 'block' : 'none';
        }
        const bookBtn = document.getElementById('details-modal-book-btn');
        if (bookBtn) {
          bookBtn.onclick = () => {
            Modal.close('details-modal');
            openBookingModal(card.dataset.serviceId, card.dataset.serviceName);
          };
        }
        Modal.open('details-modal');
      });
    }

    card.addEventListener("click", () => {
      const id   = card.dataset.serviceId;
      const name = card.dataset.serviceName;
      openBookingModal(id, name);
    });
  });
}

function serviceCardHTML(s) {
  const defaultIcons = {
    "AC & Appliances": "https://cdn-icons-png.flaticon.com/512/2933/2933245.png",
    "Cleaning":        "https://cdn-icons-png.flaticon.com/512/3063/3063176.png",
    "Plumbing":        "https://cdn-icons-png.flaticon.com/512/1527/1527772.png",
    "Electrical":      "https://cdn-icons-png.flaticon.com/512/1048/1048947.png",
    "Painting":        "https://cdn-icons-png.flaticon.com/512/3062/3062634.png",
    "Carpentry":       "https://cdn-icons-png.flaticon.com/512/619/619052.png",
  };
  const icon = s.ImageURL || defaultIcons[s.Category] || "https://cdn-icons-png.flaticon.com/512/2917/2917995.png";

  return `
  <article class="service-card modern-card" data-service-id="${s.ServiceID}" data-service-name="${Utils.escapeHtml(s.ServiceName)}" data-service-desc="${Utils.escapeHtml(s.Description || '')}" data-service-image="${icon}" role="button" tabindex="0" aria-label="Book ${Utils.escapeHtml(s.ServiceName)}">
    <div class="icon-wrap">
      <img src="${icon}" alt="${Utils.escapeHtml(s.ServiceName)}" loading="lazy" onerror="this.src='https://cdn-icons-png.flaticon.com/512/2917/2917995.png'">
    </div>
    <div class="card-content" style="padding:12px; display:flex; flex-direction:column; flex-grow:1;">
      <h3 style="font-size:0.95rem; line-height:1.2; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; text-overflow:ellipsis; min-height:2.2rem; margin-bottom:4px; font-weight:700;">${Utils.escapeHtml(s.ServiceName)}</h3>
      <div style="font-size:0.75rem; font-weight:700; color:var(--emerald-600); margin-bottom:10px;"><span style="color:var(--slate-500);font-weight:500;font-size:0.65rem;">Starting from</span> ${Utils.formatPrice(s.BasePrice)}</div>
      
      <div style="display: flex; align-items: center; justify-content: space-between; margin-top: auto; gap:6px;">
        <button class="btn btn-sm details-btn" style="flex:1; padding:6px 0; font-size:0.75rem; border-radius:6px; background:var(--slate-100); color:var(--slate-700); border:1px solid var(--slate-200);">Details</button>
        <button class="btn btn-primary btn-sm book-btn" style="flex:1; padding:6px 0; font-size:0.75rem; border-radius:6px;">Add</button>
      </div>
    </div>
  </article>`;
}

// ── Category Filter Tabs ─────────────────────────────────────
function renderCategoryTabs() {
  const container = document.getElementById("category-tabs");
  if (!container) return;

  const services   = AppState.get("services") || [];
  const categories = ["All", ...new Set(services.filter(s => s.Status === "Active").map(s => s.Category))];

  container.innerHTML = categories.map((cat, i) =>
    `<button class="filter-tab${i === 0 ? " active" : ""}" data-cat="${cat}">${cat}</button>`
  ).join("");

  container.querySelectorAll(".filter-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      container.querySelectorAll(".filter-tab").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const searchInput = document.getElementById("service-search-input");
      const query = searchInput ? searchInput.value : "";
      renderServiceGrid(btn.dataset.cat, query);
    });
  });
}

// Rebuild tabs and grid when data loads
document.addEventListener("dataLoaded", () => {
  renderCategoryTabs();
  renderServiceGrid();
  
  const searchInput = document.getElementById("service-search-input");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      const activeTab = document.querySelector("#category-tabs .filter-tab.active");
      const cat = activeTab ? activeTab.dataset.cat : "All";
      renderServiceGrid(cat, e.target.value);
    });
  }
});

// ── Multi-Step Booking Modal ──────────────────────────────────
let bookingState = {
  serviceId: "",
  serviceName: "",
  step: 1,
  bookingId: "",
  couponCode: "",
  discountApplied: 0,
  basePrice: 0
};

function openBookingModal(serviceId, serviceName) {
  if (AppState.get("userRole") === "Guest") {
    Modal.open("login-modal");
    return;
  }

  bookingState = { serviceId, serviceName, step: 1, bookingId: "" };

  // Populate service selector
  const sel = document.getElementById("booking-service-select");
  const imgEl = document.getElementById("booking-service-image");
  if (sel) {
    const services = AppState.get("services") || [];
    
    const updateServiceImage = (id) => {
      if (!imgEl) return;
      const srv = services.find(s => s.ServiceID === id);
      const defaultIcons = {
        "AC & Appliances": "https://cdn-icons-png.flaticon.com/512/2933/2933245.png",
        "Cleaning":        "https://cdn-icons-png.flaticon.com/512/3063/3063176.png",
        "Plumbing":        "https://cdn-icons-png.flaticon.com/512/1527/1527772.png",
        "Electrical":      "https://cdn-icons-png.flaticon.com/512/1048/1048947.png",
        "Painting":        "https://cdn-icons-png.flaticon.com/512/3062/3062634.png",
        "Carpentry":       "https://cdn-icons-png.flaticon.com/512/619/619052.png",
      };
      const icon = (srv && srv.ImageURL) ? srv.ImageURL : ((srv && defaultIcons[srv.Category]) ? defaultIcons[srv.Category] : "https://cdn-icons-png.flaticon.com/512/2917/2917995.png");
      imgEl.src = icon;
      const wrapper = document.getElementById("booking-service-image-wrapper");
      if(wrapper) wrapper.style.display = "block";
    };

    sel.innerHTML = services.filter(s => s.Status === "Active").map(s =>
      `<option value="${s.ServiceID}"${s.ServiceID === serviceId ? " selected" : ""}>${s.ServiceName} — ${Utils.formatPrice(s.BasePrice)}</option>`
    ).join("");

    updateServiceImage(serviceId || sel.value);
    sel.onchange = (e) => updateServiceImage(e.target.value);
  }

  // Set min date to today
  const dateInput = document.getElementById("booking-date");
  if (dateInput) {
    const today = new Date().toISOString().split("T")[0];
    dateInput.min = today;
    dateInput.value = "";
  }

  goToStep(1);
  Modal.open("booking-modal");
}

function initBookingModal() {
  // Keyboard accessibility
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      const open = document.querySelector(".modal-backdrop.open");
      if (open) Modal.close(open.id);
    }
  });
}

// ── Global booking button handlers (onclick from HTML) ────────
window.bookingNextStep = function() {
  const service = document.getElementById("booking-service-select")?.value;
  const date    = document.getElementById("booking-date")?.value;
  const time    = document.getElementById("booking-time")?.value;

  if (!service) { Toast.show("Please select a service.", "error"); return; }

  bookingState.serviceId = service;
  bookingState.date = date;
  bookingState.time = time;
  
  // Pre-fill name if available
  const profile = AppState.get("userProfile");
  if (profile && profile.name) {
    const nameInput = document.getElementById("booking-name");
    if (nameInput && !nameInput.value) nameInput.value = profile.name;
  }
  
  goToStep(2);
  initBookingMap();
};

window.bookingBack = function() {
  goToStep(1);
};

window.bookingSubmit = async function() {
  const name   = document.getElementById("booking-name")?.value.trim();
  const phone  = document.getElementById("booking-phone")?.value.trim();
  const area   = document.getElementById("booking-area")?.value.trim();
  const notes  = document.getElementById("booking-notes")?.value.trim();

  if (!name)  { Toast.show("Please enter your name.", "error"); return; }
  if (!phone || !/^\d{10}$/.test(phone)) { Toast.show("Please enter a valid 10-digit phone number.", "error"); return; }
  if (!area)  { Toast.show("Please enter your area.", "error"); return; }

  const btn = document.getElementById("booking-submit");
  Utils.showLoading(btn, "Booking...");

  try {
    const profile = AppState.get("userProfile");
    const latlng = bookingMarker ? bookingMarker.getLatLng() : null;
    const res = await SheetsAPI.addBooking({
      CustomerName:    name,
      CustomerEmail:   profile ? profile.email : "",
      Phone:           phone,
      SelectedService: bookingState.serviceId,
      BookingDate:     bookingState.date,
      BookingTime:     bookingState.time,
      Area:            area,
      SpecialNotes:    notes,
      Lat:             latlng ? latlng.lat : "",
      Lng:             latlng ? latlng.lng : "",
      CouponCode:      bookingState.couponCode,
      DiscountApplied: bookingState.discountApplied
    });
    bookingState.bookingId = res.bookingId || "JOB-DEMO-XXXX";
    document.getElementById("success-booking-id").textContent = bookingState.bookingId;
    document.getElementById("success-service-name").textContent = bookingState.serviceName || bookingState.serviceId;
    document.getElementById("success-customer-name").textContent = name;
    goToStep(3);
    // Reload bookings
    SheetsAPI.getBookings().then(r => AppState.set("bookings", r.data || []));
  } catch (err) {
    Toast.show("Booking failed: " + err.message, "error");
  } finally {
    Utils.hideLoading(btn);
  }
};

window.bookingDone = function() {
  Modal.close("booking-modal");
};

window.bookingTrack = function() {
  Modal.close("booking-modal");
  const phone = document.getElementById("booking-phone")?.value;
  if (phone) document.getElementById("tracker-phone-input").value = phone;
  Router.navigate("tracker");
  setTimeout(() => document.getElementById("tracker-search-btn")?.click(), 300);
};

window.heroBookNow = function() {
  const services = AppState.get("services") || [];
  const first    = services.find(s => s.Status === "Active");
  if (first) openBookingModal(first.ServiceID, first.ServiceName);
  else { Router.navigate("services"); }
};

window.applyCoupon = function() {
  const code = document.getElementById("booking-coupon").value.trim().toUpperCase();
  const msgEl = document.getElementById("coupon-message");
  const breakdownEl = document.getElementById("booking-price-breakdown");
  if (!code) { Toast.show("Please enter a coupon code", "warning"); return; }
  
  const coupons = AppState.get("coupons") || [];
  const c = coupons.find(x => x.CouponCode === code && x.Status === "Active");
  if (!c) {
    msgEl.textContent = "Invalid or inactive coupon.";
    msgEl.style.color = "var(--color-danger)";
    msgEl.style.display = "block";
    bookingState.couponCode = "";
    bookingState.discountApplied = 0;
    breakdownEl.style.display = "none";
    return;
  }
  
  if (c.ExpiryDate && new Date(c.ExpiryDate) < new Date()) {
    msgEl.textContent = "This coupon has expired.";
    msgEl.style.color = "var(--color-danger)";
    msgEl.style.display = "block";
    return;
  }
  
  if (c.MaxUses > 0 && c.UsesCount >= c.MaxUses) {
    msgEl.textContent = "This coupon has reached its usage limit.";
    msgEl.style.color = "var(--color-danger)";
    msgEl.style.display = "block";
    return;
  }
  
  let discount = 0;
  if (c.DiscountType === "Flat") {
    discount = parseFloat(c.DiscountValue);
  } else {
    discount = (parseFloat(c.DiscountValue) / 100) * bookingState.basePrice;
  }
  
  if (discount > bookingState.basePrice) discount = bookingState.basePrice;
  
  bookingState.couponCode = code;
  bookingState.discountApplied = discount;
  
  msgEl.textContent = `Coupon applied successfully!`;
  msgEl.style.color = "var(--emerald-600)";
  msgEl.style.display = "block";
  
  document.getElementById("bp-base").textContent = `₹${bookingState.basePrice}`;
  document.getElementById("bp-discount").textContent = `-₹${discount.toFixed(2)}`;
  document.getElementById("bp-total").textContent = `₹${(bookingState.basePrice - discount).toFixed(2)}`;
  breakdownEl.style.display = "block";
};



let bookingMap = null;
let bookingMarker = null;

function initBookingMap() {
  if (bookingMap) {
    setTimeout(() => bookingMap.invalidateSize(), 300);
    return;
  }
  
  const mapEl = document.getElementById("booking-map");
  if (!mapEl) return;
  
  // Default to Bongaon
  const defaultCenter = [23.0645, 88.8282];
  
  bookingMap = L.map('booking-map').setView(defaultCenter, 13);
  
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap',
    maxZoom: 19
  }).addTo(bookingMap);
  
  bookingMarker = L.marker(defaultCenter, {draggable: true}).addTo(bookingMap);
  
  bookingMarker.on('dragend', async function() {
    const latlng = bookingMarker.getLatLng();
    await updateAddressFromLatLng(latlng.lat, latlng.lng);
  });
  
  bookingMap.on('click', async function(e) {
    bookingMarker.setLatLng(e.latlng);
    await updateAddressFromLatLng(e.latlng.lat, e.latlng.lng);
  });
  
  setTimeout(() => bookingMap.invalidateSize(), 300);
  
  document.getElementById("btn-use-location")?.addEventListener("click", () => {
    if ("geolocation" in navigator) {
      const btn = document.getElementById("btn-use-location");
      const origText = btn.innerHTML;
      btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg> Locating...`;
      navigator.geolocation.getCurrentPosition(async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        bookingMap.setView([lat, lng], 15);
        bookingMarker.setLatLng([lat, lng]);
        await updateAddressFromLatLng(lat, lng);
        btn.innerHTML = origText;
      }, () => {
        Toast.show("Unable to get location. Please allow browser permissions.", "error");
        btn.innerHTML = origText;
      });
    } else {
      Toast.show("Geolocation is not supported by your browser.", "error");
    }
  });

  // Forward Geocoding (debounce search when typing in booking-area)
  let geocodeTimer = null;
  const areaInput = document.getElementById("booking-area");
  if (areaInput) {
    areaInput.addEventListener("input", (e) => {
      clearTimeout(geocodeTimer);
      geocodeTimer = setTimeout(async () => {
        const query = e.target.value.trim();
        if (query.length < 4) return; // Too short to search
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&limit=1`);
          const data = await res.json();
          if (data && data.length > 0) {
            const lat = parseFloat(data[0].lat);
            const lng = parseFloat(data[0].lon);
            bookingMap.setView([lat, lng], 15);
            bookingMarker.setLatLng([lat, lng]);
          }
        } catch(err) {
          console.error("Forward geocoding failed", err);
        }
      }, 800);
    });
  }
}

async function updateAddressFromLatLng(lat, lng) {
  const input = document.getElementById("booking-area");
  if (!input) return;
  try {
    input.value = "Fetching address...";
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
    const data = await res.json();
    if (data && data.display_name) {
      input.value = `${data.display_name} (${lat.toFixed(6)}, ${lng.toFixed(6)})`;
    } else {
      input.value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
  } catch (err) {
    input.value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }
}


function goToStep(n) {
  bookingState.step = n;

  // Step dots
  document.querySelectorAll(".step-dot").forEach((dot, i) => {
    dot.classList.toggle("active", i + 1 === n);
    dot.classList.toggle("done", i + 1 < n);
  });
  document.querySelectorAll(".step-line").forEach((line, i) => {
    line.classList.toggle("done", i + 1 < n);
  });

  // Steps
  document.querySelectorAll(".booking-step").forEach(step => step.classList.remove("active"));
  const active = document.getElementById(`booking-step-${n}`);
  if (active) active.classList.add("active");
}

// ── Hero Search ───────────────────────────────────────────────
function initHeroSearch() {
    const searchInput = document.getElementById("content-hero_search_placeholder");
    const searchBtn   = document.getElementById("hero-search-btn");

  function doSearch() {
    const q = searchInput?.value.trim().toLowerCase();
    if (!q) return;
    Router.navigate("services");
    setTimeout(() => {
      const services = AppState.get("services") || [];
      const match = services.find(s =>
        s.ServiceName.toLowerCase().includes(q) ||
        s.Category.toLowerCase().includes(q) ||
        (s.Description || "").toLowerCase().includes(q)
      );
      if (match) {
        // Filter to matching category
        const tabs = document.querySelectorAll(".filter-tab");
        tabs.forEach(t => {
          t.classList.toggle("active", t.dataset.cat === match.Category);
        });
        renderServiceGrid(match.Category);
      }
    }, 200);
  }

  searchBtn?.addEventListener("click", doSearch);
  searchInput?.addEventListener("keydown", e => { if (e.key === "Enter") doSearch(); });
}

document.addEventListener("DOMContentLoaded", initHeroSearch);

// ── Booking Tracker Page ──────────────────────────────────────
function initTrackerPage() {
  const role = AppState.get("userRole");
  const profile = AppState.get("userProfile");
  
  const authOverlay = document.getElementById("tracker-auth-overlay");
  const resultDiv = document.getElementById("tracker-result");
  const descText = document.getElementById("tracker-desc");

  if (!authOverlay) return;

  if (role === "Guest" || !profile) {
    authOverlay.classList.remove("hidden");
    if (resultDiv) resultDiv.innerHTML = "";
    if (descText) descText.textContent = "Please sign in with Google to view and track your booking history.";
  } else {
    authOverlay.classList.add("hidden");
    if (descText) descText.textContent = `Showing booking history for: ${profile.email}`;
    searchBookingsByEmail(profile.email);
  }
}

let trackerBookings = [];
let trackerPage = 1;
let trackerPageSize = 5;

async function searchBookingsByEmail(email) {
  const result = document.getElementById("tracker-result");
  if (result) result.innerHTML = `<div class="text-center" style="padding:2rem;color:var(--color-text-2)">
    <svg class="spinner" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin:0 auto 1rem;display:block"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
    Loading your bookings and wishes...</div>`;

  try {
    const [bookingsRes, wishesRes] = await Promise.all([
      SheetsAPI.getBookingByEmail(email),
      SheetsAPI.getWishesByEmail(email)
    ]);

    const userBookings = bookingsRes.data || [];
    const userWishes = (wishesRes.data || []).map(w => ({
      ...w,
      BookingID: w.WishID, // Map WishID to BookingID for rendering
      SelectedService: "Wish: " + (w.WishItem ? w.WishItem.replace(/\[WISH_PHOTO:.+?\]/, "").trim() : "") + (w.WishItem && w.WishItem.includes("[WISH_PHOTO:") ? " 📷 (Photo Attached)" : ""),
      BookingTime: "TBD",
      FinalPrice: w.FinalPrice || "",
      Rating: w.Rating || "",
      Review: w.Review || "",
      PaymentStatus: w.PaymentStatus || "Unpaid",
      PaymentMethodUsed: w.PaymentMethodUsed || "",
      TransactionRef: w.TransactionRef || "",
      isWish: true
    }));

    const combined = [...userBookings, ...userWishes];
    
    // Sort combined descending by ID
    combined.sort((a, b) => {
      const aVal = a.BookingID || "";
      const bVal = b.BookingID || "";
      return bVal.localeCompare(aVal);
    });

    // Merge into AppState so openPayNow and ratings can find them
    let allBookings = AppState.get("bookings") || [];
    userBookings.forEach(ub => {
      const idx = allBookings.findIndex(b => b.BookingID === ub.BookingID);
      if (idx > -1) allBookings[idx] = ub;
      else allBookings.push(ub);
    });
    userWishes.forEach(uw => {
      const idx = allBookings.findIndex(b => b.BookingID === uw.BookingID);
      if (idx > -1) allBookings[idx] = uw;
      else allBookings.push(uw);
    });
    AppState.set("bookings", allBookings);

    trackerBookings = combined;
    trackerPage = 1;
    renderTrackerResults();
  } catch (err) {
    if (result) result.innerHTML = `<div class="card text-center" style="max-width:480px;margin:0 auto;border-color:#fecaca"><p style="color:#dc2626">Error: ${err.message}</p></div>`;
  }
}

function renderTrackerResults() {
  const result = document.getElementById("tracker-result");
  if (!result) return;
  
  if (!trackerBookings.length) {
    result.innerHTML = `<div class="card text-center" style="max-width:480px;margin:0 auto">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin:0 auto 1rem;display:block;color:var(--slate-300)"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35M8 11h6M11 8v6"/></svg>
      <h3 style="font-size:var(--text-lg);margin-bottom:var(--sp-2)">No bookings found</h3>
      <p class="text-muted">We couldn't find any orders for this account.</p>
    </div>`;
    return;
  }

  // Calculate pages
  const totalPages = Math.ceil(trackerBookings.length / trackerPageSize);
  // Ensure current page is valid
  if (trackerPage > totalPages) trackerPage = totalPages;
  if (trackerPage < 1) trackerPage = 1;

  const startIndex = (trackerPage - 1) * trackerPageSize;
  const endIndex = Math.min(startIndex + trackerPageSize, trackerBookings.length);
  const paginatedBookings = trackerBookings.slice(startIndex, endIndex);

  // Render cards
  const cardsHTML = paginatedBookings.map(b => trackerCardHTML(b)).join("");

  // Pagination controls HTML
  const paginationControlsHTML = `
    <div class="card" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-top:2rem; padding:1.25rem; border-radius:16px; background:#fff; box-shadow:0 4px 15px rgba(0,0,0,0.02); border:1px solid var(--slate-100);">
      
      <!-- Page Size Selector -->
      <div style="display:flex; align-items:center; gap:8px; font-size:0.88rem; color:var(--slate-600);">
        <span>Show:</span>
        <select onchange="window.changeTrackerPageSize(this.value)" style="padding:6px 12px; border-radius:8px; border:1px solid var(--slate-200); background:#fff; cursor:pointer; font-weight:600; font-size:0.88rem; outline:none; color:var(--slate-800);">
          <option value="5" ${trackerPageSize === 5 ? "selected" : ""}>5</option>
          <option value="10" ${trackerPageSize === 10 ? "selected" : ""}>10</option>
        </select>
      </div>

      <!-- Info Text -->
      <div style="font-size:0.88rem; color:var(--slate-500); font-weight:500;">
        Showing <span style="font-weight:600; color:var(--slate-800);">${startIndex + 1}-${endIndex}</span> of <span style="font-weight:600; color:var(--slate-800);">${trackerBookings.length}</span> bookings
      </div>

      <!-- Next / Prev Buttons -->
      <div style="display:flex; gap:8px;">
        <button onclick="window.prevTrackerPage()" ${trackerPage === 1 ? "disabled" : ""} class="btn btn-secondary btn-sm" style="border-radius:8px; padding:6px 16px; font-weight:600; font-size:0.88rem; display:inline-flex; align-items:center; gap:6px; opacity:${trackerPage === 1 ? "0.5" : "1"}; cursor:${trackerPage === 1 ? "not-allowed" : "pointer"}; background:#fff; border:1px solid var(--slate-200);">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 18l-6-6 6-6"/></svg> Prev
        </button>
        <button onclick="window.nextTrackerPage()" ${trackerPage >= totalPages ? "disabled" : ""} class="btn btn-secondary btn-sm" style="border-radius:8px; padding:6px 16px; font-weight:600; font-size:0.88rem; display:inline-flex; align-items:center; gap:6px; opacity:${trackerPage >= totalPages ? "0.5" : "1"}; cursor:${trackerPage >= totalPages ? "not-allowed" : "pointer"}; background:#fff; border:1px solid var(--slate-200);">
          Next <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>

    </div>
  `;

  result.innerHTML = cardsHTML + paginationControlsHTML;
}

window.changeTrackerPageSize = function(val) {
  trackerPageSize = parseInt(val, 10);
  trackerPage = 1;
  renderTrackerResults();
};

window.prevTrackerPage = function() {
  if (trackerPage > 1) {
    trackerPage--;
    renderTrackerResults();
    document.getElementById("page-tracker").scrollIntoView({ behavior: 'smooth' });
  }
};

window.nextTrackerPage = function() {
  const totalPages = Math.ceil(trackerBookings.length / trackerPageSize);
  if (trackerPage < totalPages) {
    trackerPage++;
    renderTrackerResults();
    document.getElementById("page-tracker").scrollIntoView({ behavior: 'smooth' });
  }
};

function trackerCardHTML(b) {
  const services = AppState.get("services") || [];
  const svc = services.find(s => s.ServiceID === b.SelectedService);
  const svcName = svc ? svc.ServiceName : b.SelectedService;

  const isWish = b.SelectedService && b.SelectedService.startsWith("Wish: ");
  let statusOrder = ["Pending", "Contacted", "Partner_Assigned", "Completed"];
  
  if (isWish) {
    statusOrder = ["Pending", "Confirmed", "Scheduled", "Done"];
    if (b.JobStatus === "Rejected") {
      statusOrder = ["Pending", "Rejected"];
    }
  }
  
  const currentIdx  = statusOrder.indexOf(b.JobStatus);

  const timelineHTML = statusOrder.map((status, i) => {
    const isDone   = i < currentIdx;
    const isActive = i === currentIdx;
    
    const labels   = {
      "Pending":          isWish ? "Wish Received" : "Booking Received",
      "Contacted":        "Customer Contacted",
      "Partner_Assigned": "Partner Assigned",
      "Completed":        "Job Completed",
      "Confirmed":        "Wish Confirmed",
      "Scheduled":        "Delivery Scheduled",
      "Done":             "Wish Fulfilled",
      "Rejected":         "Wish Rejected",
    };
    
    const descs = {
      "Pending":          isWish ? "Your custom wish has been received and is under review." : "Your booking is confirmed and awaiting assignment.",
      "Contacted":        "Our team has reached out to confirm your appointment.",
      "Partner_Assigned": `Partner ${b.AssignedPartner || "—"} has been assigned.`,
      "Completed":        `Job completed. Final price: ${b.FinalPrice ? Utils.formatPrice(b.FinalPrice) : "—"}`,
      "Confirmed":        "Our team has confirmed and accepted your wish request.",
      "Scheduled":        "We have scheduled the delivery / execution of your wish.",
      "Done":             `Your wish has been successfully fulfilled! Final price: ${b.FinalPrice ? Utils.formatPrice(b.FinalPrice) : "—"}`,
      "Rejected":         "We are unable to fulfill this wish (either due to legal/ethical reasons or unavailability).",
    };
    
    return `<div class="timeline-item ${isDone ? "done" : isActive ? "active" : "inactive"}">
      <h4>${labels[status]}</h4>
      <p>${isActive || isDone ? descs[status] : "Upcoming step"}</p>
    </div>`;
  }).join("");

  const isCompleted = b.JobStatus === "Completed" || b.JobStatus === "Done";
  const hasRated = b.Rating !== undefined && b.Rating !== "";
  const payStatus = b.PaymentStatus || "Unpaid";
  const hasFinalPrice = b.FinalPrice && parseFloat(b.FinalPrice) > 0;
  
  // Payment section
  let paymentSectionHTML = "";
  if (hasFinalPrice) {
    if (payStatus === "Verified") {
      paymentSectionHTML = `
        <div style="background:linear-gradient(135deg,#d1fae5,#a7f3d0);border-radius:12px;padding:1rem;margin-top:1rem;border:1px solid var(--emerald-300);display:flex;align-items:center;gap:12px">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#065f46" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          <div>
            <div style="font-weight:700;color:#065f46;font-size:0.875rem">Payment Verified ✓</div>
            <div class="text-sm" style="color:#047857">₹${Utils.formatPrice(b.FinalPrice)} · via ${Utils.escapeHtml(b.PaymentMethodUsed || "—")}</div>
          </div>
        </div>`;
    } else if (payStatus === "Pending_Payment") {
      paymentSectionHTML = `
        <div style="background:#fffbeb;border-radius:12px;padding:1rem;margin-top:1rem;border:1px solid #fde68a;display:flex;align-items:center;gap:12px">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#92400e" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <div>
            <div style="font-weight:700;color:#92400e;font-size:0.875rem">Payment Submitted — Awaiting Verification</div>
            <div class="text-sm" style="color:#b45309">Ref: ${Utils.escapeHtml(b.TransactionRef || "—")} · We'll verify shortly.</div>
          </div>
        </div>`;
    } else if (payStatus === "Rejected") {
      paymentSectionHTML = `
        <div style="background:#fee2e2;border-radius:12px;padding:1rem;margin-top:1rem;border:1px solid #fca5a5">
          <div style="font-weight:700;color:#b91c1c;margin-bottom:4px">❌ Payment Rejected</div>
          <div class="text-sm" style="color:#dc2626;margin-bottom:10px">Your previous payment was not verified. Please retry.</div>
          <button class="btn btn-primary btn-sm" onclick="openPayNow('${b.BookingID}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
            Retry Payment
          </button>
        </div>`;
    } else {
      // Unpaid
      paymentSectionHTML = `
        <div style="margin-top:1rem">
          <button class="btn btn-primary btn-full" onclick="openPayNow('${b.BookingID}')" style="background:linear-gradient(135deg,#10b981,#059669);display:flex;align-items:center;gap:8px;justify-content:center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
            Pay Now — ${Utils.formatPrice(b.FinalPrice)}
          </button>
          <p class="text-xs text-muted text-center" style="margin-top:6px">Secure payment via UPI / COD</p>
        </div>`;
    }
  }

  let ratingSectionHTML = "";
  if (isCompleted) {
    if (hasRated) {
      ratingSectionHTML = `
        <div class="divider"></div>
        <div style="background:var(--emerald-50);padding:1rem;border-radius:12px;border:1px solid var(--emerald-200);margin-top:1.5rem">
          <div style="font-weight:700;color:var(--emerald-800);margin-bottom:4px;font-size:0.875rem">Your Review</div>
          <div class="stars" style="margin-bottom:6px">${"★".repeat(parseInt(b.Rating))}${"☆".repeat(5 - parseInt(b.Rating))}</div>
          <p class="text-sm text-muted" style="margin:0">${Utils.escapeHtml(b.Review || "No comments left.")}</p>
        </div>`;
    } else {
      ratingSectionHTML = `
        <div class="divider"></div>
        <div id="rating-form-${b.BookingID}" style="background:var(--slate-50);padding:1.25rem;border-radius:12px;border:1px solid var(--slate-200);margin-top:1.5rem">
          <h4 style="margin-bottom:8px;font-size:0.9rem">Rate Your Service</h4>
          <div class="form-group" style="margin-bottom:12px">
            <label class="form-label text-sm" style="font-size:0.75rem">Rating</label>
            <select id="rate-select-${b.BookingID}" class="form-control" style="background:#fff;padding:4px 8px;height:auto">
              <option value="5">⭐⭐⭐⭐⭐ Excellent (5/5)</option>
              <option value="4">⭐⭐⭐⭐ Very Good (4/5)</option>
              <option value="3">⭐⭐⭐ Good (3/5)</option>
              <option value="2">⭐⭐ Fair (2/5)</option>
              <option value="1">⭐ Poor (1/5)</option>
            </select>
          </div>
          <div class="form-group" style="margin-bottom:12px">
            <label class="form-label text-sm" style="font-size:0.75rem">Review Message</label>
            <textarea id="rate-review-${b.BookingID}" class="form-control" style="background:#fff;font-size:0.875rem;min-height:60px" placeholder="Share your experience (optional)..."></textarea>
          </div>
          <button class="btn btn-primary btn-sm" onclick="submitBookingRating('${b.BookingID}')">Submit Rating</button>
        </div>`;
    }
  }

  return `
  <div class="card tracker-result" style="max-width:560px;margin:0 auto var(--sp-6)">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:var(--sp-4)">
      <div>
        <div style="font-size:var(--text-xs);color:var(--color-text-3);font-weight:600;letter-spacing:.05em;text-transform:uppercase;margin-bottom:4px">Booking ID</div>
        <div style="font-weight:800;color:var(--color-primary);font-size:var(--text-base)">${b.BookingID}</div>
      </div>
      ${Utils.statusBadge(b.JobStatus)}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-3);margin-bottom:var(--sp-5)">
      <div class="text-sm"><span class="text-muted">${isWish ? "Wish Item" : "Service"}</span><br><strong>${Utils.escapeHtml(svcName)}</strong></div>
      <div class="text-sm"><span class="text-muted">Submitted</span><br><strong>${Utils.formatDate(b.BookingDate)}</strong></div>
      <div class="text-sm"><span class="text-muted">Area</span><br><strong>${Utils.escapeHtml(b.Area || "—")}</strong></div>
      <div class="text-sm"><span class="text-muted">${isWish ? "Payment Amount" : "Price"}</span><br><strong>${b.FinalPrice ? Utils.formatPrice(b.FinalPrice) : (isWish ? "Awaiting quote" : "TBD after inspection")}</strong></div>
      ${isWish && b.DeliveryDate ? `<div class="text-sm" style="grid-column:1/-1"><span class="text-muted">📅 Delivery Date</span><br><strong style="color:var(--color-primary)">${Utils.escapeHtml(b.DeliveryDate)}</strong></div>` : ""}
    </div>
    ${paymentSectionHTML}
    <div class="divider" style="margin-top:1.25rem"></div>
    <div class="timeline">${timelineHTML}</div>
    ${ratingSectionHTML}
  </div>`;
}

// ── Pay Now Flow ─────────────────────────────────────────────
window.openPayNow = function(itemId) {
  // Search both bookings and wishes
  const bks = AppState.get("bookings") || [];
  const wishes = AppState.get("wishes") || [];
  const b = bks.find(x => x.BookingID === itemId) || wishes.find(x => x.WishID === itemId);
  if (!b) return;
  const displayId = b.BookingID || b.WishID;

  document.getElementById("pay-booking-id").value = displayId;
  document.getElementById("pay-amount-display").textContent = b.FinalPrice ? Utils.formatPrice(b.FinalPrice) : "Amount TBD";
  document.getElementById("pay-booking-display").textContent = (displayId.startsWith("WSH-") ? "Wish: " : "Booking: ") + displayId;
  document.getElementById("pay-txn-ref").value = "";

  // Render payment methods
  const methods = (AppState.get("paymentSettings") || []).filter(m => m.Status === "Active");
  const list = document.getElementById("pay-methods-list");
  if (!methods.length) {
    list.innerHTML = `<p class="text-muted text-sm text-center">No payment methods configured by admin yet. Please contact support.</p>`;
  } else {
    list.innerHTML = methods.map(m => `
      <div style="border:2px solid var(--slate-200);border-radius:12px;padding:1rem;background:var(--slate-50)">
        <div style="font-weight:700;font-size:0.95rem;margin-bottom:6px">${Utils.escapeHtml(m.Name)}</div>
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
            ${m.QRCodeURL ? `<img src="${m.QRCodeURL}" alt="QR Code" title="Click to enlarge" style="width:90px;height:90px;border-radius:8px;border:1px solid var(--slate-200);cursor:zoom-in;transition:all 0.3s ease;object-fit:contain;" onclick="if(this.style.width==='90px'){this.style.width='100%';this.style.height='auto';this.style.maxWidth='300px';this.style.cursor='zoom-out';}else{this.style.width='90px';this.style.height='90px';this.style.cursor='zoom-in';}" onerror="this.style.display='none'" />` : ""}
          <div>
            <div class="text-sm text-muted" style="margin-bottom:4px">Pay to:</div>
            <div style="font-family:monospace;font-weight:700;font-size:1rem;color:var(--color-primary);background:var(--emerald-50);padding:4px 12px;border-radius:8px;display:inline-block">${Utils.escapeHtml(m.Details)}</div>
            <button class="btn btn-sm btn-secondary" style="margin-top:6px;display:flex;align-items:center;gap:4px" onclick="navigator.clipboard.writeText('${m.Details}').then(()=>Toast.show('Copied!','success'))">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
              Copy ID
            </button>
          </div>
        </div>
      </div>
    `).join("");
  }

  Modal.open("pay-now-modal");
};

window.submitPayment = async function() {
  const bookingId = document.getElementById("pay-booking-id").value;
  const txnRef = document.getElementById("pay-txn-ref").value.trim();
  const methods = (AppState.get("paymentSettings") || []).filter(m => m.Status === "Active");

  if (!txnRef) {
    Toast.show("Please enter your transaction ID / UTR number.", "error"); return;
  }

  const btn = document.getElementById("pay-submit-btn");
  Utils.showLoading(btn, "Submitting...");

  try {
    const methodName = methods[0]?.Name || "UPI";
    if (bookingId.startsWith("WSH-")) {
      await SheetsAPI.updateWish({
        WishID: bookingId,
        PaymentStatus: "Pending_Payment",
        PaymentMethodUsed: methodName,
        TransactionRef: txnRef
      });
      // Update local wish state
      const wishes = AppState.get("wishes") || [];
      const w = wishes.find(x => x.WishID === bookingId);
      if (w) { w.PaymentStatus = "Pending_Payment"; w.PaymentMethodUsed = methodName; w.TransactionRef = txnRef; }
      AppState.set("wishes", wishes);
    } else {
      await SheetsAPI.updateBooking({
        BookingID: bookingId,
        PaymentStatus: "Pending_Payment",
        PaymentMethodUsed: methodName,
        TransactionRef: txnRef
      });
      const bks = AppState.get("bookings") || [];
      const b = bks.find(x => x.BookingID === bookingId);
      if (b) { b.PaymentStatus = "Pending_Payment"; b.PaymentMethodUsed = methodName; b.TransactionRef = txnRef; }
      AppState.set("bookings", bks);
    }

    Modal.close("pay-now-modal");
    Toast.show("✅ Payment submitted! Admin will verify shortly.", "success");
    initTrackerPage();
  } catch (err) {
    Toast.show("Error submitting payment: " + err.message, "error");
  } finally {
    Utils.hideLoading(btn);
  }
};


window.submitBookingRating = async function(bookingId) {
  const rating = parseInt(document.getElementById(`rate-select-${bookingId}`).value);
  const review = document.getElementById(`rate-review-${bookingId}`).value.trim();

  const container = document.getElementById(`rating-form-${bookingId}`);
  const submitBtn = container.querySelector("button");

  Utils.showLoading(submitBtn, "Submitting...");
  try {
    if (bookingId.startsWith("WSH-")) {
      await SheetsAPI.updateWish({ WishID: bookingId, Rating: rating, Review: review });
    } else {
      await SheetsAPI.updateBooking({ BookingID: bookingId, Rating: rating, Review: review });
    }
    
    // Update local AppState
    const bks = AppState.get("bookings") || [];
    const b = bks.find(bk => bk.BookingID === bookingId);
    if (b) {
      b.Rating = rating;
      b.Review = review;
    }
    AppState.set("bookings", bks);
    
    Toast.show("Thank you for your rating and review!", "success");
    initTrackerPage(); // Redraw tracker cards
  } catch (err) {
    Toast.show("Error submitting review: " + err.message, "error");
  } finally {
    Utils.hideLoading(submitBtn);
  }
};

// Re-render on data/auth reload
document.addEventListener("dataLoaded", () => {
  if (AppState.get("currentPage") === "services") renderServiceGrid();
  if (AppState.get("currentPage") === "tracker") initTrackerPage();
  if (AppState.get("currentPage") === "extra") initExtraPage();
});

document.addEventListener("authChanged", () => {
  if (AppState.get("currentPage") === "tracker") initTrackerPage();
  if (AppState.get("currentPage") === "extra") initExtraPage();
});

function initExtraPage() {
  const role = AppState.get("userRole");
  const profile = AppState.get("userProfile");

  const authOverlay = document.getElementById("extra-auth-overlay");
  const formContainer = document.getElementById("extra-wish-container");

  if (!authOverlay || !formContainer) return;

  if (role === "Guest" || !profile) {
    authOverlay.classList.remove("hidden");
    formContainer.classList.add("hidden");
  } else {
    authOverlay.classList.add("hidden");
    formContainer.classList.remove("hidden");
    resetWishSteps();
  }

  // Start typing placeholder once
  const form = document.getElementById("wish-form");
  if (form && !form.dataset.typing) {
    form.dataset.typing = "true";
    startPlaceholderTyping("wish-item");
  }

  // Bind submit event
  if (form && !form.dataset.bound) {
    form.dataset.bound = "true";
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      const wishItem = document.getElementById("wish-item").value.trim();
      const whatsapp = document.getElementById("wish-whatsapp").value.trim();
      const address = document.getElementById("wish-address").value.trim();
      const expectation = document.getElementById("wish-expectation").value.trim();
      const photoInput = document.getElementById("wish-photo");

      const btn = document.getElementById("wish-submit-btn");
      Utils.showLoading(btn, "Submitting Wish...");

      try {
        let wishPhotoUrl = "";
        if (photoInput && photoInput.files && photoInput.files[0]) {
          const file = photoInput.files[0];
          
          btn.innerHTML = "Uploading photo...";
          
          const formData = new FormData();
          formData.append("image", file);
          
          const res = await fetch("https://api.imgbb.com/1/upload?key=067538657aea330a1d149baf45171d04", {
            method: "POST",
            body: formData
          });
          const data = await res.json();
          if (data && data.success) {
            wishPhotoUrl = data.data.url;
          } else {
            throw new Error(data.error ? data.error.message : "Image upload failed");
          }
        }

        let finalWishItem = wishItem;
        if (wishPhotoUrl) {
          finalWishItem += `\n\n[WISH_PHOTO:${wishPhotoUrl}]`;
        }

        const today = new Date().toISOString().split('T')[0];
        const profile = AppState.get("userProfile");
        
        await SheetsAPI.addWish({
          CustomerName:    profile ? profile.name : "Customer",
          CustomerEmail:   profile ? profile.email : "",
          Phone:           whatsapp,
          WishItem:        finalWishItem,
          BookingDate:     today,
          Area:            address,
          SpecialNotes:    "Delivery Expectation: " + expectation
        });

        Toast.show("✨ Wish placed successfully! You can track it in your orders.", "success");
        form.reset();
        resetWishSteps();
        
        // Reload all data so tracker gets the new wish
        await loadAllData();
        
        // Go to tracker page
        Router.navigate("tracker");
      } catch (err) {
        Toast.show("Error placing wish: " + err.message, "error");
      } finally {
        Utils.hideLoading(btn);
      }
    });
  }
}

function resetWishSteps() {
  document.querySelectorAll(".wish-step").forEach((step, i) => {
    if (i === 0) {
      step.classList.remove("hidden-step");
      step.classList.add("active-step");
      step.style.display = "block";
      step.style.opacity = 1;
      step.style.transform = "translateX(0)";
    } else {
      step.classList.remove("active-step");
      step.classList.add("hidden-step");
      step.style.display = "none";
      step.style.opacity = 0;
      step.style.transform = "translateX(20px)";
    }
  });

  const progress = document.getElementById("wish-progress");
  if (progress) progress.style.width = "25%";

  document.querySelectorAll(".step-dot").forEach((dot, idx) => {
    dot.classList.toggle("active", idx === 0);
  });
}

window.nextWishStep = function(currentStep) {
  let input;
  if (currentStep === 1) input = document.getElementById("wish-item");
  if (currentStep === 2) input = document.getElementById("wish-whatsapp");
  if (currentStep === 3) input = document.getElementById("wish-address");

  if (input && !input.checkValidity()) {
    input.reportValidity();
    return;
  }

  const currentEl = document.querySelector(`.wish-step[data-step="${currentStep}"]`);
  const nextEl = document.querySelector(`.wish-step[data-step="${currentStep + 1}"]`);
  
  if (currentEl && nextEl) {
    currentEl.style.opacity = 0;
    currentEl.style.transform = "translateX(-20px)";
    setTimeout(() => {
      currentEl.style.display = "none";
      nextEl.style.display = "block";
      
      // Trigger reflow
      nextEl.offsetHeight;
      
      nextEl.style.opacity = 1;
      nextEl.style.transform = "translateX(0)";
      
      const progress = document.getElementById("wish-progress");
      if (progress) progress.style.width = `${(currentStep) * 25 + 25}%`;
      
      document.querySelectorAll(".step-dot").forEach((dot, idx) => {
        dot.classList.toggle("active", idx === currentStep);
      });
      
      const nextInput = nextEl.querySelector("input, textarea");
      if (nextInput) nextInput.focus();

      // Initialize map when entering step 3
      if (currentStep === 2) {
        initWishMap();
      }
    }, 300);
  }
};

window.prevWishStep = function(currentStep) {
  const currentEl = document.querySelector(`.wish-step[data-step="${currentStep}"]`);
  const prevEl = document.querySelector(`.wish-step[data-step="${currentStep - 1}"]`);
  
  if (currentEl && prevEl) {
    currentEl.style.opacity = 0;
    currentEl.style.transform = "translateX(20px)";
    setTimeout(() => {
      currentEl.style.display = "none";
      prevEl.style.display = "block";
      
      // Trigger reflow
      prevEl.offsetHeight;
      
      prevEl.style.opacity = 1;
      prevEl.style.transform = "translateX(0)";
      
      const progress = document.getElementById("wish-progress");
      if (progress) progress.style.width = `${(currentStep - 2) * 25 + 25}%`;
      
      document.querySelectorAll(".step-dot").forEach((dot, idx) => {
        dot.classList.toggle("active", idx === (currentStep - 2));
      });
      
      const prevInput = prevEl.querySelector("input, textarea");
      if (prevInput) prevInput.focus();

      // Initialize map when entering step 3 (moving back)
      if (currentStep === 4) {
        initWishMap();
      }
    }, 300);
  }
};

const wishPlaceholders = [
  "e.g. Mount Everest rock...",
  "e.g. Digha sea beach food...",
  "e.g. rare historical book...",
  "e.g. vintage postage stamps...",
  "e.g. specific local handmade item..."
];

function startPlaceholderTyping(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;

  let textIdx = 0;
  let charIdx = 0;
  let isDeleting = false;
  let timeoutVal = 100;

  function tick() {
    // Make sure element still exists
    const currentEl = document.getElementById(elementId);
    if (!currentEl) return;

    const currentText = wishPlaceholders[textIdx];
    if (isDeleting) {
      currentEl.placeholder = currentText.substring(0, charIdx - 1);
      charIdx--;
      timeoutVal = 40;
    } else {
      currentEl.placeholder = currentText.substring(0, charIdx + 1);
      charIdx++;
      timeoutVal = 80;
    }

    if (!isDeleting && charIdx === currentText.length) {
      isDeleting = true;
      timeoutVal = 1500; // Pause when full
    } else if (isDeleting && charIdx === 0) {
      isDeleting = false;
      textIdx = (textIdx + 1) % wishPlaceholders.length;
      timeoutVal = 500; // Pause before typing next
    }

    setTimeout(tick, timeoutVal);
  }

  tick();
}

// Render dynamic FAQs inside the Premium Wishes page
AppState.on("faqs", (items) => {
  const container = document.getElementById("extra-faq-accordion");
  const section = document.getElementById("extra-faq-section");
  if (!container || !section) return;

  const activeItems = (items || []).filter(f => f.Status === "Active" && f.Section === "Extra");
  if (!activeItems.length) {
    section.style.display = "none";
  } else {
    section.style.display = "block";
    container.innerHTML = activeItems.map((f, i) => `
      <details style="background:#fff;border:1px solid var(--slate-200);border-radius:16px;padding:1.1rem;cursor:pointer;outline:none;box-shadow:0 4px 10px rgba(0,0,0,0.02);transition:all 0.3s;">
        <summary style="font-weight:600;font-size:1rem;color:var(--slate-800);list-style:none;display:flex;justify-content:space-between;align-items:center">
          ${Utils.escapeHtml(f.Question)}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="color:var(--slate-400);transition:transform 0.3s;"><path d="M19 9l-7 7-7-7"/></svg>
        </summary>
        <div style="margin-top:1rem;color:var(--slate-600);line-height:1.6;font-size:0.92rem;">
          ${Utils.escapeHtml(f.Answer).replace(/\n/g, '<br>')}
        </div>
      </details>
    `).join("");
  }
});

let wishMap = null;
let wishMarker = null;

function initWishMap() {
  const mapEl = document.getElementById("wish-map");
  if (!mapEl) return;

  if (wishMap) {
    setTimeout(() => wishMap.invalidateSize(), 300);
    return;
  }

  // Default to Bongaon center
  const defaultCenter = [23.0645, 88.8282];
  wishMap = L.map('wish-map').setView(defaultCenter, 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap',
    maxZoom: 19
  }).addTo(wishMap);

  wishMarker = L.marker(defaultCenter, {draggable: true}).addTo(wishMap);

  // Address updating helpers
  async function updateWishAddress(lat, lng) {
    const input = document.getElementById("wish-address");
    if (!input) return;
    try {
      input.value = "Fetching address...";
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
      const data = await res.json();
      if (data && data.display_name) {
        input.value = `${data.display_name} (${lat.toFixed(6)}, ${lng.toFixed(6)})`;
      } else {
        input.value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      }
    } catch (err) {
      input.value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
  }

  wishMarker.on('dragend', async function() {
    const latlng = wishMarker.getLatLng();
    await updateWishAddress(latlng.lat, latlng.lng);
  });

  wishMap.on('click', async function(e) {
    wishMarker.setLatLng(e.latlng);
    await updateWishAddress(e.latlng.lat, e.latlng.lng);
  });

  // Locate me button binding
  document.getElementById("btn-wish-use-location")?.addEventListener("click", () => {
    if ("geolocation" in navigator) {
      const btn = document.getElementById("btn-wish-use-location");
      const origText = btn.innerHTML;
      btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2a8 8 0 00-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 00-8-8z"/><circle cx="12" cy="10" r="3"/></svg> Locating...`;
      
      navigator.geolocation.getCurrentPosition(async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        wishMap.setView([lat, lng], 15);
        wishMarker.setLatLng([lat, lng]);
        await updateWishAddress(lat, lng);
        btn.innerHTML = origText;
      }, () => {
        Toast.show("Unable to get location. Please check browser permissions.", "error");
        btn.innerHTML = origText;
      });
    } else {
      Toast.show("Geolocation is not supported by your browser.", "error");
    }
  });

  // Geocoding search from manual input typing (forward geocoding)
  let wishGeocodeTimer = null;
  const addressInput = document.getElementById("wish-address");
  if (addressInput) {
    addressInput.addEventListener("input", (e) => {
      clearTimeout(wishGeocodeTimer);
      wishGeocodeTimer = setTimeout(async () => {
        const query = e.target.value.trim();
        // Remove trailing coordinates from reverse-geocoding if user is typing
        const queryClean = query.replace(/\s*\(-?\d+\.\d+,\s*-?\d+\.\d+\)$/, "");
        if (queryClean.length < 4) return;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(queryClean)}&limit=1`);
          const data = await res.json();
          if (data && data.length > 0) {
            const lat = parseFloat(data[0].lat);
            const lng = parseFloat(data[0].lon);
            wishMap.setView([lat, lng], 15);
            wishMarker.setLatLng([lat, lng]);
          }
        } catch(err) {
          console.error("Wish geocoding search failed", err);
        }
      }, 800);
    });
  }
}
