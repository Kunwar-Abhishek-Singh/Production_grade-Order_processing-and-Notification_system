// const test = require('node:test'); //importing the test module which is used for testing the application
// const assert = require('node:assert'); //importing the assert module which is used for asserting the test cases
// const request = require('supertest'); //importing the supertest module which is used for testing the API endpoints

// const app = require('../src/app'); //importing the app module which is used for testing the API endpoints

// test('POST /orders creates an order with valid data', async () => {
//     const response = await request(app)
//         .post('/orders')
//         .send({
//             productId: 'product_123',
//             quantity:2,
//             email:'customer@example.com'

//         });

//         console.log("response.body", response.body);

//         assert.equal(response.status, 201);
//         assert.equal(response.body.status, 'Success');
//         assert.equal(response.body.data.productId, 'product_123');
//         assert.equal(response.body.data.quantity, 2);
// });

// test('POST /orders rejects invalid quantity and email', async () => {
//     const response = await request(app)
//         .post('/orders')
//         .send({
//             productId: 'product_123',
//             quantity: -2,
//             email:"invalid_email"
//         });

//         assert.equal(response.status, 400);
//         assert.equal(response.body.status, 'error');

// });

// test('POST /orders rejects missing required fields', async () => {
//     const response = await request(app)
//         .post('/orders')
//         .send({
//             productId:'product_123',
//             quantity: 2
//         });

//         assert.equal(response.status, 400);
//         assert.equal(response.body.status, 'error');
// });

// test('POST /orders rejects unknown fields', async () => {
//     const response = await request(app)
//         .post('/orders')
//         .send({
//             productId:'product_123',
//             quantity:2,
//             email:'customer@example.com',
//             isAdmin:true
//         });

//         assert.equal(response.status, 400);
//         assert.equal(response.body.status, 'error');
// });




require("dotenv").config();

const {
  test,
  before,
  after
} = require("node:test");

const assert = require("node:assert/strict");
const request = require("supertest");
const mongoose = require("mongoose");

const app = require("../src/app");

before(async () => {
  const testUri = process.env.MONGODB_TEST_URI;

  if (!testUri) {
    throw new Error("MONGODB_TEST_URI is not configured");
  }

  if (testUri === process.env.MONGODB_URI) {
    throw new Error(
      "Test database URI must differ from development database URI"
    );
  }

  await mongoose.connect(testUri);
});

after(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
});

test("POST /orders creates an order with valid data", async () => {
  const response = await request(app)
    .post("/orders")
    .send({
      productId: "product_123",
      quantity: 2,
      email: "customer@example.com"
    });

    console.log("Response status:", response.status);
console.log("Response body:", JSON.stringify(response.body, null, 2));

  assert.equal(response.status, 201);
  assert.equal(response.body.status, "Success");
  assert.equal(response.body.data.productId, "product_123");
  assert.equal(response.body.data.quantity, 2);

  const savedOrder = await mongoose.connection
    .collection("orders")
    .findOne({ productId: "product_123" });

  assert.ok(savedOrder);
});

test("POST /orders rejects invalid quantity and email", async () => {
  const response = await request(app)
    .post("/orders")
    .send({
      productId: "product_123",
      quantity: -2,
      email: "invalid-email"
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.status, "error");
});

test("POST /orders rejects missing required fields", async () => {
  const response = await request(app)
    .post("/orders")
    .send({
      productId: "product_123",
      quantity: 2
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.status, "error");
});

test("POST /orders rejects unknown fields", async () => {
  const response = await request(app)
    .post("/orders")
    .send({
      productId: "product_123",
      quantity: 2,
      email: "customer@example.com",
      isAdmin: true
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.status, "error");
});



test("GET /orders/:id retrieves an existing order", async () => {
  const createdOrder = await mongoose.connection
    .collection("orders")
    .insertOne({
      productId: "product_get_test",
      quantity: 3,
      email: "gettest@example.com",
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date()
    });

  const response = await request(app)
    .get(`/orders/${createdOrder.insertedId.toString()}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.status, "Success");
  assert.equal(response.body.data.productId, "product_get_test");
  assert.equal(response.body.data.quantity, 3);
});

test("GET /orders/:id returns 404 when the order does not exist", async () => {
  const response = await request(app)
    .get("/orders/507f1f77bcf86cd799439011");

  assert.equal(response.status, 404);
  assert.equal(response.body.status, "error");
  assert.equal(response.body.message, "Order not found");
});

