const express = require("express");
const Product = require("../models/Product");
const User = require("../models/User");
const { protect, authorize } = require("../middleware/authMiddleware");
const { catalogCategories } = require("../config/catalogMeta");

const router = express.Router();

const logProductActivity = (action, actor, product) => {
  console.log(
    [
      `[product:${action}]`,
      `role=${actor.role}`,
      `actor=${actor.email}`,
      `store=${actor.storeName || "-"}`,
      `product="${product.name}"`,
      `category=${product.category}`,
      `segment=${product.segment || "-"}`,
      `type=${product.productType || "-"}`,
      `price=${product.price}`,
      `stock=${product.stock}`,
    ].join(" ")
  );
};

router.get("/categories/all", (req, res) => {
  res.json({ success: true, data: catalogCategories });
});

router.get("/", async (req, res, next) => {
  try {
    const { category, segment, minPrice, maxPrice, rating, sortBy, search } = req.query;
    const query = {};

    if (category && category !== "All") {
      query.category = category;
    }

    if (segment && segment !== "All") {
      query.segment = segment;
    }

    if (rating) {
      query.rating = { $gte: Number(rating) };
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
        { segment: { $regex: search, $options: "i" } },
        { productType: { $regex: search, $options: "i" } },
        { vendorName: { $regex: search, $options: "i" } },
        { features: { $elemMatch: { $regex: search, $options: "i" } } },
      ];
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) {
        query.price.$gte = Number(minPrice);
      }
      if (maxPrice) {
        query.price.$lte = Number(maxPrice);
      }
    }

    const sortOptions = {
      price_asc: { price: 1 },
      price_desc: { price: -1 },
      rating_desc: { rating: -1 },
      latest: { createdAt: -1 },
    };

    const products = await Product.find(query)
      .sort(sortOptions[sortBy] || { createdAt: -1 })
      .populate("vendor", "name storeName");

    res.json({ success: true, data: products });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).populate("vendor", "name storeName email");

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
});

router.post("/", protect, authorize("vendor", "admin"), async (req, res, next) => {
  try {
    const product = await Product.create({
      ...req.body,
      vendor: req.user._id,
      vendorName: req.user.storeName || req.user.name,
    });

    logProductActivity("create", req.user, product);

    res.status(201).json({ success: true, message: "Product created", data: product });
  } catch (error) {
    next(error);
  }
});

router.put("/:id", protect, authorize("vendor", "admin"), async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const isOwner = product.vendor.toString() === req.user._id.toString();
    if (req.user.role !== "admin" && !isOwner) {
      return res.status(403).json({ success: false, message: "Not allowed to edit this product" });
    }

    Object.assign(product, req.body);
    await product.save();
    logProductActivity("update", req.user, product);

    res.json({ success: true, message: "Product updated", data: product });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", protect, authorize("vendor", "admin"), async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const isOwner = product.vendor.toString() === req.user._id.toString();
    if (req.user.role !== "admin" && !isOwner) {
      return res.status(403).json({ success: false, message: "Not allowed to delete this product" });
    }

    logProductActivity("delete", req.user, product);
    await User.updateMany(
      {},
      {
        $pull: {
          wishlist: product._id,
          cart: { product: product._id },
        },
      }
    );
    await product.deleteOne();

    res.json({ success: true, message: "Product deleted" });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
