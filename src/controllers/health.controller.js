const getHealth = (req, res) => {
    res.status(200).json({
        status: "OK",
        message: "Server is Healthy"
    });
};

module.exports = {
    getHealth
};