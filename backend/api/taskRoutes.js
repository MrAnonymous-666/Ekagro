const express = require("express");
const Task = require("../database/Task");
const protect = require("../authentication/authMiddleware");
const pickFields = require("../utils/pickFields");

const router = express.Router();

const EDITABLE_FIELDS = ["text", "category", "priority", "dueDate", "dueTime", "durationMinutes", "completed", "status", "recurring", "tags"];

router.use(protect);

router.get("/", async (req, res) => {
  const tasks = await Task.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json(tasks);
});

router.post("/", async (req, res) => {
  try {
    const { text, category, priority, dueDate, dueTime, status, recurring, tags } = req.body;
    if (!text) return res.status(400).json({ message: "Task text is required" });

    const task = await Task.create({
      user: req.user._id,
      text,
      category,
      priority,
      dueDate,
      dueTime,
      status: status || "icebox",
      recurring: recurring || "none",
      tags: Array.isArray(tags) ? tags : []
    });

    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/:id", async (req, res) => {
  const task = await Task.findOne({ _id: req.params.id, user: req.user._id });
  if (!task) return res.status(404).json({ message: "Task not found" });

  Object.assign(task, pickFields(req.body, EDITABLE_FIELDS));
  const updated = await task.save();
  res.json(updated);
});

router.delete("/:id", async (req, res) => {
  const task = await Task.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!task) return res.status(404).json({ message: "Task not found" });
  res.json({ message: "Task deleted" });
});

module.exports = router;
