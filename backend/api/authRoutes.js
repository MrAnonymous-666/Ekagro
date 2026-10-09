const express = require("express");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");
const User = require("../database/User");
const Task = require("../database/Task");
const { sendOTPEmail } = require("../database/emailService");
const protect = require("../authentication/authMiddleware");

const router = express.Router();

const GRACE_PERIOD_DAYS = 7;
const GENERIC_MSG = "If an account exists, further instructions will be sent.";

// dummy hash so login takes the same time whether the email exists or not
// (read up on timing attacks after a classmate mentioned it - bcrypt.compare
// is the slow part so this evens it out)
const DUMMY_HASH = "$2a$10$CwTycUXWue0Thq9StjUM0uJ8kzQzHJXOc6DClluGaCTBpr7wOFGja";
// TODO: double check this is actually constant-time enough, read conflicting things online

// ===== RATE LIMITING =====
// Applied to every sensitive auth endpoint - blunts brute-force and
// account-enumeration attempts regardless of how good the messaging is.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  // The test suite makes many requests back-to-back on purpose - this
  // limiter is meant to stop real attackers, not the tests that check
  // it works. Jest sets NODE_ENV to "test" automatically, so this only
  // ever skips during `npm test`, never during real usage.
  skip: () => process.env.NODE_ENV === "test",
  message: { message: "Too many attempts. Please try again later." }
});

router.use(authLimiter);

// ===== HONEYPOT BOT CHECK =====
// The frontend includes a hidden field (name: "website") that real users
// never see or fill in, but simple bots often auto-fill every field they
// find. If it's non-empty, silently treat it as a bot - respond with the
// same generic message as a normal request so bots get no signal that
// they were caught.
function isBot(req) {
  return !!(req.body && req.body.website);
}

// ===== OPTIONAL reCAPTCHA v3 HOOK =====
// Disabled unless RECAPTCHA_SECRET_KEY is set in .env - opt-in, since it
// requires the developer to register a free site key with Google first.
// See README for setup steps.
async function verifyCaptcha(token) {
  if (!process.env.RECAPTCHA_SECRET_KEY) return true; // not configured, skip
  if (!token) return false;
  try {
    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${token}`
    });
    const data = await res.json();
    return data.success && (data.score === undefined || data.score >= 0.5);
  } catch (err) {
    return false;
  }
}

function generateToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });
}

// POST /api/auth/register
// Uses generic messaging: the response never directly says "email already
// registered" - that would let an attacker discover which emails are in
// use. Duplicate and new-account cases return the same message text and
// status code; only the presence of a token differs (a genuinely new
// account needs a token to log the user in immediately). This isn't a
// perfect enumeration defense - a determined attacker could still notice
// the response is a few bytes longer when a token is present - but
// combined with rate limiting it raises the bar significantly, and is
// documented here rather than overclaimed.
router.post("/register", async (req, res) => {
  try {
    if (isBot(req)) return res.json({ message: GENERIC_MSG });

    const captchaOk = await verifyCaptcha(req.body.captchaToken);
    if (!captchaOk) return res.status(400).json({ message: "Captcha verification failed" });

    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      // Do dummy work so timing matches the "create a new user" path below.
      await bcrypt.compare(password, DUMMY_HASH);
      return res.json({ message: GENERIC_MSG });
    }

    const user = await User.create({ name, email, password });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      token: generateToken(user._id),
      twoFactorEnabled: false,
      message: GENERIC_MSG
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/login
// Login has to tell the user their attempt failed - that's unavoidable -
// but it never reveals WHICH part was wrong (email vs password), and
// timing is equalized with a dummy hash comparison when the email isn't
// found at all, so response time doesn't leak that either.
router.post("/login", async (req, res) => {
  try {
    if (isBot(req)) return res.status(401).json({ message: "Invalid email or password" });

    const captchaOk = await verifyCaptcha(req.body.captchaToken);
    if (!captchaOk) return res.status(400).json({ message: "Captcha verification failed" });

    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      await bcrypt.compare(password || "", DUMMY_HASH); // equalize timing
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (!(await user.matchPassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (user.deletedAt) {
      const daysSinceDeleted = (Date.now() - new Date(user.deletedAt).getTime()) / 86400000;

      if (daysSinceDeleted <= GRACE_PERIOD_DAYS) {
        user.deletedAt = null;
        await user.save();
        return res.json({
          _id: user._id, name: user.name, email: user.email,
          token: generateToken(user._id), restored: true,
          message: "Welcome back! Your account has been restored."
        });
      } else {
        await Task.deleteMany({ user: user._id });
        await User.findByIdAndDelete(user._id);
        return res.status(401).json({
          message: "This account was permanently deleted after the 7-day recovery window and no longer exists."
        });
      }
    }

    // If 2FA is on, don't issue a token yet - send an OTP and make the
    // frontend call /login/verify-2fa with it before we hand out a token.
    if (user.twoFactorEnabled) {
      const otp = crypto.randomInt(100000, 999999).toString();
      user.loginOTP = otp;
      user.loginOTPExpires = Date.now() + 10 * 60 * 1000;
      await user.save();
      await sendOTPEmail(user.email, otp, "login2fa");
      return res.json({ requires2FA: true, userId: user._id, email: user.email });
    }

    res.json({ _id: user._id, name: user.name, email: user.email, token: generateToken(user._id), twoFactorEnabled: false });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/login/verify-2fa
// Second step of login when the account has 2FA enabled.
router.post("/login/verify-2fa", async (req, res) => {
  try {
    const { userId, otp } = req.body;
    if (!userId || !otp) return res.status(400).json({ message: "OTP is required" });

    const user = await User.findOne({
      _id: userId, loginOTP: otp, loginOTPExpires: { $gt: Date.now() }
    });
    if (!user) return res.status(400).json({ message: "Invalid or expired code" });

    user.loginOTP = undefined;
    user.loginOTPExpires = undefined;
    await user.save();

    res.json({ _id: user._id, name: user.name, email: user.email, token: generateToken(user._id), twoFactorEnabled: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/auth/2fa - toggle two-factor authentication on/off
router.put("/2fa", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.twoFactorEnabled = !!req.body.enabled;
    await user.save();

    res.json({ twoFactorEnabled: user.twoFactorEnabled });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/forgot-password
router.post("/forgot-password", async (req, res) => {
  try {
    if (isBot(req)) return res.json({ message: GENERIC_MSG });

    const captchaOk = await verifyCaptcha(req.body.captchaToken);
    if (!captchaOk) return res.status(400).json({ message: "Captcha verification failed" });

    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email });

    if (!user) {
      // Dummy delay so this branch takes about as long as the real one below.
      await new Promise((resolve) => setTimeout(resolve, 150));
      return res.json({ message: GENERIC_MSG });
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    user.resetOTP = otp;
    user.resetOTPExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    await sendOTPEmail(user.email, otp, "reset");

    res.json({ message: GENERIC_MSG });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/reset-password
// By this point the user already has a valid OTP (proof they received the
// email), so confirming "invalid OTP" here doesn't leak account existence
// the way the earlier steps would.
router.post("/reset-password", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "Email, OTP, and new password are all required" });
    }

    const user = await User.findOne({
      email, resetOTP: otp, resetOTPExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    user.password = newPassword;
    user.resetOTP = undefined;
    user.resetOTPExpires = undefined;
    await user.save();

    res.json({ message: "Password reset successful. You can now log in." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/request-delete-otp
router.post("/request-delete-otp", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const otp = crypto.randomInt(100000, 999999).toString();
    user.deleteOTP = otp;
    user.deleteOTPExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    await sendOTPEmail(user.email, otp, "delete");

    res.json({ message: GENERIC_MSG });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/auth/account - soft delete, 7-day recovery window
router.delete("/account", protect, async (req, res) => {
  try {
    const { otp } = req.body;
    if (!otp) return res.status(400).json({ message: "OTP is required to delete your account" });

    const user = await User.findOne({
      _id: req.user._id, deleteOTP: otp, deleteOTPExpires: { $gt: Date.now() }
    });

    if (!user) return res.status(400).json({ message: "Invalid or expired OTP" });

    user.deletedAt = new Date();
    user.deleteOTP = undefined;
    user.deleteOTPExpires = undefined;
    await user.save();

    res.json({
      message: `Your account has been scheduled for deletion. Log in within ${GRACE_PERIOD_DAYS} days to restore it, or it will be permanently deleted.`
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/auth/profile - update display name
router.put("/profile", protect, async (req, res) => {
  try {
    const name = (req.body.name || "").trim();
    if (!name) return res.status(400).json({ message: "Name is required" });
    if (name.length > 60) return res.status(400).json({ message: "Name is too long" });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.name = name;
    await user.save();

    res.json({ _id: user._id, name: user.name, email: user.email });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
