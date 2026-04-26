const express = require("express");
const Product = require("../models/Product");
const Order = require("../models/Order");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();
const LOW_STOCK_THRESHOLD = 5;
const RECENT_PRODUCT_WINDOW_DAYS = 7;

router.get("/dashboard", protect, authorize("vendor"), async (req, res, next) => {
  try {
    const products = await Product.find({ vendor: req.user._id }).sort({ createdAt: -1 });
    const orders = await Order.find({ "items.vendor": req.user._id }).sort({ createdAt: -1 });
    const recentProductCutoff = new Date(Date.now() - RECENT_PRODUCT_WINDOW_DAYS * 24 * 60 * 60 * 1000);

    const totalRevenue = orders.reduce((sum, order) => {
      const vendorTotal = order.items
        .filter((item) => item.vendor.toString() === req.user._id.toString())
        .reduce(
          (itemSum, item) =>
            itemSum +
            (Number(item.lineTotal) || Number(item.discountedTaxableAmount) || Number(item.price) * Number(item.quantity || 1)),
          0
        );

      return sum + vendorTotal;
    }, 0);

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
        stats: {
          totalProducts: products.length,
          totalOrders: orders.length,
          totalRevenue,
          ...inventoryMetrics,
        },
        products,
        orders,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
