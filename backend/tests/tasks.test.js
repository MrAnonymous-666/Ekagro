// Tests the actual task features: adding a task, seeing it in your
// list, editing it, deleting it - and importantly, making sure one
// person can never see or touch another person's tasks.

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
    name: "Task Tester", email: email, password: "SuperSecret123!"
  });
  return res.body.token;
}

describe("Task CRUD", () => {
  it("starts with an empty task list for a new user", async () => {
    const token = await registerAndGetToken("user1@example.com");
    const res = await request(app).get("/api/tasks").set("Authorization", "Bearer " + token);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("creates a task and then sees it in the list", async () => {
    const token = await registerAndGetToken("user1@example.com");
    const createRes = await request(app).post("/api/tasks").set("Authorization", "Bearer " + token)
      .send({ text: "Finish STQA assignment", category: "Study", priority: "high" });
    expect(createRes.status).toBe(201);
    expect(createRes.body.text).toBe("Finish STQA assignment");

    const listRes = await request(app).get("/api/tasks").set("Authorization", "Bearer " + token);
    expect(listRes.body.length).toBe(1);
  });

  it("refuses to create a task with no text", async () => {
    const token = await registerAndGetToken("user1@example.com");
    const res = await request(app).post("/api/tasks").set("Authorization", "Bearer " + token)
      .send({ category: "Study" });
    expect(res.status).toBe(400);
  });

  it("updates a task", async () => {
    const token = await registerAndGetToken("user1@example.com");
    const created = await request(app).post("/api/tasks").set("Authorization", "Bearer " + token)
      .send({ text: "Original name" });

    const updateRes = await request(app).put("/api/tasks/" + created.body._id).set("Authorization", "Bearer " + token)
      .send({ completed: true });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.completed).toBe(true);
  });

  it("deletes a task", async () => {
    const token = await registerAndGetToken("user1@example.com");
    const created = await request(app).post("/api/tasks").set("Authorization", "Bearer " + token)
      .send({ text: "Delete me" });

    await request(app).delete("/api/tasks/" + created.body._id).set("Authorization", "Bearer " + token);
    const listRes = await request(app).get("/api/tasks").set("Authorization", "Bearer " + token);
    expect(listRes.body.length).toBe(0);
  });
});

describe("Task privacy between users", () => {
  it("does not show User A's tasks to User B", async () => {
    const tokenA = await registerAndGetToken("userA@example.com");
    const tokenB = await registerAndGetToken("userB@example.com");

    await request(app).post("/api/tasks").set("Authorization", "Bearer " + tokenA)
      .send({ text: "User A's private task" });

    const bListRes = await request(app).get("/api/tasks").set("Authorization", "Bearer " + tokenB);
    expect(bListRes.body.length).toBe(0);
  });
});
