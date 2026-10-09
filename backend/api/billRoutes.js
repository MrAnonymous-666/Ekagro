const express = require("express");
const Bill = require("../database/Bill");
const protect = require("../authentication/authMiddleware");
const pickFields = require("../utils/pickFields");

const router = express.Router();

const EDITABLE_FIELDS = ["name", "amount", "dueDate", "recurring", "paid"];

router.use(protect);

router.get("/", async (req, res) => {
  const bills = await Bill.find({ user: req.user._id }).sort({ dueDate: 1 });
  res.json(bills);
});

router.post("/", async (req, res) => {
  try {
    const { name, amount, dueDate, recurring } = req.body;
    if (!name || !dueDate) return res.status(400).json({ message: "Bill name and due date are required" });

    const bill = await Bill.create({
      user: req.user._id,
      name,
      amount: amount || 0,
      dueDate,
      recurring: recurring || "none"
    });
    res.status(201).json(bill);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/:id", async (req, res) => {
  const bill = await Bill.findOne({ _id: req.params.id, user: req.user._id });
  if (!bill) return res.status(404).json({ message: "Bill not found" });

  Object.assign(bill, pickFields(req.body, EDITABLE_FIELDS));
  const updated = await bill.save();
  res.json(updated);
});

router.delete("/:id", async (req, res) => {
  const bill = await Bill.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!bill) return res.status(404).json({ message: "Bill not found" });
  res.json({ message: "Bill deleted" });
});

module.exports = router;
