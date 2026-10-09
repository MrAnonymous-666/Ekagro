// Tests the Notes feature: creating a note, listing notes, editing one,
// deleting one, and that notes are private per-user just like tasks.

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
    name: "Note Tester", email: email, password: "SuperSecret123!"
  });
  return res.body.token;
}

describe("Notes CRUD", () => {
  it("creates a note with default title when none is given", async () => {
    const token = await registerAndGetToken("notesuser@example.com");
    const res = await request(app).post("/api/notes").set("Authorization", "Bearer " + token).send({});
    expect(res.status).toBe(201);
    expect(res.body.title).toBe("Untitled Note");
  });

  it("saves typed text into a note", async () => {
    const token = await registerAndGetToken("notesuser@example.com");
    const created = await request(app).post("/api/notes").set("Authorization", "Bearer " + token).send({});

    const updateRes = await request(app).put("/api/notes/" + created.body._id).set("Authorization", "Bearer " + token)
      .send({ title: "Shopping List", content: "milk, eggs, bread" });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.content).toBe("milk, eggs, bread");
  });

  it("lists notes most-recently-edited first", async () => {
    const token = await registerAndGetToken("notesuser@example.com");
    const first = await request(app).post("/api/notes").set("Authorization", "Bearer " + token).send({ title: "First" });
    const second = await request(app).post("/api/notes").set("Authorization", "Bearer " + token).send({ title: "Second" });

    // Touch the first note again so it should now be the most recent
    await request(app).put("/api/notes/" + first.body._id).set("Authorization", "Bearer " + token)
      .send({ content: "updated" });

    const listRes = await request(app).get("/api/notes").set("Authorization", "Bearer " + token);
    expect(listRes.body[0]._id).toBe(first.body._id);
  });

  it("deletes a note", async () => {
    const token = await registerAndGetToken("notesuser@example.com");
    const created = await request(app).post("/api/notes").set("Authorization", "Bearer " + token).send({});

    await request(app).delete("/api/notes/" + created.body._id).set("Authorization", "Bearer " + token);
    const listRes = await request(app).get("/api/notes").set("Authorization", "Bearer " + token);
    expect(listRes.body.length).toBe(0);
  });

  it("keeps notes private between users", async () => {
    const tokenA = await registerAndGetToken("notesA@example.com");
    const tokenB = await registerAndGetToken("notesB@example.com");

    await request(app).post("/api/notes").set("Authorization", "Bearer " + tokenA).send({ title: "A's secret note" });

    const bListRes = await request(app).get("/api/notes").set("Authorization", "Bearer " + tokenB);
    expect(bListRes.body.length).toBe(0);
  });
});
