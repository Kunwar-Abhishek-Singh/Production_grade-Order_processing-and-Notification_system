require("dotenv").config();

const mongoose = require("mongoose");
const config = require("../src/config/env");
const Order = require("../src/models/order.model");

const seedOrders = async () => {
  try {
    await mongoose.connect(config.config.database.mongodbUri);

    const statuses = [
      "pending",
      "processing",
      "completed",
      "failed"
    ];

    const orders = Array.from({ length: 25 }, (_, index) => ({
      productId: `product_${index + 1}`,
      quantity: (index % 5) + 1,
      email: `customer${index + 1}@example.com`,
      status: statuses[index % statuses.length]
    }));

    const result = await Order.insertMany(orders);

    console.log(`Inserted ${result.length} sample orders.`);
  } catch (error) {
    console.error("Failed to seed orders:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

seedOrders();