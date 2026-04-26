const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    image: { type: String, required: true },
    category: { type: String, default: "" },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    gstRate: { type: Number, default: 0, min: 0 },
    taxableAmount: { type: Number, default: 0, min: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },
    discountedTaxableAmount: { type: Number, default: 0, min: 0 },
    gstAmount: { type: Number, default: 0, min: 0 },
    lineTotal: { type: Number, default: 0, min: 0 },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    vendorName: { type: String, required: true },
  },
  { _id: false }
);

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, default: "" },
    label: { type: String, default: "" },
    type: { type: String, default: "" },
    value: { type: Number, default: 0, min: 0 },
    minSubtotal: { type: Number, default: 0, min: 0 },
    maxDiscount: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const billingSchema = new mongoose.Schema(
  {
    subtotal: { type: Number, default: 0, min: 0 },
    discountedSubtotal: { type: Number, default: 0, min: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },
    gstAmount: { type: Number, default: 0, min: 0 },
    deliveryCharge: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, default: 0, min: 0 },
    freeDeliveryThreshold: { type: Number, default: 499, min: 0 },
    qualifiesForFreeDelivery: { type: Boolean, default: false },
    coupon: couponSchema,
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: [orderItemSchema],
    shippingAddress: { type: String, required: true },
    paymentMethod: { type: String, default: "Cash on Delivery" },
    paymentStatus: { type: String, enum: ["pending", "paid"], default: "paid" },
    paymentReference: { type: String, default: "" },
    authorizationCode: { type: String, default: "" },
    authorizedAt: { type: Date },
    maskedCard: { type: String, default: "" },
    orderStatus: {
      type: String,
      enum: ["processing", "confirmed", "shipped", "delivered", "cancelled"],
      default: "processing",
    },
    cancelledAt: { type: Date },
    billing: billingSchema,
    totalAmount: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
