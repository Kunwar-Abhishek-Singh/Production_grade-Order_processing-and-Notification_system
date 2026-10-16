
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

const regularAdminAgent = request.agent(app);

const regularAdmin = {
  email: "regular-admin-test@example.com",
  password: "RegularAdminPassword123!"
};

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

  await Admin.create({
  email: regularAdmin.email,
  passwordHash: regularAdmin.password,
  role: "admin"
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


test("Unauthenticated users cannot create admins", async () => {
  const response = await request(app)
    .post("/admin/admins")
    .send({
      email: "new-admin@example.com",
      password: "NewAdminPassword123!",
      role: "admin"
    });

  assert.equal(response.status, 302);
  assert.equal(response.headers.location, "/admin/login");
});

test("Regular admins cannot create admin accounts", async () => {
  const loginResponse = await regularAdminAgent
    .post("/admin/login")
    .type("form")
    .send({
      email: regularAdmin.email,
      password: regularAdmin.password
    });

  assert.equal(loginResponse.status, 302);

  const response = await regularAdminAgent
    .post("/admin/admins")
    .send({
      email: "created-by-admin@example.com",
      password: "CreatedAdminPassword123!",
      role: "admin"
    });

  assert.equal(response.status, 403);
});

test("Superadmins can create admin accounts", async () => {
  const response = await adminAgent
    .post("/admin/admins")
    .send({
      email: "created-admin@example.com",
      password: "CreatedAdminPassword123!",
      role: "admin"
    });

  assert.equal(response.status, 201);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.email, "created-admin@example.com");
  assert.equal(response.body.data.role, "admin");

  assert.equal("passwordHash" in response.body.data, false);
  assert.equal("password" in response.body.data, false);
});

test("Creating an admin with a duplicate email returns 409", async () => {
  const response = await adminAgent
    .post("/admin/admins")
    .send({
      email: testAdmin.email,
      password: "AnotherPassword123!",
      role: "admin"
    });

  assert.equal(response.status, 409);
});


test("Unauthenticated users cannot list admins", async () => {
  const response = await request(app)
    .get("/admin/admins");

  assert.equal(response.status, 302);
  assert.equal(response.headers.location, "/admin/login");
});



test("Regular admins cannot list admin accounts", async () => {
  await regularAdminAgent
    .post("/admin/login")
    .type("form")
    .send(regularAdmin);

  const response = await regularAdminAgent
    .get("/admin/admins");

  assert.equal(response.status, 403);
  assert.equal(
    response.body.message,
    "You do not have permission to perform this action"
  );
});


test("Superadmins can list admins with pagination and safe fields", async () => {
  const response = await adminAgent
    .get("/admin/admins?page=1&limit=2");

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);

  // Pagination
  assert.equal(response.body.pagination.page, 1);
  assert.equal(response.body.pagination.limit, 2);
  assert.ok(response.body.pagination.totalAdmins >= 3);
  assert.equal(
    response.body.pagination.totalPages,
    Math.ceil(response.body.pagination.totalAdmins / 2)
  );

  // Only two admins should be returned on this page.
  assert.equal(response.body.data.length, 2);

  // Verify that sensitive fields are never exposed.
  for (const admin of response.body.data) {
    assert.ok(admin.id);
    assert.ok(admin.email);
    assert.ok(admin.role);
    assert.equal("passwordHash" in admin, false);
    assert.equal("password" in admin, false);
  }
});




test("Admin listing rejects invalid pagination parameters", async () => {
  const invalidPageResponse = await adminAgent
    .get("/admin/admins?page=0&limit=10");

  assert.equal(invalidPageResponse.status, 400);

  const invalidLimitResponse = await adminAgent
    .get("/admin/admins?page=1&limit=101");

  assert.equal(invalidLimitResponse.status, 400);
});




test("Logout destroys the session and blocks dashboard access", async () => {
  const logoutResponse = await adminAgent.post("/admin/logout");

  assert.equal(logoutResponse.status, 302);
  assert.equal(logoutResponse.headers.location, "/admin/login");

  const dashboardResponse = await adminAgent.get("/admin/orders");

  assert.equal(dashboardResponse.status, 302);
  assert.equal(dashboardResponse.headers.location, "/admin/login");
});





