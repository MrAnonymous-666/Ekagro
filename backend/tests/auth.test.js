// Tests the core "can people actually get into their account safely"
// flow: signing up, logging in with the right password, being refused
// with the wrong password, and making sure protected routes actually
// require a valid login token.

jest.mock("../database/emailService", () => ({
  sendOTPEmail: jest.fn().mockResolvedValue(true)
}));

const request = require("supertest");
const app = require("../app");
const { setupTestDB, teardownTestDB, clearAllCollections } = require("./testUtils");

beforeAll(async () => { await setupTestDB(); });
afterAll(async () => { await teardownTestDB(); });
afterEach(async () => { await clearAllCollections(); });

const testUser = { name: "Test User", email: "testuser@example.com", password: "SuperSecret123!" };

describe("POST /api/auth/register", () => {
  it("creates a new account and returns a login token", async () => {
    const res = await request(app).post("/api/auth/register").send(testUser);
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.email).toBe(testUser.email);
  });

  it("does not reveal that an email is already registered (privacy protection)", async () => {
    await request(app).post("/api/auth/register").send(testUser);
    const res = await request(app).post("/api/auth/register").send(testUser);
    // Same generic message either way - this is intentional, so an
    // attacker can't use this endpoint to discover who has an account.
    expect(res.body.message).toBe("If an account exists, further instructions will be sent.");
  });
});

describe("POST /api/auth/login", () => {
  beforeEach(async () => {
    await request(app).post("/api/auth/register").send(testUser);
  });

  it("logs in successfully with the correct password", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: testUser.email, password: testUser.password
    });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it("refuses login with the wrong password", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: testUser.email, password: "wrong-password"
    });
    expect(res.status).toBe(401);
    expect(res.body.token).toBeUndefined();
  });

  it("refuses login for an email that was never registered", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "nobody@example.com", password: "whatever123"
    });
    expect(res.status).toBe(401);
  });
});

describe("Route protection", () => {
  it("blocks access to tasks with no login token", async () => {
    const res = await request(app).get("/api/tasks");
    expect(res.status).toBe(401);
  });

  it("blocks access to tasks with a garbage/fake token", async () => {
    const res = await request(app).get("/api/tasks").set("Authorization", "Bearer not-a-real-token");
    expect(res.status).toBe(401);
  });

  it("allows access to tasks with a real login token", async () => {
    const registerRes = await request(app).post("/api/auth/register").send(testUser);
    const res = await request(app).get("/api/tasks").set("Authorization", "Bearer " + registerRes.body.token);
    expect(res.status).toBe(200);
  });
});
