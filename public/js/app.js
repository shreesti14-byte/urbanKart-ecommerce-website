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
  authScreenMode: "login",
  checkout: {
    paymentMethod: "Card Authorization",
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
  state.paymentAuthorization = null;
  state.checkout.paymentMethod = "Card Authorization";
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
  return method === "Card Authorization";
}

function syncCheckoutState() {
  if (!safeCartItems().length) {
    state.paymentAuthorization = null;
    return;
  }

  if (
    state.paymentAuthorization &&
    Number(state.paymentAuthorization.amount || 0) !== Number(getCartSubtotal())
  ) {
    state.paymentAuthorization = null;
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
  handleScroll();
  renderNav();
  await loadCategories();
  await loadProducts();

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
  state.products = data.data;
}

async function refreshProfile() {
  if (!state.token) {
    return;
  }

  const [profileData, ordersData] = await Promise.all([api("/api/users/profile"), api("/api/orders")]);
  state.profile = profileData.data;
  state.orders = ordersData.data;

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

function authWelcomeView() {
  return `
    <section class="welcome-auth">
      <div class="welcome-auth-media">
        <img src="/images/welcome-auth.jpg" alt="UrbanKart welcome shopping visual" />
      </div>
      <div class="welcome-auth-card">
        <p class="eyebrow">Welcome To UrbanKart</p>
        <h2 class="display-title">Find your daily favorites, fashion picks, and smart essentials in one place.</h2>
        <p class="muted">Shop fresh, live better, and discover something worth adding to your cart every time.</p>
        <p class="muted">Simple browsing, trusted sellers, and a cleaner shopping experience start right here.</p>
        <div class="welcome-auth-actions">
          <button class="btn btn-primary" type="button" onclick="openAuthForm('login')">Login</button>
          <button class="btn btn-secondary" type="button" onclick="openAuthForm('signup')">Signup</button>
        </div>
      </div>
    </section>
  `;
}

function authFormView(mode = "login") {
  const isSignup = mode === "signup";
  return `
    <section class="auth-form-page">
      <div class="auth-form-card">
        <p class="eyebrow">${isSignup ? "Create An Account" : "Welcome Back"}</p>
        <h2>${isSignup ? "Signup to continue with UrbanKart" : "Login to continue with UrbanKart"}</h2>
        <div class="auth-tabs">
          <button class="btn btn-secondary ${!isSignup ? "tab-active" : ""}" id="loginTabBtn" onclick="toggleAuthTab('login')">Login</button>
          <button class="btn btn-secondary ${isSignup ? "tab-active" : ""}" id="signupTabBtn" onclick="toggleAuthTab('signup')">Signup</button>
        </div>
        <form id="authForm">
          <input type="hidden" id="authMode" value="${isSignup ? "signup" : "login"}" />
          <div class="field" id="nameField" style="display:${isSignup ? "grid" : "none"};">
            <label for="name">Full Name</label>
            <input id="name" placeholder="Jane Smith" />
          </div>
          <div class="field">
            <label for="email">Email</label>
            <input id="email" type="email" placeholder="you@example.com" required />
          </div>
          <div class="field">
            <label for="password">Password</label>
            <input id="password" type="password" placeholder="Minimum 6 characters" required />
          </div>
          <div class="field" id="roleField" style="display:${isSignup ? "grid" : "none"};">
            <label for="role">Role</label>
            <select id="role">
              <option value="customer">Customer</option>
              <option value="vendor">Vendor</option>
            </select>
          </div>
          <div class="field" id="storeNameField" style="display:${isSignup ? "grid" : "none"};">
            <label for="storeName">Store Name</label>
            <input id="storeName" placeholder="Your Shop Name" />
          </div>
          <button class="btn btn-primary" type="submit">${isSignup ? "Create Account" : "Login"}</button>
        </form>
        <div class="toolbar auth-form-footer">
          <button class="btn btn-ghost" type="button" onclick="resetPasswordPrompt()">Reset password</button>
        </div>
        <p class="auth-switch-copy">
          ${
            isSignup
              ? `Already have an account? <a href="#" onclick="openAuthForm('login'); return false;">Login here</a>`
              : `If you don't have an account, <a href="#" onclick="openAuthForm('signup'); return false;">create an account</a>`
          }
        </p>
      </div>
    </section>
  `;
}

function openAuthForm(mode = "login") {
  state.currentView = "authForm";
  state.authScreenMode = mode;
  render();
}

function announcementMarkup() {
  return `<div class="announcement-strip">${announcements
    .map((item) => `<span>${item}</span>`)
    .join("")}</div>`;
}

function customerHeader() {
  const searchValue = escapeText(state.filters.search);

  return `
    <header class="store-header">
      ${announcementMarkup()}
      <div class="store-topbar">
        <div class="brand-mark" onclick="goHome()" style="cursor:pointer;">URBANKART<small>&bull;</small></div>
        <form class="search-shell" onsubmit="submitSearch(event)">
          <input id="headerSearch" value="${searchValue}" placeholder="Search products, brands, categories" />
          <button type="submit">Find</button>
        </form>
        <div class="utility-links">
          <span class="utility-link" onclick="goHome()">Home</span>
          <span class="utility-link" onclick="setView('about')">About</span>
          <span class="utility-link" onclick="setView('profile')">Account</span>
          <span class="utility-icon" onclick="setView('wishlist')" title="Wishlist">&#9825;</span>
          <span class="utility-icon" onclick="setView('orders')" title="Orders">ORD</span>
          <span class="utility-icon utility-icon-cart" onclick="setView('cart')" title="Cart"><span class="cart-icon">&#128722;</span><span class="cart-count">${getCartCount()}</span></span>
        </div>
      </div>
      <div class="category-nav-wrap">
        <div class="category-nav">
          ${state.categories
            .slice(1)
            .map(
              (category) =>
                `<span class="category-link ${state.filters.category === category ? "active" : ""}" onclick="selectCategory('${escapeText(
                  category
                )}')">${escapeText(category)}</span>`
            )
            .join("")}
        </div>
      </div>
    </header>
  `;
}

function heroMarkup() {
  return `
    <section class="hero-stage" onmouseenter="stopHeroRotation()" onmouseleave="startHeroRotation()">
      ${heroSlides
        .map(
          (slide, index) => `
            <div
              class="hero-slide ${index === activeHeroSlideIndex ? "is-active" : ""}"
              style="background-image:url('${slide.image}');"
              data-hero-index="${index}"
              aria-hidden="${index === activeHeroSlideIndex ? "false" : "true"}"
            >
              <div class="hero-content">
                <h2 class="hero-title">${slide.title}</h2>
                <p class="hero-copy">${slide.copy}</p>
                <div class="toolbar">
                  <button class="btn btn-secondary hero-cta" onclick="selectCategory('${escapeText(
                    slide.category || "All"
                  )}')">${slide.cta}</button>
                </div>
              </div>
            </div>
          `
        )
        .join("")}
      <div class="hero-dots">
        ${heroSlides
          .map(
            (_, index) => `
              <button
                class="hero-dot ${index === activeHeroSlideIndex ? "active" : ""}"
                type="button"
                aria-label="Show slide ${index + 1}"
                onclick="setHeroSlide(${index}, true)"
              ></button>
            `
          )
          .join("")}
      </div>
      <div class="hero-arrows">
        <button class="hero-arrow" type="button" aria-label="Previous slide" onclick="shiftHeroSlide(-1)">&#8592;</button>
        <button class="hero-arrow" type="button" aria-label="Next slide" onclick="shiftHeroSlide(1)">&#8594;</button>
      </div>
    </section>
  `;
}

function syncHeroSlider() {
  const slides = document.querySelectorAll(".hero-slide");
  const dots = document.querySelectorAll(".hero-dot");

  slides.forEach((slide, index) => {
    const isActive = index === activeHeroSlideIndex;
    slide.classList.toggle("is-active", isActive);
    slide.setAttribute("aria-hidden", String(!isActive));
  });

  dots.forEach((dot, index) => {
    const isActive = index === activeHeroSlideIndex;
    dot.classList.toggle("active", isActive);
    dot.setAttribute("aria-pressed", String(isActive));
  });
}

function setHeroSlide(index, restartTimer = false) {
  activeHeroSlideIndex = (index + heroSlides.length) % heroSlides.length;
  syncHeroSlider();

  if (restartTimer) {
    startHeroRotation();
  }
}

function shiftHeroSlide(direction) {
  setHeroSlide(activeHeroSlideIndex + direction, true);
}

function stopHeroRotation() {
  if (heroRotationTimer) {
    clearInterval(heroRotationTimer);
    heroRotationTimer = null;
  }
}

function startHeroRotation() {
  stopHeroRotation();

  if (!document.querySelector(".hero-stage")) {
    return;
  }

  heroRotationTimer = window.setInterval(() => {
    setHeroSlide(activeHeroSlideIndex + 1);
  }, 4500);
}

function initHeroSlider() {
  if (!document.querySelector(".hero-stage")) {
    stopHeroRotation();
    return;
  }

  syncHeroSlider();
  startHeroRotation();
}

function standardBadge(title) {
  const badgeMap = {
    "Clean & Organic": "PURE",
    "Delivered Across India": "SWIFT",
    "Personally Curated": "CURATED",
    "Feel Gloriously Well": "WELL",
  };

  return badgeMap[title] || "SELECT";
}

function standardsMarkup() {
  return `
    <section class="standards-section">
      <div class="standards-grid">
        <div class="standard-lead">
          <h2 class="editorial-title">The UrbanKart Standard</h2>
          <p class="section-kicker">Provenance and purity, no compromise</p>
        </div>
        ${standards
          .map(
            (item) => `
              <div class="standard-item">
                <div class="standard-icon">${standardBadge(item.title)}</div>
                <strong>${item.title}</strong>
                <span>${item.copy}</span>
              </div>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function productCard(product) {
  const inventory = getInventoryState(product);

  return `
    <article class="rail-card">
      <div class="rail-image">
        <button class="wish-button ${isWishlisted(product._id) ? "active" : ""}" type="button" onclick="toggleWishlist('${product._id}')" title="Wishlist">&#9825;</button>
        <img ${fallbackImageAttrs(product)} alt="${escapeText(product.name)}" />
      </div>
      <div class="product-card-topline">
        <div class="brand-tag">${escapeText(productBadge(product))}</div>
        ${stockBadgeMarkup(product, { compact: true })}
      </div>
      <h4>${escapeText(product.name)}</h4>
      <div class="product-submeta">${escapeText(product.vendorName || "UrbanKart")}</div>
      <div class="meta">${escapeText(product.description).slice(0, 72)}...</div>
      <div class="meta">${escapeText(inventory.detail)}</div>
      <div class="price-tag">${formatCurrency(product.price)}</div>
      <div class="toolbar">
        <button class="btn btn-secondary" onclick="openProduct('${product._id}')">View details</button>
        <button class="btn btn-primary" onclick="quickAddToCart('${product._id}')" ${
          inventory.purchasable ? "" : "disabled"
        }>${inventory.buttonLabel}</button>
      </div>
    </article>
  `;
}

function railSection(sectionId, title, copy, buttonLabel, products) {
  return `
    <section class="section-block" id="${sectionId}">
      <div class="rail-layout">
        <div class="rail-sidebar">
          <h2 class="section-title">${title}</h2>
          <p class="section-kicker">${copy}</p>
          <div class="toolbar">
            <button class="btn btn-primary" onclick="openRailCollection('${sectionId}')">${buttonLabel}</button>
          </div>
          <div class="rail-controls">
            <button class="btn btn-secondary" type="button" onclick="scrollRail('${sectionId}', 'prev')">&#8592;</button>
            <button class="btn btn-secondary" type="button" onclick="scrollRail('${sectionId}', 'next')">&#8594;</button>
          </div>
        </div>
        <div class="rail-track" id="${sectionId}Track">
          ${products.map(productCard).join("")}
        </div>
      </div>
    </section>
  `;
}

function bannerSection() {
  const product = featuredProducts("Decoration Items", 1)[0] || state.products[0];
  if (!product) {
    return "";
  }

  return `
    <section class="section-block">
      <div class="banner-card">
        <div class="banner-copy">
          <h2 class="section-title">Happy House</h2>
          <p class="section-kicker">Discover the household essentials that help make your space calmer, cleaner, and better arranged.</p>
          <div class="toolbar">
            <button class="btn btn-primary" onclick="openProduct('${product._id}')">Shop now</button>
          </div>
        </div>
        <div class="banner-media" style="background-image:url('${productImageUrl(product)}');"></div>
      </div>
    </section>
  `;
}

function featureCards() {
  const picks = favoriteProducts(3);
  return `
    <section class="section-block">
      <div class="section-head">
        <div>
          <h2 class="section-title">UrbanKart Favourites</h2>
          <p class="section-kicker">Curated bundles and product stories designed to support your daily goals.</p>
        </div>
      </div>
      <div class="feature-grid">
        ${picks
          .map(
            (product) => `
              <article class="feature-card">
                <div class="feature-media">
                  <img ${fallbackImageAttrs(product)} alt="${escapeText(product.name)}" />
                </div>
                <h3>${escapeText(product.name)}</h3>
                <p>${escapeText(product.description)}</p>
                <a href="#" class="link-inline" onclick="openProduct('${product._id}'); return false;">Shop The Collection</a>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function realImageGalleryMarkup() {
  const products = marketGalleryProducts(20);
  if (!products.length) {
    return "";
  }

  return `
    <section class="section-block">
      <div class="section-head">
        <div>
          <p class="eyebrow">Real Image Edit</p>
          <h2 class="section-title">20 Fresh Fashion, Beauty & Grocery Picks</h2>
          <p class="section-kicker">Real product photos across male, female, kids fashion, beauty essentials, and daily grocery favorites.</p>
        </div>
        <div class="toolbar">
          <button class="btn btn-secondary" type="button" onclick="selectCategory('Fashion')">Shop Fashion</button>
          <button class="btn btn-primary" type="button" onclick="selectCategory('Grocery')">Shop Grocery</button>
        </div>
      </div>
      <div class="lookbook-grid">
        ${products
          .map(
            (product) => `
              <button class="lookbook-card" type="button" onclick="openProduct('${product._id}')">
                <img ${fallbackImageAttrs(product)} alt="${escapeText(product.name)}" />
                <span class="lookbook-copy">
                  <span class="lookbook-meta">${escapeText(productMetaTrail(product) || product.category || "UrbanKart")}</span>
                  <span class="lookbook-title">${escapeText(product.name)}</span>
                  <span class="lookbook-price">${formatCurrency(product.price)}</span>
                </span>
              </button>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function partnersMarkup() {
  return `
    <section class="partner-section">
      <div class="section-head">
        <div>
          <h2 class="section-title">Our Partners</h2>
        </div>
      </div>
      <div class="partner-logos">
        ${partnerNames.map((name) => `<span class="partner-logo">${name}</span>`).join("")}
      </div>
    </section>
  `;
}

function journalMarkup() {
  const images = [
    "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1514996937319-344454492b37?auto=format&fit=crop&w=1000&q=80",
  ];

  return `
    <section class="journal-section">
      <div class="section-head">
        <div>
          <h2 class="section-title">UrbanKart Journal</h2>
        </div>
      </div>
      <div class="journal-grid">
        ${journalTopics
          .map(
            (topic, index) => `
              <article class="article-card">
                <img src="${images[index]}" alt="${escapeText(topic.title)}" />
                <h3>${topic.title}</h3>
                <p>${topic.copy}</p>
                <a href="#" class="link-inline" onclick="scrollToSection('featuredProducts'); return false;">Read More</a>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function footerMarkup() {
  return `
    <footer class="footer-section" id="footerSection">
      <div class="footer-inner">
        <div>
          <div class="footer-display">UrbanKart</div>
          <p class="footer-copy">A calmer multi-vendor marketplace for daily essentials, fashion, beauty, decor, and personal tech.</p>
          <div class="newsletter-box">
            <input placeholder="Email" />
            <button type="button">&#8594;</button>
          </div>
        </div>
        <div>
          <strong>Discover</strong>
          <ul class="footer-links">
            <li class="footer-action" onclick="openRailCollection('exclusiveProducts')">Elevare Exclusives</li>
            <li class="footer-action" onclick="openRailCollection('featuredProducts')">Featured Products</li>
            <li class="footer-action" onclick="showFeatureToast('Curated Bundles')">Curated Bundles</li>
          </ul>
        </div>
        <div>
          <strong>Customer Support</strong>
          <ul class="footer-links">
            <li class="footer-action" onclick="showFeatureToast('Delivery & Returns')">Delivery & Returns</li>
            <li class="footer-action" onclick="showFeatureToast('Contact Us')">Contact Us</li>
            <li class="footer-action" onclick="showFeatureToast('FAQs')">FAQs</li>
          </ul>
        </div>
        <div>
          <strong>Explore</strong>
          <ul class="footer-links">
            <li class="footer-action" onclick="setView('about')">Our Story</li>
            <li class="footer-action" onclick="setView('about')">About UrbanKart</li>
            <li class="footer-action" onclick="showFeatureToast('Our Brands')">Our Brands</li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <span>&copy; 2026 UrbanKart. Multi-vendor shopping made simple.</span>
        <div class="toolbar">
          <a href="#" onclick="showFeatureToast('Terms & Conditions'); return false;">Terms & Conditions</a>
          <a href="#" onclick="showFeatureToast('Privacy Policy'); return false;">Privacy Policy</a>
          <a href="#" onclick="showFeatureToast('Cookie Policy'); return false;">Cookie Policy</a>
        </div>
      </div>
    </footer>
  `;
}

function aboutView() {
  const categoryCount = Math.max(
    state.categories.length - 1,
    new Set(state.products.map((product) => product.category).filter(Boolean)).size
  );
  const vendorCount = Math.max(1, new Set(state.products.map((product) => product.vendorName || "UrbanKart")).size);
  const priceValues = state.products.map((product) => Number(product.price || 0)).filter(Boolean);
  const minPrice = priceValues.length ? Math.min(...priceValues) : 0;
  const maxPrice = priceValues.length ? Math.max(...priceValues) : 0;
  const primaryAction = state.user ? "goHome()" : "setView('authForm')";
  const primaryLabel = state.user ? "Back to shopping" : "Explore UrbanKart";

  return `
    ${state.user ? customerHeader() : ""}
    <div class="commerce-shell">
      <div class="page-shell about-page">
        <section class="about-hero panel">
          <p class="eyebrow">About UrbanKart</p>
          <h2 class="section-title">UrbanKart is a multi-vendor marketplace built to make everyday shopping feel curated, calm, and dependable.</h2>
          <p class="muted">We bring together trusted sellers across essentials, fashion, beauty, decor, and technology so customers can shop from multiple vendors without the clutter of a generic marketplace.</p>
          <p class="muted">Our goal is simple: real products, sensible pricing, polished discovery, and a storefront that feels easy to return to.</p>
          <div class="toolbar">
            <button class="btn btn-primary" type="button" onclick="${primaryAction}">${primaryLabel}</button>
            <button class="btn btn-secondary" type="button" onclick="scrollToSection('aboutStory')">Why people choose us</button>
          </div>
        </section>

        <section class="section-block">
          <div class="section-head">
            <div>
              <h2 class="section-title">Marketplace At A Glance</h2>
              <p class="section-kicker">A balanced mix of categories, practical price points, and curated discovery.</p>
            </div>
          </div>
          <div class="stats-grid">
            <article class="feature-card about-metric">
              <p>Categories</p>
              <h3>${categoryCount}</h3>
              <span class="meta">From grocery staples to premium tech and occasion wear.</span>
            </article>
            <article class="feature-card about-metric">
              <p>Products</p>
              <h3>${state.products.length}</h3>
              <span class="meta">A growing catalog designed for discovery without overload.</span>
            </article>
            <article class="feature-card about-metric">
              <p>Vendors</p>
              <h3>${vendorCount}</h3>
              <span class="meta">Multiple sellers supported by one consistent storefront experience.</span>
            </article>
            <article class="feature-card about-metric">
              <p>Price range</p>
              <h3>${priceValues.length ? formatCurrency(minPrice) : "Value-led"}</h3>
              <span class="meta">${priceValues.length ? `Thoughtful options that scale up to ${formatCurrency(maxPrice)}.` : "Smart pricing across everyday and premium categories."}</span>
            </article>
          </div>
        </section>

        <section class="section-block" id="aboutStory">
          <div class="section-head">
            <div>
              <h2 class="section-title">What Makes UrbanKart Different</h2>
              <p class="section-kicker">A more intentional marketplace experience for both shoppers and sellers.</p>
            </div>
          </div>
          <div class="about-story-grid">
            ${aboutHighlights
              .map(
                (item) => `
                  <article class="feature-card about-story-card">
                    <p class="eyebrow">UrbanKart Promise</p>
                    <h3>${item.title}</h3>
                    <p>${item.copy}</p>
                  </article>
                `
              )
              .join("")}
          </div>
        </section>

        <section class="about-note panel">
          <p class="eyebrow">Our Vision</p>
          <h2 class="section-title">We want UrbanKart to feel like a modern marketplace with the clarity of a well-designed boutique.</h2>
          <p class="muted">That means better product presentation, realistic pricing, easier browsing, and enough warmth in the experience that customers feel confident buying from different vendors in one place.</p>
        </section>
      </div>
      ${footerMarkup()}
    </div>
  `;
}

function customerHomeView() {
  return `
    ${customerHeader()}
    <div class="commerce-shell">
      <div class="page-shell">
        ${shouldShowSearchResults() ? catalogView() : `
          ${heroMarkup()}
          ${standardsMarkup()}
          ${realImageGalleryMarkup()}
          ${railSection("featuredProducts", "Featured Products", "Most celebrated picks reserved exclusively for our community.", "Shop The Collection", favoriteProducts(4))}
          ${bannerSection()}
          ${featureCards()}
          ${railSection("exclusiveProducts", "UrbanKart Exclusives", "Assembled by our experts so the storefront feels curated, not cluttered.", "Shop The Collection", exclusiveProducts(4))}
          ${partnersMarkup()}
          ${journalMarkup()}
        `}
      </div>
      ${footerMarkup()}
    </div>
  `;
}

function storefrontView() {
  return `
    ${customerHeader()}
    <div class="commerce-shell">
      <div class="page-shell">
        ${catalogView()}
      </div>
      ${footerMarkup()}
    </div>
  `;
}

function filterSidebar() {
  return `
    <aside class="catalog-sidebar">
      <div class="filter-group">
        <strong>Category</strong>
        ${state.categories
          .slice(1)
          .map(
            (category) => `
              <label class="filter-option">
                <input type="radio" name="category" ${state.filters.category === category ? "checked" : ""} onchange="updateFilter('category', '${escapeText(category)}')" />
                <span>${escapeText(category)}</span>
              </label>
            `
          )
          .join("")}
        <button class="btn btn-ghost" onclick="clearSearchFilters()">Clear All</button>
      </div>
      ${
        isFashionCategory()
          ? `
            <div class="filter-group">
              <strong>Fashion For</strong>
              <label class="filter-option">
                <input type="radio" name="segment" ${!state.filters.segment ? "checked" : ""} onchange="updateFilter('segment', '')" />
                <span>All Fashion</span>
              </label>
              ${fashionSegments
                .map(
                  (segment) => `
                    <label class="filter-option">
                      <input type="radio" name="segment" ${state.filters.segment === segment ? "checked" : ""} onchange="updateFilter('segment', '${segment}')" />
                      <span>${segment}</span>
                    </label>
                  `
                )
                .join("")}
            </div>
          `
          : ""
      }
      <div class="filter-group">
        <strong>Customer Reviews</strong>
        <label class="filter-option"><input type="radio" name="rating" ${state.filters.rating === "4" ? "checked" : ""} onchange="updateFilter('rating', '4')" />4 stars & up</label>
        <label class="filter-option"><input type="radio" name="rating" ${state.filters.rating === "4.5" ? "checked" : ""} onchange="updateFilter('rating', '4.5')" />4.5 stars & up</label>
      </div>
      <div class="filter-group">
        <strong>Price</strong>
        <input class="search-input" type="number" placeholder="Min" value="${escapeText(state.filters.minPrice)}" oninput="setDraftPrice('minPrice', this.value)" />
        <input class="search-input" type="number" placeholder="Max" value="${escapeText(state.filters.maxPrice)}" oninput="setDraftPrice('maxPrice', this.value)" />
        ${isFashionCategory() ? `<span class="filter-note">Fashion pricing is curated between ${formatCurrency(300)} and ${formatCurrency(5000)}.</span>` : ""}
        <div class="filter-actions">
          <button class="btn btn-secondary" onclick="applyPriceFilters()">Apply</button>
        </div>
      </div>
      <div class="filter-group">
        <strong>Sort By</strong>
        <select onchange="updateFilter('sortBy', this.value)">
          <option value="latest" ${state.filters.sortBy === "latest" ? "selected" : ""}>Latest</option>
          <option value="price_asc" ${state.filters.sortBy === "price_asc" ? "selected" : ""}>Price low to high</option>
          <option value="price_desc" ${state.filters.sortBy === "price_desc" ? "selected" : ""}>Price high to low</option>
          <option value="rating_desc" ${state.filters.sortBy === "rating_desc" ? "selected" : ""}>Top rated</option>
        </select>
      </div>
    </aside>
  `;
}

function catalogCard(product) {
  const inventory = getInventoryState(product);

  return `
    <article class="catalog-card">
      <div class="catalog-image">
        <button class="wish-button ${isWishlisted(product._id) ? "active" : ""}" type="button" onclick="toggleWishlist('${product._id}')">&#9825;</button>
        <img ${fallbackImageAttrs(product)} alt="${escapeText(product.name)}" />
      </div>
      <div class="product-card-topline">
        <div class="brand-tag">${escapeText(productBadge(product))}</div>
        ${stockBadgeMarkup(product, { compact: true })}
      </div>
      <h3>${escapeText(product.name)}</h3>
      <div class="product-submeta">${escapeText(product.vendorName || "UrbanKart")}</div>
      <p>${escapeText(product.description).slice(0, 92)}...</p>
      <div>${ratingStars(product.rating)}</div>
      <div class="meta">${escapeText(inventory.detail)}</div>
      <div class="price-tag">${formatCurrency(product.price)}</div>
      <div class="toolbar">
        <button class="btn btn-secondary" onclick="openProduct('${product._id}')">View</button>
        <button class="btn btn-primary" onclick="quickAddToCart('${product._id}')" ${
          inventory.purchasable ? "" : "disabled"
        }>${inventory.buttonLabel}</button>
      </div>
    </article>
  `;
}

async function openRailCollection(sectionId) {
  if (sectionId === "featuredProducts") {
    state.filters.category = "All";
    state.filters.segment = "";
    state.filters.search = "";
    state.filters.sortBy = "rating_desc";
  } else if (sectionId === "exclusiveProducts") {
    state.filters.category = "All";
    state.filters.segment = "";
    state.filters.search = "";
    state.filters.sortBy = "latest";
  }

  await loadProducts();
  state.currentView = "home";
  render();
  scrollToSection(sectionId === "featuredProducts" ? "featuredProducts" : "exclusiveProducts");
}

function catalogView() {
  const label = catalogViewLabel();
  return `
    <section class="catalog-layout">
      ${filterSidebar()}
      <div>
        <div class="catalog-toolbar">
          <div>
            <h2 class="section-title" style="font-size:3rem;">${escapeText(label)}</h2>
            <p class="section-kicker">${state.products.length} products found</p>
          </div>
          <button class="btn btn-secondary" onclick="goHome()">Back Home</button>
        </div>
        ${
          isFashionCategory()
            ? `
              <div class="segment-strip">
                <button class="segment-pill ${!state.filters.segment ? "active" : ""}" type="button" onclick="updateFilter('segment', '')">All</button>
                ${fashionSegments
                  .map(
                    (segment) => `
                      <button class="segment-pill ${state.filters.segment === segment ? "active" : ""}" type="button" onclick="updateFilter('segment', '${segment}')">${segment}</button>
                    `
                  )
                  .join("")}
              </div>
            `
            : ""
        }
        <div class="catalog-grid">
          ${state.products.length ? state.products.map(catalogCard).join("") : `<div class="empty-state">No products matched your search yet.</div>`}
        </div>
      </div>
    </section>
  `;
}

function productDetailView() {
  const product = findProductById(state.selectedProduct);
  if (!product) {
    return `${customerHeader()}<div class="commerce-shell"><div class="page-shell"><div class="empty-state">Product not found.</div></div>${footerMarkup()}</div>`;
  }

  const inventory = getInventoryState(product);

  return `
    ${customerHeader()}
    <div class="commerce-shell">
      <div class="page-shell">
        <section class="detail-layout">
          <div class="product-detail">
            <img ${fallbackImageAttrs(product)} alt="${escapeText(product.name)}" />
          </div>
          <aside class="summary-panel">
            <p class="eyebrow">${escapeText(productMetaTrail(product) || product.category)}</p>
            <h2 class="section-title" style="font-size:3rem;">${escapeText(product.name)}</h2>
            <p class="product-submeta">${escapeText(product.vendorName || "UrbanKart")}</p>
            <div class="detail-status-row">
              ${stockBadgeMarkup(product)}
              ${storefrontBadgeMarkup(product)}
            </div>
            <div>${ratingStars(product.rating)}</div>
            <p>${escapeText(product.description)}</p>
            <div class="summary-total">${formatCurrency(product.price)}</div>
            <p class="meta">${escapeText(inventory.detail)}</p>
            <div>${(product.features || []).map((feature) => `<span class="feature-chip">${escapeText(feature)}</span>`).join("")}</div>
            <div class="toolbar">
              <button class="btn btn-primary" onclick="quickAddToCart('${product._id}')" ${
                inventory.purchasable ? "" : "disabled"
              }>${inventory.buttonLabel}</button>
              <button class="btn btn-secondary" onclick="toggleWishlist('${product._id}')">Wishlist</button>
              <button class="btn btn-ghost" onclick="goHome()">Continue shopping</button>
            </div>
          </aside>
        </section>
      </div>
      ${footerMarkup()}
    </div>
  `;
}

function wishlistView() {
  const wishlist = safeWishlistItems();
  return `
    ${customerHeader()}
    <div class="commerce-shell">
      <div class="page-shell">
        <section class="section-block">
          <div class="section-head">
            <div>
              <h2 class="section-title">Your Wishlist</h2>
              <p class="section-kicker">${wishlist.length} saved products</p>
            </div>
          </div>
          <div class="catalog-grid">
            ${wishlist.length ? wishlist.map(catalogCard).join("") : `<div class="empty-state">Wishlist is empty.</div>`}
          </div>
        </section>
      </div>
      ${footerMarkup()}
    </div>
  `;
}

function cartView() {
  const cart = safeCartItems();
  const paymentMethod = state.checkout.paymentMethod;
  const showCardFields = requiresPaymentAuthorization(paymentMethod);
  const authorization = state.paymentAuthorization;
  return `
    ${customerHeader()}
    <div class="commerce-shell">
      <div class="page-shell">
        <section class="cart-layout">
          <div class="cart-panel panel">
            <h2 class="section-title">Shopping Cart</h2>
            ${
              cart.length
                ? cart
                    .map(
                      (item) => {
                        const inventory = getInventoryState(item.product);
                        const maxQuantity = Math.max(1, getProductStock(item.product));

                        return `
                        <article class="cart-item">
                          <img ${fallbackImageAttrs(item.product)} alt="${escapeText(item.product.name)}" />
                          <div>
                            <h3>${escapeText(item.product.name)}</h3>
                            <p class="meta">${escapeText(item.product.vendorName)}</p>
                            <div class="cart-item-status">
                              ${stockBadgeMarkup(item.product)}
                              ${storefrontBadgeMarkup(item.product)}
                            </div>
                            <p class="price-tag">${formatCurrency(item.product.price)}</p>
                            <div class="toolbar">
                              <div class="qty-box">
                                <label>Qty</label>
                                <input class="qty-input" type="number" min="1" max="${maxQuantity}" value="${item.quantity}" onchange="updateCartQuantity('${item.product._id}', this.value)" ${
                                  inventory.purchasable ? "" : "disabled"
                                } />
                              </div>
                              <button class="btn btn-ghost" onclick="removeFromCart('${item.product._id}')">Remove</button>
                              <button class="btn btn-secondary" onclick="openProduct('${item.product._id}')">View details</button>
                            </div>
                          </div>
                        </article>
                      `;
                      }
                    )
                    .join("")
                : `<div class="empty-state">Your cart is empty.</div>`
            }
          </div>
          <aside class="summary-panel">
            <p class="eyebrow">Checkout</p>
            <h2 class="section-title" style="font-size:2.6rem;">Order Summary</h2>
            <p>Subtotal (${getCartCount()} items)</p>
            <div class="summary-total">${formatCurrency(getCartSubtotal())}</div>
            <form onsubmit="placeOrder(event)">
              <div class="field">
                <label for="shippingAddress">Shipping Address</label>
                <textarea id="shippingAddress" required>${escapeText(state.profile?.address || "")}</textarea>
              </div>
              <div class="field">
                <label for="paymentMethod">Payment</label>
                <select id="paymentMethod" onchange="handlePaymentMethodChange(this.value)">
                  <option value="Card Authorization" ${paymentMethod === "Card Authorization" ? "selected" : ""}>Card Authorization</option>
                  <option value="Cash on Delivery" ${paymentMethod === "Cash on Delivery" ? "selected" : ""}>Cash on Delivery</option>
                  <option value="UPI on Delivery" ${paymentMethod === "UPI on Delivery" ? "selected" : ""}>UPI on Delivery</option>
                </select>
              </div>
              ${
                showCardFields
                  ? `
                    <div class="payment-stack">
                      <div class="payment-card-grid">
                        <div class="field">
                          <label for="cardHolder">Card Holder</label>
                          <input id="cardHolder" placeholder="Cardholder name" value="${escapeText(
                            authorization?.cardHolder || state.profile?.name || ""
                          )}" />
                        </div>
                        <div class="field">
                          <label for="cardNumber">Card Number</label>
                          <input id="cardNumber" inputmode="numeric" maxlength="19" placeholder="1234 5678 9012 3456" />
                        </div>
                        <div class="field">
                          <label for="cardExpiry">Expiry</label>
                          <input id="cardExpiry" maxlength="5" placeholder="MM/YY" />
                        </div>
                        <div class="field">
                          <label for="cardCvv">CVV</label>
                          <input id="cardCvv" type="password" inputmode="numeric" maxlength="4" placeholder="123" />
                        </div>
                      </div>
                      <button class="btn btn-secondary" type="button" onclick="authorizePayment()">Authorize Payment</button>
                      <div class="payment-status-card ${authorization ? "authorized" : "pending"}">
                        ${
                          authorization
                            ? `<strong>Authorized</strong>
                               <span>${escapeText(authorization.maskedCard)} | ${escapeText(
                                authorization.paymentReference
                              )}</span>
                               <span>Authorized for ${formatCurrency(authorization.amount)}</span>`
                            : `<strong>Awaiting Authorization</strong>
                               <span>Authorize the card first, then place the order.</span>`
                        }
                      </div>
                    </div>
                  `
                  : `<p class="payment-note">No upfront authorization needed for ${escapeText(paymentMethod)}.</p>`
              }
              <button class="btn btn-primary" type="submit">Proceed to Buy</button>
            </form>
          </aside>
        </section>
      </div>
      ${footerMarkup()}
    </div>
  `;
}

function ordersView() {
  return `
    ${customerHeader()}
    <div class="commerce-shell">
      <div class="page-shell">
        <section class="section-block">
          <div class="section-head">
            <div>
              <h2 class="section-title">Orders</h2>
              <p class="section-kicker">${state.orders.length} order records</p>
            </div>
          </div>
          <div class="results-stack">
            ${
              state.orders.length
                ? state.orders
                    .map(
                      (order) => `
                        <article class="order-card">
                          <div class="section-head">
                            <div>
                              <strong>Order #${order._id.slice(-6).toUpperCase()}</strong>
                              <p class="meta">${new Date(order.createdAt).toLocaleString()}</p>
                            </div>
                            <div>
                              <div class="status ${order.orderStatus}">${order.orderStatus}</div>
                              <strong>${formatCurrency(order.totalAmount)}</strong>
                            </div>
                          </div>
                          <div class="order-payment-meta">
                            <span>Payment: ${escapeText(order.paymentMethod || "Card Authorization")}</span>
                            <span>Status: ${escapeText(order.paymentStatus || "pending")}</span>
                            ${order.paymentReference ? `<span>Ref: ${escapeText(order.paymentReference)}</span>` : ""}
                            ${order.maskedCard ? `<span>${escapeText(order.maskedCard)}</span>` : ""}
                          </div>
                          <ul class="order-items">
                            ${order.items
                              .map(
                                (item) =>
                                  `<li>${escapeText(item.name)} | ${item.quantity} x ${formatCurrency(item.price)} | ${escapeText(item.vendorName)}</li>`
                              )
                              .join("")}
                          </ul>
                          ${
                            state.user.role !== "customer"
                              ? `<div class="toolbar"><select onchange="changeOrderStatus('${order._id}', this.value)">
                                  ${["processing", "confirmed", "shipped", "delivered"]
                                    .map(
                                      (status) =>
                                        `<option value="${status}" ${order.orderStatus === status ? "selected" : ""}>${status}</option>`
                                    )
                                    .join("")}
                                </select></div>`
                              : ""
                          }
                        </article>
                      `
                    )
                    .join("")
                : `<div class="empty-state">No orders yet.</div>`
            }
          </div>
        </section>
      </div>
      ${footerMarkup()}
    </div>
  `;
}

function profileView() {
  const user = state.profile || state.user;
  return `
    ${customerHeader()}
    <div class="commerce-shell">
      <div class="page-shell">
        <section class="profile-panel">
          <p class="eyebrow">Account</p>
          <h2 class="section-title">Profile Settings</h2>
          <form onsubmit="saveProfile(event)">
            <div class="field">
              <label for="profileName">Name</label>
              <input id="profileName" value="${escapeText(user.name || "")}" />
            </div>
            <div class="field">
              <label for="profilePhone">Phone</label>
              <input id="profilePhone" value="${escapeText(user.phone || "")}" />
            </div>
            <div class="field">
              <label for="profileAddress">Address</label>
              <textarea id="profileAddress">${escapeText(user.address || "")}</textarea>
            </div>
            ${
              state.user.role === "vendor"
                ? `<div class="field">
                    <label for="profileStoreName">Store Name</label>
                    <input id="profileStoreName" value="${escapeText(user.storeName || "")}" />
                  </div>`
                : ""
            }
            <div class="toolbar">
              <button class="btn btn-primary" type="submit">Save Changes</button>
              <button class="btn btn-secondary" type="button" onclick="logout()">Logout</button>
            </div>
          </form>
        </section>
      </div>
      ${footerMarkup()}
    </div>
  `;
}

function vendorView() {
  const dashboard = state.vendorDashboard;
  if (!dashboard) {
    return `${customerHeader()}<div class="commerce-shell"><div class="page-shell"><div class="empty-state">Vendor access required.</div></div>${footerMarkup()}</div>`;
  }

  const recentProducts = recentProductCount(dashboard.products || []);

  return `
    ${customerHeader()}
    <div class="commerce-shell">
      <div class="page-shell">
        <section class="vendor-panel">
          <div class="section-head">
            <div>
              <h2 class="section-title">Vendor Hub</h2>
              <p class="section-kicker">Manage products, inventory, and what customers can see on the live store.</p>
            </div>
          </div>
          <div class="stats-grid">
            <div class="feature-card"><p>Products</p><h3>${dashboard.stats.totalProducts}</h3></div>
            <div class="feature-card"><p>Live on Site</p><h3>${dashboard.stats.liveProducts}</h3></div>
            <div class="feature-card"><p>Out of Stock</p><h3>${dashboard.stats.outOfStockProducts}</h3></div>
            <div class="feature-card"><p>Low Stock</p><h3>${dashboard.stats.lowStockProducts}</h3></div>
            <div class="feature-card"><p>Orders</p><h3>${dashboard.stats.totalOrders}</h3></div>
            <div class="feature-card"><p>New 7 Days</p><h3>${dashboard.stats.newProductsThisWeek ?? recentProducts}</h3></div>
            <div class="feature-card"><p>Revenue</p><h3>${formatCurrency(dashboard.stats.totalRevenue)}</h3></div>
          </div>
        </section>
        <section class="vendor-panel">
          <div class="section-head">
            <div>
              <h2 class="section-title">Manage Products</h2>
              <p class="section-kicker">Save karte hi product niche list me aa jayega aur customer site par uska live status bhi dikhega.</p>
            </div>
          </div>
          <form onsubmit="submitProduct(event)">
            <input type="hidden" id="productId" />
            <div class="field"><label>Name</label><input id="productName" required /></div>
            <div class="field"><label>Description</label><textarea id="productDescription" required></textarea></div>
            <div class="field"><label>Image URL</label><input id="productImage" required /></div>
            <div class="field"><label>Category</label><select id="productCategory">${state.categories.slice(1).map((category) => `<option value="${escapeText(category)}">${escapeText(category)}</option>`).join("")}</select></div>
            <div class="field"><label>Price</label><input id="productPrice" type="number" min="0" required /></div>
            <div class="field"><label>Rating</label><input id="productRating" type="number" min="0" max="5" step="0.1" value="4" required /></div>
            <div class="field"><label>Stock</label><input id="productStock" type="number" min="0" required /></div>
            <div class="field"><label>Features</label><input id="productFeatures" placeholder="Comma separated" /></div>
            <p class="form-hint">Stock 0 karoge to customer, vendor, aur admin tino dashboards me product out of stock ke label ke saath dikhega.</p>
            <button class="btn btn-primary" type="submit">Save Product</button>
          </form>
        </section>
        <section class="vendor-panel">
          <div class="section-head">
            <div>
              <h2 class="section-title">Product Visibility</h2>
              <p class="section-kicker">Naya product sabse upar dikh raha hoga. Customer site column se turant pata chalega ki product live hai ya out of stock.</p>
            </div>
          </div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Product</th><th>Category</th><th>Inventory</th><th>Customer Site</th><th>Added</th><th>Actions</th></tr></thead>
              <tbody>
                ${
                  dashboard.products?.length
                    ? dashboard.products
                        .map((product) => {
                          const inventory = getInventoryState(product);

                          return `
                      <tr>
                        <td>
                          <div class="table-stack">
                            <strong>${escapeText(product.name)}</strong>
                            <div class="meta">${escapeText([product.vendorName, formatCurrency(product.price)].filter(Boolean).join(" • "))}</div>
                          </div>
                        </td>
                        <td>${escapeText(product.category)}</td>
                        <td>
                          <div class="table-stack">
                            ${stockBadgeMarkup(product)}
                            <div class="meta">${product.stock} units available</div>
                          </div>
                        </td>
                        <td>
                          <div class="table-stack">
                            ${storefrontBadgeMarkup(product)}
                            <div class="meta">${escapeText(inventory.detail)}</div>
                          </div>
                        </td>
                        <td>${formatDateTime(product.createdAt)}</td>
                        <td><div class="toolbar"><button class="btn btn-secondary" onclick="editProduct('${product._id}')">Edit</button><button class="btn btn-ghost" onclick="deleteProduct('${product._id}')">Delete</button></div></td>
                      </tr>
                    `;
                        })
                        .join("")
                    : `<tr><td colspan="6">Aapka koi product abhi tak add nahi hua.</td></tr>`
                }
              </tbody>
            </table>
          </div>
        </section>
      </div>
      ${footerMarkup()}
    </div>
  `;
}

function adminView() {
  const dashboard = state.adminDashboard;
  if (!dashboard) {
    return `${customerHeader()}<div class="commerce-shell"><div class="page-shell"><div class="empty-state">Admin access required.</div></div>${footerMarkup()}</div>`;
  }

  const recentProducts = recentProductCount(dashboard.products || []);

  return `
    ${customerHeader()}
    <div class="commerce-shell">
      <div class="page-shell">
        <section class="admin-panel">
          <div class="section-head">
            <div>
              <h2 class="section-title">Admin Panel</h2>
              <p class="section-kicker">Monitor users, vendors, orders, and what the real customer storefront is showing right now.</p>
            </div>
          </div>
          <div class="stats-grid">
            <div class="feature-card"><p>Users</p><h3>${dashboard.metrics.totalUsers}</h3></div>
            <div class="feature-card"><p>Vendors</p><h3>${dashboard.metrics.totalVendors}</h3></div>
            <div class="feature-card"><p>Products</p><h3>${dashboard.metrics.totalProducts}</h3></div>
            <div class="feature-card"><p>Orders</p><h3>${dashboard.metrics.totalOrders}</h3></div>
            <div class="feature-card"><p>Live on Site</p><h3>${dashboard.metrics.liveProducts}</h3></div>
            <div class="feature-card"><p>Out of Stock</p><h3>${dashboard.metrics.outOfStockProducts}</h3></div>
            <div class="feature-card"><p>Low Stock</p><h3>${dashboard.metrics.lowStockProducts}</h3></div>
            <div class="feature-card"><p>New 7 Days</p><h3>${dashboard.metrics.newProductsThisWeek ?? recentProducts}</h3></div>
          </div>
        </section>
        <section class="admin-panel">
          <div class="dashboard-callout">
            Customer storefront snapshot: ${dashboard.metrics.liveProducts} products abhi buyable hain, ${dashboard.metrics.outOfStockProducts} products out of stock label ke saath visible hain, aur pichhle 7 din me ${dashboard.metrics.newProductsThisWeek ?? recentProducts} naye products add hue hain.
          </div>
        </section>
        <section class="admin-panel">
          <div class="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Change Role</th></tr></thead>
              <tbody>
                ${dashboard.users
                  .map(
                    (user) => `
                      <tr>
                        <td>${escapeText(user.name)}</td>
                        <td>${escapeText(user.email)}</td>
                        <td>${escapeText(user.role)}</td>
                        <td>
                          <select onchange="changeUserRole('${user._id}', this.value)">
                            ${["customer", "vendor", "admin"]
                              .map((role) => `<option value="${role}" ${user.role === role ? "selected" : ""}>${role}</option>`)
                              .join("")}
                          </select>
                        </td>
                      </tr>
                    `
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        </section>
        <section class="admin-panel">
          <div class="section-head">
            <div>
              <h2 class="section-title">Vendor Products</h2>
              <p class="section-kicker">Yahan se dekh sakte ho kis vendor ne kaunsa product add kiya hai, kab add kiya hai, aur customer site par wo live hai ya out of stock.</p>
            </div>
          </div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Product</th><th>Vendor</th><th>Store</th><th>Inventory</th><th>Customer Site</th><th>Added</th><th>Action</th></tr></thead>
              <tbody>
                ${
                  dashboard.products?.length
                    ? dashboard.products
                        .map((product) => `
                            <tr>
                              <td>
                                <div class="table-stack">
                                  <strong>${escapeText(product.name)}</strong>
                                  <div class="meta">${escapeText([product.category, formatCurrency(product.price)].join(" • "))}</div>
                                </div>
                              </td>
                              <td>${escapeText(product.vendor?.name || product.vendorName || "-")}</td>
                              <td>${escapeText(product.vendor?.storeName || product.vendorName || "-")}</td>
                              <td>
                                <div class="table-stack">
                                  ${stockBadgeMarkup(product)}
                                  <div class="meta">${product.stock} units available</div>
                                </div>
                              </td>
                              <td>
                                <div class="table-stack">
                                  ${storefrontBadgeMarkup(product)}
                                  <div class="meta">${escapeText(getInventoryState(product).detail)}</div>
                                </div>
                              </td>
                              <td>${formatDateTime(product.createdAt)}</td>
                              <td><button class="btn btn-ghost" type="button" onclick="deleteProduct('${product._id}')">Delete</button></td>
                            </tr>
                          `)
                        .join("")
                    : `<tr><td colspan="7">No vendor products found.</td></tr>`
                }
              </tbody>
            </table>
          </div>
        </section>
      </div>
      ${footerMarkup()}
    </div>
  `;
}

function render() {
  renderNav();
  topbar.style.display = state.user ? "none" : "flex";

  if (!state.user && !["auth", "authForm", "about"].includes(state.currentView)) {
    state.currentView = "auth";
  }

  const viewMap = {
    auth: authWelcomeView,
    authForm: () => authFormView(state.authScreenMode),
    about: aboutView,
    home:
      state.user && isCustomer()
        ? customerHomeView
        : state.user?.role === "vendor"
        ? vendorView
        : state.user?.role === "admin"
        ? adminView
        : authWelcomeView,
    storefront: state.user ? storefrontView : authWelcomeView,
    detail: productDetailView,
    wishlist: wishlistView,
    cart: cartView,
    orders: ordersView,
    profile: profileView,
    vendor: vendorView,
    admin: adminView,
  };

  app.innerHTML = (viewMap[state.currentView] || authWelcomeView)();
  initHeroSlider();

  const authForm = document.getElementById("authForm");
  if (authForm) {
    authForm.addEventListener("submit", handleAuth);
  }
}

function toggleAuthTab(mode) {
  state.authScreenMode = mode;
  document.getElementById("authMode").value = mode;
  document.getElementById("nameField").style.display = mode === "signup" ? "grid" : "none";
  document.getElementById("roleField").style.display = mode === "signup" ? "grid" : "none";
  document.getElementById("storeNameField").style.display = mode === "signup" ? "grid" : "none";
  document.getElementById("loginTabBtn").classList.toggle("tab-active", mode === "login");
  document.getElementById("signupTabBtn").classList.toggle("tab-active", mode === "signup");
}

async function handleAuth(event) {
  event.preventDefault();
  const mode = document.getElementById("authMode").value;
  const payload = {
    email: document.getElementById("email").value,
    password: document.getElementById("password").value,
  };

  if (mode === "signup") {
    payload.name = document.getElementById("name").value;
    payload.role = document.getElementById("role").value;
    payload.storeName = document.getElementById("storeName").value;
  }

  try {
    const endpoint = mode === "signup" ? "/api/auth/signup" : "/api/auth/login";
    const data = await api(endpoint, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    persistAuth(data.data);
    await refreshProfile();
    state.currentView = state.user.role === "customer" ? "home" : state.user.role;
    render();
    showToast(data.message);
  } catch (error) {
    showToast(error.message);
  }
}

async function resetPasswordPrompt() {
  const email = window.prompt("Enter your registered email");
  if (!email) {
    return;
  }

  const password = window.prompt("Enter new password");
  if (!password) {
    return;
  }

  try {
    const data = await api("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    toggleAuthTab("login");
    document.getElementById("email").value = email.trim().toLowerCase();
    showToast(data.message);
  } catch (error) {
    showToast(error.message);
  }
}

async function updateFilter(key, value) {
  state.filters[key] = value;
  if (key === "category") {
    state.filters.search = "";
    if (value !== "Fashion") {
      state.filters.segment = "";
    }
  }
  if (key === "segment") {
    state.filters.category = "Fashion";
    state.filters.search = "";
  }
  await loadProducts();
  state.currentView = catalogTargetView();
  render();
}

function setDraftPrice(key, value) {
  state.filters[key] = value;
}

async function applyPriceFilters() {
  await loadProducts();
  state.currentView = catalogTargetView();
  render();
}

async function clearSearchFilters() {
  state.filters = {
    category: "All",
    segment: "",
    minPrice: "",
    maxPrice: "",
    rating: "",
    sortBy: "latest",
    search: "",
  };
  await loadProducts();
  state.currentView = defaultLandingView();
  render();
}

async function submitSearch(event) {
  event.preventDefault();
  state.filters.search = document.getElementById("headerSearch").value.trim();
  state.filters.category = "All";
  state.filters.segment = "";
  if (!state.filters.search && state.filters.category === "All") {
    showToast("Type something to search");
    return;
  }
  await loadProducts();
  state.currentView = catalogTargetView();
  render();
}

async function selectCategory(category) {
  state.filters.category = category;
  state.filters.segment = category === "Fashion" ? state.filters.segment : "";
  state.filters.search = "";
  await loadProducts();
  state.currentView = catalogTargetView();
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function goHome() {
  await clearSearchFilters();
}

function openDashboard() {
  const dashboardView = dashboardViewForRole();
  if (dashboardView === "home") {
    setView("home");
    return;
  }

  setView(dashboardView);
}

function openProduct(productId) {
  setView("detail", productId);
}

async function requireCustomerAction(action) {
  if (!state.user) {
    setView("auth");
    showToast("Please login to continue");
    return false;
  }

  if (!isCustomer()) {
    showToast(`${action} is available for customer accounts`);
    return false;
  }

  return true;
}

async function quickAddToCart(productId) {
  if (!(await requireCustomerAction("Add to cart"))) {
    return;
  }

  const product = findProductById(productId);
  if (product && !getInventoryState(product).purchasable) {
    showToast(`${product.name} is currently out of stock`);
    return;
  }

  try {
    await api("/api/users/cart", {
      method: "POST",
      body: JSON.stringify({ productId, quantity: 1 }),
    });
    await refreshProfile();
    render();
    showToast("Added to cart");
  } catch (error) {
    showToast(error.message);
  }
}

async function toggleWishlist(productId) {
  if (!(await requireCustomerAction("Wishlist"))) {
    return;
  }

  try {
    await api(`/api/users/wishlist/${productId}`, { method: "POST" });
    await refreshProfile();
    render();
    showToast("Wishlist updated");
  } catch (error) {
    showToast(error.message);
  }
}

async function updateCartQuantity(productId, quantity) {
  try {
    await api(`/api/users/cart/${productId}`, {
      method: "PUT",
      body: JSON.stringify({ quantity }),
    });
    await refreshProfile();
    render();
  } catch (error) {
    showToast(error.message);
  }
}

async function removeFromCart(productId) {
  try {
    await api(`/api/users/cart/${productId}`, { method: "DELETE" });
    await refreshProfile();
    render();
    showToast("Removed from cart");
  } catch (error) {
    showToast(error.message);
  }
}

function handlePaymentMethodChange(value) {
  state.checkout.paymentMethod = value;
  if (!requiresPaymentAuthorization(value)) {
    state.paymentAuthorization = null;
  }
  render();
}

async function authorizePayment() {
  if (!(await requireCustomerAction("Payment authorization"))) {
    return;
  }

  try {
    const data = await api("/api/orders/authorize", {
      method: "POST",
      body: JSON.stringify({
        cardHolder: document.getElementById("cardHolder")?.value || "",
        cardNumber: document.getElementById("cardNumber")?.value || "",
        expiry: document.getElementById("cardExpiry")?.value || "",
        cvv: document.getElementById("cardCvv")?.value || "",
      }),
    });

    state.paymentAuthorization = data.data;
    render();
    showToast(data.message);
  } catch (error) {
    showToast(error.message);
  }
}

async function placeOrder(event) {
  event.preventDefault();

  try {
    const unavailableItem = safeCartItems().find((item) => !getInventoryState(item.product).purchasable);
    if (unavailableItem) {
      showToast(`${unavailableItem.product.name} is out of stock. Remove it before checkout.`);
      return;
    }

    const quantityIssue = safeCartItems().find((item) => item.quantity > getProductStock(item.product));
    if (quantityIssue) {
      showToast(`Reduce quantity for ${quantityIssue.product.name}. Only ${getProductStock(quantityIssue.product)} left.`);
      return;
    }

    if (requiresPaymentAuthorization() && !state.paymentAuthorization) {
      showToast("Authorize the card payment before placing the order");
      return;
    }

    await api("/api/orders", {
      method: "POST",
      body: JSON.stringify({
        shippingAddress: document.getElementById("shippingAddress").value,
        paymentMethod: document.getElementById("paymentMethod").value,
        paymentAuthorization: state.paymentAuthorization,
      }),
    });
    await refreshProfile();
    state.paymentAuthorization = null;
    state.checkout.paymentMethod = "Card Authorization";
    state.currentView = "orders";
    render();
    showToast("Order placed successfully");
  } catch (error) {
    showToast(error.message);
  }
}

async function saveProfile(event) {
  event.preventDefault();

  try {
    await api("/api/users/profile", {
      method: "PUT",
      body: JSON.stringify({
        name: document.getElementById("profileName").value,
        phone: document.getElementById("profilePhone").value,
        address: document.getElementById("profileAddress").value,
        storeName: document.getElementById("profileStoreName")?.value || "",
      }),
    });
    await refreshProfile();
    render();
    showToast("Profile updated");
  } catch (error) {
    showToast(error.message);
  }
}

function editProduct(productId) {
  const product = state.vendorDashboard?.products.find((item) => item._id === productId);
  if (!product) {
    showToast("Product not found");
    return;
  }

  setView("vendor");
  document.getElementById("productId").value = product._id;
  document.getElementById("productName").value = product.name;
  document.getElementById("productDescription").value = product.description;
  document.getElementById("productImage").value = product.image;
  document.getElementById("productCategory").value = product.category;
  document.getElementById("productPrice").value = product.price;
  document.getElementById("productRating").value = product.rating;
  document.getElementById("productStock").value = product.stock;
  document.getElementById("productFeatures").value = (product.features || []).join(", ");
}

async function submitProduct(event) {
  event.preventDefault();

  const productId = document.getElementById("productId").value;
  const payload = {
    name: document.getElementById("productName").value,
    description: document.getElementById("productDescription").value,
    image: document.getElementById("productImage").value,
    category: document.getElementById("productCategory").value,
    price: Number(document.getElementById("productPrice").value),
    rating: Number(document.getElementById("productRating").value),
    stock: Number(document.getElementById("productStock").value),
    features: document
      .getElementById("productFeatures")
      .value.split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  };

  try {
    const response = await api(productId ? `/api/products/${productId}` : "/api/products", {
      method: productId ? "PUT" : "POST",
      body: JSON.stringify(payload),
    });
    await Promise.all([loadProducts(), refreshProfile()]);
    event.target.reset();
    render();
    const inventory = getInventoryState(response.data);
    showToast(
      productId
        ? `${response.data.name} updated. ${inventory.detail}.`
        : `${response.data.name} added successfully. ${inventory.detail}.`
    );
  } catch (error) {
    showToast(error.message);
  }
}

async function deleteProduct(productId) {
  if (!window.confirm("Kya aap is product ko delete karna chahte ho?")) {
    return;
  }

  try {
    await api(`/api/products/${productId}`, { method: "DELETE" });
    await Promise.all([loadProducts(), refreshProfile()]);
    render();
    showToast("Product deleted");
  } catch (error) {
    showToast(error.message);
  }
}

async function changeOrderStatus(orderId, orderStatus) {
  try {
    await api(`/api/orders/${orderId}/status`, {
      method: "PUT",
      body: JSON.stringify({ orderStatus }),
    });
    await refreshProfile();
    render();
    showToast("Order status updated");
  } catch (error) {
    showToast(error.message);
  }
}

async function changeUserRole(userId, role) {
  try {
    await api(`/api/admin/users/${userId}/role`, {
      method: "PUT",
      body: JSON.stringify({ role }),
    });
    await refreshProfile();
    render();
    showToast("User role updated");
  } catch (error) {
    showToast(error.message);
  }
}

bootstrap();

