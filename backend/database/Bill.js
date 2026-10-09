const mongoose = require("mongoose");

const billSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    amount: { type: Number, default: 0 },
    dueDate: { type: String, required: true },
    recurring: { type: String, enum: ["none", "weekly", "monthly"], default: "none" },
    paid: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Bill", billSchema);
