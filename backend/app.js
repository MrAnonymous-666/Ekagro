const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const authRoutes = require("./api/authRoutes");
const taskRoutes = require("./api/taskRoutes");
const aiRoutes = require("./api/aiRoutes");
const habitRoutes = require("./api/habitRoutes");
const billRoutes = require("./api/billRoutes");
const projectRoutes = require("./api/projectRoutes");
const noteRoutes = require("./api/noteRoutes");

const app = express();

// render sits behind a proxy, without this every user looks like the same IP
// and the login rate limit would be shared between everyone
app.set("trust proxy", 1);

app.use(helmet({ contentSecurityPolicy: false }));

// send http traffic to https in production only (localhost still works)
app.use((req, res, next) => {
  if (process.env.NODE_ENV === "production" && req.headers["x-forwarded-proto"] !== "https") {
    return res.redirect(301, "https://" + req.headers.host + req.url);
  }
  next();
});

app.use(cors());
app.use(express.json());
app.use(mongoSanitize());

app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/habits", habitRoutes);
app.use("/api/bills", billRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/notes", noteRoutes);

app.get("/", (req, res) => {
  res.send("Ekagro API is running");
});

module.exports = app;