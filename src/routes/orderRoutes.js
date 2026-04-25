const express = require("express");
const User = require("../models/User");
const Product = require("../models/Product");
const Order = require("../models/Order");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();
const CANCELLABLE_ORDER_STATUSES = new Set(["processing", "confirmed"]);
const ADVANCEABLE_ORDER_STATUSES = new Set(["processing", "confirmed", "shipped", "delivered"]);

const cardMask = (number = "") => {
  const digits = String(number).replace(/\D/g, "");
  return `**** **** **** ${digits.slice(-4)}`;
};

const cartSubtotal = (cart = []) =>
  cart.reduce((sum, item) => sum + (item.product?.price || 0) * item.quantity, 0);

const normalizeCartItems = (cart = []) =>
  cart.filter((item) => item.product).map((item) => ({
    product: item.product._id || item.product,
    quantity: item.quantity,
  }));

const restockOrderItems = async (order) => {
  for (const item of order.items || []) {
    const product = await Product.findById(item.product);

    if (!product) {
      continue;
    }

    product.stock += Number(item.quantity) || 0;
    await product.save();
  }
};

const cancelOrder = async (order) => {
  if (order.orderStatus === "cancelled") {
    return order;
  }

  if (!CANCELLABLE_ORDER_STATUSES.has(order.orderStatus)) {
    const error = new Error("Order ab cancel nahi ho sakta");
    error.status = 400;
    throw error;
  }

  await restockOrderItems(order);
  order.orderStatus = "cancelled";
  order.cancelledAt = new Date();
  await order.save();
  return order;
};

router.post("/authorize", protect, authorize("customer", "admin"), async (req, res, next) => {
  try {
    const { cardHolder, cardNumber, expiry, cvv } = req.body;
    const user = await User.findById(req.user._id).populate("cart.product");
    const validCartItems = user.cart.filter((item) => item.product);

    if (validCartItems.length !== user.cart.length) {
      user.cart = normalizeCartItems(validCartItems);
      await user.save();
    }

    if (!validCartItems.length) {
      return res.status(400).json({ success: false, message: "Add items to cart before authorization" });
    }

    const sanitizedNumber = String(cardNumber || "").replace(/\D/g, "");
    const sanitizedCvv = String(cvv || "").replace(/\D/g, "");
    const trimmedHolder = String(cardHolder || "").trim();
    const trimmedExpiry = String(expiry || "").trim();

    if (trimmedHolder.length < 3) {
      return res.status(400).json({ success: false, message: "Enter the card holder name" });
    }

    if (sanitizedNumber.length !== 16) {
      return res.status(400).json({ success: false, message: "Enter a valid 16-digit card number" });
    }

    if (!/^\d{2}\/\d{2}$/.test(trimmedExpiry)) {
      return res.status(400).json({ success: false, message: "Use expiry in MM/YY format" });
    }

    if (sanitizedCvv.length < 3 || sanitizedCvv.length > 4) {
      return res.status(400).json({ success: false, message: "Enter a valid CVV" });
    }

    const totalAmount = cartSubtotal(validCartItems);
    const now = new Date();
    const paymentReference = `PAY-${now.getTime().toString().slice(-8)}`;
    const authorizationCode = `AUTH${Math.floor(100000 + Math.random() * 900000)}`;

    res.json({
      success: true,
      message: "Payment authorized successfully",
      data: {
        cardHolder: trimmedHolder,
        paymentReference,
        authorizationCode,
        authorizedAt: now,
        maskedCard: cardMask(sanitizedNumber),
        amount: totalAmount,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/", protect, authorize("customer", "admin"), async (req, res, next) => {
  try {
    const { shippingAddress, paymentMethod = "Cash on Delivery", paymentAuthorization } = req.body;
    const user = await User.findById(req.user._id).populate("cart.product");
    const validCartItems = user.cart.filter((item) => item.product);

    if (validCartItems.length !== user.cart.length) {
      user.cart = normalizeCartItems(validCartItems);
      await user.save();
      await user.populate("cart.product");
    }

    if (!validCartItems.length) {
      return res.status(400).json({ success: false, message: "Your cart is empty" });
    }

    const items = [];
    let totalAmount = 0;

    for (const item of validCartItems) {
      const product = await Product.findById(item.product._id);

      if (!product || product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${item.product.name}`,
        });
      }

      product.stock -= item.quantity;
      await product.save();

      totalAmount += product.price * item.quantity;
      items.push({
        product: product._id,
        name: product.name,
        image: product.image,
        price: product.price,
        quantity: item.quantity,
        vendor: product.vendor,
        vendorName: product.vendorName,
      });
    }

    const requiresAuthorization = paymentMethod === "Card Authorization";
    const isUpiPayment = paymentMethod === "UPI Payment";
    const paymentStatus = requiresAuthorization || isUpiPayment ? "paid" : "pending";
    const now = new Date();

    if (requiresAuthorization) {
      if (
        !paymentAuthorization?.paymentReference ||
        !paymentAuthorization?.authorizationCode ||
        !paymentAuthorization?.maskedCard
      ) {
        return res.status(400).json({
          success: false,
          message: "Authorize the card payment before placing the order",
        });
      }
    }

    const order = await Order.create({
      customer: req.user._id,
      items,
      shippingAddress: shippingAddress || user.address || "Default address",
      paymentMethod,
      paymentStatus,
      paymentReference: paymentAuthorization?.paymentReference || (isUpiPayment ? `UPI-${Date.now().toString().slice(-8)}` : ""),
      authorizationCode: paymentAuthorization?.authorizationCode || "",
      authorizedAt: paymentAuthorization?.authorizedAt || (isUpiPayment ? now : undefined),
      maskedCard: paymentAuthorization?.maskedCard || "",
      totalAmount,
    });

    user.cart = [];
    await user.save();

    res.status(201).json({ success: true, message: "Order placed successfully", data: order });
  } catch (error) {
    next(error);
  }
});

router.get("/", protect, async (req, res, next) => {
  try {
    let orders;

    if (req.user.role === "admin") {
      orders = await Order.find().populate("customer", "name email").sort({ createdAt: -1 });
    } else if (req.user.role === "vendor") {
      orders = await Order.find({ "items.vendor": req.user._id })
        .populate("customer", "name email")
        .sort({ createdAt: -1 });
    } else {
      orders = await Order.find({ customer: req.user._id }).sort({ createdAt: -1 });
    }

    res.json({ success: true, data: orders });
  } catch (error) {
    next(error);
  }
});

router.put("/:id/status", protect, authorize("vendor", "admin"), async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (
      req.user.role === "vendor" &&
      !order.items.some((item) => item.vendor.toString() === req.user._id.toString())
    ) {
      return res.status(403).json({ success: false, message: "Not allowed to update this order" });
    }

    const nextStatus = req.body.orderStatus || order.orderStatus;

    if (nextStatus === "cancelled") {
      await cancelOrder(order);
      return res.json({ success: true, message: "Order cancelled", data: order });
    }

    if (!ADVANCEABLE_ORDER_STATUSES.has(nextStatus)) {
      return res.status(400).json({ success: false, message: "Invalid order status" });
    }

    if (order.orderStatus === "cancelled") {
      return res.status(400).json({ success: false, message: "Cancelled order ko update nahi kar sakte" });
    }

    order.orderStatus = nextStatus;
    await order.save();

    res.json({ success: true, message: "Order status updated", data: order });
  } catch (error) {
    next(error);
  }
});

router.put("/:id/cancel", protect, authorize("customer", "admin"), async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (req.user.role === "customer" && order.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Not allowed to cancel this order" });
    }

    await cancelOrder(order);

    res.json({ success: true, message: "Order cancelled successfully", data: order });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
