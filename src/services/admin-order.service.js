const Order = require('../models/order.model');

const escapeRegex = (value) => {
      return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

}

const getOrders = async ({page, limit, status, search}) => {
    const filter = {};
    if(status){
        filter.status = status;
    }

    if(search){
        const searchRegex = new RegExp(escapeRegex(search), "i");

        filter.$or = [
            {productId:searchRegex},
            {email: searchRegex}
        ];
    }

    const skip = (page -1) * limit;

    const [orders, totalOrders] = await Promise.all([
        Order.find(filter)
            .sort({createdAt:-1, _id: -1})
            .skip(skip)
            .limit(limit)
            .lean(),

        Order.countDocuments(filter)
    ]);

    return{
        orders,
        pagination:{
            page,
            limit,
            totalOrders,
            totalPages: Math.ceil(totalOrders/limit)
        },
        filters: {status: status || "", search: search || ""}
        
    };
};

module.exports = {getOrders};