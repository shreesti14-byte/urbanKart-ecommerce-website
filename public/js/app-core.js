const state = {
  token: localStorage.getItem("mv_token") || "",
  user: JSON.parse(localStorage.getItem("mv_user") || "null"),
  products: [],
  categories: [],
  currentView: "home",
  selectedProduct: null,
  profile: null,
  orders: [],
  vendorDashboard: null,
  adminDashboard: null,
  paymentAuthorization: null,
  expandedTrackingOrders: [],
  authScreenMode: "login",
  checkout: {
    paymentMethod: "Cash on Delivery",
    shippingAddress: "",
    upiModalOpen: false,
    upiQrVisible: false,
  },
  filters: {
    category: "All",
    segment: "",
    minPrice: "",
    maxPrice: "",
    rating: "",
    sortBy: "latest",
    search: "",
  },
};

let activeHeroSlideIndex = 0;
let heroRotationTimer = null;

const app = document.getElementById("app");
const navActions = document.getElementById("navActions");
const backToTopBtn = document.getElementById("backToTopBtn");
const topbar = document.querySelector(".topbar");

const announcements = [
  "Premium Products",
  "Delivery Across India",
  "Exclusive Brands",
  "Scheduled Delivery",
  "Personally Curated",
  "Feel Gloriously Well",
];

const heroSlides = [
  {
    title: "Fresh Grocery Picks",
    copy: "Shop fruits, vegetables, pantry staples, and daily home essentials in one easy grocery lane.",
    image:
      "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1600&q=80",
    cta: "Shop Grocery",
    category: "Grocery",
  },
  {
    title: "Everyday Fashion Finds",
    copy: "Shop trending fashion, beauty staples, shoes, and wardrobe essentials from multiple sellers in one polished marketplace.",
    image:
      "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1600&q=80",
    cta: "Shop Fashion",
    category: "Fashion",
  },
  {
    title: "Tech That Moves Fast",
    copy: "Explore smart phones, laptops, and electronics picked for daily performance, gifting, and upgrades.",
    image:
      "https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=1600&q=80",
    cta: "Browse Tech",
    category: "Electronics",
  },
];

const standards = [
  { icon: "◌", title: "Clean & Organic", copy: "Gorgeous picks with fewer nasties and more intention." },
  { icon: "▣", title: "Delivered Across India", copy: "Swiftly dispatched, right to your door." },
  { icon: "♡", title: "Personally Curated", copy: "Handpicked by people, not just algorithms." },
  { icon: "✦", title: "Feel Gloriously Well", copy: "Everyday essentials designed to support better living." },
];

const partnerNames = ["Clearspring", "Cheeky Panda", "Cosmic Dealer", "Davids", "PACA", "Honey"];
const fashionSegments = ["Male", "Female", "Kids"];
const homePriorityCategories = new Set(["Fashion", "Beauty", "Grocery"]);
const LOW_STOCK_THRESHOLD = 5;
const RECENT_PRODUCT_WINDOW_DAYS = 7;

const journalTopics = [
  {
    title: "A Better Daily Basket",
    copy: "Discover healthier, calmer product picks from multiple vendors without losing the joy of browsing.",
  },
  {
    title: "How To Shop Smarter",
    copy: "Use category filters, wishlist saves, and cart actions to build a more intentional routine.",
  },
  {
    title: "What Makes A Product Worth It",
    copy: "From ratings to shipping flow, compare essentials with a storefront that stays clean and functional.",
  },
];

const storePaymentSettings = {
  upiPayeeName: "UPI Payment",
  upiId: "",
  upiQrImage: "/images/upi-qr.jpeg",
};

const aboutHighlights = [
  {
    title: "Curated Across Categories",
    copy: "UrbanKart brings grocery, fashion, beauty, decor, mobiles, and laptops into one storefront so shoppers can browse with less friction and more clarity.",
  },
  {
    title: "Built For Trust",
    copy: "We focus on clear pricing, dependable product details, and a cleaner marketplace experience that helps customers compare products confidently.",
  },
  {
    title: "Vendor Friendly",
    copy: "The platform is designed to help multiple sellers list, manage, and grow their catalog while still keeping the customer experience polished.",
  },
];

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2600);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

function persistAuth(data) {
  state.token = data.token;
  state.user = data.user;
  localStorage.setItem("mv_token", state.token);
  localStorage.setItem("mv_user", JSON.stringify(state.user));
}

function clearAuth() {
  state.token = "";
  state.user = null;
  state.profile = null;
  state.orders = [];
  state.expandedTrackingOrders = [];
  state.paymentAuthorization = null;
  state.checkout.paymentMethod = "Cash on Delivery";
  state.checkout.shippingAddress = "";
  state.checkout.upiModalOpen = false;
  state.checkout.upiQrVisible = false;
  localStorage.removeItem("mv_token");
  localStorage.removeItem("mv_user");
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function safeWishlistItems() {
  return (state.profile?.wishlist || []).filter(Boolean);
}

function safeCartItems() {
  return (state.profile?.cart || []).filter((item) => item?.product);
}

function getProductStock(product) {
  return Math.max(0, Number(product?.stock) || 0);
}

function getInventoryState(product) {
  const stock = getProductStock(product);

  if (stock <= 0) {
    return {
      label: "Out of stock",
      detail: "Shown to customers as out of stock",
      className: "out-of-stock",
      buttonLabel: "Out of stock",
      purchasable: false,
    };
  }

  if (stock < LOW_STOCK_THRESHOLD) {
    return {
      label: `Only ${stock} left`,
      detail: "Live on customer site",
      className: "low-stock",
      buttonLabel: "Add to cart",
      purchasable: true,
    };
  }

  return {
    label: `${stock} in stock`,
    detail: "Live on customer site",
    className: "in-stock",
    buttonLabel: "Add to cart",
    purchasable: true,
  };
}

function stockBadgeMarkup(product, options = {}) {
  const { compact = false } = options;
  const inventory = getInventoryState(product);

  return `<span class="stock-badge ${inventory.className}${compact ? " compact" : ""}">${escapeText(
    inventory.label
  )}</span>`;
}

function storefrontBadgeMarkup(product) {
  const inventory = getInventoryState(product);
  const label = inventory.purchasable ? "Customer site: live" : "Customer site: out of stock";
  const className = inventory.purchasable ? "status-live" : "status-out";
  return `<span class="status-pill ${className}">${label}</span>`;
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function recentProductCount(products = []) {
  const recentCutoff = Date.now() - RECENT_PRODUCT_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  return products.filter((product) => new Date(product.createdAt).getTime() >= recentCutoff).length;
}

function findProductById(productId) {
  const sources = [
    state.products,
    safeWishlistItems(),
    safeCartItems().map((item) => item.product),
    state.vendorDashboard?.products || [],
    state.adminDashboard?.products || [],
  ];

  for (const source of sources) {
    const product = source.find((item) => item?._id === productId);
    if (product) {
      return product;
    }
  }

  return null;
}

function ratingStars(rating = 0) {
  return `<span class="meta">${"★".repeat(Math.max(1, Math.round(rating)))}</span> <span class="meta">${rating.toFixed(1)}</span>`;
}

function getCartCount() {
  return safeCartItems().reduce((sum, item) => sum + item.quantity, 0);
}

function getCartSubtotal() {
  return safeCartItems().reduce((sum, item) => sum + item.product.price * item.quantity, 0);
}

function isWishlisted(productId) {
  return Boolean(safeWishlistItems().some((item) => item._id === productId));
}

function requiresPaymentAuthorization(method = state.checkout.paymentMethod) {
  return false;
}

function isUpiPayment(method = state.checkout.paymentMethod) {
  return method === "UPI Payment";
}

function syncCheckoutState() {
  if (!safeCartItems().length) {
    state.paymentAuthorization = null;
    state.checkout.upiModalOpen = false;
    state.checkout.upiQrVisible = false;
    return;
  }

  if (
    state.paymentAuthorization &&
    Number(state.paymentAuthorization.amount || 0) !== Number(getCartSubtotal())
  ) {
    state.paymentAuthorization = null;
  }
}

function currentShippingAddress() {
  return (document.getElementById("shippingAddress")?.value || state.checkout.shippingAddress || state.profile?.address || "").trim();
}

function updateCheckoutAddress(value) {
  state.checkout.shippingAddress = value;
}

function openUpiPaymentModal() {
  state.checkout.upiModalOpen = true;
  state.checkout.upiQrVisible = false;
  render();
}

function closeUpiPaymentModal() {
  state.checkout.upiModalOpen = false;
  state.checkout.upiQrVisible = false;
  render();
}

function revealUpiQr() {
  state.checkout.upiQrVisible = true;
  render();
}

function upiSupportedAppsMarkup() {
  const apps = [
    {
      key: "phonepe",
      label: "PhonePe",
      logo: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="1.5" y="1.5" width="21" height="21" rx="7" fill="#5f259f" />
          <path d="M9 6.8h4.5c2.2 0 3.8 1.4 3.8 3.5 0 2.2-1.6 3.6-3.8 3.6H11v3.3H9V6.8Zm2 5.5h2.2c1.1 0 1.9-.7 1.9-1.9 0-1.1-.8-1.8-1.9-1.8H11v3.7Z" fill="#ffffff" />
          <path d="M12.7 14.7h3.7" stroke="#ffffff" stroke-width="1.7" stroke-linecap="round" />
        </svg>
      `,
    },
    {
      key: "gpay",
      label: "Google Pay",
      logo: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="1.5" y="1.5" width="21" height="21" rx="7" fill="#ffffff" stroke="#dfe4ea" />
          <path d="M12.3 7.2a4.9 4.9 0 1 0 0 9.8c2.3 0 4.4-1.6 4.4-4.2v-.4h-4.4" fill="none" stroke="#4285F4" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M12.3 7.2a4.8 4.8 0 0 0-3.4 1.4" fill="none" stroke="#EA4335" stroke-width="1.9" stroke-linecap="round" />
          <path d="M8.9 8.6a4.8 4.8 0 0 0-1.4 3.4" fill="none" stroke="#FBBC05" stroke-width="1.9" stroke-linecap="round" />
          <path d="M7.5 12a4.8 4.8 0 0 0 4.8 5" fill="none" stroke="#34A853" stroke-width="1.9" stroke-linecap="round" />
        </svg>
      `,
    },
    {
      key: "paytm",
      label: "Paytm",
      logo: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="1.5" y="1.5" width="21" height="21" rx="7" fill="#eef8ff" stroke="#cfe8f7" />
          <path d="M6.8 8.2h5.6c1.8 0 3 1.1 3 2.8s-1.2 2.8-3 2.8H9.3v2.1H6.8V8.2Z" fill="#00349a" />
          <path d="M10.1 10h2c.7 0 1.2.4 1.2 1s-.5 1.1-1.2 1.1h-2V10Z" fill="#00baf2" />
          <path d="M15.8 8.2h1.4v7.7h-1.4z" fill="#00baf2" />
        </svg>
      `,
    },
    {
      key: "bhim",
      label: "BHIM",
      logo: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="1.5" y="1.5" width="21" height="21" rx="7" fill="#ffffff" stroke="#dfe4ea" />
          <path d="M7 8.1h10l-4.6 4.4H7z" fill="#f7931a" />
          <path d="M7 11.3h5.4L17 15.8H7z" fill="#138808" />
          <path d="M12 9.7 16.5 12 12 14.4 9.5 12z" fill="#2b4ea2" />
        </svg>
      `,
    },
  ];

  return `
    <div class="upi-app-row">
      ${apps
        .map(
          (app) => `
            <span class="upi-app-badge ${app.key}">
              <span class="upi-app-icon">${app.logo}</span>
              <span>${escapeText(app.label)}</span>
            </span>
          `
        )
        .join("")}
    </div>
  `;
}

function upiPaymentMarkup(amount = 0) {
  const hasQrImage = Boolean(storePaymentSettings.upiQrImage);
  const qrVisible = state.checkout.upiQrVisible;

  return `
    <div class="upi-modal-backdrop" onclick="closeUpiPaymentModal()">
      <div class="upi-modal-card" onclick="event.stopPropagation()">
        <div class="upi-modal-head">
          <div>
            <p class="eyebrow">UPI Payment</p>
            <strong>Scan and Pay</strong>
          </div>
          <button class="btn btn-ghost" type="button" onclick="closeUpiPaymentModal()">Close</button>
        </div>
        <div class="upi-panel">
          <div class="upi-panel-head">
            <div>
              <p class="eyebrow">UPI QR</p>
              <strong>Pay with any UPI app</strong>
            </div>
            <span class="upi-amount">${formatCurrency(amount)}</span>
          </div>
          <div class="upi-grid">
            <div class="upi-qr-shell ${hasQrImage ? "" : "placeholder"} ${qrVisible ? "revealed" : "blurred"}">
              ${
                hasQrImage
                  ? `
                    <img src="${escapeText(storePaymentSettings.upiQrImage)}" alt="UPI QR code" />
                    ${
                      qrVisible
                        ? ""
                        : `<button class="upi-show-button" type="button" onclick="revealUpiQr()">Show QR</button>`
                    }
                  `
                  : `<div class="upi-qr-placeholder">
                      <strong>Add Your QR</strong>
                      <span>Set your QR image in <code>public/js/app-core.js</code></span>
                    </div>`
              }
            </div>
            <div class="upi-copy">
              <strong>${escapeText(storePaymentSettings.upiPayeeName)}</strong>
              ${
                storePaymentSettings.upiId
                  ? `<span>${escapeText(storePaymentSettings.upiId)}</span>`
                  : ""
              }
              <p class="meta">Scan the QR using any UPI app. Once the payment is done, tap the button below.</p>
              ${upiSupportedAppsMarkup()}
            </div>
          </div>
          <div class="upi-modal-actions">
            <button class="btn btn-secondary" type="button" onclick="closeUpiPaymentModal()">Back</button>
            <button class="btn btn-primary" type="button" onclick="confirmUpiPaymentAndPlaceOrder()">Paid & Place Order</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function checkoutModalMarkup() {
  if (!(state.currentView === "cart" && isUpiPayment() && state.checkout.upiModalOpen)) {
    return "";
  }

  return upiPaymentMarkup(getCartSubtotal());
}

function syncOverlayState() {
  document.body.classList.toggle(
    "modal-open",
    Boolean(state.currentView === "cart" && isUpiPayment() && state.checkout.upiModalOpen)
  );
}

function handleGlobalKeydown(event) {
  if (event.key === "Escape" && state.checkout.upiModalOpen) {
    closeUpiPaymentModal();
  }
}

function isCustomer() {
  return state.user?.role === "customer";
}

function isDashboardRole() {
  return state.user?.role === "vendor" || state.user?.role === "admin";
}

function dashboardViewForRole(role = state.user?.role) {
  if (role === "vendor") {
    return "vendor";
  }

  if (role === "admin") {
    return "admin";
  }

  return "home";
}

function catalogTargetView() {
  return isDashboardRole() ? "storefront" : "home";
}

function defaultLandingView() {
  return isDashboardRole() ? dashboardViewForRole() : "home";
}

function shouldShowSearchResults() {
  return Boolean(
    state.filters.search ||
      state.filters.category !== "All" ||
      state.filters.segment ||
      state.filters.minPrice ||
      state.filters.maxPrice ||
      state.filters.rating
  );
}

function escapeText(text = "") {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function categoryImage(category = "") {
  const fileMap = {
    Grocery:
      "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=80",
    Electronics:
      "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=900&q=80",
    Laptops:
      "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=80",
    "Mobile Phones":
      "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=80",
    Shoes:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80",
    Fashion:
      "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=900&q=80",
    Beauty:
      "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=80",
    "Decoration Items":
      "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=900&q=80",
  };

  return (
    fileMap[category] ||
    "https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=900&q=80"
  );
}

function unsplashDownload(photoId, width = 900) {
  return `https://unsplash.com/photos/${photoId}/download?force=true&w=${width}`;
}

const curatedRealCatalogImages = {
  fashion: {
    maleTshirt: unsplashDownload("gCHHRPRmn0o"),
    maleTop: unsplashDownload("7VDBbdUWRUY"),
    maleOuterwear: unsplashDownload("cuvFOLi_mUw"),
    maleIndianWear: unsplashDownload("sLRFg-VC2FY"),
    femaleTop: unsplashDownload("t2RzXa59QdA"),
    femaleTshirt: unsplashDownload("nXNyhCLh7G8"),
    femaleDress: unsplashDownload("H8A7q7sOR3Y"),
    femaleIndianWear: unsplashDownload("APcoIgvzb2Q"),
    kidsTop:
      "https://images.unsplash.com/photo-1560544140-bd4b8d7962b9?auto=format&fit=crop&w=900&q=80",
    kidsTshirt:
      "https://images.unsplash.com/photo-1503919005314-30d93d07d823?auto=format&fit=crop&w=900&q=80",
    kidsDress: unsplashDownload("MthzMu3slZI"),
    kidsIndianWear: unsplashDownload("PzlbgBlZE-A"),
  },
  beauty: {
    cleanser: unsplashDownload("ppk8KD_CS-w"),
    serum: unsplashDownload("5kqhnnEGhTc"),
    lip: unsplashDownload("G_lgGJc0APM"),
    compact: unsplashDownload("LjKB320s1Cs"),
    sunscreen: unsplashDownload("C5M8S9WuSjE"),
    lotion: unsplashDownload("QrCEPudYVwE"),
    kajal: unsplashDownload("4dwilMLZHL4"),
    mascara: unsplashDownload("HIkyOG1RjDM"),
    perfume: unsplashDownload("V8e6mCiXLz8"),
    oil: unsplashDownload("avU3_umxNLU"),
    shampoo: unsplashDownload("K1k8M_bb2bM"),
    conditioner: unsplashDownload("fEioDH186lc"),
    maskJar: unsplashDownload("8ZpV_md88vA"),
    toner: unsplashDownload("WDKBiAeI3iU"),
    nail: unsplashDownload("67cDnEPSn9M"),
    brushes: unsplashDownload("X-Jr_cTP2c4"),
    sheetMask: unsplashDownload("-cLDUePhniU"),
  },
  decor: {
    decor: categoryImage("Decoration Items"),
    vase: categoryImage("Decoration Items"),
    lamp: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80",
    wallArt: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=900&q=80",
    candle: "https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=900&q=80",
    basket: "https://images.unsplash.com/photo-1582582621959-48d27397dc69?auto=format&fit=crop&w=900&q=80",
    mirror: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=900&q=80",
    cushion: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80",
    planter: "https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=900&q=80",
    clock: categoryImage("Decoration Items"),
    tray: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=900&q=80",
  },
  shoes: {
    running: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80",
    leather: "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=900&q=80",
    canvas: "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=900&q=80",
    white: "https://images.unsplash.com/photo-1463100099107-aa0980c362e6?auto=format&fit=crop&w=900&q=80",
    knit: "https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=900&q=80",
    court: "https://images.unsplash.com/photo-1514996937319-344454492b37?auto=format&fit=crop&w=900&q=80",
    slipOn: "https://images.unsplash.com/photo-1491553895911-0055eca6402d?auto=format&fit=crop&w=900&q=80",
    training: "https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&w=900&q=80",
    suede: "https://images.unsplash.com/photo-1515955656352-a1fa3ffcd111?auto=format&fit=crop&w=900&q=80",
    sneaker: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80",
  },
};

const curatedProductImageOverrides = {
  "Oxford Office Shirt": "/images/catalog/custom/oxford-office-shirt.webp",
  "Vintage Graphic Tee": "/images/catalog/custom/vintage-graphic-tee.webp",
  "Relaxed Crew Neck Tee": "/images/catalog/custom/relaxed-crew-neck-tee.jpg",
  "Everyday Soft Top": "/images/catalog/custom/everyday-soft-top.jpg",
  "Classic White Shirt": "/images/catalog/custom/classic-white-shirt.jpg",
  "Ribbed Casual Tee": "/images/catalog/custom/ribbed-casual-tee.webp",
  "Smart Check Shirt": "/images/catalog/custom/smart-check-shirt.webp",
  "Rainbow Play Top": "/images/catalog/custom/rainbow-play-top.webp",
  "Running Track Pants": "/images/catalog/custom/running-track-pants.webp",
  "Stylish Mens Trackpants": "/images/catalog/custom/running-track-pants.webp",
  "Striped Weekend Shirt": "/images/catalog/custom/striped-weekend-shirt.webp",
  "casual shirts for men": "/images/catalog/custom/striped-weekend-shirt.webp",
  "Tailored Cotton Chinos": "/images/catalog/custom/tailored-cotton-chinos.jpg",
  "beige pant men's": "/images/catalog/custom/tailored-cotton-chinos.jpg",
  "Zip Front Hoodie": "/images/catalog/custom/zip-front-hoodie.webp",
  "Lava Men Hoodie": "/images/catalog/custom/zip-front-hoodie.webp",
  "Smart Casual Blazer": "/images/catalog/custom/smart-casual-blazer.webp",
  "Men's grey single breasted slim fit blazer": "/images/catalog/custom/smart-casual-blazer.webp",
  "Denim Jacket Slate": "/images/catalog/custom/denim-jacket-slate.jpg",
  "pure cotton denim jacket": "/images/catalog/custom/denim-jacket-slate.jpg",
  "Embroidered Kurta Set": "/images/catalog/custom/embroidered-kurta-set-male.webp",
  "Mustard Parrot Chanderi Kurta Set for Men": "/images/catalog/custom/embroidered-kurta-set-male.webp",
  "Varsity Sweatshirt": "/images/catalog/custom/varsity-sweatshirt.webp",
  "graphic print Men Sweatshirt": "/images/catalog/custom/varsity-sweatshirt.webp",
};

const curatedProductNameOverrides = {
  "Running Track Pants": "Stylish Mens Trackpants",
  "Striped Weekend Shirt": "casual shirts for men",
  "Tailored Cotton Chinos": "beige pant men's",
  "Zip Front Hoodie": "Lava Men Hoodie",
  "Smart Casual Blazer": "Men's grey single breasted slim fit blazer",
  "Denim Jacket Slate": "pure cotton denim jacket",
  "Embroidered Kurta Set": "Mustard Parrot Chanderi Kurta Set for Men",
  "Varsity Sweatshirt": "graphic print Men Sweatshirt",
};

function normalizedProductName(name = "") {
  return curatedProductNameOverrides[name] || name;
}

function normalizeProductRecord(product) {
  if (!product || typeof product !== "object" || Array.isArray(product)) {
    return product;
  }

  const normalizedName = normalizedProductName(product.name);
  const explicitImage = curatedProductImageOverrides[normalizedName] || curatedProductImageOverrides[product.name];

  return {
    ...product,
    name: normalizedName,
    image: explicitImage || product.image,
  };
}

function normalizeProfileRecord(profile) {
  if (!profile || typeof profile !== "object") {
    return profile;
  }

  return {
    ...profile,
    wishlist: Array.isArray(profile.wishlist) ? profile.wishlist.map(normalizeProductRecord) : profile.wishlist,
    cart: Array.isArray(profile.cart)
      ? profile.cart.map((item) => ({
          ...item,
          product: normalizeProductRecord(item.product),
        }))
      : profile.cart,
  };
}

function normalizeOrderRecord(order) {
  if (!order || typeof order !== "object") {
    return order;
  }

  return {
    ...order,
    items: Array.isArray(order.items)
      ? order.items.map((item) => ({
          ...item,
          name: normalizedProductName(item?.name),
          product: normalizeProductRecord(item?.product),
        }))
      : order.items,
  };
}

const beautySvgPalettes = [
  { bg: "#fff4f6", panel: "#ffdce6", accent: "#ec5d87", accentSoft: "#ffbfd0", ink: "#5f2a40" },
  { bg: "#fff7ef", panel: "#ffe0c2", accent: "#d9783f", accentSoft: "#ffc58f", ink: "#69412a" },
  { bg: "#f5f8ff", panel: "#dce8ff", accent: "#5b7be0", accentSoft: "#b8ccff", ink: "#2e3d73" },
  { bg: "#f4fff9", panel: "#d7f4e4", accent: "#42a874", accentSoft: "#afe6c7", ink: "#25553d" },
  { bg: "#fff9f2", panel: "#f6e3c8", accent: "#ba7c3f", accentSoft: "#ebc695", ink: "#64452b" },
];

function hashString(value = "") {
  let hash = 0;

  for (const character of String(value)) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return hash;
}

function svgToDataUrl(svg) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function splitProductLabel(text = "", maxChars = 18) {
  const words = String(text).trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let currentLine = "";

  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;
    if (nextLine.length > maxChars && currentLine) {
      lines.push(currentLine);
      currentLine = word;
      if (lines.length === 2) {
        break;
      }
    } else {
      currentLine = nextLine;
    }
  }

  if (currentLine && lines.length < 2) {
    lines.push(currentLine);
  }

  return lines.length ? lines : [String(text).slice(0, maxChars)];
}

function beautyImageKey(product) {
  const label = `${product?.name || ""} ${product?.productType || ""}`.toLowerCase();

  if (label.includes("brush")) return "brushes";
  if (label.includes("perfume") || label.includes("fragrance") || label.includes("mist")) return "perfume";
  if (label.includes("mascara")) return "mascara";
  if (label.includes("kajal") || label.includes("eye makeup")) return "kajal";
  if (label.includes("nail")) return "nail";
  if (label.includes("lip") || label.includes("cheek tint")) return "lip";
  if (label.includes("compact") || label.includes("foundation") || label.includes("skin tint") || label.includes("powder")) return "compact";
  if (label.includes("sheet mask")) return "sheetMask";
  if (label.includes("mask")) return "maskJar";
  if (label.includes("serum")) return "serum";
  if (label.includes("sunscreen")) return "sunscreen";
  if (label.includes("cleanser") || label.includes("face wash")) return "cleanser";
  if (label.includes("moisturizer") || label.includes("cream") || label.includes("lotion")) return "lotion";
  if (label.includes("hair oil")) return "oil";
  if (label.includes("shampoo")) return "shampoo";
  if (label.includes("conditioner")) return "conditioner";
  if (label.includes("toner")) return "toner";

  return "cleanser";
}

function beautyArtworkMarkup(kind, palette) {
  const shadow = `<ellipse cx="360" cy="402" rx="118" ry="24" fill="${palette.accent}" opacity="0.12" />`;

  const artworkMap = {
    cleanser: `
      ${shadow}
      <rect x="290" y="122" width="140" height="210" rx="34" fill="${palette.panel}" stroke="${palette.ink}" stroke-width="10" />
      <rect x="320" y="88" width="80" height="48" rx="16" fill="${palette.accentSoft}" stroke="${palette.ink}" stroke-width="10" />
      <rect x="336" y="62" width="48" height="28" rx="12" fill="${palette.accent}" />
      <circle cx="360" cy="222" r="36" fill="${palette.accent}" opacity="0.18" />
    `,
    serum: `
      ${shadow}
      <rect x="308" y="154" width="104" height="166" rx="28" fill="${palette.panel}" stroke="${palette.ink}" stroke-width="10" />
      <rect x="332" y="112" width="56" height="52" rx="14" fill="${palette.accentSoft}" stroke="${palette.ink}" stroke-width="10" />
      <rect x="346" y="72" width="28" height="42" rx="10" fill="${palette.accent}" />
      <path d="M360 214 C330 250 336 286 360 306 C384 286 390 250 360 214Z" fill="${palette.accent}" opacity="0.24" />
    `,
    lip: `
      ${shadow}
      <rect x="322" y="200" width="76" height="132" rx="22" fill="${palette.panel}" stroke="${palette.ink}" stroke-width="10" />
      <rect x="330" y="150" width="60" height="70" rx="16" fill="${palette.accentSoft}" stroke="${palette.ink}" stroke-width="10" />
      <path d="M338 150 L382 150 L374 108 Q360 88 346 108 Z" fill="${palette.accent}" stroke="${palette.ink}" stroke-width="10" stroke-linejoin="round" />
    `,
    compact: `
      ${shadow}
      <circle cx="360" cy="206" r="70" fill="${palette.accentSoft}" stroke="${palette.ink}" stroke-width="10" />
      <path d="M290 258 Q360 322 430 258" fill="${palette.panel}" stroke="${palette.ink}" stroke-width="10" />
      <rect x="286" y="258" width="148" height="86" rx="26" fill="${palette.panel}" stroke="${palette.ink}" stroke-width="10" />
      <circle cx="360" cy="300" r="28" fill="${palette.accent}" opacity="0.2" />
    `,
    sunscreen: `
      ${shadow}
      <path d="M316 118 H404 L424 340 Q420 360 400 360 H320 Q300 360 296 340 Z" fill="${palette.panel}" stroke="${palette.ink}" stroke-width="10" stroke-linejoin="round" />
      <rect x="336" y="84" width="48" height="42" rx="14" fill="${palette.accentSoft}" stroke="${palette.ink}" stroke-width="10" />
      <circle cx="360" cy="214" r="32" fill="${palette.accent}" opacity="0.18" />
      <path d="M360 166 L368 188 L392 188 L372 202 L380 226 L360 212 L340 226 L348 202 L328 188 L352 188 Z" fill="${palette.accent}" />
    `,
    lotion: `
      ${shadow}
      <rect x="300" y="116" width="120" height="222" rx="30" fill="${palette.panel}" stroke="${palette.ink}" stroke-width="10" />
      <rect x="330" y="82" width="60" height="44" rx="16" fill="${palette.accentSoft}" stroke="${palette.ink}" stroke-width="10" />
      <path d="M390 92 H418 Q430 92 430 104 V120 H406 V106 H390 Z" fill="${palette.accent}" stroke="${palette.ink}" stroke-width="10" stroke-linejoin="round" />
      <rect x="332" y="198" width="56" height="64" rx="18" fill="${palette.accent}" opacity="0.2" />
    `,
    kajal: `
      ${shadow}
      <rect x="336" y="110" width="48" height="208" rx="20" fill="${palette.panel}" stroke="${palette.ink}" stroke-width="10" />
      <path d="M344 110 L376 110 L368 72 H352 Z" fill="${palette.accent}" stroke="${palette.ink}" stroke-width="10" stroke-linejoin="round" />
      <circle cx="360" cy="252" r="18" fill="${palette.accent}" opacity="0.25" />
    `,
    mascara: `
      ${shadow}
      <rect x="328" y="168" width="64" height="156" rx="22" fill="${palette.panel}" stroke="${palette.ink}" stroke-width="10" />
      <rect x="344" y="84" width="32" height="84" rx="16" fill="${palette.accent}" stroke="${palette.ink}" stroke-width="10" />
      <line x1="360" y1="84" x2="360" y2="42" stroke="${palette.ink}" stroke-width="10" stroke-linecap="round" />
      <line x1="344" y1="50" x2="376" y2="50" stroke="${palette.ink}" stroke-width="6" stroke-linecap="round" />
      <line x1="346" y1="38" x2="374" y2="38" stroke="${palette.ink}" stroke-width="6" stroke-linecap="round" />
    `,
    perfume: `
      ${shadow}
      <rect x="296" y="150" width="128" height="162" rx="34" fill="${palette.panel}" stroke="${palette.ink}" stroke-width="10" />
      <rect x="334" y="108" width="52" height="44" rx="12" fill="${palette.accentSoft}" stroke="${palette.ink}" stroke-width="10" />
      <rect x="346" y="78" width="28" height="28" rx="8" fill="${palette.accent}" />
      <path d="M386 106 H424" stroke="${palette.ink}" stroke-width="10" stroke-linecap="round" />
      <circle cx="360" cy="232" r="26" fill="${palette.accent}" opacity="0.18" />
    `,
    oil: `
      ${shadow}
      <path d="M314 104 H406 L420 324 Q420 350 392 350 H328 Q300 350 300 324 Z" fill="${palette.panel}" stroke="${palette.ink}" stroke-width="10" stroke-linejoin="round" />
      <rect x="334" y="74" width="52" height="40" rx="14" fill="${palette.accentSoft}" stroke="${palette.ink}" stroke-width="10" />
      <path d="M360 184 C334 218 336 254 360 274 C384 254 386 218 360 184Z" fill="${palette.accent}" opacity="0.24" />
    `,
    shampoo: `
      ${shadow}
      <rect x="304" y="112" width="112" height="220" rx="34" fill="${palette.panel}" stroke="${palette.ink}" stroke-width="10" />
      <rect x="330" y="78" width="60" height="42" rx="14" fill="${palette.accentSoft}" stroke="${palette.ink}" stroke-width="10" />
      <rect x="340" y="58" width="40" height="20" rx="8" fill="${palette.accent}" />
      <path d="M330 214 Q360 176 390 214" stroke="${palette.accent}" stroke-width="12" stroke-linecap="round" fill="none" />
      <path d="M330 240 Q360 202 390 240" stroke="${palette.accent}" stroke-width="12" stroke-linecap="round" fill="none" />
    `,
    conditioner: `
      ${shadow}
      <path d="M314 110 H406 V318 Q406 350 374 350 H346 Q314 350 314 318 Z" fill="${palette.panel}" stroke="${palette.ink}" stroke-width="10" stroke-linejoin="round" />
      <rect x="332" y="74" width="56" height="36" rx="12" fill="${palette.accentSoft}" stroke="${palette.ink}" stroke-width="10" />
      <circle cx="360" cy="218" r="28" fill="${palette.accent}" opacity="0.2" />
      <path d="M336 252 Q360 286 384 252" stroke="${palette.accent}" stroke-width="12" stroke-linecap="round" fill="none" />
    `,
    maskJar: `
      ${shadow}
      <rect x="294" y="214" width="132" height="108" rx="28" fill="${palette.panel}" stroke="${palette.ink}" stroke-width="10" />
      <rect x="280" y="160" width="160" height="60" rx="24" fill="${palette.accentSoft}" stroke="${palette.ink}" stroke-width="10" />
      <circle cx="360" cy="268" r="26" fill="${palette.accent}" opacity="0.18" />
    `,
    toner: `
      ${shadow}
      <rect x="312" y="112" width="96" height="226" rx="28" fill="${palette.panel}" stroke="${palette.ink}" stroke-width="10" />
      <rect x="330" y="72" width="60" height="48" rx="16" fill="${palette.accentSoft}" stroke="${palette.ink}" stroke-width="10" />
      <rect x="346" y="48" width="28" height="24" rx="8" fill="${palette.accent}" />
      <circle cx="360" cy="228" r="24" fill="${palette.accent}" opacity="0.2" />
    `,
    nail: `
      ${shadow}
      <rect x="320" y="168" width="80" height="134" rx="24" fill="${palette.panel}" stroke="${palette.ink}" stroke-width="10" />
      <rect x="344" y="84" width="32" height="84" rx="14" fill="${palette.accent}" stroke="${palette.ink}" stroke-width="10" />
      <circle cx="360" cy="234" r="24" fill="${palette.accent}" opacity="0.18" />
    `,
    brushes: `
      ${shadow}
      <rect x="274" y="258" width="172" height="76" rx="24" fill="${palette.panel}" stroke="${palette.ink}" stroke-width="10" />
      <line x1="312" y1="120" x2="332" y2="258" stroke="${palette.ink}" stroke-width="10" stroke-linecap="round" />
      <line x1="360" y1="96" x2="360" y2="258" stroke="${palette.ink}" stroke-width="10" stroke-linecap="round" />
      <line x1="408" y1="126" x2="388" y2="258" stroke="${palette.ink}" stroke-width="10" stroke-linecap="round" />
      <ellipse cx="308" cy="110" rx="24" ry="32" fill="${palette.accentSoft}" stroke="${palette.ink}" stroke-width="10" />
      <ellipse cx="360" cy="82" rx="26" ry="36" fill="${palette.accent}" stroke="${palette.ink}" stroke-width="10" />
      <ellipse cx="412" cy="116" rx="22" ry="30" fill="${palette.accentSoft}" stroke="${palette.ink}" stroke-width="10" />
    `,
    sheetMask: `
      ${shadow}
      <rect x="294" y="116" width="132" height="228" rx="28" fill="${palette.panel}" stroke="${palette.ink}" stroke-width="10" />
      <path d="M320 178 Q360 146 400 178 V244 Q400 296 360 316 Q320 296 320 244 Z" fill="${palette.accentSoft}" />
      <circle cx="342" cy="214" r="10" fill="${palette.ink}" />
      <circle cx="378" cy="214" r="10" fill="${palette.ink}" />
      <path d="M346 256 Q360 268 374 256" stroke="${palette.ink}" stroke-width="8" stroke-linecap="round" fill="none" />
    `,
  };

  return artworkMap[kind] || artworkMap.cleanser;
}

function beautyGeneratedImage(product) {
  const seed = `${product?.name || ""}-${product?.productType || ""}`;
  const palette = beautySvgPalettes[hashString(seed) % beautySvgPalettes.length];
  const titleLines = splitProductLabel(product?.name || "Beauty Pick");
  const subtitle = escapeText(product?.productType || "Beauty");
  const titleMarkup = titleLines
    .map(
      (line, index) =>
        `<text x="50%" y="${index === 0 ? 404 : 432}" text-anchor="middle" font-family="Manrope, Arial, sans-serif" font-size="${
          index === 0 ? 22 : 20
        }" font-weight="800" fill="${palette.ink}">${escapeText(line)}</text>`
    )
    .join("");

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 520" role="img" aria-label="${escapeText(
      product?.name || "Beauty product"
    )}">
      <rect width="720" height="520" rx="36" fill="${palette.bg}" />
      <rect x="54" y="42" width="612" height="436" rx="32" fill="white" />
      <rect x="76" y="64" width="568" height="392" rx="28" fill="${palette.bg}" />
      <circle cx="132" cy="104" r="8" fill="${palette.accent}" opacity="0.6" />
      <circle cx="588" cy="112" r="12" fill="${palette.accentSoft}" opacity="0.7" />
      ${beautyArtworkMarkup(beautyImageKey(product), palette)}
      ${titleMarkup}
      <text x="50%" y="462" text-anchor="middle" font-family="Manrope, Arial, sans-serif" font-size="16" font-weight="700" fill="${palette.accent}">${subtitle}</text>
    </svg>
  `;

  return svgToDataUrl(svg);
}

function decorImageKey(product) {
  const label = `${product?.name || ""} ${product?.productType || ""}`.toLowerCase();

  if (label.includes("lamp")) return "lamp";
  if (label.includes("art") || label.includes("frame")) return "wallArt";
  if (label.includes("candle")) return "candle";
  if (label.includes("basket")) return "basket";
  if (label.includes("mirror")) return "mirror";
  if (label.includes("cushion") || label.includes("soft furnishing")) return "cushion";
  if (label.includes("planter")) return "planter";
  if (label.includes("clock")) return "clock";
  if (label.includes("tray")) return "tray";
  if (label.includes("vase")) return "vase";

  return "decor";
}

function shoeImageKey(product) {
  const label = `${product?.name || ""} ${product?.productType || ""}`.toLowerCase();

  if (label.includes("slip")) return "slipOn";
  if (label.includes("training")) return "training";
  if (label.includes("trail") || label.includes("running") || label.includes("runner")) return "running";
  if (label.includes("canvas")) return "canvas";
  if (label.includes("court")) return "court";
  if (label.includes("suede")) return "suede";
  if (label.includes("leather")) return "leather";
  if (label.includes("white") || label.includes("low top")) return "white";
  if (label.includes("knit")) return "knit";
  if (label.includes("sneaker")) return "sneaker";

  return "running";
}

function usesGeneratedCatalogImage(product) {
  const image = String(product?.image || "");
  return image.startsWith("/images/catalog/") || /\.svg(?:$|\?)/i.test(image);
}

function curatedRealProductImage(product) {
  const explicitImage = curatedProductImageOverrides[product?.name];

  if (explicitImage) {
    return explicitImage;
  }

  const category = product?.category || "";
  const type = String(product?.productType || "").toLowerCase();
  const segment = String(product?.segment || "").toLowerCase();

  if (category === "Fashion") {
    if (segment === "male") {
      if (type.includes("indian wear")) {
        return curatedRealCatalogImages.fashion.maleIndianWear;
      }
      if (type.includes("jacket") || type.includes("hoodie") || type.includes("blazer") || type.includes("sweatshirt")) {
        return curatedRealCatalogImages.fashion.maleOuterwear;
      }
      if (type.includes("shirt") || type.includes("top") || type.includes("polo")) {
        return curatedRealCatalogImages.fashion.maleTop;
      }
      return curatedRealCatalogImages.fashion.maleTshirt;
    }

    if (segment === "female") {
      if (type.includes("indian wear") || type.includes("saree") || type.includes("lehenga") || type.includes("tunic")) {
        return curatedRealCatalogImages.fashion.femaleIndianWear;
      }
      if (type.includes("dress") || type.includes("gown")) {
        return curatedRealCatalogImages.fashion.femaleDress;
      }
      if (type.includes("shirt") || type.includes("top") || type.includes("blouse") || type.includes("jacket") || type.includes("cardigan") || type.includes("knitwear")) {
        return curatedRealCatalogImages.fashion.femaleTop;
      }
      return curatedRealCatalogImages.fashion.femaleTshirt;
    }

    if (segment === "kids") {
      if (type.includes("indian wear")) {
        return curatedRealCatalogImages.fashion.kidsIndianWear;
      }
      if (type.includes("dress") || type.includes("frock")) {
        return curatedRealCatalogImages.fashion.kidsDress;
      }
      if (type.includes("shirt") || type.includes("top") || type.includes("hoodie") || type.includes("jacket")) {
        return curatedRealCatalogImages.fashion.kidsTop;
      }
      return curatedRealCatalogImages.fashion.kidsTshirt;
    }
  }

  if (category === "Beauty") {
    return curatedRealCatalogImages.beauty[beautyImageKey(product)] || curatedRealCatalogImages.beauty.cleanser;
  }

  if (category === "Decoration Items") {
    return curatedRealCatalogImages.decor[decorImageKey(product)] || curatedRealCatalogImages.decor.decor;
  }

  if (category === "Shoes") {
    return curatedRealCatalogImages.shoes[shoeImageKey(product)] || curatedRealCatalogImages.shoes.running;
  }

  return "";
}

function productImageUrl(product) {
  const explicitImage = curatedProductImageOverrides[product?.name];

  if (explicitImage) {
    return explicitImage;
  }

  if (usesGeneratedCatalogImage(product)) {
    return curatedRealProductImage(product) || categoryImage(product?.category);
  }

  return product?.image || categoryImage(product?.category);
}

function fallbackImageAttrs(product) {
  return `src="${escapeText(productImageUrl(product))}" onerror="this.onerror=null;this.src='${categoryImage(product?.category)}'"`;
}

function featuredProducts(category, limit = 4) {
  return state.products.filter((product) => product.category === category).slice(0, limit);
}

function homeCategoryBoost(product) {
  return homePriorityCategories.has(product?.category) ? 1 : 0;
}

function showcaseSort(a, b) {
  return (
    homeCategoryBoost(b) - homeCategoryBoost(a) ||
    Number(b.isFeatured) - Number(a.isFeatured) ||
    b.rating - a.rating ||
    a.name.localeCompare(b.name)
  );
}

function favoriteProducts(limit = 4) {
  return [...state.products]
    .sort(
      (a, b) =>
        homeCategoryBoost(b) - homeCategoryBoost(a) ||
        b.rating - a.rating ||
        Number(b.isFeatured) - Number(a.isFeatured) ||
        a.name.localeCompare(b.name)
    )
    .slice(0, limit);
}

function exclusiveProducts(limit = 4) {
  return [...state.products].sort(showcaseSort).slice(0, limit);
}

function marketGalleryProducts(limit = 20) {
  const sortByShowcase = (products) => [...products].sort(showcaseSort);
  const fashion = sortByShowcase(state.products.filter((product) => product.category === "Fashion"));
  const beauty = sortByShowcase(state.products.filter((product) => product.category === "Beauty"));
  const grocery = sortByShowcase(state.products.filter((product) => product.category === "Grocery"));

  const fashionShowcase = [
    ...fashion.filter((product) => product.segment === "Male").slice(0, 3),
    ...fashion.filter((product) => product.segment === "Female").slice(0, 3),
    ...fashion.filter((product) => product.segment === "Kids").slice(0, 2),
  ];

  return [...fashionShowcase, ...beauty.slice(0, 6), ...grocery.slice(0, 6)].slice(0, limit);
}

function isFashionCategory(category = state.filters.category) {
  return category === "Fashion";
}

function productBadge(product) {
  if (product?.category === "Fashion") {
    return [product.segment, product.productType].filter(Boolean).join(" / ") || "Fashion";
  }

  if (product?.category === "Beauty") {
    return product.productType || "Beauty";
  }

  return product?.vendorName || product?.category || "UrbanKart";
}

function productMetaTrail(product) {
  return [product?.category, product?.segment, product?.productType].filter(Boolean).join(" / ");
}

function catalogViewLabel() {
  if (state.filters.search) {
    return state.filters.search;
  }

  if (isFashionCategory() && state.filters.segment) {
    return `${state.filters.segment} Fashion`;
  }

  return state.filters.category;
}

async function bootstrap() {
  window.addEventListener("scroll", handleScroll);
  window.addEventListener("keydown", handleGlobalKeydown);
  handleScroll();
  renderNav();
  
  try {
    await loadCategories();
    await loadProducts();
  } catch (err) {
    console.error("Backend error:", err);
    document.getElementById("app").innerHTML = `
      <div style="padding: 100px 20px; text-align: center; font-family: sans-serif;">
        <h2 style="color: #333;">Service Unavailable</h2>
        <p style="color: #666; margin-top: 10px;">The backend server is either restarting or not reachable. Please refresh the page in a few seconds.</p>
        <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #000; color: #fff; border: none; border-radius: 4px; cursor: pointer;">Retry</button>
      </div>
    `;
    return;
  }

  if (state.token) {
    try {
      await refreshProfile();
    } catch (error) {
      clearAuth();
    }
  }

  render();
}

async function loadCategories() {
  const data = await api("/api/products/categories/all");
  state.categories = ["All", ...data.data];
}

async function loadProducts() {
  const params = new URLSearchParams();
  Object.entries(state.filters).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });

  const data = await api(`/api/products?${params.toString()}`);
  state.products = (data.data || []).map(normalizeProductRecord);
}

async function refreshProfile() {
  if (!state.token) {
    return;
  }

  const [profileData, ordersData] = await Promise.all([api("/api/users/profile"), api("/api/orders")]);
  state.profile = normalizeProfileRecord(profileData.data);
  state.orders = (ordersData.data || []).map(normalizeOrderRecord);

  if (state.user.role === "vendor") {
    state.vendorDashboard = (await api("/api/vendor/dashboard")).data;
  }

  if (state.user.role === "admin") {
    state.adminDashboard = (await api("/api/admin/dashboard")).data;
  }

  syncCheckoutState();
}

function setView(view, productId = null) {
  state.currentView = view;
  state.selectedProduct = productId;
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function logout() {
  clearAuth();
  state.currentView = "auth";
  state.authScreenMode = "login";
  render();
  showToast("Logged out successfully");
}

function handleScroll() {
  backToTopBtn.classList.toggle("visible", window.scrollY > 500);
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function scrollToSection(sectionId) {
  document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function scrollRail(sectionId, direction) {
  const rail = document.getElementById(`${sectionId}Track`);
  if (!rail) {
    return;
  }

  rail.scrollBy({
    left: direction === "next" ? 320 : -320,
    behavior: "smooth",
  });
}

function showFeatureToast(label) {
  showToast(`${label} coming soon`);
}

function renderNav() {
  if (state.user) {
    navActions.innerHTML = "";
    return;
  }

  navActions.innerHTML = `
    <button class="btn btn-ghost" type="button" onclick="setView('auth')">Home</button>
    <button class="btn btn-ghost" type="button" onclick="setView('about')">About</button>
    <button class="btn btn-secondary" type="button" onclick="setView('authForm')">Login / Signup</button>
  `;
}

function authView() {
  return `
    <section class="auth-showcase">
      <div class="auth-phone-board">
        <article class="auth-phone auth-phone--welcome">
          <div class="auth-phone-shell">
            <div class="auth-phone-notch"></div>
            <div class="auth-phone-screen">
              <div class="welcome-cart">🛒</div>
              <h3 class="welcome-title">Welcome to OUR MART, let's shop</h3>
              <div class="welcome-visual">
                <img
                  src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80"
                  alt="Shopping style visual"
                />
              </div>
              <div class="phone-dots phone-dots--warm">
                <span class="active"></span>
                <span></span>
                <span></span>
              </div>
              <button class="btn btn-primary phone-cta" type="button" onclick="toggleAuthTab('signup')">Continue</button>
            </div>
          </div>
        </article>
        <article class="auth-phone auth-phone--form">
          <div class="auth-phone-shell">
            <div class="auth-phone-notch"></div>
            <div class="auth-phone-screen auth-phone-screen--form">
              <p class="auth-phone-heading">Sign Up</p>
              <span class="auth-phone-subheading">Hello there, sign up to continue.</span>
              <div class="auth-tabs auth-tabs--compact">
                <button class="btn btn-secondary tab-active" id="loginTabBtn" onclick="toggleAuthTab('login')">Login</button>
                <button class="btn btn-secondary" id="signupTabBtn" onclick="toggleAuthTab('signup')">Sign Up</button>
              </div>
              <form id="authForm">
                <input type="hidden" id="authMode" value="login" />
                <div class="field auth-field" id="nameField" style="display:none;">
                  <input id="name" placeholder="Full Name" />
                </div>
                <div class="field auth-field">
                  <input id="email" type="email" placeholder="Email" required />
                </div>
                <div class="field auth-field">
                  <input id="password" type="password" placeholder="Password" required />
                </div>
                <div class="field auth-field" id="roleField" style="display:none;">
                  <select id="role">
                    <option value="customer">Customer</option>
                    <option value="vendor">Vendor</option>
                  </select>
                </div>
                <div class="field auth-field" id="storeNameField" style="display:none;">
                  <input id="storeName" placeholder="Store Name" />
                </div>
                <button class="btn btn-primary phone-cta" type="submit">Continue</button>
              </form>
              <div class="auth-divider auth-divider--compact"><span>OR</span></div>
              <div class="social-row">
                <button class="social-btn" type="button">G</button>
                <button class="social-btn" type="button">f</button>
                <button class="social-btn" type="button">t</button>
              </div>
              <p class="auth-terms">By continuing you agree to our terms & conditions.</p>
            </div>
          </div>
        </article>
        <article class="auth-phone auth-phone--login">
          <div class="auth-phone-shell">
            <div class="auth-phone-notch"></div>
            <div class="auth-phone-screen auth-phone-screen--login">
              <p class="auth-phone-heading">Good Afternoon !</p>
              <span class="auth-phone-subheading">Welcome to UrbanKart</span>
              <div class="login-preview-field">Email</div>
              <div class="login-preview-field">Password</div>
              <div class="login-preview-meta">
                <span>Remember Me</span>
                <button class="auth-link-btn" type="button" onclick="resetPasswordPrompt()">Reset Password</button>
              </div>
              <button class="btn btn-primary phone-cta" type="button" onclick="toggleAuthTab('login')">Login</button>
              <p class="login-preview-copy">Don't have account? Register!</p>
              <div class="auth-divider auth-divider--compact"><span>OR Login with</span></div>
              <div class="social-row">
                <button class="social-btn" type="button">G</button>
                <button class="social-btn" type="button">f</button>
                <button class="social-btn" type="button">t</button>
              </div>
              <p class="auth-terms">By continuing you confirm that you agree with our terms & condition.</p>
            </div>
          </div>
        </article>
      </div>
      <div class="auth-showcase-copy">
        <p class="eyebrow">Scalable Multi-Vendor Commerce</p>
        <h2 class="display-title">UrbanKart auth, styled like your reference.</h2>
        <p class="muted">A more visual onboarding flow with shopping-first cues, while keeping the real login and signup logic connected to your backend.</p>
        <div class="auth-side-note">
          <strong>Demo accounts</strong>
          <span>admin@example.com, vendor@example.com, customer@example.com</span>
        </div>
      </div>
    </section>
  `;
}

