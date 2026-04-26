const FREE_DELIVERY_THRESHOLD = 499;
const STANDARD_DELIVERY_CHARGE = 50;

const DEFAULT_GST_BY_CATEGORY = {
  Grocery: 5,
  Fashion: 12,
  Beauty: 18,
  Electronics: 18,
  "Decoration Items": 12,
  Shoes: 18,
  Laptops: 18,
  "Mobile Phones": 18,
};

const COUPON_DEFINITIONS = [
  {
    code: "WELCOME50",
    label: "Flat Rs. 50 off",
    type: "flat",
    value: 50,
    minSubtotal: 299,
  },
  {
    code: "SAVE10",
    label: "10% off up to Rs. 250",
    type: "percent",
    value: 10,
    minSubtotal: 399,
    maxDiscount: 250,
  },
  {
    code: "FREESHIP",
    label: "Free delivery coupon",
    type: "shipping",
    value: 0,
    minSubtotal: 199,
  },
];

const roundCurrency = (value = 0) => Math.max(0, Math.round(Number(value) || 0));

const clampGstRate = (value, category = "") => {
  const numericValue = Number(value);

  if (Number.isFinite(numericValue) && numericValue >= 0) {
    return Math.min(40, roundCurrency(numericValue));
  }

  return defaultGstRateForCategory(category);
};

function defaultGstRateForCategory(category = "") {
  return DEFAULT_GST_BY_CATEGORY[String(category).trim()] ?? 12;
}

function sanitizeCouponCode(code = "") {
  return String(code).trim().toUpperCase();
}

function resolveCoupon(rawCode = "", subtotal = 0) {
  const code = sanitizeCouponCode(rawCode);

  if (!code) {
    return {
      code: "",
      isValid: false,
      discountAmount: 0,
      message: "",
      definition: null,
    };
  }

  const definition = COUPON_DEFINITIONS.find((coupon) => coupon.code === code);

  if (!definition) {
    return {
      code,
      isValid: false,
      discountAmount: 0,
      message: "Invalid coupon code",
      definition: null,
    };
  }

  if (roundCurrency(subtotal) < roundCurrency(definition.minSubtotal)) {
    return {
      code,
      isValid: false,
      discountAmount: 0,
      message: `Coupon works on orders of Rs. ${roundCurrency(definition.minSubtotal)} or more`,
      definition,
    };
  }

  let discountAmount = 0;

  if (definition.type === "flat") {
    discountAmount = roundCurrency(Math.min(subtotal, definition.value));
  } else if (definition.type === "percent") {
    const computedDiscount = roundCurrency((roundCurrency(subtotal) * Number(definition.value)) / 100);
    discountAmount = definition.maxDiscount
      ? Math.min(computedDiscount, roundCurrency(definition.maxDiscount))
      : computedDiscount;
  } else if (definition.type === "shipping") {
    discountAmount = 0;
  }

  return {
    code,
    isValid: true,
    discountAmount: roundCurrency(discountAmount),
    message: "",
    definition,
  };
}

function calculateOrderBill(rawItems = [], couponCode = "") {
  const items = (Array.isArray(rawItems) ? rawItems : [])
    .map((item) => {
      const quantity = Math.max(1, roundCurrency(item?.quantity || 1));
      const unitPrice = roundCurrency(item?.price || 0);
      const taxableAmount = roundCurrency(unitPrice * quantity);
      const gstRate = clampGstRate(item?.gstRate, item?.category);

      return {
        product: item?.product,
        name: item?.name || "Product",
        image: item?.image || "",
        vendor: item?.vendor,
        vendorName: item?.vendorName || "",
        category: item?.category || "",
        quantity,
        unitPrice,
        taxableAmount,
        gstRate,
      };
    })
    .filter((item) => item.taxableAmount > 0);

  const subtotal = items.reduce((sum, item) => sum + item.taxableAmount, 0);
  const coupon = resolveCoupon(couponCode, subtotal);
  const discountAmount = roundCurrency(coupon.discountAmount);
  let allocatedDiscount = 0;

  const billedItems = items.map((item, index) => {
    const isLastItem = index === items.length - 1;
    const proportionalDiscount =
      subtotal > 0 ? roundCurrency((discountAmount * item.taxableAmount) / subtotal) : 0;
    const itemDiscount = isLastItem
      ? Math.max(0, discountAmount - allocatedDiscount)
      : Math.min(item.taxableAmount, proportionalDiscount);

    allocatedDiscount += itemDiscount;

    const discountedTaxableAmount = Math.max(0, item.taxableAmount - itemDiscount);
    const gstAmount = roundCurrency((discountedTaxableAmount * item.gstRate) / 100);
    const lineTotal = roundCurrency(discountedTaxableAmount + gstAmount);

    return {
      ...item,
      discountAmount: itemDiscount,
      discountedTaxableAmount,
      gstAmount,
      lineTotal,
    };
  });

  const discountedSubtotal = billedItems.reduce((sum, item) => sum + item.discountedTaxableAmount, 0);
  const gstAmount = billedItems.reduce((sum, item) => sum + item.gstAmount, 0);
  const qualifiesForFreeDelivery = discountedSubtotal >= FREE_DELIVERY_THRESHOLD;
  const deliveryCharge =
    !billedItems.length || coupon.definition?.type === "shipping"
      ? 0
      : qualifiesForFreeDelivery
      ? 0
      : STANDARD_DELIVERY_CHARGE;
  const totalAmount = roundCurrency(discountedSubtotal + gstAmount + deliveryCharge);

  return {
    items: billedItems,
    subtotal,
    discountedSubtotal,
    discountAmount,
    gstAmount,
    deliveryCharge,
    totalAmount,
    qualifiesForFreeDelivery,
    freeDeliveryThreshold: FREE_DELIVERY_THRESHOLD,
    coupon: coupon.isValid && coupon.definition
      ? {
          code: coupon.code,
          label: coupon.definition.label,
          type: coupon.definition.type,
          value: coupon.definition.value,
          minSubtotal: coupon.definition.minSubtotal,
          maxDiscount: coupon.definition.maxDiscount || 0,
        }
      : null,
    invalidCoupon: !coupon.isValid && coupon.code
      ? {
          code: coupon.code,
          message: coupon.message,
        }
      : null,
  };
}

module.exports = {
  COUPON_DEFINITIONS,
  DEFAULT_GST_BY_CATEGORY,
  FREE_DELIVERY_THRESHOLD,
  STANDARD_DELIVERY_CHARGE,
  calculateOrderBill,
  clampGstRate,
  defaultGstRateForCategory,
  resolveCoupon,
  roundCurrency,
  sanitizeCouponCode,
};
