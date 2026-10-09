const express = require("express");
const Task = require("../database/Task");
const protect = require("../authentication/authMiddleware");

const router = express.Router();

router.use(protect);

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

function summarizeTasksForAI(taskList) {
  if (!taskList.length) return "(no tasks yet)";
  return taskList
    .map(
      (t) =>
        `- [${t.completed ? "done" : "pending"}] ${t.text} (category: ${t.category}, priority: ${t.priority}, due: ${t.dueDate || "none"})`
    )
    .join("\n");
}

router.post("/insights", async (req, res) => {
  try {
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ message: "Server is missing GEMINI_API_KEY - set it in backend/.env" });
    }

    const { period } = req.body;
    const periodLabel = { week: "past week", month: "past month", year: "past year" }[period] || "recent period";

    const tasks = await Task.find({ user: req.user._id });
    const today = new Date().toISOString().split("T")[0];

    const prompt = `
Today's date is ${today}. Here is the user's full task list:
${summarizeTasksForAI(tasks)}

Write a short, friendly productivity summary focused on the ${periodLabel}.
Mention: how many tasks are completed vs pending, which category the user
is focusing on most, any overdue tasks (due date before today and not
completed), and end with one encouraging, specific tip.
Keep it to 4-6 sentences. Plain text only, no markdown, no headers.
`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const geminiRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return res.status(502).json({ message: `AI provider error: ${errText.slice(0, 300)}` });
    }

    const data = await geminiRes.json();
    const summary =
      data.candidates && data.candidates[0] && data.candidates[0].content
        ? data.candidates[0].content.parts[0].text
        : null;

    if (!summary) {
      return res.status(502).json({ message: "AI returned an empty response" });
    }

    res.json({ summary });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
