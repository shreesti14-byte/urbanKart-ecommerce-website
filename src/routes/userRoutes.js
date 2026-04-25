const express = require("express");
const User = require("../models/User");
const Product = require("../models/Product");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/profile", protect, async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate("wishlist")
    .populate("cart.product");

  const profile = user.toObject();
  profile.wishlist = (profile.wishlist || []).filter(Boolean);
  profile.cart = (profile.cart || []).filter((item) => item.product);

  res.json({ success: true, data: profile });
});

router.put("/profile", protect, async (req, res, next) => {
  try {
    const { name, phone, address, storeName } = req.body;
    const user = await User.findById(req.user._id);

    user.name = name || user.name;
    user.phone = phone || user.phone;
    user.address = address || user.address;
    if (user.role === "vendor") {
      user.storeName = storeName || user.storeName;
    }

    await user.save();
    res.json({ success: true, message: "Profile updated", data: user });
  } catch (error) {
    next(error);
  }
});

router.post("/wishlist/:productId", protect, authorize("customer"), async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const productId = req.params.productId;
    const exists = user.wishlist.some((id) => id.toString() === productId);

    user.wishlist = exists
      ? user.wishlist.filter((id) => id.toString() !== productId)
      : [...user.wishlist, productId];

    await user.save();
    await user.populate("wishlist");

    res.json({
      success: true,
      message: exists ? "Removed from wishlist" : "Added to wishlist",
      data: user.wishlist,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/cart", protect, authorize("customer"), async (req, res, next) => {
  try {
    const { productId, quantity = 1 } = req.body;
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    if (product.stock <= 0) {
      return res.status(400).json({ success: false, message: `${product.name} is currently out of stock` });
    }

    const user = await User.findById(req.user._id);
    const cartItem = user.cart.find((item) => item.product.toString() === productId);
    const requestedQuantity = Math.max(1, Number(quantity) || 1);
    const nextQuantity = cartItem ? cartItem.quantity + requestedQuantity : requestedQuantity;

    if (nextQuantity > product.stock) {
      return res.status(400).json({
        success: false,
        message: `Only ${product.stock} unit(s) available for ${product.name}`,
      });
    }

    if (cartItem) {
      cartItem.quantity = nextQuantity;
    } else {
      user.cart.push({ product: productId, quantity: requestedQuantity });
    }

    await user.save();
    await user.populate("cart.product");

    res.json({ success: true, message: "Cart updated", data: user.cart });
  } catch (error) {
    next(error);
  }
});

router.put("/cart/:productId", protect, authorize("customer"), async (req, res, next) => {
  try {
    const { quantity } = req.body;
    const user = await User.findById(req.user._id);
    const item = user.cart.find((cartItem) => cartItem.product.toString() === req.params.productId);
    const product = await Product.findById(req.params.productId);

    if (!item) {
      return res.status(404).json({ success: false, message: "Cart item not found" });
    }

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    if (product.stock <= 0) {
      return res.status(400).json({ success: false, message: `${product.name} is currently out of stock` });
    }

    const nextQuantity = Math.max(1, Number(quantity) || 1);
    if (nextQuantity > product.stock) {
      return res.status(400).json({
        success: false,
        message: `Only ${product.stock} unit(s) available for ${product.name}`,
      });
    }

    item.quantity = nextQuantity;
    await user.save();
    await user.populate("cart.product");

    res.json({ success: true, message: "Quantity updated", data: user.cart });
  } catch (error) {
    next(error);
  }
});

router.delete("/cart/:productId", protect, authorize("customer"), async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    user.cart = user.cart.filter((item) => item.product.toString() !== req.params.productId);
    await user.save();
    await user.populate("cart.product");

    res.json({ success: true, message: "Item removed from cart", data: user.cart });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
