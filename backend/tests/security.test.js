// Tests that a request can't sneak in fields it shouldn't be able to
// touch - specifically, that you can't reassign a task's ownership to
// someone else by including a "user" field in an update request.

jest.mock("../database/emailService", () => ({
  sendOTPEmail: jest.fn().mockResolvedValue(true)
}));

const request = require("supertest");
const app = require("../app");
const { setupTestDB, teardownTestDB, clearAllCollections } = require("./testUtils");

beforeAll(async () => { await setupTestDB(); });
afterAll(async () => { await teardownTestDB(); });
afterEach(async () => { await clearAllCollections(); });

async function registerAndGetToken(email){
  const res = await request(app).post("/api/auth/register").send({
    name: "Security Tester", email: email, password: "SuperSecret123!"
  });
  return { token: res.body.token, userId: res.body._id };
}

describe("Mass-assignment protection", () => {
  it("does not let a task update reassign ownership to another user", async () => {
    const owner = await registerAndGetToken("owner@example.com");
    const attacker = await registerAndGetToken("attacker@example.com");

    const created = await request(app).post("/api/tasks").set("Authorization", "Bearer " + owner.token)
      .send({ text: "Original owner's task" });

    // Try to hijack the task by including a "user" field pointing at
    // the attacker's own account.
    await request(app).put("/api/tasks/" + created.body._id).set("Authorization", "Bearer " + owner.token)
      .send({ text: "Updated text", user: attacker.userId });

    // The attacker's task list should still be empty - ownership must
    // not have changed.
    const attackerList = await request(app).get("/api/tasks").set("Authorization", "Bearer " + attacker.token);
    expect(attackerList.body.length).toBe(0);

    // The legitimate text change should still have gone through.
    const ownerList = await request(app).get("/api/tasks").set("Authorization", "Bearer " + owner.token);
    expect(ownerList.body[0].text).toBe("Updated text");
  });
});
