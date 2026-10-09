const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true },
    category: { type: String, default: "Personal" },
    priority: { type: String, enum: ["high", "medium", "low"], default: "medium" },
    dueDate: { type: String },
    dueTime: { type: String },
    durationMinutes: { type: Number, default: 30 },
    completed: { type: Boolean, default: false },
    // Recurrence: when a recurring task is completed, the frontend creates
    // the next occurrence automatically.
    recurring: { type: String, enum: ["none", "daily", "weekly", "monthly"], default: "none" },
    tags: { type: [String], default: [] },
    // Kanban board column - 4 stages (Testing was removed)
    status: {
      type: String,
      enum: ["icebox", "emergency", "inprogress", "testing", "complete"],
      default: "icebox"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Task", taskSchema);
