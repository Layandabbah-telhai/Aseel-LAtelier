const request = require("supertest");
const app = require("../server");

describe("Aseel L'Atelier API Tests", () => {
  test("GET /api/health should return ok true", async () => {
    const res = await request(app).get("/api/health");

    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test("GET /api/db-test should check database connection", async () => {
    const res = await request(app).get("/api/db-test");

    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(1);
  });

  test("Login without email and password should fail", async () => {
    const res = await request(app)
      .post("/api/login")
      .send({});

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Email and password are required");
  });

  test("Login with wrong credentials should fail", async () => {
    const res = await request(app)
      .post("/api/login")
      .send({
        email: "wrong@test.com",
        password: "wrongpassword"
      });

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe("Invalid email or password");
  });
});
afterAll(async () => {
  await new Promise((resolve) => setTimeout(resolve, 500));
});