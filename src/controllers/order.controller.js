const createOrder = (req, res) => {
    const orderData = req.validated.body();
    res.status(201).json({
        status: "Success",
        message: "Request validation passed",
        data: orderData
    });
};

module.exports = {createOrder};