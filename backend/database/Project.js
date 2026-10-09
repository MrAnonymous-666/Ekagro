const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    progress: { type: Number, default: 0, min: 0, max: 100 }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Project", projectSchema);
