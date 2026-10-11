// This file builds the Express app and wires up every route, but does
// NOT connect to the database or start listening on a port. That's on
// purpose: it lets the test suite import just the app and run requests
// against it in-memory, without needing a real server or a real database
// running. server.js is the file that actually starts things up for
// real usage - see server.js for that.

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

// render puts a proxy in front of the app, without this every visitor looks like
// the same IP and the login rate limit gets shared between all users
app.set("trust proxy", 1);

// Adds standard protective response headers (blocks the page from being
// framed by another site, stops browsers from mis-guessing file types,
// etc). This is a JSON API with no server-rendered HTML, so the default
// Content-Security-Policy (meant for pages with scripts/styles) is
// switched off here rather than fighting it - the frontend already
// avoids trusting user input on its own (see the escapeHtml fix), which
// is what a CSP would otherwise be a second layer of defense for.
app.use(helmet({ contentSecurityPolicy: false }));

// Redirects plain http:// to https:// in production. Skipped entirely
// in development so `npm run dev` on localhost still works over http.
app.use((req, res, next) => {
  if (process.env.NODE_ENV === "production" && req.headers["x-forwarded-proto"] !== "https") {
    return res.redirect(301, "https://" + req.headers.host + req.url);
  }
  next();
});

app.use(cors());
app.use(express.json());

// Strips out any request field that looks like a MongoDB operator
// (keys starting with "$" or containing ".") before it reaches a
// database query - stops someone from sending something like
// { "email": { "$gt": "" } } to try to trick a query into matching
// every user instead of one specific email.
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
