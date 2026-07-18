/**
 * ============================================================
 * Module C — Partner Onboarding
 * ============================================================
 * Beautiful landing page for local technicians to register.
 * On submission, data appends to the Partners Google Sheet
 * with DocumentStatus = "Pending Review".
 * ============================================================
 */

let partnerInited = false;

function initPartnerModule() {
  if (!partnerInited) {
    partnerInited = true;
    initSkillChips();
    initPartnerForm();
  }
  
  const role = AppState.get("userRole");
  const profile = AppState.get("userProfile");
  
  const overlay = document.getElementById("partner-auth-overlay");
  const formWrap = document.getElementById("partner-form");
  const dashWrap = document.getElementById("partner-dashboard");
  const successMsg = document.getElementById("partner-success");
  
  // Reset visibility
  overlay?.classList.add("hidden");
  formWrap?.classList.add("hidden");
  dashWrap?.classList.add("hidden");
  successMsg?.classList.add("hidden");

  if (role === "Guest") {
    overlay?.classList.remove("hidden");
  } else if (role === "Partner") {
    dashWrap?.classList.remove("hidden");
    renderPartnerDashboard(profile?.email);
  } else {
    // Customer or Admin -> show onboarding form
    formWrap?.classList.remove("hidden");
    if (profile) {
      const nameInput = document.getElementById("partner-name");
      if (nameInput && !nameInput.value) nameInput.value = profile.name;
    }
  }
}

window.refreshPartnerJobs = async function(btn) {
  if (btn) {
    btn.dataset.origHtml = btn.innerHTML;
    btn.innerHTML = `<svg class="spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>`;
    btn.disabled = true;
  }
  try {
    const bkRes = await SheetsAPI.getBookings();
    AppState.set("bookings", bkRes.data || []);
    const p = AppState.get('userProfile');
    if (p) renderPartnerDashboard(p.email);
  } catch (e) {
    Toast.show("Failed to refresh: " + e.message, "error");
  } finally {
    if (btn) {
      btn.innerHTML = btn.dataset.origHtml;
      btn.disabled = false;
    }
  }
}

function renderPartnerDashboard(email) {
  if (!email) return;
  const allPartners = AppState.get("partners") || [];
  const partner = allPartners.find(p => p.Email === email);
  if (!partner) return;
  
  const ratingDisplay = document.getElementById("partner-rating-display");
  if (ratingDisplay) {
    const r = parseFloat(partner.Rating);
    if (!isNaN(r)) {
      let emoji = "😃";
      if (r >= 4.0) emoji = "😘";
      else if (r < 3.0) emoji = "😞";
      
      ratingDisplay.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;gap:8px">
          <span>${r.toFixed(1)}</span>
          <span style="font-size:1.5rem" title="Customer Satisfaction">${emoji}</span>
        </div>
        <div style="color:#f59e0b;font-size:1rem;margin-top:4px;letter-spacing:2px;font-weight:400">${Utils.stars(r)}</div>
      `;
    } else {
      ratingDisplay.textContent = "New";
    }
  }
  
  const grid = document.getElementById("partner-jobs-grid");
  if (!grid) return;
  
  const allBookings = AppState.get("bookings") || [];
  const filterVal = document.getElementById("partner-job-filter")?.value || "all";
  
  let myJobs = allBookings.filter(b => b.AssignedPartner && b.AssignedPartner.includes(partner.PartnerID));

  const jobsCountDisplay = document.getElementById("partner-jobs-count");
  if (jobsCountDisplay) {
    const completed = myJobs.filter(b => b.JobStatus === "Completed").length;
    const active = myJobs.filter(b => ["Partner_Assigned", "Contacted", "In_Progress"].includes(b.JobStatus)).length;
    jobsCountDisplay.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;gap:8px">
        <span>${myJobs.length}</span>
        <span style="font-size:1.5rem">💼</span>
      </div>
      <div style="color:var(--slate-500);font-size:0.9rem;margin-top:4px;font-weight:500">${completed} Completed &middot; ${active} Active</div>
    `;
  }

  const feeContent = (AppState.get("content") || []).find(c => c.Key === "platform_fee_percent");
  const platformFee = feeContent ? (parseFloat(feeContent.Value) || 20) : 20;
  const earningMultiplier = (100 - platformFee) / 100;

  let totalEarnings = 0;
  myJobs.forEach(b => {
    if (b.JobStatus === "Completed" && b.AssignedPartner === partner.PartnerID && b.FinalPrice) {
      const p = parseFloat(b.FinalPrice);
      if (!isNaN(p)) totalEarnings += p * earningMultiplier;
    }
  });
  
  const earningsDisplay = document.getElementById("partner-earnings-display");
  if (earningsDisplay) {
    const completedCount = myJobs.filter(b => b.JobStatus === "Completed" && b.AssignedPartner === partner.PartnerID && b.FinalPrice).length;
    earningsDisplay.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;gap:8px">
        <span>₹${totalEarnings.toLocaleString("en-IN")}</span>
        <span style="font-size:1.5rem">💰</span>
      </div>
      <div style="color:var(--emerald-500);font-size:0.9rem;margin-top:4px;font-weight:500">From ${completedCount} jobs</div>
    `;
  }
  
  myJobs = myJobs.filter(b => {
    const isCompleted = b.JobStatus === "Completed" || b.JobStatus === "Cancelled";
    const isBroadcast = b.AssignedPartner.includes(",");
    if (filterVal === "all") return true;
    if (filterVal === "completed") return isCompleted;
    if (filterVal === "pending") return isBroadcast && !isCompleted;
    if (filterVal === "assigned") return !isBroadcast && !isCompleted;
    return true;
  });

  myJobs.sort((a, b) => {
    const getScore = (job) => {
      if (job.JobStatus === "Completed" || job.JobStatus === "Cancelled") return 3;
      if (job.AssignedPartner.includes(",")) return 2;
      return 1;
    };
    const sA = getScore(a);
    const sB = getScore(b);
    if (sA !== sB) return sA - sB;
    // Tie-breaker: reverse original order (assume string IDs sort alphabetically for recency or just keep order)
    return b.BookingID.localeCompare(a.BookingID);
  });
  
  // Pagination
  window.partnerJobPage = window.partnerJobPage || 1;
  const pageSize = parseInt(document.getElementById("partner-job-pagesize")?.value || 10, 10);
  const totalItems = myJobs.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  
  if (window.partnerJobPage > totalPages) window.partnerJobPage = totalPages;
  if (window.partnerJobPage < 1) window.partnerJobPage = 1;
  
  const startIdx = (window.partnerJobPage - 1) * pageSize;
  const pagedJobs = myJobs.slice(startIdx, startIdx + pageSize);
  
  const pageInfo = document.getElementById("partner-job-page-info");
  if (pageInfo) {
    if (totalItems === 0) {
      pageInfo.textContent = "0 of 0";
    } else {
      pageInfo.textContent = `${startIdx + 1}-${Math.min(startIdx + pageSize, totalItems)} of ${totalItems}`;
    }
  }
  const prevBtn = document.getElementById("partner-job-prev");
  if (prevBtn) prevBtn.disabled = (window.partnerJobPage <= 1);
  const nextBtn = document.getElementById("partner-job-next");
  if (nextBtn) nextBtn.disabled = (window.partnerJobPage >= totalPages);

  if (pagedJobs.length === 0) {
    grid.innerHTML = `<div class="text-center text-muted" style="grid-column:1/-1;padding:2rem">No jobs assigned yet.</div>`;
    return;
  }
  
  const formatTime = (t) => {
    if (!t) return "—";
    if (t.includes("T")) {
      try { return new Date(t).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}); } catch(e) {}
    }
    return t;
  };

  grid.innerHTML = pagedJobs.map(j => {
    const isCompleted = j.JobStatus === "Completed" || j.JobStatus === "Cancelled";
    const isBroadcast = j.AssignedPartner && j.AssignedPartner.includes(",");
    const isMasked = isCompleted || isBroadcast || j.JobStatus === "Pending";
    
    const mask = (str, n) => {
      if (!str) return "—";
      const s = String(str);
      return s.substring(0, n) + "***";
    };
    const custName = isMasked ? mask(j.CustomerName, 3) : (j.CustomerName || "—");
    const phoneHtml = isMasked ? `📞 ${mask(j.Phone, 4)}` : `<a href="tel:${j.Phone || ''}" style="color:inherit;text-decoration:none">📞 ${j.Phone || '—'}</a>`;
    const custArea = isMasked ? mask(j.Area, 4) : (j.Area || "—");
    
    let latLngStr = "";
    if (j.Lat && j.Lng) {
      latLngStr = `${j.Lat},${j.Lng}`;
    } else if (j.Area) {
      const match = j.Area.match(/\(([\d.-]+),\s*([\d.-]+)\)/);
      if (match) latLngStr = `${match[1]},${match[2]}`;
    }
    const mapQuery = latLngStr ? latLngStr : encodeURIComponent(j.Area || "");
    
    const mapHtml = (!isMasked) ? `<div style="margin-top:4px"><a href="https://www.google.com/maps?q=${mapQuery}" target="_blank" style="font-size:0.75rem;color:var(--color-primary);text-decoration:none;display:inline-flex;align-items:center;gap:4px;background:var(--emerald-50);padding:2px 8px;border-radius:99px;border:1px solid var(--emerald-100)"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg> Open in Maps</a></div>` : '';

    return `
    <div style="background:var(--color-bg);border:1px solid var(--color-border);border-radius:var(--r-lg);padding:1.25rem;display:flex;flex-direction:column;gap:1rem;position:relative">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:0.75rem">
        <div style="flex:1;min-width:150px">
          <div style="font-size:0.75rem;font-weight:700;color:var(--slate-400);letter-spacing:0.05em;margin-bottom:4px">${j.BookingID}</div>
          <div style="font-weight:700;font-size:1.1rem;color:var(--slate-900);line-height:1.3">${Utils.escapeHtml(AppState.get("services").find(s => s.ServiceID === j.SelectedService)?.ServiceName || j.SelectedService)}</div>
        </div>
        <div style="flex-shrink:0">
          ${Utils.statusBadge(j.JobStatus)}
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;background:#fff;padding:1rem;border-radius:var(--r-md);border:1px solid var(--color-border-2)">
        <div>
          <div style="font-size:0.75rem;color:var(--slate-500);margin-bottom:2px">Customer</div>
          <div style="font-weight:600;font-size:0.9rem">${Utils.escapeHtml(custName)}</div>
        </div>
        <div>
          <div style="font-size:0.75rem;color:var(--slate-500);margin-bottom:2px">Contact</div>
          <div style="font-weight:600;font-size:0.9rem;color:var(--color-primary)">
            ${phoneHtml}
          </div>
        </div>
        <div style="grid-column:1/-1">
          <div style="font-size:0.75rem;color:var(--slate-500);margin-bottom:2px">Location</div>
          <div style="font-weight:600;font-size:0.9rem;line-height:1.4">${Utils.escapeHtml(custArea)}</div>
          ${mapHtml}
        </div>
        <div style="grid-column:1/-1">
          <div style="font-size:0.75rem;color:var(--slate-500);margin-bottom:2px">Date & Time</div>
          <div style="font-weight:600;font-size:0.9rem">
            &#128197; ${Utils.formatDate ? Utils.formatDate(j.BookingDate) : (j.JobDate || j.BookingDate || "—")} &middot; &#128338; ${formatTime(j.JobTime || j.BookingTime)}
          </div>
        </div>
        <div style="grid-column:1/-1">
          <div style="font-size:0.75rem;color:var(--slate-500);margin-bottom:2px">Special Notes</div>
          <div style="font-weight:600;font-size:0.9rem;color:var(--color-primary)">
            ${j.SpecialNotes ? Utils.escapeHtml(j.SpecialNotes) : '<span class="text-muted">None</span>'}
          </div>
        </div>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;padding-top:0.5rem;border-top:1px solid var(--color-border-2)">
        <div>
          <div style="font-size:0.75rem;color:var(--slate-500)">Rating</div>
          <div style="font-weight:600">${j.Rating ? `<span style="color:#f59e0b">⭐ ${j.Rating}</span>` : '<span class="text-muted">—</span>'}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:0.75rem;color:var(--slate-500)">Earning</div>
          <div style="font-weight:800;color:var(--emerald-600);font-size:1.1rem">${j.FinalPrice ? `₹${Math.round(parseFloat(j.FinalPrice) * earningMultiplier)}` : '—'}</div>
        </div>
      </div>

      ${j.JobStatus === "Partner_Assigned" ? (isBroadcast ? `
        <button class="btn btn-primary btn-full" style="margin-top:0.5rem;background:var(--emerald-600);border-color:var(--emerald-600)" onclick="acceptBroadcastJob('${j.BookingID}', '${partner.PartnerID}', this)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 13l4 4L19 7"/></svg>
          Accept Job
        </button>
      ` : `
        <button class="btn btn-primary btn-full" style="margin-top:0.5rem" onclick="markJobComplete('${j.BookingID}')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>
          Mark Complete
        </button>
      `) : ''}
    </div>
    `;
  }).join("");
}

window.acceptBroadcastJob = async function(bookingId, partnerId, btn) {
  const origText = btn.innerHTML;
  btn.innerHTML = "Accepting...";
  btn.disabled = true;

  try {
    const res = await SheetsAPI.acceptJob({ BookingID: bookingId, PartnerID: partnerId });
    if (res.status === "error") {
      Toast.show(res.message, "error");
      // Someone else might have claimed it, reload to reflect
      const bks = await SheetsAPI.getBookings();
      AppState.set("bookings", bks.data || []);
      const profile = AppState.get("userProfile");
      if (profile) renderPartnerDashboard(profile.email);
      return;
    }

    Toast.show("Job accepted successfully!", "success");
    const bks = AppState.get("bookings") || [];
    const b = bks.find(x => x.BookingID === bookingId);
    if (b) b.AssignedPartner = partnerId;
    AppState.set("bookings", bks);
    
    const profile = AppState.get("userProfile");
    if (profile) renderPartnerDashboard(profile.email);
  } catch (err) {
    Toast.show("Error accepting job: " + err.message, "error");
    btn.innerHTML = origText;
    btn.disabled = false;
  }
};

window.markJobComplete = function(bookingId) {
  document.getElementById("complete-job-id").value = bookingId;
  const photoInput = document.getElementById("complete-job-photo");
  if (photoInput) photoInput.value = "";
  const nameEl = document.getElementById("complete-job-photo-name");
  if (nameEl) nameEl.textContent = "No file selected";
  Modal.open("complete-job-modal");
};

document.getElementById("complete-job-submit")?.addEventListener("click", async () => {
  const bookingId = document.getElementById("complete-job-id").value;
  const photoInput = document.getElementById("complete-job-photo");
  const btn = document.getElementById("complete-job-submit");
  
  const origText = btn.innerHTML;
  btn.innerHTML = "Saving...";
  btn.disabled = true;

  try {
    let finalImageUrl = "";
    if (photoInput && photoInput.files.length > 0) {
      const file = photoInput.files[0];
      if (file.size > 10 * 1024 * 1024) {
        throw new Error("Image must be smaller than 10MB");
      }
      
      btn.innerHTML = "Uploading to ImgBB...";
      
      const formData = new FormData();
      formData.append("image", file);
      
      const res = await fetch("https://api.imgbb.com/1/upload?key=067538657aea330a1d149baf45171d04", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (data && data.success) {
        finalImageUrl = data.data.url;
      } else {
        throw new Error(data.error ? data.error.message : "Image upload failed");
      }
    }

    const payload = { BookingID: bookingId, JobStatus: "Completed" };
    if (finalImageUrl) {
      payload.CompletionImage = finalImageUrl;
    }

    await SheetsAPI.updateBooking(payload);
    
    const bks = AppState.get("bookings") || [];
    const b = bks.find(x => x.BookingID === bookingId);
    if (b) {
      b.JobStatus = "Completed";
      // We don't get the image URL back immediately unless we refactor the API to return it,
      // but reloading state handles it or we can just ignore local caching of the image for partners
    }
    AppState.set("bookings", bks);
    
    Toast.show("Job marked as completed!", "success");
    Modal.close("complete-job-modal");
    
    const profile = AppState.get("userProfile");
    if (profile) renderPartnerDashboard(profile.email);
  } catch (err) {
    Toast.show("Error: " + err.message, "error");
  } finally {
    btn.innerHTML = origText;
    btn.disabled = false;
  }
});

// ── Skill Chips (multi-select) ────────────────────────────────
function initSkillChips() {
  const group = document.getElementById("skill-chips");
  if (!group) return;

  const services = AppState.get("services") || [];
  const cats = [...new Set(services.filter(s => s.Status === "Active").map(s => s.Category))];

  group.innerHTML = cats.map(cat => `
    <button type="button" class="chip" data-cat="${cat}">${cat}</button>
  `).join("");

  group.querySelectorAll(".chip").forEach(chip => {
    chip.addEventListener("click", () => {
      chip.classList.toggle("selected");
      syncSkillsInput();
    });
  });

  function syncSkillsInput() {
    const selected = [...group.querySelectorAll(".chip.selected")].map(c => c.dataset.cat);
    const input = document.getElementById("partner-skills-hidden");
    if (input) input.value = selected.join(", ");
  }
}

// ── Partner Onboarding Form ───────────────────────────────────
function initPartnerForm() {
  const form = document.getElementById("partner-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name     = document.getElementById("partner-name")?.value.trim();
    const phone    = document.getElementById("partner-phone")?.value.trim();
    const skills   = document.getElementById("partner-skills-hidden")?.value.trim();
    const areas    = document.getElementById("partner-areas")?.value.trim();
    const exp      = document.getElementById("partner-exp")?.value.trim();
    const agree    = document.getElementById("partner-agree")?.checked;

    // Validation
    if (!name)  { Toast.show("Please enter your full name.", "error"); return; }
    if (!phone || !/^\d{10}$/.test(phone)) { Toast.show("Please enter a valid 10-digit phone number.", "error"); return; }
    if (!skills) { Toast.show("Please select at least one skill.", "error"); return; }
    if (!areas)  { Toast.show("Please enter your service area(s).", "error"); return; }
    if (!agree)  { Toast.show("Please accept the terms to continue.", "error"); return; }

    const btn = document.getElementById("partner-submit-btn");
    Utils.showLoading(btn, "Submitting...");

    try {
      const profile = AppState.get("userProfile");
      const res = await SheetsAPI.addPartner({
        Name:              name,
        Email:             profile ? profile.email : "",
        Phone:             phone,
        Skillset:          skills,
        ServiceableAreas:  areas,
        Experience:        exp || "",
      });

      // Show success state
      form.classList.add("hidden");
      const successEl = document.getElementById("partner-success");
      if (successEl) {
        successEl.classList.remove("hidden");
        document.getElementById("partner-new-id").textContent = res.partnerId || "PTR-PENDING";
        successEl.scrollIntoView({ behavior: "smooth", block: "center" });
        // Confetti-style circles
        launchConfetti(successEl);
      }

      Toast.show("🎉 Application submitted! We'll review and contact you shortly.", "success", 5000);

      // Reload partners
      SheetsAPI.getPartners().then(r => AppState.set("partners", r.data || []));
    } catch (err) {
      Toast.show("Error submitting application: " + err.message, "error");
    } finally {
      Utils.hideLoading(btn);
    }
  });

  // Initialize states
  window.populateStates = function() {
    const areas = AppState.get("areas") || [];
    const states = [...new Set(areas.map(a => a.State).filter(Boolean))];
    const stateSelect = document.getElementById("partner-state");
    if (!stateSelect) return;
    
    stateSelect.innerHTML = `<option value="">Select State</option>` + 
      states.map(s => `<option value="${Utils.escapeHtml(s)}">${Utils.escapeHtml(s)}</option>`).join("");
  };

  window.populateDistricts = function() {
    const selectedState = document.getElementById("partner-state").value;
    const areas = AppState.get("areas") || [];
    const districts = [...new Set(areas.filter(a => a.State === selectedState).map(a => a.District).filter(Boolean))];
    const districtSelect = document.getElementById("partner-district");
    if (!districtSelect) return;
    
    districtSelect.innerHTML = `<option value="">Select District</option>` + 
      districts.map(d => `<option value="${Utils.escapeHtml(d)}">${Utils.escapeHtml(d)}</option>`).join("");
      
    // clear cities
    document.getElementById("partner-cities-container").innerHTML = "";
    document.getElementById("partner-areas").value = "";
  };

  window.populateCities = function() {
    const selectedState = document.getElementById("partner-state").value;
    const selectedDistrict = document.getElementById("partner-district").value;
    const areas = AppState.get("areas") || [];
    
    let cities = [];
    areas.forEach(a => {
      if (a.State === selectedState && a.District === selectedDistrict && a.Cities) {
        cities.push(...a.Cities.split(",").map(c => c.trim()).filter(Boolean));
      }
    });
    cities = [...new Set(cities)]; // unique cities
    
    const container = document.getElementById("partner-cities-container");
    if (!container) return;
    
    container.innerHTML = cities.map(c => `
      <label style="display:flex;align-items:center;gap:8px;font-size:0.9rem;padding:4px">
        <input type="checkbox" class="city-checkbox" value="${Utils.escapeHtml(c)}" onchange="updateSelectedCities()">
        ${Utils.escapeHtml(c)}
      </label>
    `).join("");
    document.getElementById("partner-areas").value = "";
  };

  window.updateSelectedCities = function() {
    const container = document.getElementById("partner-cities-container");
    const checked = [...container.querySelectorAll(".city-checkbox:checked")].map(cb => cb.value);
    document.getElementById("partner-areas").value = checked.join(", ");
  };

  // Call populateStates initially to fill the state dropdown
  window.populateStates();
}

// ── Confetti / Success Animation ─────────────────────────────
function launchConfetti(container) {
  const colors = ["#10b981","#34d399","#0d9488","#2dd4bf","#f59e0b","#818cf8"];
  for (let i = 0; i < 40; i++) {
    const dot = document.createElement("div");
    const size = Math.random() * 10 + 5;
    dot.style.cssText = `
      position:fixed;
      width:${size}px;height:${size}px;
      border-radius:${Math.random() > .5 ? "50%" : "3px"};
      background:${colors[Math.floor(Math.random() * colors.length)]};
      left:${Math.random() * 100}vw;
      top:-20px;
      z-index:9999;
      pointer-events:none;
      opacity:0.9;
      animation: confettiFall ${1.5 + Math.random() * 2}s ease-in ${Math.random() * .8}s forwards;
    `;
    document.body.appendChild(dot);
    setTimeout(() => dot.remove(), 4000);
  }

  // Inject confetti keyframes if not present
  if (!document.getElementById("confetti-style")) {
    const style = document.createElement("style");
    style.id = "confetti-style";
    style.textContent = `
      @keyframes confettiFall {
        0% { transform: translateY(0) rotate(0deg); opacity: .9; }
        100% { transform: translateY(100vh) rotate(${Math.random() > .5 ? "+" : "-"}${360 + Math.random() * 360}deg); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }
}

// ── Re-init when data/auth loads ───────────────────────────
document.addEventListener("dataLoaded", () => {
  if (AppState.get("currentPage") === "partner") {
    initPartnerModule();
  }
});

document.addEventListener("authChanged", () => {
  if (AppState.get("currentPage") === "partner") {
    initPartnerModule();
  }
});

window.changePartnerJobPageSize = function() { window.partnerJobPage = 1; const p = AppState.get('userProfile'); if (p) renderPartnerDashboard(p.email); };
window.prevPartnerJobPage = function() { window.partnerJobPage--; const p = AppState.get('userProfile'); if (p) renderPartnerDashboard(p.email); };
window.nextPartnerJobPage = function() { window.partnerJobPage++; const p = AppState.get('userProfile'); if (p) renderPartnerDashboard(p.email); };
