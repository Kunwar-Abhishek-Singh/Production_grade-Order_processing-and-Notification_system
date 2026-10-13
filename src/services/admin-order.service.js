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


const getOrderStats = async () => {
  const results = await Order.aggregate([
    {
      $group: {
        _id: null,

        totalOrders: { $sum: 1 },

        pending: {
          $sum: {
            $cond: [{ $eq: ["$status", "pending"] }, 1, 0]
          }
        },

        processing: {
          $sum: {
            $cond: [{ $eq: ["$status", "processing"] }, 1, 0]
          }
        },

        completed: {
          $sum: {
            $cond: [{ $eq: ["$status", "completed"] }, 1, 0]
          }
        },

        failed: {
          $sum: {
            $cond: [{ $eq: ["$status", "failed"] }, 1, 0]
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        totalOrders: 1,
        pending: 1,
        processing: 1,
        completed: 1,
        failed: 1
      }
    }
  ]);

  return results[0] || {
    totalOrders: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0
  };
};


module.exports = {getOrders, getOrderStats};