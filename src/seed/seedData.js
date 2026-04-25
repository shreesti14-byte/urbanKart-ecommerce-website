require("dotenv").config();

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const connectDB = require("../config/db");
const User = require("../models/User");
const Product = require("../models/Product");

const GENERATED_IMAGE_DIR = path.join(__dirname, "../../public/images/catalog");
const GENERATED_IMAGE_ROUTE = "/images/catalog";

const hashPassword = async (password) => bcrypt.hash(password, 10);

const seedPriceRules = {
  Grocery: { multiplier: 18, step: 5, min: 30, max: 399 },
  Electronics: { multiplier: 105, step: 100, min: 1999, max: 34999 },
  "Decoration Items": { multiplier: 38, step: 50, min: 699, max: 6999 },
  Shoes: { multiplier: 42, step: 50, min: 1799, max: 8999 },
  Laptops: { multiplier: 86, step: 500, min: 42999, max: 189999 },
  "Mobile Phones": { multiplier: 95, step: 500, min: 14999, max: 139999 },
};

const legacyPriceRules = {
  Grocery: { multiplier: 18, step: 5, min: 30 },
  Electronics: { multiplier: 45, step: 100, min: 2999 },
  Fashion: { multiplier: 8, step: 50, min: 300 },
  Beauty: { multiplier: 6, step: 50, min: 249 },
  "Decoration Items": { multiplier: 18, step: 50, min: 699 },
  Shoes: { multiplier: 22, step: 50, min: 1799 },
  Laptops: { multiplier: 85, step: 500, min: 42999 },
  "Mobile Phones": { multiplier: 75, step: 500, min: 14999 },
};

const fashionPalettes = [
  { bg: "#F7E9E4", panel: "#FFF7F4", ink: "#382B31", accent: "#C64E3B", accentSoft: "#F2B9A7", glow: "#D7A86E" },
  { bg: "#EEE7F3", panel: "#FBF8FF", ink: "#2D2340", accent: "#7C5DAA", accentSoft: "#C8B7E4", glow: "#E7C37B" },
  { bg: "#E6F0EC", panel: "#F8FCFA", ink: "#234035", accent: "#5F8A64", accentSoft: "#B9D7BE", glow: "#D8AD6C" },
  { bg: "#F5E8D8", panel: "#FFF8F0", ink: "#433126", accent: "#D07843", accentSoft: "#F2C39C", glow: "#C9965D" },
  { bg: "#E5EDF7", panel: "#F8FBFF", ink: "#24354A", accent: "#4C77B8", accentSoft: "#B8CDEB", glow: "#D7B17C" },
];

const decorPalettes = [
  { bg: "#EFE3D8", panel: "#FBF5F0", ink: "#3B2D2C", accent: "#C67952", accentSoft: "#EAC6B1", glow: "#D4A06B" },
  { bg: "#E7EFE9", panel: "#F8FCF9", ink: "#2F3E38", accent: "#6A8B74", accentSoft: "#BDD5C2", glow: "#D7B07A" },
  { bg: "#ECE8F5", panel: "#FAF8FF", ink: "#312C44", accent: "#8A70B9", accentSoft: "#CDBCE8", glow: "#DEBB84" },
];

const beautyPalettes = [
  { bg: "#FAE4E2", panel: "#FFF7F6", ink: "#41292F", accent: "#D16C7D", accentSoft: "#F3BAC6", glow: "#E5B46B" },
  { bg: "#F4E8D8", panel: "#FFF8EF", ink: "#4A3528", accent: "#C98853", accentSoft: "#ECC7A7", glow: "#D9AD68" },
  { bg: "#E7EFE8", panel: "#F9FCF9", ink: "#243A31", accent: "#5C8A64", accentSoft: "#BFD8C5", glow: "#D5AF70" },
  { bg: "#E9E7F5", panel: "#FAF9FF", ink: "#302A46", accent: "#8A6CB6", accentSoft: "#CEC1E8", glow: "#E0BA77" },
];

const hashString = (value = "") =>
  Array.from(String(value)).reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) >>> 0, 0);

const escapeXml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const slugify = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const normalizeSeedPrice = (category, basePrice) => {
  const rule = seedPriceRules[category];

  if (!rule) {
    return Number(basePrice);
  }

  const scaledPrice = Math.round((Number(basePrice) * rule.multiplier) / rule.step) * rule.step;
  return Math.min(rule.max, Math.max(rule.min, scaledPrice));
};

const normalizeLegacyPrice = (category, currentPrice) => {
  const rule = legacyPriceRules[category];

  if (!rule || Number(currentPrice) >= rule.min) {
    return currentPrice;
  }

  const scaledPrice = Math.round((Number(currentPrice) * rule.multiplier) / rule.step) * rule.step;
  return Math.max(rule.min, scaledPrice);
};

const paletteFor = (seed, paletteSet) => paletteSet[hashString(seed) % paletteSet.length];

const ensureGeneratedImageDir = () => {
  fs.mkdirSync(GENERATED_IMAGE_DIR, { recursive: true });
};

const svgShell = ({ palette, title, subtitle, artwork }) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 540" role="img" aria-label="${escapeXml(title)}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${palette.bg}" />
      <stop offset="100%" stop-color="${palette.panel}" />
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${palette.accentSoft}" />
      <stop offset="100%" stop-color="${palette.accent}" />
    </linearGradient>
  </defs>
  <rect width="720" height="540" rx="34" fill="url(#bg)" />
  <circle cx="612" cy="92" r="82" fill="${palette.accentSoft}" opacity="0.45" />
  <circle cx="116" cy="448" r="94" fill="${palette.glow}" opacity="0.22" />
  <rect x="42" y="42" width="636" height="456" rx="28" fill="${palette.panel}" opacity="0.92" />
  <rect x="78" y="86" width="166" height="34" rx="17" fill="${palette.accentSoft}" opacity="0.92" />
  <text x="161" y="108" text-anchor="middle" font-family="Manrope, Arial, sans-serif" font-size="15" font-weight="700" fill="${palette.ink}" letter-spacing="2">${escapeXml(subtitle.toUpperCase())}</text>
  ${artwork}
  <text x="78" y="454" font-family="Cormorant Garamond, Georgia, serif" font-size="42" font-weight="700" fill="${palette.ink}">${escapeXml(title)}</text>
  <text x="78" y="488" font-family="Manrope, Arial, sans-serif" font-size="18" fill="${palette.ink}" opacity="0.7">UrbanKart curated edit</text>
</svg>`;

const fashionArtwork = (productType, palette) => {
  const type = productType.toLowerCase();

  if (type.includes("jeans") || type.includes("trousers") || type.includes("joggers") || type.includes("bottom")) {
    return `
      <ellipse cx="360" cy="388" rx="118" ry="28" fill="${palette.glow}" opacity="0.24" />
      <path d="M304 138h112l26 236-49 44-33-111-35 111-47-44z" fill="url(#accent)" stroke="${palette.ink}" stroke-width="10" stroke-linejoin="round" />
      <path d="M318 166h84" stroke="${palette.panel}" stroke-width="10" stroke-linecap="round" />
      <path d="M360 138v166" stroke="${palette.ink}" stroke-width="8" opacity="0.18" />
    `;
  }

  if (type.includes("dress") || type.includes("frock") || type.includes("lehenga") || type.includes("saree") || type.includes("gown")) {
    return `
      <ellipse cx="360" cy="392" rx="124" ry="28" fill="${palette.glow}" opacity="0.26" />
      <path d="M332 126h56l28 42-22 52 78 154H248l78-154-22-52z" fill="url(#accent)" stroke="${palette.ink}" stroke-width="10" stroke-linejoin="round" />
      <path d="M342 126c0 18 12 32 18 40 6-8 18-22 18-40" fill="${palette.panel}" opacity="0.85" />
      <path d="M290 374h140" stroke="${palette.panel}" stroke-width="12" stroke-linecap="round" opacity="0.75" />
      <path d="M274 244h172" stroke="${palette.panel}" stroke-width="10" stroke-linecap="round" opacity="0.45" />
    `;
  }

  if (type.includes("hoodie") || type.includes("jacket") || type.includes("blazer") || type.includes("sweatshirt") || type.includes("shirt") || type.includes("kurta") || type.includes("tunic")) {
    return `
      <ellipse cx="360" cy="388" rx="124" ry="28" fill="${palette.glow}" opacity="0.24" />
      <path d="M294 118h132l58 92-40 28-34-44v180H310V194l-34 44-40-28z" fill="url(#accent)" stroke="${palette.ink}" stroke-width="10" stroke-linejoin="round" />
      <path d="M332 118l28 40 28-40" fill="${palette.panel}" opacity="0.92" />
      <path d="M360 158v196" stroke="${palette.panel}" stroke-width="8" stroke-linecap="round" opacity="0.8" />
      <circle cx="360" cy="208" r="5" fill="${palette.ink}" />
      <circle cx="360" cy="242" r="5" fill="${palette.ink}" />
      <circle cx="360" cy="276" r="5" fill="${palette.ink}" />
    `;
  }

  return `
    <ellipse cx="360" cy="388" rx="124" ry="28" fill="${palette.glow}" opacity="0.24" />
    <path d="M286 132l48-28h52l48 28 48 78-40 28-32-42v176H270V196l-32 42-40-28z" fill="url(#accent)" stroke="${palette.ink}" stroke-width="10" stroke-linejoin="round" />
    <path d="M334 104c0 18 12 30 26 40 14-10 26-22 26-40" fill="${palette.panel}" opacity="0.9" />
    <path d="M320 240h80" stroke="${palette.panel}" stroke-width="12" stroke-linecap="round" opacity="0.72" />
  `;
};

const beautyArtwork = (productType, palette) => {
  const type = productType.toLowerCase();

  if (type.includes("lip") || type.includes("kajal") || type.includes("mascara")) {
    return `
      <ellipse cx="360" cy="392" rx="130" ry="28" fill="${palette.glow}" opacity="0.22" />
      <rect x="288" y="160" width="66" height="170" rx="18" fill="${palette.ink}" opacity="0.14" />
      <rect x="304" y="138" width="34" height="62" rx="14" fill="url(#accent)" stroke="${palette.ink}" stroke-width="8" />
      <rect x="298" y="204" width="46" height="138" rx="14" fill="${palette.panel}" stroke="${palette.ink}" stroke-width="8" />
      <rect x="372" y="150" width="40" height="192" rx="16" fill="url(#accent)" stroke="${palette.ink}" stroke-width="8" />
      <rect x="372" y="118" width="40" height="48" rx="14" fill="${palette.panel}" stroke="${palette.ink}" stroke-width="8" />
    `;
  }

  if (type.includes("perfume") || type.includes("serum") || type.includes("oil")) {
    return `
      <ellipse cx="360" cy="392" rx="132" ry="28" fill="${palette.glow}" opacity="0.22" />
      <rect x="298" y="132" width="124" height="204" rx="36" fill="url(#accent)" stroke="${palette.ink}" stroke-width="10" />
      <rect x="332" y="104" width="56" height="46" rx="14" fill="${palette.panel}" stroke="${palette.ink}" stroke-width="8" />
      <rect x="346" y="82" width="28" height="26" rx="8" fill="${palette.ink}" opacity="0.72" />
      <rect x="320" y="194" width="80" height="56" rx="18" fill="${palette.panel}" opacity="0.84" />
    `;
  }

  if (type.includes("tools") || type.includes("brush")) {
    return `
      <ellipse cx="360" cy="396" rx="136" ry="28" fill="${palette.glow}" opacity="0.22" />
      <path d="M286 344l32-150 20 4-10 152z" fill="url(#accent)" stroke="${palette.ink}" stroke-width="8" />
      <path d="M334 344l22-174h24l22 174z" fill="${palette.panel}" stroke="${palette.ink}" stroke-width="8" />
      <path d="M404 344l-8-152 20-4 32 150z" fill="url(#accent)" stroke="${palette.ink}" stroke-width="8" />
      <path d="M318 194c0-22 24-46 36-56 8 18 18 36 18 56z" fill="${palette.accentSoft}" stroke="${palette.ink}" stroke-width="8" />
      <path d="M388 188c6-18 18-34 32-48 8 12 18 28 18 48z" fill="${palette.accentSoft}" stroke="${palette.ink}" stroke-width="8" />
    `;
  }

  return `
    <ellipse cx="360" cy="392" rx="134" ry="28" fill="${palette.glow}" opacity="0.22" />
    <rect x="286" y="142" width="148" height="190" rx="34" fill="url(#accent)" stroke="${palette.ink}" stroke-width="10" />
    <rect x="312" y="122" width="96" height="46" rx="16" fill="${palette.panel}" stroke="${palette.ink}" stroke-width="8" />
    <rect x="316" y="194" width="88" height="52" rx="18" fill="${palette.panel}" opacity="0.88" />
    <rect x="466" y="188" width="52" height="130" rx="18" fill="${palette.panel}" stroke="${palette.ink}" stroke-width="8" />
    <rect x="474" y="160" width="36" height="32" rx="12" fill="url(#accent)" stroke="${palette.ink}" stroke-width="8" />
  `;
};

const decorArtwork = (name, palette) => {
  const label = name.toLowerCase();

  if (label.includes("lamp")) {
    return `
      <ellipse cx="360" cy="396" rx="128" ry="28" fill="${palette.glow}" opacity="0.24" />
      <path d="M286 190h148l-48 88h-52z" fill="url(#accent)" stroke="${palette.ink}" stroke-width="10" stroke-linejoin="round" />
      <path d="M360 278v70" stroke="${palette.ink}" stroke-width="10" stroke-linecap="round" />
      <rect x="322" y="348" width="76" height="22" rx="11" fill="${palette.ink}" opacity="0.72" />
    `;
  }

  if (label.includes("clock")) {
    return `
      <circle cx="360" cy="250" r="114" fill="url(#accent)" stroke="${palette.ink}" stroke-width="10" />
      <circle cx="360" cy="250" r="14" fill="${palette.ink}" />
      <path d="M360 250v-56" stroke="${palette.panel}" stroke-width="10" stroke-linecap="round" />
      <path d="M360 250l42 26" stroke="${palette.panel}" stroke-width="10" stroke-linecap="round" />
      <ellipse cx="360" cy="396" rx="118" ry="24" fill="${palette.glow}" opacity="0.22" />
    `;
  }

  return `
    <ellipse cx="360" cy="396" rx="126" ry="26" fill="${palette.glow}" opacity="0.24" />
    <path d="M312 136h96l26 176c0 40-32 68-74 68s-74-28-74-68z" fill="url(#accent)" stroke="${palette.ink}" stroke-width="10" stroke-linejoin="round" />
    <path d="M326 136c0-22 16-36 34-36s34 14 34 36" fill="none" stroke="${palette.ink}" stroke-width="8" stroke-linecap="round" />
    <path d="M312 254h96" stroke="${palette.panel}" stroke-width="12" stroke-linecap="round" opacity="0.68" />
  `;
};

const shoeArtwork = (palette) => `
  <ellipse cx="360" cy="396" rx="142" ry="28" fill="${palette.glow}" opacity="0.22" />
  <path d="M246 322l80-96 64 34 42 52 58 20c12 4 20 16 20 28v8H246z" fill="url(#accent)" stroke="${palette.ink}" stroke-width="10" stroke-linejoin="round" />
  <path d="M314 244l62 36" stroke="${palette.panel}" stroke-width="10" stroke-linecap="round" opacity="0.84" />
  <path d="M296 276h62" stroke="${palette.panel}" stroke-width="10" stroke-linecap="round" opacity="0.84" />
  <path d="M272 368h228" stroke="${palette.panel}" stroke-width="12" stroke-linecap="round" opacity="0.62" />
`;

const categoryArtwork = ({ category, name, productType, palette }) => {
  if (category === "Beauty") {
    return beautyArtwork(productType, palette);
  }

  if (category === "Fashion") {
    return fashionArtwork(productType, palette);
  }

  if (category === "Decoration Items") {
    return decorArtwork(name, palette);
  }

  if (category === "Shoes") {
    return shoeArtwork(palette);
  }

  return `
    <ellipse cx="360" cy="396" rx="126" ry="26" fill="${palette.glow}" opacity="0.2" />
    <rect x="278" y="154" width="164" height="164" rx="34" fill="url(#accent)" stroke="${palette.ink}" stroke-width="10" />
    <rect x="316" y="124" width="88" height="44" rx="16" fill="${palette.panel}" stroke="${palette.ink}" stroke-width="8" />
  `;
};

const generatedCatalogImage = ({ category, name, segment = "", productType = "" }) => {
  ensureGeneratedImageDir();
  const seed = `${category}-${segment}-${productType}-${name}`;
  const paletteSet = category === "Beauty" ? beautyPalettes : category === "Fashion" ? fashionPalettes : decorPalettes;
  const palette = paletteFor(seed, paletteSet);
  const subtitle = [segment, productType || category].filter(Boolean).join(" / ");
  const svg = svgShell({
    palette,
    title: name,
    subtitle,
    artwork: categoryArtwork({ category, name, productType, palette }),
  });
  const filename = `${slugify(category)}-${slugify(segment || "all")}-${slugify(name)}.svg`;

  fs.writeFileSync(path.join(GENERATED_IMAGE_DIR, filename), svg.trim(), "utf8");
  return `${GENERATED_IMAGE_ROUTE}/${filename}`;
};

const fashionDescription = (segment, productType, name) => {
  const type = productType.toLowerCase();

  if (type.includes("indian wear")) {
    return `${name} brings polished festive dressing to the ${segment.toLowerCase()} fashion edit with comfortable tailoring and occasion-ready detailing.`;
  }

  if (type.includes("dress") || type.includes("frock") || type.includes("lehenga") || type.includes("saree") || type.includes("gown")) {
    return `${name} is styled for standout moments while still feeling wearable, comfortable, and easy to pair with everyday accessories.`;
  }

  if (type.includes("jacket") || type.includes("hoodie") || type.includes("blazer") || type.includes("sweatshirt")) {
    return `${name} adds a layered statement to the ${segment.toLowerCase()} wardrobe with practical comfort and a cleaner premium finish.`;
  }

  if (type.includes("jeans") || type.includes("trousers") || type.includes("joggers") || type.includes("bottom")) {
    return `${name} is made for repeat wear with an easy fit, flexible movement, and styling that works from weekdays to weekends.`;
  }

  return `${name} delivers an easy premium feel for ${segment.toLowerCase()} shoppers who want reliable comfort, cleaner silhouettes, and everyday versatility.`;
};

const fashionFeatures = (segment, productType) => {
  const type = productType.toLowerCase();
  const base = segment === "Kids" ? "Soft On Skin" : "Comfort First";

  if (type.includes("indian wear")) {
    return [base, "Festive Ready", "Detailed Finish"];
  }

  if (type.includes("dress") || type.includes("frock") || type.includes("saree") || type.includes("lehenga") || type.includes("gown")) {
    return [base, "Event Styling", "Easy Movement"];
  }

  if (type.includes("shirt") || type.includes("top") || type.includes("t-shirt") || type.includes("polo")) {
    return [base, "Breathable Fabric", "Daily Wear"];
  }

  if (type.includes("jacket") || type.includes("hoodie") || type.includes("blazer") || type.includes("sweatshirt")) {
    return [base, "Layering Essential", "Structured Look"];
  }

  return [base, "Wardrobe Staple", "Easy Styling"];
};

const beautyDescription = (name, productType) => {
  const type = productType.toLowerCase();

  if (type.includes("serum") || type.includes("skincare")) {
    return `${name} supports a simple, results-led routine with a polished formula that layers well into both day and night skincare.`;
  }

  if (type.includes("haircare")) {
    return `${name} is designed for healthy-looking hair with an easy routine, lightweight feel, and salon-inspired finish at home.`;
  }

  if (type.includes("fragrance")) {
    return `${name} adds a soft premium signature to your daily routine with a balanced scent profile that feels clean and wearable.`;
  }

  if (type.includes("tools")) {
    return `${name} helps create a cleaner beauty routine with dependable performance, comfortable handling, and a more polished finish.`;
  }

  return `${name} brings an easy premium beauty moment to daily use with a formula tuned for comfort, smooth application, and reliable wear.`;
};

const beautyFeatures = (productType) => {
  const type = productType.toLowerCase();

  if (type.includes("serum") || type.includes("sunscreen") || type.includes("moisturizer") || type.includes("cleanser")) {
    return ["Daily Routine", "Skin Friendly", "Easy Layering"];
  }

  if (type.includes("haircare")) {
    return ["Salon Feel", "Smooth Finish", "Routine Essential"];
  }

  if (type.includes("fragrance")) {
    return ["Signature Scent", "Travel Friendly", "Premium Blend"];
  }

  if (type.includes("tools")) {
    return ["Beauty Kit", "Precise Control", "Reusable"];
  }

  return ["Beauty Edit", "Smooth Application", "Everyday Use"];
};

const buildFashionSegment = (segment, specs) =>
  specs.map(([name, productType, price], index) => ({
    name,
    segment,
    productType,
    price,
    rating: Number((4.1 + ((index + segment.length) % 7) * 0.1).toFixed(1)),
    stock: 10 + ((index * 3 + segment.length) % 26),
    image: generatedCatalogImage({ category: "Fashion", name, segment, productType }),
    description: fashionDescription(segment, productType, name),
    features: fashionFeatures(segment, productType),
    isFeatured: index < 3,
  }));

const buildBeautyProducts = (specs) =>
  specs.map(([name, productType, price], index) => ({
    name,
    productType,
    price,
    rating: Number((4.2 + (index % 6) * 0.1).toFixed(1)),
    stock: 14 + ((index * 4) % 30),
    image: generatedCatalogImage({ category: "Beauty", name, productType }),
    description: beautyDescription(name, productType),
    features: beautyFeatures(productType),
    isFeatured: index < 3,
  }));

const buildProduct = (vendor, category, item, index) => ({
  ...item,
  price: normalizeSeedPrice(category, item.price),
  category,
  vendor: vendor._id,
  vendorName: vendor.storeName,
  isFeatured: item.isFeatured ?? index < 2,
});

const maleFashionSpecs = [
  ["Relaxed Crew Neck Tee", "T-Shirt", 799],
  ["Vintage Graphic Tee", "T-Shirt", 899],
  ["Oxford Office Shirt", "Shirt", 1499],
  ["Striped Weekend Shirt", "Shirt", 1399],
  ["Essential Knit Top", "Top", 1099],
  ["Linen Summer Shirt", "Shirt", 1799],
  ["Festive Kurta Classic", "Indian Wear", 1699],
  ["Embroidered Kurta Set", "Indian Wear", 2599],
  ["Straight Fit Jeans", "Jeans", 1999],
  ["Tailored Cotton Chinos", "Trousers", 1899],
  ["Zip Front Hoodie", "Hoodie", 1799],
  ["Varsity Sweatshirt", "Sweatshirt", 1599],
  ["Utility Overshirt", "Jacket", 2299],
  ["Smart Casual Blazer", "Blazer", 4499],
  ["Printed Resort Co-ord", "Co-ord", 2799],
  ["Running Track Pants", "Joggers", 1399],
  ["Denim Jacket Slate", "Jacket", 2499],
  ["Mandarin Collar Shirt", "Shirt", 1599],
  ["Festive Nehru Jacket", "Indian Wear", 2399],
  ["Monochrome Bomber", "Jacket", 2899],
];

const femaleFashionSpecs = [
  ["Everyday Soft Top", "Top", 699],
  ["Ribbed Casual Tee", "T-Shirt", 649],
  ["Classic White Shirt", "Shirt", 1299],
  ["Satin Work Blouse", "Top", 1499],
  ["Printed Kurta Ease", "Indian Wear", 1199],
  ["Embroidered Kurta Set", "Indian Wear", 2499],
  ["Mirror Work Lehenga", "Indian Wear", 4999],
  ["Floral Saree Story", "Indian Wear", 4299],
  ["Easy Fit Jeans", "Jeans", 1899],
  ["Pleated Midi Skirt", "Skirt", 1699],
  ["Relaxed Co-ord Set", "Co-ord", 2799],
  ["Daylight Summer Dress", "Dress", 1999],
  ["Festive Anarkali Grace", "Indian Wear", 3799],
  ["Denim Crop Jacket", "Jacket", 2399],
  ["Studio Knit Cardigan", "Knitwear", 2199],
  ["Printed Tunic Bloom", "Tunic", 1299],
  ["Lounge Palazzo Set", "Co-ord", 2299],
  ["Office Wide Leg Trousers", "Trousers", 1899],
  ["Party Satin Gown", "Dress", 4599],
  ["Cotton Dupatta Kurta", "Indian Wear", 1899],
];

const kidsFashionSpecs = [
  ["Dino Graphic Tee", "T-Shirt", 300],
  ["Rainbow Play Top", "Top", 449],
  ["Smart Check Shirt", "Shirt", 699],
  ["Easy Pull-On Shorts", "Bottoms", 499],
  ["Adventure Jogger Set", "Co-ord", 999],
  ["Cozy Zip Hoodie", "Hoodie", 1099],
  ["Festive Kurta Mini", "Indian Wear", 1199],
  ["Tiny Waistcoat Set", "Indian Wear", 1799],
  ["Twirl Party Frock", "Dress", 1299],
  ["Cartoon Sleep Set", "Nightwear", 799],
  ["Summer Cotton Dress", "Dress", 899],
  ["Everyday Denim Dungaree", "Dungaree", 1499],
  ["Graphic Sweatshirt Pop", "Sweatshirt", 899],
  ["School Day Polo", "Polo", 549],
  ["Track Pant Duo", "Bottoms", 699],
  ["Playtime Co-ord Splash", "Co-ord", 1099],
  ["Ethnic Sherwani Junior", "Indian Wear", 2499],
  ["Printed Legging Pack", "Bottoms", 599],
  ["Festive Lehenga Mini", "Indian Wear", 2299],
  ["Casual Checked Jacket", "Jacket", 1599],
];

const beautySpecs = [
  ["Hydrating Face Wash", "Cleanser", 349],
  ["Vitamin C Serum", "Serum", 799],
  ["Matte Lipstick Rose", "Lipstick", 499],
  ["Dewy Skin Tint", "Foundation", 999],
  ["SPF 50 Sunscreen Gel", "Sunscreen", 549],
  ["Overnight Repair Cream", "Moisturizer", 899],
  ["Kajal Precision Black", "Eye Makeup", 299],
  ["Volume Lift Mascara", "Eye Makeup", 599],
  ["Fresh Bloom Perfume Mist", "Fragrance", 1299],
  ["Herbal Hair Oil Blend", "Haircare", 449],
  ["Repair Shampoo Silk", "Haircare", 599],
  ["Smooth Conditioner Gloss", "Haircare", 649],
  ["Glow Clay Mask", "Skincare", 549],
  ["Brightening Toner Mist", "Skincare", 429],
  ["Cocoa Body Lotion", "Bodycare", 399],
  ["Nail Color Cherry", "Nail Care", 249],
  ["Makeup Brush Studio Set", "Tools", 1199],
  ["Compact Powder Velvet", "Makeup", 649],
  ["Sheet Mask Hydrate", "Skincare", 299],
  ["Lip And Cheek Tint Coral", "Makeup", 549],
];

const catalog = {
  Grocery: [
    {
      name: "Fresh Apple Pack",
      description: "Crisp red apples for snacking, fruit bowls, school tiffins, and healthy daily eating.",
      price: 4,
      rating: 4.7,
      stock: 110,
      image: "https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?auto=format&fit=crop&w=900&q=80",
      features: ["Fresh Fruit", "Daily Grocery", "Naturally Sweet"],
    },
    {
      name: "Farm Fresh Banana Bunch",
      description: "Naturally sweet bananas for breakfast bowls, shakes, lunch boxes, and daily snacking.",
      price: 3,
      rating: 4.6,
      stock: 120,
      image: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=900&q=80",
      features: ["Fresh Fruit", "Naturally Sweet", "Daily Essentials"],
    },
    {
      name: "Garden Tomato Pack",
      description: "Juicy red tomatoes ideal for curries, salads, sandwiches, and everyday home cooking.",
      price: 2,
      rating: 4.4,
      stock: 160,
      image: "https://images.unsplash.com/photo-1546094096-0df4bcaaa337?auto=format&fit=crop&w=900&q=80",
      features: ["Fresh Vegetables", "Kitchen Staple", "Rich Flavor"],
    },
    {
      name: "Spinach Leaf Bundle",
      description: "Washed leafy spinach bundle for smoothies, sabzi, soups, and healthy daily meals.",
      price: 2,
      rating: 4.3,
      stock: 90,
      image: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=900&q=80",
      features: ["Leafy Greens", "Iron Rich", "Fresh Harvest"],
    },
    {
      name: "Orange Citrus Bag",
      description: "Bright citrus oranges packed for juicing, fruit chaat, and quick vitamin-rich snacking.",
      price: 4,
      rating: 4.5,
      stock: 95,
      image: "https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?auto=format&fit=crop&w=900&q=80",
      features: ["Fresh Fruit", "Juicy", "Vitamin C"],
    },
    {
      name: "Daily Milk Carton",
      description: "Everyday full-cream milk carton for tea, coffee, cereal, and family breakfasts.",
      price: 2,
      rating: 4.7,
      stock: 140,
      image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=900&q=80",
      features: ["Daily Necessity", "Full Cream", "Breakfast Essential"],
    },
    {
      name: "Whole Wheat Bread Loaf",
      description: "Soft whole wheat bread loaf for toast, sandwiches, evening snacks, and quick meals.",
      price: 3,
      rating: 4.2,
      stock: 75,
      image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=80",
      features: ["Bakery Fresh", "Whole Wheat", "Family Pack"],
    },
    {
      name: "Everyday Rice Bag 5kg",
      description: "Medium grain rice bag for daily lunch and dinner cooking in busy households.",
      price: 18,
      rating: 4.6,
      stock: 58,
      image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=900&q=80",
      features: ["Pantry Staple", "5kg Pack", "Daily Use"],
    },
    {
      name: "Olive Oil Bottle",
      description: "Refined cooking oil bottle suitable for frying, sauteing, and routine meal preparation.",
      price: 6,
      rating: 4.3,
      stock: 88,
      image: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=900&q=80",
      features: ["Cooking Essential", "Daily Necessity", "Family Use"],
    },
    {
      name: "Potato Value Pack",
      description: "Reliable potato pack for curries, fries, snacks, and everyday comfort food meals.",
      price: 3,
      rating: 4.4,
      stock: 130,
      image: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=900&q=80",
      features: ["Fresh Vegetables", "Value Pack", "Kitchen Basic"],
    },
    {
      name: "Household Cleaning Combo",
      description: "Daily home care combo with dishwash, floor cleaner, and surface essentials.",
      price: 12,
      rating: 4.5,
      stock: 54,
      image: "https://images.unsplash.com/photo-1583947582886-f40ec95dd752?auto=format&fit=crop&w=900&q=80",
      features: ["Daily Necessities", "Home Care", "Combo Pack"],
    },
  ],
  Electronics: [
    {
      name: "Noise Cancelling Studio Headphones",
      description: "Over-ear headphones with immersive sound, low-latency pairing, and soft memory foam cups.",
      price: 229,
      rating: 4.7,
      stock: 24,
      image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80",
      features: ["Active Noise Cancellation", "Bluetooth 5.3", "32 Hour Battery"],
    },
    {
      name: "Pocket Bluetooth Speaker Mini",
      description: "Compact speaker for travel and work desks with rich bass and splash resistance.",
      price: 79,
      rating: 4.4,
      stock: 32,
      image: "https://images.unsplash.com/photo-1589003077984-894e133dabab?auto=format&fit=crop&w=900&q=80",
      features: ["12 Hour Playback", "IPX5 Splash Resistant", "USB-C"],
    },
    {
      name: "Smartwatch Active Fit",
      description: "Everyday fitness smartwatch with heart-rate tracking and elegant metal finish.",
      price: 159,
      rating: 4.3,
      stock: 18,
      image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80",
      features: ["Sleep Tracking", "AMOLED Face", "7 Day Battery"],
    },
    {
      name: "True Wireless Earbuds Neo",
      description: "Lightweight earbuds with deep bass, dual mic calling, and seamless quick pairing.",
      price: 119,
      rating: 4.5,
      stock: 40,
      image: "https://images.unsplash.com/photo-1606741965326-cb990ae01bb2?auto=format&fit=crop&w=900&q=80",
      features: ["Dual Mic", "Touch Controls", "Fast Charge"],
    },
    {
      name: "Portable Power Bank 20000",
      description: "Fast-charging backup power bank for phones, earbuds, and travel electronics.",
      price: 69,
      rating: 4.2,
      stock: 46,
      image: "https://images.unsplash.com/photo-1609592806787-3d9f3f4f2b7f?auto=format&fit=crop&w=900&q=80",
      features: ["20,000mAh", "18W Output", "Dual USB"],
    },
    {
      name: "Wireless Gaming Mouse Pro",
      description: "Low-latency wireless mouse with ergonomic grip and customizable DPI presets.",
      price: 89,
      rating: 4.6,
      stock: 28,
      image: "https://images.unsplash.com/photo-1527814050087-3793815479db?auto=format&fit=crop&w=900&q=80",
      features: ["Programmable Buttons", "RGB Lighting", "Rechargeable"],
    },
    {
      name: "4K Streaming Stick Hub",
      description: "Compact streaming device with voice control and fast access to major apps.",
      price: 59,
      rating: 4.4,
      stock: 35,
      image: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=900&q=80",
      features: ["4K HDR", "Voice Remote", "Wi-Fi 6"],
    },
    {
      name: "Mechanical Keyboard TKL",
      description: "Minimal tenkeyless keyboard with tactile switches and premium aluminum frame.",
      price: 109,
      rating: 4.5,
      stock: 20,
      image: "https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?auto=format&fit=crop&w=900&q=80",
      features: ["Hot Swap Keys", "White Backlight", "USB-C"],
    },
    {
      name: "Webcam Creator 1080p",
      description: "Sharp webcam for meetings, classes, and live sessions with built-in stereo mics.",
      price: 74,
      rating: 4.1,
      stock: 22,
      image: "https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?auto=format&fit=crop&w=900&q=80",
      features: ["Auto Focus", "Dual Mic", "Tripod Ready"],
    },
    {
      name: "Bluetooth Soundbar Slim",
      description: "Slim soundbar that upgrades TV audio with fuller vocals and cleaner bass.",
      price: 189,
      rating: 4.4,
      stock: 16,
      image: "https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=900&q=80",
      features: ["Bluetooth Pairing", "Wall Mount Ready", "Cinema Mode"],
    },
  ],
  Fashion: [
    ...buildFashionSegment("Male", maleFashionSpecs),
    ...buildFashionSegment("Female", femaleFashionSpecs),
    ...buildFashionSegment("Kids", kidsFashionSpecs),
  ],
  Beauty: buildBeautyProducts(beautySpecs),
  "Decoration Items": [
    {
      name: "Ceramic Vase Pair",
      description: "Neutral-toned ceramic vase duo for console tables, shelves, and centerpieces.",
      price: 54,
      rating: 4.2,
      stock: 28,
      image: generatedCatalogImage({ category: "Decoration Items", name: "Ceramic Vase Pair", productType: "Vase" }),
      features: ["Set Of 2", "Matte Finish", "Shelf Styling"],
    },
    {
      name: "Modern Table Lamp Glow",
      description: "Warm ambient lamp for reading corners, bedside tables, and workspace styling.",
      price: 89,
      rating: 4.5,
      stock: 18,
      image: generatedCatalogImage({ category: "Decoration Items", name: "Modern Table Lamp Glow", productType: "Lamp" }),
      features: ["Warm Light", "Minimal Base", "Energy Efficient"],
    },
    {
      name: "Framed Wall Art Set",
      description: "Coordinated wall art set that adds layered character to empty walls.",
      price: 79,
      rating: 4.1,
      stock: 19,
      image: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=900&q=80",
      features: ["Set Of 3", "Ready To Hang", "Gallery Style"],
    },
    {
      name: "Decorative Candle Trio",
      description: "Elegant candle trio with soft fragrance and premium glass holders.",
      price: 45,
      rating: 4.3,
      stock: 30,
      image: "https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=900&q=80",
      features: ["Soy Wax", "Gift Ready", "Long Burn"],
    },
    {
      name: "Handwoven Basket Set",
      description: "Textured woven baskets for storage and styling in living rooms or bedrooms.",
      price: 66,
      rating: 4.4,
      stock: 21,
      image: "https://images.unsplash.com/photo-1582582621959-48d27397dc69?auto=format&fit=crop&w=900&q=80",
      features: ["Natural Fiber", "Set Of 2", "Multipurpose"],
    },
    {
      name: "Accent Mirror Arch",
      description: "Statement mirror with arched silhouette that brightens and opens up a room.",
      price: 139,
      rating: 4.6,
      stock: 10,
      image: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=900&q=80",
      features: ["Metal Frame", "Wall Mounted", "Modern Shape"],
    },
    {
      name: "Textured Cushion Cover Set",
      description: "Soft cushion cover set that refreshes sofas, beds, and lounge corners.",
      price: 39,
      rating: 4.0,
      stock: 34,
      image: generatedCatalogImage({ category: "Decoration Items", name: "Textured Cushion Cover Set", productType: "Soft Furnishing" }),
      features: ["Set Of 4", "Hidden Zip", "Machine Wash"],
    },
    {
      name: "Indoor Planter Stand",
      description: "Minimal plant stand to display greenery in bright windows and living spaces.",
      price: 58,
      rating: 4.2,
      stock: 17,
      image: "https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=900&q=80",
      features: ["Powder Coated", "Stable Base", "Indoor Use"],
    },
    {
      name: "Wall Clock Nordic",
      description: "Minimal wall clock with quiet sweep movement and clean Scandinavian styling.",
      price: 62,
      rating: 4.1,
      stock: 23,
      image: generatedCatalogImage({ category: "Decoration Items", name: "Wall Clock Nordic", productType: "Clock" }),
      features: ["Silent Movement", "Easy Mount", "Minimal Dial"],
    },
    {
      name: "Marble Tray Luxe",
      description: "Decor tray ideal for candles, perfumes, keys, and coffee table accents.",
      price: 71,
      rating: 4.5,
      stock: 12,
      image: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=900&q=80",
      features: ["Marble Texture", "Gold Handles", "Easy To Style"],
    },
  ],
  Shoes: [
    {
      name: "Runner Flex Sneakers",
      description: "Responsive everyday sneakers designed for walking, commuting, and casual runs.",
      price: 109,
      rating: 4.4,
      stock: 29,
      image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80",
      features: ["Breathable Mesh", "Shock Absorption", "Grip Sole"],
    },
    {
      name: "Leather Street Sneakers",
      description: "Smart casual sneakers with clean leather panels and cushioned interiors.",
      price: 129,
      rating: 4.5,
      stock: 18,
      image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=900&q=80",
      features: ["Leather Upper", "Memory Foam", "Neutral Style"],
    },
    {
      name: "Trail Move Trainers",
      description: "Durable outdoor trainers with grippy sole for light hiking and active days.",
      price: 139,
      rating: 4.3,
      stock: 16,
      image: generatedCatalogImage({ category: "Shoes", name: "Trail Move Trainers", productType: "Running Shoes" }),
      features: ["Trail Grip", "Water Resistant", "Supportive Heel"],
    },
    {
      name: "Minimal White Low Tops",
      description: "Versatile low-top sneakers that work with denim, dresses, and easy casual looks.",
      price: 99,
      rating: 4.2,
      stock: 26,
      image: "https://images.unsplash.com/photo-1463100099107-aa0980c362e6?auto=format&fit=crop&w=900&q=80",
      features: ["Clean Finish", "Light Cushioning", "Daily Wear"],
    },
    {
      name: "Athletic Knit Runners",
      description: "Lightweight knit runners with breathable upper and springy all-day comfort.",
      price: 119,
      rating: 4.4,
      stock: 24,
      image: "https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=900&q=80",
      features: ["Knit Upper", "Lightweight", "Road Ready"],
    },
    {
      name: "Classic Canvas Sneakers",
      description: "Timeless canvas sneakers with flexible sole and laid-back street style.",
      price: 74,
      rating: 4.0,
      stock: 36,
      image: generatedCatalogImage({ category: "Shoes", name: "Classic Canvas Sneakers", productType: "Sneakers" }),
      features: ["Canvas Build", "Rubber Sole", "Everyday Style"],
    },
    {
      name: "Court Sport Trainers",
      description: "Sport-inspired trainers with stable footing and smart retro design cues.",
      price: 118,
      rating: 4.3,
      stock: 20,
      image: "https://images.unsplash.com/photo-1514996937319-344454492b37?auto=format&fit=crop&w=900&q=80",
      features: ["Retro Panels", "Supportive Insole", "Court Inspired"],
    },
    {
      name: "Urban Slip-On Comfort",
      description: "Easy slip-on shoes for quick errands and all-day comfort around town.",
      price: 69,
      rating: 4.1,
      stock: 31,
      image: "https://images.unsplash.com/photo-1491553895911-0055eca6402d?auto=format&fit=crop&w=900&q=80",
      features: ["Slip On", "Flexible Fit", "Soft Footbed"],
    },
    {
      name: "Performance Training Shoes",
      description: "Cross-training shoes built for gym sessions, HIIT workouts, and movement drills.",
      price: 135,
      rating: 4.6,
      stock: 19,
      image: "https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&w=900&q=80",
      features: ["Gym Support", "Grip Base", "Stable Cushion"],
    },
    {
      name: "Premium Suede Sneakers",
      description: "Refined suede sneakers with cushioned ankle support and elevated casual styling.",
      price: 149,
      rating: 4.5,
      stock: 14,
      image: "https://images.unsplash.com/photo-1515955656352-a1fa3ffcd111?auto=format&fit=crop&w=900&q=80",
      features: ["Suede Finish", "Soft Collar", "Premium Comfort"],
    },
  ],
  Laptops: [
    {
      name: "Creator Laptop Pro 14",
      description: "Thin premium laptop for design, office work, research, and everyday portability.",
      price: 1199,
      rating: 4.8,
      stock: 13,
      image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=80",
      features: ["16GB RAM", "512GB SSD", "Backlit Keyboard"],
    },
    {
      name: "Gaming Laptop Blaze X15",
      description: "Powerful performance laptop with dedicated graphics and high refresh display.",
      price: 1499,
      rating: 4.7,
      stock: 9,
      image: "https://images.unsplash.com/photo-1517336714739-489689fd1ca8?auto=format&fit=crop&w=900&q=80",
      features: ["RTX Graphics", "144Hz Display", "1TB SSD"],
    },
    {
      name: "Ultrabook Air Slim",
      description: "Light and fast ultrabook built for campus, travel, and focused productivity.",
      price: 1049,
      rating: 4.5,
      stock: 17,
      image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&q=80",
      features: ["Fast Boot", "Aluminum Body", "All Day Battery"],
    },
    {
      name: "Business Laptop Secure 15",
      description: "Business-ready machine with solid battery life, privacy features, and sharp display.",
      price: 999,
      rating: 4.4,
      stock: 15,
      image: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=900&q=80",
      features: ["Fingerprint Login", "15.6 Inch FHD", "Wi-Fi 6"],
    },
    {
      name: "Student Laptop Everyday 13",
      description: "Balanced laptop for assignments, browsing, streaming, and online classes.",
      price: 749,
      rating: 4.2,
      stock: 27,
      image: "https://images.unsplash.com/photo-1484788984921-03950022c9ef?auto=format&fit=crop&w=900&q=80",
      features: ["8GB RAM", "256GB SSD", "HD Webcam"],
    },
    {
      name: "Editing Laptop Vision 16",
      description: "Large screen laptop with color-rich display for editing and creative review.",
      price: 1369,
      rating: 4.6,
      stock: 11,
      image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=900&q=80",
      features: ["16 Inch Display", "Creator GPU", "Color Accurate Panel"],
    },
    {
      name: "Convertible Touch Laptop Flip",
      description: "Touch-enabled 2-in-1 laptop for note taking, streaming, and flexible daily use.",
      price: 929,
      rating: 4.3,
      stock: 14,
      image: "https://images.unsplash.com/photo-1588702547919-26089e690ecc?auto=format&fit=crop&w=900&q=80",
      features: ["Touch Display", "360 Degree Hinge", "Stylus Support"],
    },
    {
      name: "Performance Laptop Core 17",
      description: "Big-screen laptop with strong multitasking power for analytics and heavy tabs.",
      price: 1289,
      rating: 4.5,
      stock: 10,
      image: "https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?auto=format&fit=crop&w=900&q=80",
      features: ["17 Inch Display", "32GB RAM", "Fast Cooling"],
    },
    {
      name: "Portable Laptop Litebook",
      description: "Slim and budget-friendly notebook made for browsing, documents, and travel.",
      price: 629,
      rating: 4.0,
      stock: 30,
      image: "https://images.unsplash.com/photo-1496171367470-9ed9a91ea931?auto=format&fit=crop&w=900&q=80",
      features: ["Lightweight", "Solid State Storage", "USB-C Charging"],
    },
    {
      name: "Workstation Laptop Titan",
      description: "Heavy-duty workstation with serious processing power for engineering and rendering.",
      price: 1799,
      rating: 4.8,
      stock: 7,
      image: "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&w=900&q=80",
      features: ["Workstation GPU", "32GB RAM", "Pro Build"],
    },
  ],
  "Mobile Phones": [
    {
      name: "Smartphone Max 5G",
      description: "Flagship 5G smartphone with vibrant display, all-day battery, and sharp camera detail.",
      price: 899,
      rating: 4.7,
      stock: 19,
      image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=80",
      features: ["AMOLED Display", "Fast Charging", "50MP Camera"],
    },
    {
      name: "Camera Phone Vision Pro",
      description: "Camera-first phone tuned for portraits, low light, and crisp detail capture.",
      price: 799,
      rating: 4.6,
      stock: 16,
      image: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=900&q=80",
      features: ["OIS Camera", "Night Mode", "Ultra Wide Lens"],
    },
    {
      name: "Compact Phone Mini 5G",
      description: "Small-form premium phone with top performance in a pocket-friendly design.",
      price: 699,
      rating: 4.4,
      stock: 20,
      image: "https://images.unsplash.com/photo-1556656793-08538906a9f8?auto=format&fit=crop&w=900&q=80",
      features: ["Compact Body", "5G", "Fast Processor"],
    },
    {
      name: "Battery Phone Marathon",
      description: "Long-lasting smartphone built for travel, maps, calls, and streaming on the go.",
      price: 549,
      rating: 4.3,
      stock: 24,
      image: "https://images.unsplash.com/photo-1580910051074-3eb694886505?auto=format&fit=crop&w=900&q=80",
      features: ["6000mAh Battery", "Fast Charge", "Dual Speakers"],
    },
    {
      name: "Value Phone Nova Lite",
      description: "Affordable phone with smooth UI, clean display, and dependable day-to-day performance.",
      price: 399,
      rating: 4.1,
      stock: 34,
      image: "https://images.unsplash.com/photo-1567581935884-3349723552ca?auto=format&fit=crop&w=900&q=80",
      features: ["90Hz Display", "4GB RAM", "128GB Storage"],
    },
    {
      name: "Gaming Phone Turbo",
      description: "Gaming-focused handset with cooling support, fast refresh, and low touch latency.",
      price: 749,
      rating: 4.5,
      stock: 15,
      image: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=900&q=80",
      features: ["120Hz Screen", "Gaming Mode", "Liquid Cooling"],
    },
    {
      name: "Elegant Phone Pearl",
      description: "Slim premium handset with glass finish and a polished everyday software feel.",
      price: 679,
      rating: 4.2,
      stock: 18,
      image: "https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=900&q=80",
      features: ["Slim Build", "OLED Screen", "Fast Unlock"],
    },
    {
      name: "Creator Phone Studio",
      description: "Balanced performance phone with dependable cameras for content and social media.",
      price: 629,
      rating: 4.3,
      stock: 21,
      image: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=900&q=80",
      features: ["4K Video", "Stabilized Camera", "Stereo Audio"],
    },
    {
      name: "Budget Phone Spark",
      description: "Entry-friendly smartphone with solid battery life and practical everyday features.",
      price: 299,
      rating: 4.0,
      stock: 38,
      image: "https://images.unsplash.com/photo-1605236453806-6ff36851218e?auto=format&fit=crop&w=900&q=80",
      features: ["5000mAh Battery", "Dual SIM", "Expandable Storage"],
    },
    {
      name: "Premium Phone Aura Ultra",
      description: "Top-tier premium phone with stunning screen, pro-level camera, and fast performance.",
      price: 1099,
      rating: 4.8,
      stock: 11,
      image: "https://images.unsplash.com/photo-1585060544812-6b45742d762f?auto=format&fit=crop&w=900&q=80",
      features: ["LTPO Display", "Pro Camera System", "Wireless Charging"],
    },
  ],
};

const assertUniqueCatalogImages = (items) => {
  const seen = new Map();

  for (const product of items) {
    if (!product.image) {
      continue;
    }

    if (seen.has(product.image)) {
      throw new Error(`Duplicate image detected for "${product.name}" and "${seen.get(product.image)}"`);
    }

    seen.set(product.image, product.name);
  }
};

const seed = async () => {
  await connectDB();

  await User.findOneAndUpdate(
    { email: "admin@example.com" },
    {
      $set: {
        name: "Platform Admin",
        role: "admin",
      },
      $setOnInsert: {
        email: "admin@example.com",
        password: await hashPassword("admin123"),
      },
    },
    { new: true, upsert: true }
  );

  const vendor = await User.findOneAndUpdate(
    { email: "vendor@example.com" },
    {
      $set: {
        name: "Tech Vendor",
        role: "vendor",
        storeName: "Tech World",
      },
      $setOnInsert: {
        email: "vendor@example.com",
        password: await hashPassword("vendor123"),
      },
    },
    { new: true, upsert: true }
  );

  await User.findOneAndUpdate(
    { email: "customer@example.com" },
    {
      $set: {
        name: "Customer Demo",
        role: "customer",
        address: "221 Demo Street, Mumbai",
      },
      $setOnInsert: {
        email: "customer@example.com",
        password: await hashPassword("customer123"),
      },
    },
    { new: true, upsert: true }
  );

  const demoProducts = Object.entries(catalog).flatMap(([category, items]) =>
    items.map((item, index) => buildProduct(vendor, category, item, index))
  );

  assertUniqueCatalogImages(demoProducts);

  for (const product of demoProducts) {
    const lookup = product.segment
      ? { name: product.name, vendor: vendor._id, category: product.category, segment: product.segment }
      : { name: product.name, vendor: vendor._id, category: product.category };

    await Product.findOneAndUpdate(
      lookup,
      { $set: product },
      { upsert: true, new: true }
    );
  }

  const currentCatalogKeys = new Set(
    demoProducts.map((product) => `${product.category}::${product.segment || ""}::${product.name}`)
  );
  const staleManagedProducts = await Product.find({
    vendor: vendor._id,
    category: { $in: [...Object.keys(catalog), "Dresses"] },
  }).select("_id name category segment");
  const staleIds = staleManagedProducts
    .filter((product) => !currentCatalogKeys.has(`${product.category}::${product.segment || ""}::${product.name}`))
    .map((product) => product._id);

  if (staleIds.length) {
    await User.updateMany(
      {},
      {
        $pull: {
          cart: { product: { $in: staleIds } },
          wishlist: { $in: staleIds },
        },
      }
    );

    await Product.deleteMany({ _id: { $in: staleIds } });
  }

  const existingProducts = await Product.find();

  for (const product of existingProducts) {
    const normalizedPrice = normalizeLegacyPrice(product.category, product.price);

    if (Number(normalizedPrice) !== Number(product.price)) {
      await Product.updateOne({ _id: product._id }, { $set: { price: normalizedPrice } });
    }
  }

  console.log(`Seeded ${demoProducts.length} products with Fashion and Beauty catalog updates`);
  await mongoose.connection.close();
};

seed().catch(async (error) => {
  console.error(error);
  await mongoose.connection.close();
});
