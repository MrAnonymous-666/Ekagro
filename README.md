# Ekagro - Full Edition

Login/OTP auth, tasks with date+time, 4-column Kanban, Dashboard, weekly
Habit Tracker, AI Insights, PDF reports, pie/line charts, Project
Tracking, Bills, Calendar, Time Conflict Detection, Customize panel,
Notes, soft-delete account recovery (7-day window), themes + fonts,
custom accent colors, email 2FA. One frontend (frontend/) powers web,
PWA, Android, iOS, and Desktop.

See `ARCHITECTURE.md` for a plain-language explanation of how everything
fits together and why. See `backend/tests/README.md` for how to run the
automated test suite.

## Layout

- Top-left icon = Menu: Home / Customize / Schedule (Daily+Weekly) / Progress Report (AI Insights, PDF reports, charts, Project Tracking)
- Top-right icon = Profile: name/email, theme, font, Logout, Delete Account
- Home screen: Add Task -> Today's Tasks + Habit Tracker (equal height) -> Dashboard -> Search/Filter -> Task List -> Kanban -> optional Customize widgets

## Setup

cd backend
cp .env.example .env   # fill in MONGO_URI, JWT_SECRET, EMAIL_USER/PASS, GEMINI_API_KEY
npm install
npm run dev
cd frontend
npx serve .

## Desktop

cd desktop
npm install
npm start
npm run build:win   (or build:mac / build:linux)

## Android

Set frontend/config.js API_URL to <http://10.0.2.2:5000/api> for the emulator.

cd android
npm install
npm run add
npm run sync
npm run open

## iOS

Same pattern as android/, but requires a Mac with Xcode:

cd ios
npm install
npm run add
npm run sync
npm run open

## Deploying

Deploy backend/ to Render.com (set env vars in their dashboard), then
update frontend/config.js API_URL to the live URL before rebuilding apps.
