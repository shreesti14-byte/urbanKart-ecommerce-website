const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    image: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    vendorName: { type: String, required: true },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: [orderItemSchema],
    shippingAddress: { type: String, required: true },
    paymentMethod: { type: String, default: "Card Authorization" },
    paymentStatus: { type: String, enum: ["pending", "paid"], default: "paid" },
    paymentReference: { type: String, default: "" },
    authorizationCode: { type: String, default: "" },
    authorizedAt: { type: Date },
    maskedCard: { type: String, default: "" },
    orderStatus: {
      type: String,
      enum: ["processing", "confirmed", "shipped", "delivered"],
      default: "processing",
    },
    totalAmount: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
