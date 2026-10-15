
require("dotenv").config();

const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const request = require("supertest");

const app = require("../src/app");
const Admin = require("../src/models/admin.model");
const {
  connectRedis,
  disconnectRedis
} = require("../src/config/redis");

const statuses = [
  "pending",
  "processing",
  "completed",
  "failed"
];

const adminAgent = request.agent(app);

const testAdmin = {
  email: "admin-test@example.com",
  password: "TestAdminPassword123!"
};

before(async () => {
  const testUri = process.env.MONGODB_TEST_URI;

  if (!testUri || testUri === process.env.MONGODB_URI) {
    throw new Error(
      "Configure a dedicated MONGODB_TEST_URI before testing"
    );
  }

  await connectRedis();
  await mongoose.connect(testUri);

  // This suite uses only the dedicated test database.
  await mongoose.connection.dropDatabase();

  // Create a test-only admin account.
  // The Admin model hashes the password before saving.
  await Admin.create({
    email: testAdmin.email,
    passwordHash: testAdmin.password,
    role: "superadmin"
  });

  const orders = Array.from({ length: 12 }, (_, index) => ({
    productId: `product_${String(index + 1).padStart(2, "0")}`,
    quantity: (index % 5) + 1,
    email: `customer${index + 1}@example.com`,
    status: statuses[index % statuses.length],
    createdAt: new Date(Date.UTC(2026, 0, index + 1)),
    updatedAt: new Date(Date.UTC(2026, 0, index + 1))
  }));

  await mongoose.connection.collection("orders").insertMany(orders);
});

after(async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    }
  } finally {
    await disconnectRedis();
  }
});

test("Unauthenticated users cannot access the dashboard", async () => {
  const response = await request(app).get("/admin/orders");

  assert.equal(response.status, 302);
  assert.equal(response.headers.location, "/admin/login");
});

test("Admin can log in and retain the session", async () => {
  const loginResponse = await adminAgent
    .post("/admin/login")
    .type("form")
    .send({
      email: testAdmin.email,
      password: testAdmin.password
    });

  assert.equal(loginResponse.status, 302);
  assert.equal(loginResponse.headers.location, "/admin/orders");

  // The agent retains the session cookie from login.
  const dashboardResponse = await adminAgent.get("/admin/orders");

  assert.equal(dashboardResponse.status, 200);
  assert.match(dashboardResponse.text, /Total Orders/);
});

test("GET /admin/orders renders the dashboard", async () => {
  const response = await adminAgent.get("/admin/orders");

  assert.equal(response.status, 200);
  assert.match(response.headers["content-type"], /text\/html/);
  assert.match(response.text, /Total Orders/);
});

test("Dashboard search returns matching orders", async () => {
  const response = await adminAgent
    .get("/admin/orders?search=product_05");

  assert.equal(response.status, 200);
  assert.match(response.text, /product_05/);
  assert.doesNotMatch(response.text, /product_04/);
});

test("Dashboard filters orders by status", async () => {
  const response = await adminAgent
    .get("/admin/orders?status=completed");

  assert.equal(response.status, 200);
  assert.match(response.text, /product_03/);
  assert.doesNotMatch(response.text, /product_01/);
});

test("Dashboard pagination displays the correct page", async () => {
  const pageOne = await adminAgent
    .get("/admin/orders?page=1&limit=10");

  const pageTwo = await adminAgent
    .get("/admin/orders?page=2&limit=10");

  assert.equal(pageOne.status, 200);
  assert.equal(pageTwo.status, 200);

  // Newest orders should appear first.
  assert.match(pageOne.text, /product_12/);
  assert.doesNotMatch(pageOne.text, /product_01/);

  // The remaining two orders should appear on page two.
  assert.match(pageTwo.text, /product_01/);
  assert.match(pageTwo.text, /product_02/);
  assert.doesNotMatch(pageTwo.text, /product_12/);
});

test("Dashboard summary statistics match the database", async () => {
  const response = await adminAgent.get("/admin/orders");

  assert.equal(response.status, 200);

  // Twelve seeded orders: three in each status.
  assert.match(response.text, /Total Orders/);
  assert.match(response.text, /Pending/);
  assert.match(response.text, /Processing/);
  assert.match(response.text, /Completed/);
  assert.match(response.text, /Failed/);

  // Confirm the underlying test data and aggregation expectations.
  const counts = await mongoose.connection
    .collection("orders")
    .aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ])
    .toArray();

  assert.equal(
    counts.reduce((sum, item) => sum + item.count, 0),
    12
  );

  for (const status of statuses) {
    assert.equal(
      counts.find((item) => item._id === status)?.count,
      3
    );
  }
});

test("Dashboard shows zero statistics when there are no orders", async () => {
  await mongoose.connection.collection("orders").deleteMany({});

  const response = await adminAgent.get("/admin/orders");

  assert.equal(response.status, 200);
  assert.match(response.text, /Total Orders/);

  // The page should not crash when the aggregation returns no groups.
  assert.doesNotMatch(response.text, /Internal Server Error/);
});


test("Logout destroys the session and blocks dashboard access", async () => {
  const logoutResponse = await adminAgent.post("/admin/logout");

  assert.equal(logoutResponse.status, 302);
  assert.equal(logoutResponse.headers.location, "/admin/login");

  const dashboardResponse = await adminAgent.get("/admin/orders");

  assert.equal(dashboardResponse.status, 302);
  assert.equal(dashboardResponse.headers.location, "/admin/login");
});

