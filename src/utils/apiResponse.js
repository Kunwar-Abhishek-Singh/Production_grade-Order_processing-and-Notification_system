const sendSuccess = (res, {statusCode = 200, message, data}) => {
    return res.status(statusCode).json({
        status: "Success",
        message,
        data
    });

};

module.exports = {
    sendSuccess
};