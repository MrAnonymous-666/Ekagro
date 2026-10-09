const express = require("express");
const Habit = require("../database/Habit");
const protect = require("../authentication/authMiddleware");

const router = express.Router();

router.use(protect);

router.get("/", async (req, res) => {
  const habits = await Habit.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json(habits);
});

router.post("/", async (req, res) => {
  try {
    const { name, icon } = req.body;
    if (!name) return res.status(400).json({ message: "Habit name is required" });

    const habit = await Habit.create({ user: req.user._id, name, icon: icon || "🔥" });
    res.status(201).json(habit);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/:id/toggle-today", async (req, res) => {
  const habit = await Habit.findOne({ _id: req.params.id, user: req.user._id });
  if (!habit) return res.status(404).json({ message: "Habit not found" });

  const today = new Date().toISOString().split("T")[0];
  const alreadyDone = habit.completions.includes(today);

  if (alreadyDone) {
    habit.completions = habit.completions.filter((d) => d !== today);
  } else {
    habit.completions.push(today);
  }

  await habit.save();
  res.json(habit);
});

// PUT /api/habits/:id/toggle-date - toggle completion for ANY specific date,
// used by the weekly Mon-Sun tick grid on the home screen.
router.put("/:id/toggle-date", async (req, res) => {
  const habit = await Habit.findOne({ _id: req.params.id, user: req.user._id });
  if (!habit) return res.status(404).json({ message: "Habit not found" });

  const { date } = req.body;
  if (!date) return res.status(400).json({ message: "date is required" });

  const alreadyDone = habit.completions.includes(date);
  if (alreadyDone) {
    habit.completions = habit.completions.filter((d) => d !== date);
  } else {
    habit.completions.push(date);
  }

  await habit.save();
  res.json(habit);
});

router.delete("/:id", async (req, res) => {
  const habit = await Habit.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!habit) return res.status(404).json({ message: "Habit not found" });
  res.json({ message: "Habit deleted" });
});

module.exports = router;
