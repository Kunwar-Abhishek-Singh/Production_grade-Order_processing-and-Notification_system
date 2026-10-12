const mongoose = require('mongoose'); //importing mongoose to connect to the database

const orderSchema = new mongoose.Schema({
    productId:{
        type: String,
        required: true,
        trim: true
    },

    quantity:{
        type: Number,
        required: true,
        min: [1, "Quantity must be at least 1"],
        validate:{
            validator: Number.isInteger,
            message: "Quantity must be an integer"
        }
    },

    email:{
        type: String,
        required: [true, "Email is required"],
        trim: true,
        lowercase: tru
    },

    status:{
        type: String,
        enum: ["pending", "processing", "completed", "failed"],
        default: "pending"
    }
},
{
    timestamps: true,
    versionKey: false
}
);

const Order = mongoose.model('Order', orderSchema); //creating a model named 'Order' using the orderSchema

module.exports = Order; //exporting the Order model to be used in other files