# How Ekagro Is Put Together (and Why)

This is a plain-language explanation of how the pieces of this project
fit together, and the reasoning behind the bigger decisions. It's meant
to be readable by future-you (six months from now, having forgotten all
of this) or anyone else who picks up the project.

## The big picture

Ekagro has two main parts that talk to each other over the internet:

1. **The frontend** (`frontend/` folder) - everything you actually see
   and click on. It's plain HTML, CSS, and JavaScript - no React, no
   Vue, no build step. You can open `index.html` in a browser and it
   just works.
2. **The backend** (`backend/` folder) - a server that stores your data
   and handles logins. It never shows you anything directly; the
   frontend asks it for data (over what's called an API) and the
   backend replies with the answer.

The same frontend folder is reused to make the Android app, the iOS
app, and the Desktop app - each one is really just "the website, wrapped
in a container that makes it feel like a native app." That's why fixing
a bug once in `frontend/` fixes it everywhere.

## Why a separate frontend and backend at all?

Two reasons:

- **Your data needs to live somewhere safe.** If everything ran only in
  the browser, your tasks would vanish the moment you closed the tab, and
  anyone could open your browser's dev tools and see (or fake) anything.
  The backend keeps your real data in a database that only responds to
  requests carrying a valid login token.
- **One backend, many frontends.** Because the phone app, desktop app,
  and website all talk to the same backend, your tasks stay in sync
  across every device automatically - add a task on your phone, see it
  on your laptop.

## Why MongoDB (the database)?

Your data - tasks, notes, habits - doesn't have a rigid, fixed shape.
A task might have tags, or not. It might repeat, or not. MongoDB stores
things as flexible documents (basically, structured JSON) rather than
strict rows-and-columns tables, which fits this kind of "everything is
slightly different" data more naturally than a traditional SQL database
would, and it's also what most tutorials and examples use for
learning full-stack development, so there's a lot of help available if
you get stuck.

## How a login actually works, step by step

1. You type your email and password and hit "Login."
2. The frontend sends that to the backend.
3. The backend checks the password against a *hashed* (scrambled,
   one-way) version stored in the database - your real password is never
   stored anywhere, only a fingerprint of it that can't be reversed.
4. If it matches, the backend hands back a **token** - think of it as a
   temporary ID badge with an expiry date.
5. The frontend stores that token and includes it on every future
   request ("here's my badge, let me see my tasks").
6. If the badge is missing or fake, the backend refuses the request.
   This is what the `protect` function in `authentication/authMiddleware.js`
   does on every route that needs a login.

Two-factor authentication (if you turn it on) just adds a second badge
check - after your password is right, the backend also emails you a
one-time code and won't hand over the real badge until you enter it too.

## Why the frontend JavaScript is split into 7 files

It used to be one 1,700-line file. It's now organized by topic
(`app-core.js` for login, `app-tasks.js` for tasks, `app-notes.js` for
notes, etc.) so that fixing one feature means opening one small file
instead of hunting through everything. Nothing about how the app works
changed - this was purely about making the code easier to safely edit.

## Why there's a test suite (`backend/tests/`)

Tests are an automatic way of asking "did I just break something?"
every time a change is made, instead of manually clicking through the
whole app after every fix. See `backend/tests/README.md` for how to
actually run them.

## The "offline app" trick (service worker)

`frontend/service-worker.js` lets the app be installed like a real app
and work even with a spotty connection, by keeping a saved copy of the
app's files. The tradeoff: it needs a version number bumped
(`CACHE_NAME`) every time the app's files change, or it'll keep showing
the old saved copy instead of your update. This tripped us up a few
times during development - now you know why, if it ever happens again.

## Folder map

```
task-manager-full/
├── frontend/          the actual app (web, and reused by mobile/desktop)
│   ├── index.html      structure + all the styling
│   ├── app-core.js      login, register, 2FA, password reset
│   ├── app-panels-theme.js   menus, theme, font
│   ├── app-tasks.js     tasks, dashboard, habits, Kanban
│   ├── app-settings.js  customize toggles, accent colors, notifications
│   ├── app-reports.js   schedule, AI insights, PDF export, projects
│   ├── app-notes.js     the Notes feature
│   ├── app-init.js      the bit that starts everything on page load
│   └── service-worker.js   offline/installable-app support
├── backend/
│   ├── server.js        starts the real server (connects to the real database)
│   ├── app.js            the Express app itself (used directly by tests)
│   ├── api/              one file per feature's routes (auth, tasks, notes...)
│   ├── database/         the shape of each thing stored (User, Task, Note...)
│   ├── authentication/   the login-token checker used by protected routes
│   └── tests/             the automated test suite
├── android/, ios/, desktop/   thin wrappers that package frontend/ as native apps
```

## Known tradeoffs (things done deliberately, not by accident)

- **No framework (React/Vue) on the frontend.** Plain JavaScript was
  chosen to keep things simple to understand and edit without needing a
  build step. The tradeoff is that building up the page happens by
  joining pieces of HTML text together, which is more error-prone than
  a framework's safer approach - this is a reasonable choice for a
  project this size, but is the first thing worth reconsidering if the
  app grows much bigger.
- **The 2FA is email-based, not an authenticator app.** Simpler to build
  and test since it reuses the existing email system, but less secure
  than a proper authenticator app (which can't be intercepted by reading
  someone's email). Fine for a personal productivity app; would need
  upgrading for anything handling more sensitive data.
- **The app icon doesn't change with your in-app theme/accent color.**
  App icons are static image files, so it always shows the same default
  colors regardless of what theme you're using inside the app.
