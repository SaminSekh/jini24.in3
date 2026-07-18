/**
 * ============================================================
 * Google Sheets API Bridge
 * ============================================================
 * Configure SCRIPT_URL after deploying Code.gs as a Web App.
 * All methods return Promises. The GAS Web App is the only
 * network endpoint; no Google API keys needed in the browser.
 * ============================================================
 */

const SheetsAPI = (() => {

  // ── Configuration ──────────────────────────────────────
  let SCRIPT_URL = localStorage.getItem("ghs_script_url") || "https://script.google.com/macros/s/AKfycbzoxlgV3rax2HgHLoqwXppiIwABGVFOj7nzGsoiBdktg73wXkq6krRLVvQ14rMeQCtA5Q/exec";

  function setScriptUrl(url) {
    SCRIPT_URL = url.trim();
    localStorage.setItem("ghs_script_url", SCRIPT_URL);
  }

  function getScriptUrl() { return SCRIPT_URL; }

  // ── Core Fetch with Retry ───────────────────────────────
  async function request(method, params = {}, body = null, retries = 3) {
    if (!SCRIPT_URL) {
      throw new Error("Google Sheets Script URL not configured. Please complete the setup instructions.");
    }

    let url = SCRIPT_URL;
    if (method === "GET" && Object.keys(params).length) {
      const qs = new URLSearchParams(params).toString();
      url = `${SCRIPT_URL}?${qs}`;
    }

    const opts = { method, redirect: "follow" };
    if (method === "POST" && body) {
      opts.body = JSON.stringify(body);
      opts.headers = { "Content-Type": "text/plain" };
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const res = await fetch(url, opts);
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        const data = await res.json();
        if (data.status === "error") throw new Error(data.message || "Server error");
        return data;
      } catch (err) {
        if (attempt === retries) throw err;
        await delay(attempt * 600);
      }
    }
  }

  function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

  // ── GET Helpers ─────────────────────────────────────────
  const get  = (action, extra = {}) => request("GET",  { action, ...extra });
  const post = (action, data = {})  => request("POST", {}, { action, data });

  // ── Public API ──────────────────────────────────────────

  // Services
  const getServices   = ()           => get("getServices");
  const addService    = (data)       => post("addService", data);
  const updateService = (data)       => post("updateService", data);
  const deleteService = (serviceId)  => request("POST", {}, { action: "deleteService", serviceId });

  // Bookings
  const getBookings         = ()     => get("getBookings");
  const getBookingByPhone   = (phone)=> get("getBookingByPhone", { phone });
  const getBookingByEmail   = (email)=> get("getBookingByEmail", { email });
  const acceptJob           = (data) => post("acceptJob", data);
  const addBooking          = (data) => post("addBooking", data);
  const updateBooking       = (data) => post("updateBooking", data);
  const deleteBooking         = (bookingId) => request("POST", {}, { action: "deleteBooking", bookingId });

  // Wishes
  const getWishes           = ()     => get("getWishes");
  const getWishesByEmail    = (email)=> get("getWishesByEmail", { email });
  const addWish             = (data) => post("addWish", data);
  const updateWish          = (data) => post("updateWish", data);
  const deleteWish          = (wishId) => request("POST", {}, { action: "deleteWish", wishId });

  // Partners
  const getPartners  = ()     => get("getPartners");
  const addPartner   = (data) => post("addPartner", data);
  const updatePartner= (data) => post("updatePartner", data);
  const deletePartner= (partnerId) => request("POST", {}, { action: "deletePartner", partnerId });

  // Payment Settings
  const getPaymentSettings = () => get("getPaymentSettings");
  const addPaymentSetting = (data) => post("addPaymentSetting", data);
  const updatePaymentSetting = (data) => post("updatePaymentSetting", data);
  const deletePaymentSetting = (paymentMethodId) => request("POST", {}, { action: "deletePaymentSetting", paymentMethodId });

  // Dashboard stats
  const getStats = () => get("getStats");

  // Admin check — server-side only, no emails exposed in browser
  // Admins
  const checkAdmin   = (email) => get("checkAdmin", { email });
  const getAdmins    = ()      => get("getAdmins");
  const addAdmin     = (data)  => post("addAdmin", data);
  const updateAdmin  = (data)  => post("updateAdmin", data);
  const deleteAdmin  = (id)    => request("POST", {}, { action: "deleteAdmin", AdminID: id });

  // Users
  const getUsers       = ()           => get("getUsers");
  const updateProfile  = (data)       => post("updateProfile", data);

  // Contacts
  const getContacts    = ()           => get("getContacts");
  const addContact     = (data)       => post("addContact", data);
  const updateContact  = (data)       => post("updateContact", data);
  const deleteContact  = (contactId)  => request("POST", {}, { action: "deleteContact", contactId });

  // Content & FAQ
  const getContent   = () => get("getContent");
  const updateContent= (data) => post("updateContent", data);
  const getFAQs      = () => get("getFAQs");
  const addFAQ       = (data) => post("addFAQ", data);
  const updateFAQ    = (data) => post("updateFAQ", data);
  const deleteFAQ    = (faqId) => request("POST", {}, { action: "deleteFAQ", faqId });

  // Categories
  const getCategories = () => get("getCategories");
  const addCategory   = (data) => post("addCategory", data);
  const deleteCategory= (categoryId) => request("POST", {}, { action: "deleteCategory", categoryId });

  // Service Areas
  const getAreas      = () => get("getAreas");
  const addArea       = (data) => post("addArea", data);
  const updateArea    = (data) => post("updateArea", data);
  const deleteArea    = (areaId) => request("POST", {}, { action: "deleteArea", areaId });

  // Coupons
  const getCoupons    = () => get("getCoupons");
  const addCoupon     = (data) => post("addCoupon", data);
  const updateCoupon  = (data) => post("updateCoupon", data);
  const deleteCoupon  = (couponCode) => request("POST", {}, { action: "deleteCoupon", couponCode });

  return {
    setScriptUrl,
    getScriptUrl,
    getServices,
    addService,
    updateService,
    deleteService,
    getBookings,
    getBookingByPhone,
    getBookingByEmail,
    addBooking,
    updateBooking,
    deleteBooking,
    acceptJob,
    getWishes,
    getWishesByEmail,
    addWish,
    updateWish,
    deleteWish,
    getPartners,
    addPartner,
    updatePartner,
    deletePartner,
    getPaymentSettings,
    addPaymentSetting,
    updatePaymentSetting,
    deletePaymentSetting,
    getStats,
    checkAdmin,
    getAdmins,
    addAdmin,
    updateAdmin,
    deleteAdmin,
    getContacts,
    addContact,
    updateContact,
    deleteContact,
    getContent,
    updateContent,
    getFAQs,
    addFAQ,
    updateFAQ,
    deleteFAQ,
    getCategories,
    addCategory,
    deleteCategory,
    getUsers,
    updateProfile,
    getAreas,
    addArea,
    updateArea,
    deleteArea,
    getCoupons,
    addCoupon,
    updateCoupon,
    deleteCoupon
  };

})();
