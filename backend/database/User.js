const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    resetOTP: { type: String },
    resetOTPExpires: { type: Date },
    deleteOTP: { type: String },
    deleteOTPExpires: { type: Date },
    // Email-based two-factor authentication
    twoFactorEnabled: { type: Boolean, default: false },
    loginOTP: { type: String },
    loginOTPExpires: { type: Date },
    // When set, the account is in a 7-day recovery window before it is
    // permanently purged. Logging in during this window restores it.
    deletedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
