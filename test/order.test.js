const test = require('node:test'); //importing the test module which is used for testing the application
const assert = require('node:assert'); //importing the assert module which is used for asserting the test cases
const request = require('supertest'); //importing the supertest module which is used for testing the API endpoints

const app = require('../src/app'); //importing the app module which is used for testing the API endpoints

test('POST /orders creates an order with valid data', async () => {
    const response = await request(app)
        .post('/orders')
        .send({
            productId: 'product_123',
            quantity:2,
            email:'customer@example.com'

        });

        assert.equal(response.status, 201);
        assert.equal(response.body.status, 'Success');
        assert.equal(response.body.data.productId, 'product_123');
        assert.equal(response.body.data.quantity, 2);
});

test('POST /orders rejects invalid quantity and email', async () => {
    const response = await request(app)
        .post('/orders')
        .send({
            productId: 'product_123',
            quantity: -2,
            email:"invalid_email"
        });

        assert.equal(response.status, 400);
        assert.equal(response.body.status, 'error');

});

test('POST /orders rejects missing required fields', async () => {
    const response = await request(app)
        .post('/orders')
        .send({
            productId:'product_123',
            quantity: 2
        });

        assert.equal(response.status, 400);
        assert.equal(response.body.status, 'error');
});

test('POST /orders rejects unknown fields', async () => {
    const response = await request(app)
        .post('/orders')
        .send({
            productId:'product_123',
            quantity:2,
            email:'customer@example.com',
            isAdmin:true
        });

        assert.equal(response.status, 400);
        assert.equal(response.body.status, 'error');
});