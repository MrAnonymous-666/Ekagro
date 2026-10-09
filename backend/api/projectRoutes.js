const express = require("express");
const Project = require("../database/Project");
const protect = require("../authentication/authMiddleware");
const pickFields = require("../utils/pickFields");

const router = express.Router();

const EDITABLE_FIELDS = ["name", "progress"];

router.use(protect);

router.get("/", async (req, res) => {
  const projects = await Project.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json(projects);
});

router.post("/", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: "Project name is required" });
    const project = await Project.create({ user: req.user._id, name, progress: 0 });
    res.status(201).json(project);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/:id", async (req, res) => {
  const project = await Project.findOne({ _id: req.params.id, user: req.user._id });
  if (!project) return res.status(404).json({ message: "Project not found" });
  Object.assign(project, pickFields(req.body, EDITABLE_FIELDS));
  const updated = await project.save();
  res.json(updated);
});

router.delete("/:id", async (req, res) => {
  const project = await Project.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!project) return res.status(404).json({ message: "Project not found" });
  res.json({ message: "Project deleted" });
});

module.exports = router;
