// The simplest test there is: does the server even respond? No database
// needed for this one - if this test fails, something is very wrong
// with the basic setup (a typo in a route file, a missing package, etc).

const request = require("supertest");
const app = require("../app");

describe("Health check", () => {
  it("responds on the root route", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.text).toContain("Ekagro");
  });
});
