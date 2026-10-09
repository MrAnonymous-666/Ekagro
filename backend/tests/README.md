# Running the tests

This checks that the important stuff still works after any change:
signing up, logging in, wrong passwords being rejected, tasks and notes
being created/edited/deleted correctly, and people never being able to
see someone else's tasks or notes.

## How to run it

```
cd backend
npm install
npm test
```

That's it. You'll see a list of checks with a green checkmark next to
each one that passes.

## The first time you run it

The first run needs to download a small MongoDB program (about 70MB) so
the tests have a real, temporary database to work with - this database
only exists while the tests are running and is thrown away right after,
so it never touches your real data. This download needs internet access
and happens automatically. Every run after the first is fast and doesn't
need to download anything again.

## What's actually being tested

- `health.test.js` - the server responds at all
- `auth.test.js` - signup works, wrong passwords are rejected, protected
  pages can't be reached without logging in
- `tasks.test.js` - adding/editing/deleting tasks works, and one
  person's tasks are never visible to another person
- `notes.test.js` - same idea, for the Notes feature

## If a test fails after you change something

That's the whole point of having them - it means your change broke
something that used to work. The test output tells you exactly which
check failed and what it expected vs. what actually happened, so you
know exactly where to look.
