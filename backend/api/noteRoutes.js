const express = require("express");
const Note = require("../database/Note");
const protect = require("../authentication/authMiddleware");
const pickFields = require("../utils/pickFields");

const router = express.Router();

const EDITABLE_FIELDS = ["title", "content"];

router.use(protect);

// GET /api/notes - most recently updated first, so recently edited notes float to the top
router.get("/", async (req, res) => {
  const notes = await Note.find({ user: req.user._id }).sort({ updatedAt: -1 });
  res.json(notes);
});

router.post("/", async (req, res) => {
  try {
    const note = await Note.create({
      user: req.user._id,
      title: req.body.title || "Untitled Note",
      content: req.body.content || ""
    });
    res.status(201).json(note);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/:id", async (req, res) => {
  const note = await Note.findOne({ _id: req.params.id, user: req.user._id });
  if (!note) return res.status(404).json({ message: "Note not found" });

  Object.assign(note, pickFields(req.body, EDITABLE_FIELDS));
  const updated = await note.save();
  res.json(updated);
});

router.delete("/:id", async (req, res) => {
  const note = await Note.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!note) return res.status(404).json({ message: "Note not found" });
  res.json({ message: "Note deleted" });
});

module.exports = router;
