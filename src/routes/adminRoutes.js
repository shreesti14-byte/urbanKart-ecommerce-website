const express = require("express");
const User = require("../models/User");
const Product = require("../models/Product");
const Order = require("../models/Order");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();
const LOW_STOCK_THRESHOLD = 5;
const RECENT_PRODUCT_WINDOW_DAYS = 7;

router.use(protect, authorize("admin"));

router.get("/dashboard", async (req, res, next) => {
  try {
    const [userCount, vendorCount, productCount, orders, users, products] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "vendor" }),
      Product.countDocuments(),
      Order.find().populate("customer", "name email").sort({ createdAt: -1 }),
      User.find().select("-password").sort({ createdAt: -1 }),
      Product.find()
        .populate("vendor", "name email storeName")
        .sort({ createdAt: -1 }),
    ]);

    const recentProductCutoff = new Date(Date.now() - RECENT_PRODUCT_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const inventoryMetrics = products.reduce(
      (summary, product) => {
        if (product.stock <= 0) {
          summary.outOfStockProducts += 1;
        } else {
          summary.liveProducts += 1;
        }

        if (product.stock > 0 && product.stock < LOW_STOCK_THRESHOLD) {
          summary.lowStockProducts += 1;
        }

        if (product.createdAt >= recentProductCutoff) {
          summary.newProductsThisWeek += 1;
        }

        return summary;
      },
      {
        liveProducts: 0,
        outOfStockProducts: 0,
        lowStockProducts: 0,
        newProductsThisWeek: 0,
      }
    );

    res.json({
      success: true,
      data: {
        metrics: {
          totalUsers: userCount,
          totalVendors: vendorCount,
          totalProducts: productCount,
          totalOrders: orders.length,
          ...inventoryMetrics,
        },
        users,
        products,
        orders,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.put("/users/:id/role", async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    user.role = req.body.role || user.role;
    await user.save();

    res.json({ success: true, message: "User role updated", data: user });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
