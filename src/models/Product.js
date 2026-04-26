const mongoose = require("mongoose");
const { defaultGstRateForCategory } = require("../config/billing");

const reviewSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    customerName: { type: String, required: true, trim: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, trim: true, maxlength: 600 },
  },
  { timestamps: true }
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category: { type: String, required: true, trim: true },
    segment: { type: String, trim: true, default: "" },
    productType: { type: String, trim: true, default: "" },
    price: { type: Number, required: true, min: 0 },
    rating: { type: Number, default: 4, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0, min: 0 },
    stock: { type: Number, default: 0, min: 0 },
    gstRate: {
      type: Number,
      min: 0,
      max: 40,
      default() {
        return defaultGstRateForCategory(this.category);
      },
    },
    image: { type: String, required: true },
    features: [{ type: String }],
    reviews: [reviewSchema],
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    vendorName: { type: String, required: true },
    isFeatured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
