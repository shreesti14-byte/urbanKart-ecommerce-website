const express = require("express");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/signup", async (req, res, next) => {
  try {
    const { name, email, password, role = "customer", storeName = "" } = req.body;
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const allowedRole = role === "vendor" ? "vendor" : "customer";

    const exists = await User.findOne({ email: normalizedEmail });
    if (exists) {
      return res.status(400).json({ success: false, message: "Email already registered" });
    }

    const user = await User.create({
      name,
      email: normalizedEmail,
      password,
      role: allowedRole,
      storeName,
    });
    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          storeName: user.storeName,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const isValidPassword =
      (await user.comparePassword(password)) || user.matchesLegacyPassword(password);

    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    if (user.matchesLegacyPassword(password)) {
      user.password = password;
      await user.save();
    }

    const token = generateToken(user);

    res.json({
      success: true,
      message: "Login successful",
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          storeName: user.storeName,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/reset-password", async (req, res, next) => {
  try {
    const normalizedEmail = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({ success: false, message: "Account not found" });
    }

    user.password = password;
    await user.save();

    res.json({ success: true, message: "Password reset successful. Please login now." });
  } catch (error) {
    next(error);
  }
});

router.get("/me", protect, async (req, res) => {
  res.json({ success: true, data: req.user });
});

module.exports = router;
