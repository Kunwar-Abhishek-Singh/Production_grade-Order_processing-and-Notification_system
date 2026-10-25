
const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true
    },

    type: {
      type: String,
      enum: ["order_confirmation"],
      required: true
    },

    status: {
      type: String,
      enum: ["pending", "processing", "sent", "failed"],
      default: "pending",
      required: true
    },

    attempts: {
      type: Number,
      default: 0,
      min: 0
    },

    sentAt: {
      type: Date,
      default: null
    },

    lastError: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// One notification record per order and notification type.
notificationSchema.index(
  { orderId: 1, type: 1 },
  { unique: true }
);

const Notification = mongoose.model(
  "Notification",
  notificationSchema
);

module.exports = Notification;
