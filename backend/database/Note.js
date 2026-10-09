const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, default: "Untitled Note" },
    content: { type: String, default: "" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Note", noteSchema);
