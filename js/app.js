/**
 * ============================================================
 * App Router & Global State Manager
 * ============================================================
 * Hash-based SPA routing with observable reactive state.
 * Handles page transitions, toasts, modals, and admin auth.
 * ============================================================
 */

// ── Global State Store ──────────────────────────────────────
const AppState = (() => {
  const _state = {
    currentPage: "home",        // home | services | tracker | admin | partner
    currentAdminView: "dashboard",
    services: [],
    bookings: [],
    partners: [],
    stats: {},
    isLoading: false,
    userProfile: null, // { email, name, picture }
    userRole: "Guest", // Guest | Customer | Partner | Admin
  };

  const _listeners = {};

  function get(key) { return _state[key]; }

  function set(key, val) {
    _state[key] = val;
    (_listeners[key] || []).forEach(fn => fn(val));
  }

  function on(key, fn) {
    if (!_listeners[key]) _listeners[key] = [];
    _listeners[key].push(fn);
  }

  return { get, set, on };
})();

// ── Toast System ────────────────────────────────────────────
const Toast = (() => {
  let container;
  function init() {
    container = document.querySelector(".toast-container");
    if (!container) {
      container = document.createElement("div");
      container.className = "toast-container";
      document.body.appendChild(container);
    }
  }
  function show(message, type = "success", duration = 3500) {
    if (!container) init();
    const icons = {
      success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18" height="18" style="color:#10b981"><path d="M20 6L9 17l-5-5"/></svg>`,
      error:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18" height="18" style="color:#ef4444"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>`,
      warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18" height="18" style="color:#f59e0b"><path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>`,
      info:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18" height="18" style="color:#3b82f6"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>`,
    };
    const el = document.createElement("div");
    el.className = `toast${type !== "success" ? " " + type : ""}`;
    el.innerHTML = `${icons[type] || ""}<span>${message}</span>`;
    container.appendChild(el);
    setTimeout(() => { el.style.opacity = "0"; el.style.transform = "translateY(10px)"; el.style.transition = "all .3s ease"; setTimeout(() => el.remove(), 300); }, duration);
  }
  return { show, init };
})();

// ── Modal Manager ───────────────────────────────────────────
const Modal = (() => {
  function open(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add("open");
    document.body.style.overflow = "hidden";
  }
  function close(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove("open");
    document.body.style.overflow = "";
  }
  function init() {
    document.querySelectorAll(".modal-backdrop").forEach(backdrop => {
      backdrop.addEventListener("click", e => {
        if (e.target === backdrop) close(backdrop.id);
      });
    });
  }
  return { open, close, init };
})();

// ── Router ──────────────────────────────────────────────────
const Router = (() => {
  const routes = {
    "":        "home",
    "home":    "home",
    "services":"services",
    "tracker": "tracker",
    "admin":   "admin",
    "partner": "partner",
    "extra":   "extra",
  };

  function navigate(page) {
    window.location.hash = page;
  }

  function getPage(hash) {
    const key = (hash || "").replace("#", "");
    return routes[key] || "home";
  }

  function showPage(pageName) {
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    const target = document.getElementById(`page-${pageName}`);
    if (target) { target.classList.add("active"); window.scrollTo(0, 0); }

    // Hide top navigation entirely for Admin Panel
    const custNav = document.getElementById("customer-nav");
    if (custNav) {
      custNav.style.display = pageName === "admin" ? "none" : "flex";
    }

    // Update nav links
    document.querySelectorAll(".nav-links a, .bottom-nav-item").forEach(a => {
      a.classList.toggle("active", a.dataset.page === pageName);
    });

    AppState.set("currentPage", pageName);
    document.dispatchEvent(new CustomEvent("pageChanged", { detail: pageName }));
  }

  function init() {
    window.addEventListener("hashchange", () => {
      const page = getPage(window.location.hash);
      showPage(page);
    });

    // Handle all data-page links
    document.addEventListener("click", e => {
      const link = e.target.closest("[data-page]");
      if (link && link.dataset.page) {
        e.preventDefault();
        navigate(link.dataset.page);
      }
    });

    // Initial load
    const page = getPage(window.location.hash);
    showPage(page);
  }

  return { navigate, showPage, init, getPage };
})();

// ── Auth & Google Identity ───────────────────────────────────
const Auth = (() => {
  // No admin emails stored here — checked server-side via Apps Script

  function parseJwt(token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (e) {
      console.error("JWT Decode failed", e);
      return null;
    }
  }

  async function determineRole(email) {
    // Check admin status on the server
    try {
      const res = await SheetsAPI.checkAdmin(email);
      if (res && res.isAdmin) {
        AppState.set("adminType", res.type || "Master");
        AppState.set("adminPermissions", res.permissions || null);
        return "Admin";
      }
    } catch (err) {
      console.warn("Admin check failed, falling back to Customer role:", err);
    }
    
    let partners = AppState.get("partners") || [];
    // If partners haven't loaded yet, fetch them quickly to avoid the 30s fallback delay
    if (partners.length === 0) {
      try {
        const pRes = await SheetsAPI.getPartners();
        partners = pRes.data || [];
      } catch (err) {}
    }
    
    if (partners.some(p => p.Email === email)) return "Partner";
    return "Customer";
  }

  async function login(token) {
    const profile = parseJwt(token);
    if (!profile || !profile.email) return false;
    
    const role = await determineRole(profile.email);
    AppState.set("userProfile", profile);
    AppState.set("userRole", role);
    
    localStorage.setItem("user_token", token);
    localStorage.setItem("cached_role", role);
    localStorage.setItem("cached_profile", JSON.stringify(profile));
    // Cache sub-admin type & permissions so initial render is correct
    localStorage.setItem("cached_adminType", AppState.get("adminType") || "");
    const perms = AppState.get("adminPermissions");
    localStorage.setItem("cached_adminPermissions", perms ? JSON.stringify(perms) : "");
    
    updateUIAfterLogin(profile, role);
    return true;
  }

  function logout() {
    localStorage.removeItem("user_token");
    localStorage.removeItem("cached_role");
    localStorage.removeItem("cached_profile");
    localStorage.removeItem("cached_adminType");
    localStorage.removeItem("cached_adminPermissions");
    AppState.set("userProfile", null);
    AppState.set("userRole", "Guest");
    
    document.getElementById("auth-container").classList.remove("hidden");
    document.getElementById("user-profile-menu").classList.add("hidden");
    
    // Reset navbar text
    const partnerLink = document.getElementById("nav-partner");
    if (partnerLink) partnerLink.textContent = "Become a Partner";

    // Reset bottom nav last button for Guest
    const lastBtn   = document.getElementById("bottom-nav-last-btn");
    const lastLabel = document.getElementById("bottom-nav-last-label");
    const lastIcon  = document.getElementById("bottom-nav-last-icon");
    if (lastBtn && lastLabel && lastIcon) {
      lastBtn.setAttribute("data-page", "extra");
      lastBtn.removeAttribute("onclick");
      lastBtn.classList.add("is-extra");
      lastLabel.textContent = "Wish";
      lastLabel.classList.add("premium-gradient-text");
      lastIcon.textContent  = "★";
      lastIcon.style.cssText = "font-size:1.3rem";
    }

    Toast.show("Logged out successfully.", "info");
    Router.navigate("home");
  }

  function updateUIAfterLogin(profile, role) {
    document.getElementById("auth-container").classList.add("hidden");
    const profileMenu = document.getElementById("user-profile-menu");
    profileMenu.classList.remove("hidden");
    
    document.getElementById("user-avatar").src = profile.picture || "";
    document.getElementById("user-name-display").textContent = profile.name;
    document.getElementById("user-role-badge").textContent = role;
    
    // Add dynamic nav link if Admin
    const navLinks = document.querySelector(".nav-links");
    let adminLink = document.getElementById("nav-admin");
    if (role === "Admin" && !adminLink) {
      const li = document.createElement("li");
      li.innerHTML = `<a href="#admin" data-page="admin" id="nav-admin" style="color:var(--emerald-600); font-weight:700;">Admin Panel</a>`;
      navLinks.appendChild(li);
    } else if (role !== "Admin" && adminLink) {
      adminLink.parentElement.remove();
    }

    // Show/hide Extra nav link — hide for Admin (they have Admin Panel)
    const extraNavLi = document.getElementById("nav-extra-li");
    if (extraNavLi) {
      extraNavLi.style.display = role === "Admin" ? "none" : "";
    }
    
    // Update Partner link text
    const partnerLink = document.getElementById("nav-partner");
    if (partnerLink) {
      if (role === "Partner") {
        partnerLink.textContent = "Partner Jobs";
      } else {
        partnerLink.textContent = "Become a Partner";
      }
    }
    
    // Update bottom nav last button based on role
    const lastBtn   = document.getElementById("bottom-nav-last-btn");
    const lastLabel = document.getElementById("bottom-nav-last-label");
    const lastIcon  = document.getElementById("bottom-nav-last-icon");
    if (lastBtn && lastLabel && lastIcon) {
      lastBtn.setAttribute("data-page", "extra");
      lastBtn.removeAttribute("onclick");
      lastBtn.classList.add("is-extra");
      lastLabel.textContent = "Wish";
      lastLabel.classList.add("premium-gradient-text");
      lastIcon.textContent  = "★";
      lastIcon.style.cssText = "font-size:1.3rem";
    }

    // Wire logout in extra sheet
    const sheetLogout = document.getElementById("extra-sheet-logout-btn");
    if (sheetLogout) {
      sheetLogout.onclick = () => { closeExtraSheet(); document.getElementById("logout-btn")?.click(); };
    }

    // Close overlays if open
    const overlay = document.getElementById("admin-login-overlay");
    if (overlay) {
      overlay.classList.add("hidden");
    }
    if (role === "Admin" && AppState.get("currentPage") === "admin") {
      initAdminModule();
    }
    
    // Dispatch event so other modules can react
    document.dispatchEvent(new CustomEvent("authChanged", { detail: { profile, role } }));
  }

  function init() {
    // Check local storage on load
    const token = localStorage.getItem("user_token");
    if (token) {
      // 1. Instantly bootstrap with cached role
      const cachedRole = localStorage.getItem("cached_role");
      const cachedProfile = localStorage.getItem("cached_profile");
      
      if (cachedRole && cachedProfile) {
        try {
          const profile = JSON.parse(cachedProfile);
          AppState.set("userProfile", profile);
          AppState.set("userRole", cachedRole);
          // Restore cached sub-admin type & permissions so initial render hides correct menus
          const cachedAdminType = localStorage.getItem("cached_adminType");
          if (cachedAdminType) AppState.set("adminType", cachedAdminType);
          const cachedPerms = localStorage.getItem("cached_adminPermissions");
          if (cachedPerms) {
            try { AppState.set("adminPermissions", JSON.parse(cachedPerms)); } catch(e) {}
          }
          updateUIAfterLogin(profile, cachedRole);
          
          if (window.location.hash === "" || window.location.hash === "#home") {
            if (cachedRole === "Admin") Router.navigate("admin");
            else if (cachedRole === "Partner") Router.navigate("partner");
          }
        } catch(e) {
          console.error("Cache parsing error", e);
        }
      }

      // 2. Validate token and determine role in background
      login(token).then(() => {
        // Auto-redirect on initial load if they are on the home page (fallback)
        if (window.location.hash === "" || window.location.hash === "#home") {
          const role = AppState.get("userRole");
          if (role === "Admin") Router.navigate("admin");
          else if (role === "Partner") Router.navigate("partner");
        }
      });
    }
    
    // Listen to dataLoaded to re-evaluate roles (e.g. if a partner was just approved)
    AppState.on("partners", async () => {
      const profile = AppState.get("userProfile");
      if (profile) {
        const newRole = await determineRole(profile.email);
        if (newRole !== AppState.get("userRole")) {
          AppState.set("userRole", newRole);
          updateUIAfterLogin(profile, newRole);
        }
      }
    });

    // Apply CMS Content to DOM
    AppState.on("content", (items) => {
      items.forEach(item => {
        const el = document.getElementById(`content-${item.Key}`);
        if (el) {
          if (el.tagName === "INPUT") {
            el.placeholder = item.Value;
          } else if (el.tagName === "IMG") {
            // Logo image: only show if URL is set in Sheets
            if (item.Value && item.Value.trim()) {
              el.src = item.Value.trim();
              el.style.display = "inline-block";
              const svgLogo = document.getElementById("logo_svg");
              if (svgLogo && item.Key === "logo_image") svgLogo.style.display = "none";
            } else {
              // No logo set in Sheets — keep default SVG visible
              el.style.display = "none";
              const svgLogo = document.getElementById("logo_svg");
              if (svgLogo && item.Key === "logo_image") svgLogo.style.display = "inline-block";
            }
          } else {
            // Only override text if Sheets has a non-empty value
            if (item.Value && item.Value.trim()) {
              el.innerHTML = item.Value.trim();
            }
            // If empty in Sheets, leave the hardcoded HTML default as-is
          }
        }

        // Sync Genie Lamp Image with custom logo_image CMS setting
        if (item.Key === "logo_image") {
          const lampImg = document.getElementById("genie-lamp-img");
          if (lampImg) {
            const val = item.Value && item.Value.trim();
            lampImg.src = val ? val : "logo.png";
            lampImg.style.display = "block";
            const lampSvg = document.getElementById("genie-lamp-svg");
            if (lampSvg) lampSvg.style.display = "none";
          }
        }

        // Handle app download button visibility
        if (item.Key === "app_link" || item.Key === "app_pwa_enabled") {
          const allContent = items || [];
          const appLink   = (allContent.find(i => i.Key === "app_link") || {}).Value || "";
          const pwaEnable = String((allContent.find(i => i.Key === "app_pwa_enabled") || {}).Value).toLowerCase() === "true";
          const btn       = document.getElementById("nav-download-app-btn");
          if (btn) {
            const show = !!(appLink.trim() || pwaEnable);
            btn.style.display = show ? "flex" : "none";
          }
          // Store for use by handleDownloadApp
          window._appLink    = appLink.trim();
          window._appPwaEnabled = pwaEnable;
        }
      });
    });

    // Apply FAQs to DOM
    AppState.on("faqs", (items) => {
      const container = document.getElementById("faq-accordion");
      if (!container) return;
      const activeItems = items.filter(f => f.Status === "Active" && (!f.Section || f.Section === "Main"));
      if (!activeItems.length) {
        document.getElementById("faq-section").style.display = "none";
      } else {
        document.getElementById("faq-section").style.display = "block";
        container.innerHTML = activeItems.map((f, i) => `
          <details style="background:var(--slate-50);border:1px solid var(--slate-200);border-radius:var(--r-md);padding:1rem;cursor:pointer;outline:none">
            <summary style="font-weight:600;font-size:1.1rem;color:var(--slate-800);list-style:none;display:flex;justify-content:space-between;align-items:center">
              ${Utils.escapeHtml(f.Question)}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 9l-7 7-7-7"/></svg>
            </summary>
            <div style="margin-top:1rem;color:var(--slate-600);line-height:1.6">
              ${Utils.escapeHtml(f.Answer).replace(/\n/g, '<br>')}
            </div>
          </details>
        `).join("");
      }
    });

    // Apply Contacts to DOM
    AppState.on("contacts", (items) => {
      const grid = document.getElementById("contact-cards-grid");
      if (!grid) return;
      if (!items || items.length === 0) {
        grid.innerHTML = `<p class="text-muted text-center" style="grid-column:1/-1">No contact info available.</p>`;
        return;
      }
      const iconMap = {
        phone:    `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 015 12.84a19.79 19.79 0 01-3.07-8.67A2 2 0 013.92 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>`,
        email:    `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`,
        whatsapp: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>`,
        address:  `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
        website:  `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>`,
      };
      const linkMap = {
        phone:    (v) => String(v).startsWith("http") ? String(v) : `tel:${String(v).replace(/\s/g, "")}`,
        email:    (v) => String(v).startsWith("mailto:") ? String(v) : `mailto:${String(v)}`,
        whatsapp: (v) => {
          v = String(v);
          if (v.startsWith("http")) return v;
          const digits = v.replace(/\D/g, "");
          return `https://wa.me/${digits}`;
        },
        address:  (v) => String(v).startsWith("http") ? String(v) : `https://www.google.com/maps?q=${encodeURIComponent(String(v))}`,
        website:  (v) => String(v).startsWith("http") ? String(v) : `https://${String(v)}`,
        location: (v) => String(v).startsWith("http") ? String(v) : `https://www.google.com/maps?q=${encodeURIComponent(String(v))}`,
        web:      (v) => String(v).startsWith("http") ? String(v) : `https://${String(v)}`,
        link:     (v) => String(v).startsWith("http") ? String(v) : `https://${String(v)}`,
        text:     (v) => "",
        time:     (v) => ""
      };
      grid.innerHTML = items.map(c => {
        const lookupKey = (c.Icon && iconMap[c.Icon.toLowerCase()]) ? c.Icon.toLowerCase() : (c.Type || "phone").toLowerCase();
        const icon = iconMap[lookupKey] || iconMap.phone;
        let href = linkMap[lookupKey] ? linkMap[lookupKey](c.Value || "") : "";
        
        // Handle #ERROR! gracefully
        if (c.Value && String(c.Value).includes("#ERROR")) {
            href = "";
        }

        let actionText = "Click to connect";
        if (lookupKey === "phone") actionText = "Click to call";
        else if (lookupKey === "email") actionText = "Click to email";
        else if (lookupKey === "whatsapp") actionText = "Click to chat";
        else if (lookupKey === "address" || lookupKey === "location") actionText = "View on map";
        else if (lookupKey === "website" || lookupKey === "web" || lookupKey === "link") actionText = "Visit website";
        else if (lookupKey === "text" || lookupKey === "time") actionText = "";

        if (actionText === "") {
          return `
            <div class="contact-card" style="display:block;text-decoration:none;cursor:default">
              <div style="background:#fff;border:1px solid var(--color-border);border-radius:var(--r-lg);padding:1.25rem 1.5rem;display:flex;flex-direction:column;align-items:center;text-align:center;gap:0.75rem;height:100%;transition:box-shadow 0.2s,transform 0.2s;"
                onmouseover="this.style.boxShadow='var(--shadow-md)';this.style.transform='translateY(-2px)'"
                onmouseout="this.style.boxShadow='none';this.style.transform='translateY(0)'">
                <div style="width:44px;height:44px;border-radius:50%;background:var(--emerald-50);display:flex;align-items:center;justify-content:center;color:var(--color-primary)">
                  ${icon}
                </div>
                <div>
                  <div style="font-weight:700;font-size:0.9rem;color:var(--slate-800);margin-bottom:4px">${Utils.escapeHtml(c.Label || type)}</div>
                  <div style="font-size:0.85rem;color:var(--slate-600);font-weight:500;">${Utils.escapeHtml(c.Value)}</div>
                </div>
              </div>
            </div>`;
        } else {
          return `
            <a href="${href ? Utils.escapeHtml(href) : '#'}" ${href && href.startsWith('http') ? 'target="_blank" rel="noopener noreferrer"' : ''} class="contact-card" style="display:block;text-decoration:none;cursor:${href ? 'pointer' : 'default'}">
              <div style="background:#fff;border:1px solid var(--color-border);border-radius:var(--r-lg);padding:1.25rem 1.5rem;display:flex;flex-direction:column;align-items:center;text-align:center;gap:0.75rem;height:100%;transition:box-shadow 0.2s,transform 0.2s;"
                onmouseover="this.style.boxShadow='var(--shadow-md)';this.style.transform='translateY(-2px)'"
                onmouseout="this.style.boxShadow='none';this.style.transform='translateY(0)'">
                <div style="width:44px;height:44px;border-radius:50%;background:var(--emerald-50);display:flex;align-items:center;justify-content:center;color:var(--color-primary)">
                  ${icon}
                </div>
                <div>
                  <div style="font-weight:700;font-size:0.9rem;color:var(--slate-800);margin-bottom:4px">${Utils.escapeHtml(c.Label || type)}</div>
                  <div style="font-size:0.85rem;color:var(--color-primary);font-weight:500;">${actionText} &rarr;</div>
                </div>
              </div>
            </a>`;
        }
      }).join("");
    });

    // Footer Map
    document.addEventListener("dataLoaded", () => {
      const mapEl = document.getElementById("footer-map");
      if (mapEl && !mapEl.classList.contains("leaflet-container") && typeof L !== "undefined") {
        const footerMap = L.map('footer-map', { zoomControl: false, scrollWheelZoom: false }).setView([23.0725, 88.8252], 10);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; CARTO'
        }).addTo(footerMap);
        L.marker([23.0725, 88.8252]).addTo(footerMap).bindPopup('<b>Jini24 Services</b><br>Serving Bongaon & Ranaghat');
      }
    });
    
    // Setup logout listener
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
      logoutBtn.onclick = (e) => {
        e.stopPropagation();
        document.getElementById('profile-dropdown-content')?.classList.add('hidden');
        logout();
      };
    }
    
    // Close dropdown on outside click
    document.addEventListener("click", (e) => {
      const menu = document.getElementById("user-profile-menu");
      const dropdown = document.getElementById("profile-dropdown-content");
      if (menu && dropdown && !menu.contains(e.target)) {
        dropdown.classList.add("hidden");
      }
    });
  }

  const COMMON_AREAS = ["Bongaon", "Ranaghat", "Gaighata", "Habra", "Santipur", "Chakdaha", "Kalyani", "Krishnanagar"];

  function initMultiSelect(inputId, searchId, dropdownId, badgesId, options, initialValues) {
    const input = document.getElementById(inputId);
    const search = document.getElementById(searchId);
    const dropdown = document.getElementById(dropdownId);
    const badges = document.getElementById(badgesId);
    
    let selected = initialValues.split(",").map(s => s.trim()).filter(Boolean);
    
    function render() {
      input.value = selected.join(", ");
      
      // Render badges
      badges.innerHTML = "";
      selected.forEach(val => {
        const opt = options.find(o => o.value === val);
        const label = opt ? opt.label : val;
        const b = document.createElement("span");
        b.className = "badge";
        b.style.cssText = "background:var(--emerald-100);color:var(--emerald-800);padding:2px 8px;border-radius:12px;font-size:0.75rem;display:flex;align-items:center;gap:4px";
        b.innerHTML = `${label} <span style="cursor:pointer;font-weight:bold" data-val="${val}">&times;</span>`;
        b.querySelector("span").onclick = (e) => {
          e.stopPropagation();
          selected = selected.filter(s => s !== val);
          render();
        };
        badges.appendChild(b);
      });
      
      // Render dropdown items
      const query = search.value.toLowerCase();
      dropdown.innerHTML = "";
      options.filter(o => o.label.toLowerCase().includes(query) || o.value.toLowerCase().includes(query)).forEach(opt => {
        const div = document.createElement("label");
        div.style.cssText = "display:flex;align-items:center;gap:8px;padding:4px 8px;cursor:pointer;border-radius:4px;font-size:0.85rem;color:var(--slate-800)";
        div.onmouseover = () => div.style.background = "var(--slate-50)";
        div.onmouseout = () => div.style.background = "transparent";
        
        const chk = document.createElement("input");
        chk.type = "checkbox";
        chk.checked = selected.includes(opt.value);
        chk.onchange = (e) => {
          if (e.target.checked) {
            if (!selected.includes(opt.value)) selected.push(opt.value);
          } else {
            selected = selected.filter(s => s !== opt.value);
          }
          render();
        };
        
        div.appendChild(chk);
        div.appendChild(document.createTextNode(opt.label));
        dropdown.appendChild(div);
      });
    }
    
    search.onfocus = () => dropdown.classList.remove("hidden");
    search.oninput = () => render();
    
    // Document click to close dropdowns
    document.addEventListener("click", (e) => {
      if (!search.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.add("hidden");
      }
    });
    
    render();
  }

  function openProfileModal() {
    const profile = AppState.get("userProfile");
    if (!profile) return;
    
    const users = AppState.get("users") || [];
    const myProfile = users.find(u => u.Email === profile.email);
    
    document.getElementById("profile-name").value = myProfile ? myProfile.Name : profile.name;
    document.getElementById("profile-phone").value = myProfile ? (myProfile.Phone || "") : "";
    
    const role = AppState.get("userRole");
    const address = myProfile ? (myProfile.Address || "") : "";
    
    // Initialize profile areas dropdowns
    const areasList = AppState.get("areas") || [];
    const stateSelect = document.getElementById("profile-state");
    stateSelect.innerHTML = '<option value="">Select State</option>';
    const uniqueStates = [...new Set(areasList.map(a => a.State))].filter(Boolean).sort();
    uniqueStates.forEach(s => {
      stateSelect.innerHTML += `<option value="${Utils.escapeHtml(s)}">${Utils.escapeHtml(s)}</option>`;
    });
    
    let foundState = "", foundDistrict = "", foundCity = address;
    for (const a of areasList) {
      const cities = (a.Cities || a.City || "").split(",").map(c => c.trim()).filter(Boolean);
      if (cities.includes(address) || address === (a.District||"").trim() || address === (a.AreaName||"").trim()) {
        foundState = (a.State||"").trim();
        foundDistrict = (a.District||"").trim();
        foundCity = address;
        break;
      }
    }
    
    if (foundState) {
      stateSelect.value = foundState;
      window.populateProfileDistricts();
      document.getElementById("profile-district").value = foundDistrict;
      window.populateProfileCities();
      document.getElementById("profile-city").value = foundCity;
    }
    const partnerFields = document.getElementById("partner-profile-fields");
    if (role === "Partner") {
      partnerFields.classList.remove("hidden");
      const partners = AppState.get("partners") || [];
      const myPartnerData = partners.find(p => p.Email === profile.email);
      
      const skillsInit = myPartnerData ? (myPartnerData.Skillset || "") : "";
      const areasInit = myPartnerData ? (myPartnerData.ServiceableAreas || "") : "";
      const expInit = myPartnerData ? (myPartnerData.Experience || "") : "";
      
      document.getElementById("profile-experience").value = expInit;
      
      const services = AppState.get("services") || [];
      const skillOptions = services.map(s => ({ value: s.ServiceID, label: s.ServiceName }));
      initMultiSelect("profile-skillset", "profile-skillset-search", "profile-skillset-dropdown", "profile-skillset-badges", skillOptions, skillsInit);
      
      // Initialize Area Dropdowns (State -> District -> Cities)
      const partnerStateSelect = document.getElementById("profile-area-state");
      partnerStateSelect.innerHTML = '<option value="">All States</option>';
      const partnerUniqueStates = [...new Set(areasList.map(a => a.State))].filter(Boolean);
      partnerUniqueStates.forEach(s => {
        partnerStateSelect.innerHTML += `<option value="${s}">${s}</option>`;
      });
      document.getElementById("profile-area-district").innerHTML = '<option value="">All Districts</option>';
      document.getElementById("profile-area-cities-container").innerHTML = '<span class="text-muted" style="font-size: 0.8rem; width: 100%; text-align: center; margin: auto;">Please select a State and District first</span>';
      
      window.partnerProfileSelectedCities = areasInit ? areasInit.split(",").map(c => c.trim()).filter(Boolean) : [];
      document.getElementById("profile-areas").value = window.partnerProfileSelectedCities.join(",");
      if(typeof window.renderProfileAreaBadges === "function") window.renderProfileAreaBadges();
      
    } else {
      partnerFields.classList.add("hidden");
    }
    
    document.getElementById("user-profile-modal").classList.remove("hidden");
  }

  async function saveProfile() {
    const profile = AppState.get("userProfile");
    if (!profile) return;
    
    const name = document.getElementById("profile-name").value.trim();
    const phone = document.getElementById("profile-phone").value.trim();
    const address = document.getElementById("profile-city").value.trim();
    const state = document.getElementById("profile-state")?.value.trim() || "";
    const district = document.getElementById("profile-district")?.value.trim() || "";
    
    if (!name || !phone) {
      Toast.show("Name and Phone are required", "error");
      return;
    }
    
    const btn = document.getElementById("profile-save-btn");
    const origText = btn.textContent;
    btn.textContent = "Saving...";
    btn.disabled = true;
    
    try {
      const res1 = await SheetsAPI.updateProfile({ 
        Email: profile.email, 
        Name: name, 
        Phone: phone, 
        Address: address,
        State: state,
        District: district,
        City: address
      });
      
      const role = AppState.get("userRole");
      let res2 = { status: "ok" };
      let skillset = "", experience = "", areas = "";
      
      const partners = AppState.get("partners") || [];
      const myPartnerData = partners.find(p => p.Email === profile.email);
      
      if (role === "Partner" && myPartnerData) {
        skillset = document.getElementById("profile-skillset")?.value.trim() || "";
        areas = document.getElementById("profile-areas")?.value.trim() || address;
        experience = document.getElementById("profile-experience")?.value.trim() || "";
        
        res2 = await SheetsAPI.updatePartner({ PartnerID: myPartnerData.PartnerID, Name: name, Phone: phone, Skillset: skillset, Experience: experience, ServiceableAreas: areas });
      }
      
      if (res1.status === "ok" && res2.status === "ok") {
        Toast.show("Profile updated successfully!", "success");
        document.getElementById("user-profile-modal").classList.add("hidden");
        
        // Update local state (users)
        let users = AppState.get("users") || [];
        const idx = users.findIndex(u => u.Email === profile.email);
        const newData = { Email: profile.email, Name: name, Phone: phone, Address: address };
        if (idx > -1) users[idx] = newData;
        else users.push(newData);
        AppState.set("users", users);
        
        // Update local state (partners)
        if (role === "Partner" && myPartnerData) {
          myPartnerData.Name = name;
          myPartnerData.Phone = phone;
          myPartnerData.Skillset = skillset;
          myPartnerData.Experience = experience;
          myPartnerData.ServiceableAreas = areas;
          AppState.set("partners", partners);
        }
        
        // Update UI
        document.getElementById("user-name-display").textContent = name;
        
      } else {
        throw new Error(res1?.message || res2?.message || "Failed to update profile");
      }
    } catch (err) {
      Toast.show(err.message, "error");
    } finally {
      btn.textContent = origText;
      btn.disabled = false;
    }
  }

  return { init, login, logout, determineRole, openProfileModal, saveProfile };
})();

// Global callback for Google Sign-In
window.handleCredentialResponse = async (response) => {
  if (await Auth.login(response.credential)) {
    const profile = AppState.get("userProfile");
    const role    = AppState.get("userRole");

    if (role === "Admin") {
      Toast.show(`Welcome, ${profile.name}!`, "success");
      Router.navigate("admin");
    } else if (role === "Partner") {
      Toast.show(`Welcome, ${profile.name}!`, "success");
      Router.navigate("partner");
    } else {
      // Customer — check if profile is complete
      const users = AppState.get("users") || [];
      const myProfile = users.find(u => u.Email === profile.email);
      const hasPhone = myProfile && myProfile.Phone && myProfile.Phone.trim().length >= 6;

      if (!hasPhone) {
        // New / incomplete user → show onboarding
        showOnboardingModal(profile);
      } else {
        Toast.show(`Welcome back, ${myProfile.Name || profile.name}!`, "success");
        const currentPage = AppState.get("currentPage");
        document.dispatchEvent(new CustomEvent("pageChanged", { detail: currentPage }));
      }
    }
  } else {
    Toast.show("Login failed. Please try again.", "error");
  }
};


// --- Profile Area Functions ---
window.updateProfileDistricts = function() {
  const state = document.getElementById("profile-area-state").value;
  const districtSelect = document.getElementById("profile-area-district");
  const areasList = AppState.get("areas") || [];
  
  districtSelect.innerHTML = '<option value="">All Districts</option>';
  document.getElementById("profile-area-cities-container").innerHTML = '<span class="text-muted" style="font-size: 0.8rem; width: 100%; text-align: center; margin: auto;">Please select a State and District first</span>';
  
  if (!state) return;
  
  const districts = [...new Set(areasList.filter(a => a.State === state).map(a => a.District))].filter(Boolean);
  districts.forEach(d => {
    districtSelect.innerHTML += `<option value="${d}">${d}</option>`;
  });
};

window.updateProfileCities = function() {
  const state = document.getElementById("profile-area-state").value;
  const district = document.getElementById("profile-area-district").value;
  const container = document.getElementById("profile-area-cities-container");
  const areasList = AppState.get("areas") || [];
  
  if (!state || !district) {
    container.innerHTML = '<span class="text-muted" style="font-size: 0.8rem; width: 100%; text-align: center; margin: auto;">Please select a State and District first</span>';
    return;
  }
  
  container.innerHTML = '';
  
  const areaObj = areasList.find(a => a.State === state && a.District === district);
  if (!areaObj || !areaObj.Cities) return;
  
  const cities = areaObj.Cities.split(",").map(c => c.trim()).filter(Boolean);
  cities.forEach(city => {
    const isChecked = window.partnerProfileSelectedCities.includes(city) ? "checked" : "";
    container.innerHTML += `
      <label style="display:flex;align-items:center;gap:4px;background:var(--slate-50);border:1px solid var(--slate-200);padding:4px 8px;border-radius:4px;cursor:pointer;">
        <input type="checkbox" value="${city}" ${isChecked} onchange="window.toggleProfileCity(this)">
        <span class="text-sm">${city}</span>
      </label>
    `;
  });
};

window.toggleProfileCity = function(checkbox) {
  const city = checkbox.value;
  if (checkbox.checked) {
    if (!window.partnerProfileSelectedCities.includes(city)) {
      window.partnerProfileSelectedCities.push(city);
    }
  } else {
    window.partnerProfileSelectedCities = window.partnerProfileSelectedCities.filter(c => c !== city);
  }
  document.getElementById("profile-areas").value = window.partnerProfileSelectedCities.join(",");
  window.renderProfileAreaBadges();
};

window.removeProfileCity = function(city) {
  window.partnerProfileSelectedCities = window.partnerProfileSelectedCities.filter(c => c !== city);
  document.getElementById("profile-areas").value = window.partnerProfileSelectedCities.join(",");
  window.renderProfileAreaBadges();
  // Also uncheck the checkbox if it's currently visible
  window.updateProfileCities();
};

window.renderProfileAreaBadges = function() {
  const container = document.getElementById("profile-areas-badges");
  container.innerHTML = "";
  window.partnerProfileSelectedCities.forEach(city => {
    const badge = document.createElement("span");
    badge.style.cssText = "background:var(--emerald-100);color:var(--emerald-900);padding:2px 8px;border-radius:999px;font-size:0.75rem;font-weight:600;display:inline-flex;align-items:center;gap:4px;";
    badge.innerHTML = `&bull; ${city} <button type="button" onclick="window.removeProfileCity('${city}')" style="background:transparent;border:none;cursor:pointer;color:var(--emerald-700);padding:0;font-size:12px;">&times;</button>`;
    container.appendChild(badge);
  });
};


// ── Utility Helpers ──────────────────────────────────────────
const Utils = {
  formatPrice: (n) => `₹${Number(n).toLocaleString("en-IN")}`,

  formatDate: (d) => {
    if (!d) return "—";
    try { return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); }
    catch { return d; }
  },

  stars: (rating) => {
    const r = parseFloat(rating) || 0;
    const full = Math.floor(r);
    const half = r - full >= .5 ? 1 : 0;
    return "★".repeat(full) + (half ? "½" : "") + "☆".repeat(5 - full - half);
  },

  statusBadge: (status) => {
    const map = {
      "Pending":          "badge-pending",
      "Contacted":        "badge-contacted",
      "Partner_Assigned": "badge-assigned",
      "In_Progress":      "badge-progress",
      "Completed":        "badge-completed",
      "Cancelled":        "badge-cancelled",
      "Active":           "badge-active",
      "Inactive":         "badge-inactive",
      "Verified":         "badge-verified",
      "Pending Review":   "badge-pending-doc",
    };
    return `<span class="badge ${map[status] || ''}">${status || "—"}</span>`;
  },

  debounce: (fn, ms = 300) => {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  },

  escapeHtml: (str) => String(str).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])),

  showLoading: (el, text = "Loading...") => {
    if (!el) return;
    el._origHTML = el.innerHTML;
    el.innerHTML = `<svg class="spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg> ${text}`;
    el.disabled = true;
  },
  hideLoading: (el) => {
    if (!el || !el._origHTML) return;
    el.innerHTML = el._origHTML;
    el.disabled = false;
    delete el._origHTML;
  },

  animateCount: (el, end, prefix = "") => {
    const start = 0; const duration = 800;
    const startTime = performance.now();
    function step(now) {
      const p = Math.min((now - startTime) / duration, 1);
      const val = Math.round(p * p * end);
      el.textContent = prefix + val.toLocaleString("en-IN");
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
};

// ── Typewriter Effect ────────────────────────────────────────
function initTypewriter(el, phrases, speed = 80, pause = 2000) {
  if (!el) return;
  let phraseIdx = 0, charIdx = 0, deleting = false;

  function type() {
    const phrase = phrases[phraseIdx];
    el.textContent = phrase.slice(0, charIdx);

    if (!deleting && charIdx === phrase.length) {
      setTimeout(() => { deleting = true; type(); }, pause);
      return;
    }
    if (deleting && charIdx === 0) {
      deleting = false;
      phraseIdx = (phraseIdx + 1) % phrases.length;
    }
    charIdx += deleting ? -1 : 1;
    setTimeout(type, deleting ? speed / 2 : speed);
  }
  type();
}

// Config screen removed

// ── Load All Data ────────────────────────────────────────────
async function loadAllData() {
  try {
    // 1. Try to load from cache immediately for instant UI render (Stale-While-Revalidate)
    const cachedData = localStorage.getItem("jini24_data_cache");
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        Object.keys(parsed).forEach(k => AppState.set(k, parsed[k]));
        document.dispatchEvent(new Event("dataLoaded"));
      } catch(e) { console.warn("Cache parse error", e); }
    }

    // 2. Fetch fresh data in the background
    const promises = [
      SheetsAPI.getServices().catch(e => ({ data: [], error: e })),
      SheetsAPI.getBookings().catch(e => ({ data: [], error: e })),
      SheetsAPI.getPartners().catch(e => ({ data: [], error: e })),
      SheetsAPI.getPaymentSettings().catch(e => ({ data: [], error: e })),
      SheetsAPI.getContacts().catch(e => ({ data: [], error: e })),
      SheetsAPI.getContent().catch(e => ({ data: [], error: e })),
      SheetsAPI.getFAQs().catch(e => ({ data: [], error: e })),
      SheetsAPI.getCategories().catch(e => ({ data: [], error: e })),
      SheetsAPI.getUsers().catch(e => ({ data: [], error: e })),
      SheetsAPI.getAreas().catch(e => ({ data: [], error: e })),
      SheetsAPI.getCoupons().catch(e => ({ data: [], error: e })),
      SheetsAPI.getWishes().catch(e => ({ data: [], error: e }))
    ];

    const role = AppState.get("userRole");
    const adminType = AppState.get("adminType");
    let adminsPromiseIndex = -1;
    if (role === "Admin" && adminType === "Master") {
      adminsPromiseIndex = promises.length;
      promises.push(SheetsAPI.getAdmins().catch(e => ({ data: [], error: e })));
    }

    const results = await Promise.all(promises);

    const [svcRes, bkRes, ptRes, payRes, ctRes, contentRes, faqRes, catRes, userRes, areaRes, couponRes, wishesRes] = results;

    const freshData = {
      services: svcRes.data || [],
      bookings: bkRes.data || [],
      partners: ptRes.data || [],
      paymentSettings: payRes.data || [],
      contacts: ctRes.data || [],
      content: contentRes.data || [],
      faqs: faqRes.data || [],
      categories: catRes.data || [],
      users: userRes.data || [],
      areas: areaRes.data || [],
      coupons: couponRes.data || [],
      wishes: wishesRes.data || []
    };

    // Calculate dynamic rating for partners based on jobs
    freshData.partners.forEach(p => {
      const pJobs = freshData.bookings.filter(b => b.AssignedPartner && b.AssignedPartner.includes(p.PartnerID) && b.JobStatus === "Completed" && b.Rating);
      if (pJobs.length > 0) {
        const sum = pJobs.reduce((acc, b) => acc + parseFloat(b.Rating), 0);
        p.Rating = (sum / pJobs.length).toFixed(1);
      }
    });

    if (adminsPromiseIndex !== -1) {
      freshData.admins = results[adminsPromiseIndex].data || [];
    }

    // 3. Update state with fresh data and cache it
    Object.keys(freshData).forEach(k => AppState.set(k, freshData[k]));
    localStorage.setItem("jini24_data_cache", JSON.stringify(freshData));

    // 4. Trigger UI re-render with fresh data
    document.dispatchEvent(new Event("dataLoaded"));
  } catch (err) {
    console.error("Data load error:", err);
    Toast.show("⚠️ Error loading data from Google Sheets.", "error");
    document.dispatchEvent(new CustomEvent("dataLoaded"));
  }
}

// Settings Modal logic removed

// ── Auth Interactions ────────────────────────────────────────
function initAuthInteractions() {
  const logoutBtn = document.getElementById("logout-btn");
  logoutBtn?.addEventListener("click", () => Auth.logout());
  const adminLogoutBtn = document.getElementById("admin-logout-btn");
  adminLogoutBtn?.addEventListener("click", () => Auth.logout());
}

// ── Config / Settings Wizard ─────────────────────────────────
function initConfigWizard() {
  const screen = document.getElementById("config-screen");
  const closeBtn = document.getElementById("config-close-btn");
  const saveBtn = document.getElementById("config-save-btn");
  const copyBtn = document.getElementById("btn-copy-code");
  const input = document.getElementById("config-url-input");

  if (!screen) return;

  const show = () => screen.classList.remove("hidden");
  const hide = () => screen.classList.add("hidden");

  // Open settings buttons
  document.querySelectorAll("[data-open-settings]").forEach(btn => {
    btn.addEventListener("click", show);
  });

  closeBtn?.addEventListener("click", hide);

  saveBtn?.addEventListener("click", () => {
    const url = input.value.trim();
    if (!url.startsWith("https://script.google.com")) {
      Toast.show("Please paste a valid Google Apps Script URL.", "error");
      return;
    }
    SheetsAPI.setScriptUrl(url);
    hide();
    Toast.show("✅ Connected to live Google Sheet!", "success");
    loadAllData();
  });

  copyBtn?.addEventListener("click", async () => {
    try {
      Utils.showLoading(copyBtn, "Fetching Code...");
      const res = await fetch("gas/Code.gs");
      if (!res.ok) throw new Error("Could not load script code.");
      const code = await res.text();
      await navigator.clipboard.writeText(code);
      Toast.show("📋 Apps Script code copied to clipboard!", "success");
    } catch (err) {
      console.error(err);
      Toast.show("Failed to copy code. Please copy manually from gas/Code.gs file.", "error");
    } finally {
      Utils.hideLoading(copyBtn);
    }
  });

  // Pre-fill input if URL exists
  if (SheetsAPI.getScriptUrl() && input) {
    input.value = SheetsAPI.getScriptUrl();
  }
}

// ── Bootstrap ────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  Toast.init();
  Modal.init();
  Router.init();
  Auth.init();
  initAuthInteractions();
  initConfigWizard();

  // Page change handler
  document.addEventListener("pageChanged", (e) => {
    const page = e.detail;
    const role = AppState.get("userRole");
    
    if (page === "admin") {
      if (role !== "Admin") {
        document.getElementById("admin-login-overlay").classList.remove("hidden");
        return;
      }
      document.getElementById("admin-login-overlay").classList.add("hidden");
      initAdminModule();
    }
    if (page === "home" || page === "services") initCustomerModule();
    if (page === "tracker") initTrackerPage();
    if (page === "partner") initPartnerModule();
    if (page === "extra") initExtraPage();
  });

  // Load data
  loadAllData();

  // Auto-refresh every 45 seconds (for admin incoming feed)
  setInterval(() => {
    if (AppState.get("currentPage") === "admin" && AppState.get("userRole") === "Admin") {
      loadAllData();
    }
  }, 45000);

  // Typewriter on hero
  initTypewriter(
    document.querySelector(".typewriter"),
    ["AC Servicing & Repair?", "Deep Home Cleaning?", "Plumbing Issues?", "Electrical Work?", "Home Painting?", "Carpentry Help?"],
    85, 2400
  );

});

// ── Extra page / Bottom Sheet helpers ───────────────────────
function handleBottomNavLast() {
  const role = AppState.get("userRole");
  if (role === "Admin") {
    Router.navigate("admin");
  } else {
    Router.navigate("extra");
  }
}

function openExtraSheet() {
  const backdrop = document.getElementById("extra-sheet-backdrop");
  const sheet    = document.getElementById("extra-sheet");
  if (!backdrop || !sheet) return;
  backdrop.style.display = "block";
  sheet.style.display    = "block";
  // Trigger animation on next frame
  requestAnimationFrame(() => {
    sheet.style.transform = "translateY(0)";
  });
}

function closeExtraSheet() {
  const backdrop = document.getElementById("extra-sheet-backdrop");
  const sheet    = document.getElementById("extra-sheet");
  if (!backdrop || !sheet) return;
  sheet.style.transform = "translateY(100%)";
  setTimeout(() => {
    sheet.style.display    = "none";
    backdrop.style.display = "none";
  }, 300);
}

// ── App Download handler ─────────────────────────────────────
// Capture PWA install prompt early (browser fires it before user gesture)
window._pwaInstallPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  window._pwaInstallPrompt = e;
});

function handleDownloadApp() {
  const appLink    = window._appLink || "";
  const pwaEnabled = window._appPwaEnabled || false;

  if (appLink) {
    // External link (Play Store / App Store)
    window.open(appLink, "_blank", "noopener");
    return;
  }

  if (pwaEnabled) {
    if (window._pwaInstallPrompt) {
      // Browser supports native PWA install
      window._pwaInstallPrompt.prompt();
      window._pwaInstallPrompt.userChoice.then(result => {
        if (result.outcome === "accepted") {
          Toast.show("App installed successfully! 🎉", "success");
        }
        window._pwaInstallPrompt = null;
      });
    } else if (window.matchMedia("(display-mode: standalone)").matches) {
      Toast.show("App is already installed on your device.", "info");
    } else {
      // Fallback — show instructions
      Toast.show("To install: open browser menu → 'Add to Home Screen' or 'Install App'", "info");
    }
    return;
  }

  Toast.show("App download not configured yet.", "info");
}

// ══════════════════════════════════════════════════════════
// ONBOARDING MODULE (triggered on first Google sign-in)
// ══════════════════════════════════════════════════════════
let _obMap = null;
let _obMarker = null;

function showOnboardingModal(profile) {
  const modal = document.getElementById("onboarding-modal");
  if (!modal) return;

  // Pre-fill name from Google account
  const nameInput = document.getElementById("ob-name");
  if (nameInput && profile && profile.name) nameInput.value = profile.name;

  // Populate area dropdown from admin-configured areas
  populateOnboardingAreas();

  // Show modal
  modal.style.display = "flex";

  // Init map after modal is visible (needs layout dimensions)
  setTimeout(initOnboardingMap, 200);
}

window.populateOnboardingAreas = function() {
  const stateSelect = document.getElementById("ob-state");
  if (!stateSelect) return;

  const areas = AppState.get("areas") || [];
  const states = [...new Set(areas.map(a => (a.State || "").trim()).filter(Boolean))].sort();

  stateSelect.innerHTML = `<option value="">Select State...</option>` + 
    states.map(s => `<option value="${Utils.escapeHtml(s)}">${Utils.escapeHtml(s)}</option>`).join("");

  document.getElementById("ob-district").innerHTML = `<option value="">Select District...</option>`;
  document.getElementById("ob-city").innerHTML = `<option value="">Select City...</option>`;

  // If areas not loaded yet, wait for state update
  if (!states.length) {
    AppState.on("areas", () => { populateOnboardingAreas(); });
  }
};

window.populateObDistricts = function() {
  const state = document.getElementById("ob-state").value;
  const districtSelect = document.getElementById("ob-district");
  const citySelect = document.getElementById("ob-city");
  
  districtSelect.innerHTML = `<option value="">Select District...</option>`;
  citySelect.innerHTML = `<option value="">Select City...</option>`;
  if (!state) return;

  const areas = AppState.get("areas") || [];
  const districts = [...new Set(areas.filter(a => (a.State || "").trim() === state).map(a => (a.District || "").trim()).filter(Boolean))].sort();

  districtSelect.innerHTML += districts.map(d => `<option value="${Utils.escapeHtml(d)}">${Utils.escapeHtml(d)}</option>`).join("");
};

window.populateObCities = function() {
  const state = document.getElementById("ob-state").value;
  const district = document.getElementById("ob-district").value;
  const citySelect = document.getElementById("ob-city");
  
  citySelect.innerHTML = `<option value="">Select City...</option>`;
  if (!state || !district) return;

  const areas = AppState.get("areas") || [];
  const cities = [...new Set(areas.filter(a => (a.State || "").trim() === state && (a.District || "").trim() === district).flatMap(a => (a.Cities || "").split(",").map(c => c.trim()).filter(Boolean)))].sort();

  citySelect.innerHTML += cities.map(c => `<option value="${Utils.escapeHtml(c)}">${Utils.escapeHtml(c)}</option>`).join("");
};

window.populateProfileDistricts = function() {
  const state = document.getElementById("profile-state").value;
  const districtSelect = document.getElementById("profile-district");
  const citySelect = document.getElementById("profile-city");
  
  districtSelect.innerHTML = `<option value="">Select District</option>`;
  citySelect.innerHTML = `<option value="">Select City</option>`;
  if (!state) return;

  const areas = AppState.get("areas") || [];
  const districts = [...new Set(areas.filter(a => (a.State || "").trim() === state).map(a => (a.District || "").trim()).filter(Boolean))].sort();

  districtSelect.innerHTML += districts.map(d => `<option value="${Utils.escapeHtml(d)}">${Utils.escapeHtml(d)}</option>`).join("");
};

window.populateProfileCities = function() {
  const state = document.getElementById("profile-state").value;
  const district = document.getElementById("profile-district").value;
  const citySelect = document.getElementById("profile-city");
  
  citySelect.innerHTML = `<option value="">Select City</option>`;
  if (!state || !district) return;

  const areas = AppState.get("areas") || [];
  const cities = [...new Set(areas.filter(a => (a.State || "").trim() === state && (a.District || "").trim() === district).flatMap(a => (a.Cities || "").split(",").map(c => c.trim()).filter(Boolean)))].sort();

  citySelect.innerHTML += cities.map(c => `<option value="${Utils.escapeHtml(c)}">${Utils.escapeHtml(c)}</option>`).join("");
};

function initOnboardingMap() {
  if (typeof L === "undefined") return;
  const mapEl = document.getElementById("ob-map");
  if (!mapEl) return;

  // Destroy previous instance
  if (_obMap) { _obMap.remove(); _obMap = null; _obMarker = null; }

  const defaultLat = 20.5937, defaultLng = 78.9629; // Centre of India
  _obMap = L.map("ob-map", { zoomControl: true }).setView([defaultLat, defaultLng], 5);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://openstreetmap.org">OSM</a>',
    maxZoom: 19
  }).addTo(_obMap);

  // Click on map to place/move pin
  _obMap.on("click", (e) => {
    setObMarker(e.latlng.lat, e.latlng.lng);
  });
}

function makeGreenIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:linear-gradient(135deg,#10b981,#059669);border:3px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,0.3);transform:rotate(-45deg)"></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28]
  });
}

function setObMarker(lat, lng) {
  if (!_obMap) return;
  if (_obMarker) _obMarker.remove();
  _obMarker = L.marker([lat, lng], { icon: makeGreenIcon(), draggable: true }).addTo(_obMap);
  _obMarker.on("dragend", (e) => {
    const pos = e.target.getLatLng();
    updateObCoords(pos.lat, pos.lng);
  });
  _obMap.setView([lat, lng], 16);
  updateObCoords(lat, lng);
}

function updateObCoords(lat, lng) {
  document.getElementById("ob-lat").value = lat.toFixed(6);
  document.getElementById("ob-lng").value = lng.toFixed(6);
  document.getElementById("ob-coords-display").innerHTML =
    `📍 Location set: <strong>${lat.toFixed(4)}, ${lng.toFixed(4)}</strong> — drag pin to adjust`;
}

window.obLocateMe = function() {
  if (!navigator.geolocation) {
    Toast.show("Geolocation is not supported by your browser.", "error"); return;
  }
  const btn = document.querySelector("#onboarding-modal button[onclick='obLocateMe()']");
  if (btn) { btn.style.opacity = "0.7"; btn.textContent = "Locating..."; }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      setObMarker(pos.coords.latitude, pos.coords.longitude);
      if (btn) { btn.style.opacity = "1"; btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4"/></svg> Located!`; }
    },
    () => {
      Toast.show("Could not get your location. Please pin manually.", "error");
      if (btn) { btn.style.opacity = "1"; btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4"/></svg> Use my location`; }
    },
    { timeout: 8000 }
  );
};

window.saveOnboarding = async function() {
  const name  = (document.getElementById("ob-name")?.value  || "").trim();
  const phone = (document.getElementById("ob-phone")?.value || "").trim();
  const area  = (document.getElementById("ob-city")?.value  || "").trim();
  const state = document.getElementById("ob-state")?.value.trim() || "";
  const district = document.getElementById("ob-district")?.value.trim() || "";
  const lat   = document.getElementById("ob-lat")?.value  || "";
  const lng   = document.getElementById("ob-lng")?.value  || "";

  if (!name)  { Toast.show("Please enter your full name.", "error");   return; }
  if (!phone || phone.replace(/\D/g, "").length < 10) {
    Toast.show("Please enter a valid 10-digit mobile number.", "error"); return;
  }
  if (!area)  { Toast.show("Please select your service city.", "error"); return; }

  const profile = AppState.get("userProfile");
  if (!profile) return;

  const btn = document.getElementById("ob-save-btn");
  const origHTML = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="animation:spin 1s linear infinite"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>&nbsp;Saving...`;

  try {
    const res = await SheetsAPI.updateProfile({
      Email: profile.email,
      Name: name,
      Phone: phone,
      Address: area,
      State: state,
      District: district,
      City: area,
      SelectedArea: area,
      Lat: lat,
      Lng: lng
    });

    if (res.status === "ok") {
      // Update AppState users
      let users = AppState.get("users") || [];
      const idx = users.findIndex(u => u.Email === profile.email);
      const newData = { Email: profile.email, Name: name, Phone: phone, Address: area, SelectedArea: area, Lat: lat, Lng: lng };
      if (idx > -1) users[idx] = { ...users[idx], ...newData };
      else users.push(newData);
      AppState.set("users", users);

      // Update display name in nav
      const nameEl = document.getElementById("user-name-display");
      if (nameEl) nameEl.textContent = name;

      // Close modal
      document.getElementById("onboarding-modal").style.display = "none";

      Toast.show(`🎉 Welcome, ${name}! Your profile is all set.`, "success");

      // Navigate / refresh page
      const currentPage = AppState.get("currentPage");
      document.dispatchEvent(new CustomEvent("pageChanged", { detail: currentPage }));
    } else {
      throw new Error(res.message || "Failed to save profile");
    }
  } catch (err) {
    Toast.show("Error saving profile: " + err.message, "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = origHTML;
  }
};
