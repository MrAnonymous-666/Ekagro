// Shared helper for every test file: starts a temporary, in-memory
// MongoDB just for the tests to use, so nothing ever touches your real
// database. Each test file calls setupTestDB() once at the top, and
// teardownTestDB() when it's done.
//
// The very first time you run `npm test`, this needs to download a small
// MongoDB program (one-time, needs internet access, ~70MB). After that
// first download it's cached and every future test run is fast and
// works offline.

const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

let mongod;

async function setupTestDB() {
  process.env.JWT_SECRET = process.env.JWT_SECRET || "test-only-secret-not-for-real-use";
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
}

async function teardownTestDB() {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongod) await mongod.stop();
}

async function clearAllCollections() {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}

module.exports = { setupTestDB, teardownTestDB, clearAllCollections };
