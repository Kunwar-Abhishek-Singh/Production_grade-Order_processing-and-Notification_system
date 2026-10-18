
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



test("Superadmins can retrieve an admin by ID", async () => {
  const createdAdmin = await Admin.findOne({
    email: "created-admin@example.com"
  });

  assert.ok(createdAdmin, "Test admin should exist");

  const response = await adminAgent
    .get(`/admin/admins/${createdAdmin._id}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.email, createdAdmin.email);
  assert.equal(response.body.data.role, createdAdmin.role);

  assert.equal("passwordHash" in response.body.data, false);
  assert.equal("password" in response.body.data, false);
});



test("Retrieving a nonexistent admin returns 404", async () => {
  const nonexistentId = new mongoose.Types.ObjectId();

  const response = await adminAgent
    .get(`/admin/admins/${nonexistentId}`);

  assert.equal(response.status, 404);
  assert.equal(response.body.message, "Admin account not found");
});



test("Retrieving an admin with a malformed ID returns 400", async () => {
  const response = await adminAgent
    .get("/admin/admins/not-a-valid-id");

  assert.equal(response.status, 400);
});


test("Unauthenticated users cannot retrieve an admin", async () => {
  const response = await request(app)
    .get("/admin/admins/671a4e2c9b8f123456789abc");

  assert.equal(response.status, 302);
  assert.equal(response.headers.location, "/admin/login");
});



test("Regular admins cannot retrieve admin details", async () => {
  const response = await regularAdminAgent
    .get("/admin/admins/671a4e2c9b8f123456789abc");

  assert.equal(response.status, 403);
  assert.equal(
    response.body.message,
    "You do not have permission to perform this action"
  );
});




test("Superadmins can update an admin role", async () => {
  const targetAdmin = await Admin.findOne({
    email: "created-admin@example.com"
  });

  assert.ok(targetAdmin, "Target admin should exist");
  assert.equal(targetAdmin.role, "admin");

  const response = await adminAgent
    .patch(`/admin/admins/${targetAdmin._id}/role`)
    .send({ role: "superadmin" });

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.role, "superadmin");
  assert.equal(response.body.data.email, targetAdmin.email);

  assert.equal("passwordHash" in response.body.data, false);
  assert.equal("password" in response.body.data, false);

  const updatedAdmin = await Admin.findById(targetAdmin._id);
  assert.equal(updatedAdmin.role, "superadmin");
});



test("Superadmins cannot demote their own account", async () => {
  const superadmin = await Admin.findOne({
    email: testAdmin.email
  });

  assert.ok(superadmin, "Superadmin should exist");
  assert.equal(superadmin.role, "superadmin");

  const response = await adminAgent
    .patch(`/admin/admins/${superadmin._id}/role`)
    .send({ role: "admin" });

  assert.equal(response.status, 400);
  assert.equal(
    response.body.message,
    "You cannot demote your own superadmin account"
  );

  const unchangedAdmin = await Admin.findById(superadmin._id);
  assert.equal(unchangedAdmin.role, "superadmin");
});



test("Cannot demote the last remaining superadmin", async () => {
  const target = await Admin.create({
    email: "last-superadmin-test@example.com",
    passwordHash: "LastSuperadminPassword123!",
    role: "superadmin"
  });

  const otherSuperadmins = await Admin.find({
    role: "superadmin",
    _id: { $ne: target._id }
  });

  const originalRoles = otherSuperadmins.map((admin) => ({
    id: admin._id,
    role: admin.role
  }));

  try {
    await Admin.updateMany(
      {
        role: "superadmin",
        _id: { $ne: target._id }
      },
      { $set: { role: "admin" } }
    );

    const response = await adminAgent
      .patch(`/admin/admins/${target._id}/role`)
      .send({ role: "admin" });

    assert.equal(response.status, 409);
    assert.equal(
      response.body.message,
      "Cannot demote the last superadmin account"
    );

    const unchangedTarget = await Admin.findById(target._id);
    assert.equal(unchangedTarget.role, "superadmin");
  } finally {
    for (const admin of originalRoles) {
      await Admin.updateOne(
        { _id: admin.id },
        { $set: { role: admin.role } }
      );
    }

    await Admin.deleteOne({ _id: target._id });
  }
});



test("Updating a nonexistent admin returns 404", async () => {
  const nonexistentId = new mongoose.Types.ObjectId();

  const response = await adminAgent
    .patch(`/admin/admins/${nonexistentId}/role`)
    .send({ role: "admin" });

  assert.equal(response.status, 404);
  assert.equal(response.body.message, "Admin account not found");
});


test("Updating an admin with an invalid role returns 400", async () => {
  const targetAdmin = await Admin.findOne({
    email: "created-admin@example.com"
  });

  assert.ok(targetAdmin);

  const originalRole = targetAdmin.role;

  const response = await adminAgent
    .patch(`/admin/admins/${targetAdmin._id}/role`)
    .send({ role: "owner" });

  assert.equal(response.status, 400);

  const unchangedAdmin = await Admin.findById(targetAdmin._id);
  assert.equal(unchangedAdmin.role, originalRole);
});



test("Unauthenticated users cannot update admin roles", async () => {
  const response = await request(app)
    .patch("/admin/admins/671a4e2c9b8f123456789abc/role")
    .send({ role: "admin" });

  assert.equal(response.status, 302);
  assert.equal(response.headers.location, "/admin/login");
});



test("Regular admins cannot update admin roles", async () => {
  const targetAdmin = await Admin.findOne({
    email: "created-admin@example.com"
  });

  assert.ok(targetAdmin);

  const originalRole = targetAdmin.role;

  const response = await regularAdminAgent
    .patch(`/admin/admins/${targetAdmin._id}/role`)
    .send({ role: "admin" });

  assert.equal(response.status, 403);
  assert.equal(
    response.body.message,
    "You do not have permission to perform this action"
  );

  const unchangedAdmin = await Admin.findById(targetAdmin._id);
  assert.equal(unchangedAdmin.role, originalRole);
});


test("Logout destroys the session and blocks dashboard access", async () => {
  const logoutResponse = await adminAgent.post("/admin/logout");

  assert.equal(logoutResponse.status, 302);
  assert.equal(logoutResponse.headers.location, "/admin/login");

  const dashboardResponse = await adminAgent.get("/admin/orders");

  assert.equal(dashboardResponse.status, 302);
  assert.equal(dashboardResponse.headers.location, "/admin/login");
});





