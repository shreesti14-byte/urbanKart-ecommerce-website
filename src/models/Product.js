const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category: { type: String, required: true, trim: true },
    segment: { type: String, trim: true, default: "" },
    productType: { type: String, trim: true, default: "" },
    price: { type: Number, required: true, min: 0 },
    rating: { type: Number, default: 4, min: 0, max: 5 },
    stock: { type: Number, default: 0, min: 0 },
    image: { type: String, required: true },
    features: [{ type: String }],
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    vendorName: { type: String, required: true },
    isFeatured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
