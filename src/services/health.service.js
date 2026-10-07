const getHealthStatus = () =>{
    return {
        status: "OK",
        message: "Server is Healthy"
    };
};

module.exports = {
    getHealthStatus
};