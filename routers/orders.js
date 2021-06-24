const {Order} = require('../models/order');
const express = require('express');
const { OrderItem } = require('../models/order-item');
const router = express.Router();

//http://localhost:3000/api/v1/products

//Creating Orders

router.post('/', async (req,res)=>{

    const orderItemsIds = Promise.all(req.body.orderItems.map(async orderItem => {
        let newOrderItem = new OrderItem({
            quantity: orderItem.quantity,
            product : orderItem.product
        })

        newOrderItem = await newOrderItem.save();

        return newOrderItem._id;
    }))

    const orderItemsIdsResloved = await orderItemsIds;
    
    const totalPrices = await Promise.all(orderItemsIdsResloved.map(async (orderItemsId)=>{
        const orderItem = await  OrderItem.findById(orderItemsId).populate('product','price');
        const totalPrice = orderItem.product.price * orderItem.quantity;
        return totalPrice;
    }))

    const totalPrice = totalPrices.reduce((a,b) => a + b, 0);

    console.log(totalPrices);


    let order = new Order({
        orderItems:orderItemsIdsResloved,
        shippingAddress1:req.body.shippingAddress1,
        shippingAddress2:req.body.shippingAddress2,
        city:req.body.city,
        zip:req.body.zip,
        country:req.body.country,
        phone:req.body.phone,
        status:req.body.status,
        totalPrice:totalPrice,
        user:req.body.user,
    })
    order = await order.save();

    if (!order) {
        return res.status(404).send('the order cannot be created!')
    }
    res.send(order);

})


// Get All Orders with User and date



router.get(`/`, async (req, res) =>{
    const orderList = await Order.find().populate('user','name email street').sort({'dateOrdered': -1});
    
    if (!orderList) {
        res.status(500).json({success:false})
    }
    res.send(orderList);
})

// Get Order by Specfic Id's

router.get(`/:id`, async (req, res) =>{
    const order = await Order.findById(req.params.id)
    .populate('user','name email street')
    .populate({ path: 'orderItems', populate: { path:'product', populate: 'category'}});
    

    if (!order) {
        res.status(500).json({success:false})
    }
    res.status(200).send(order);
})

// Update Order

router.put('/:id', async (req,res)=>{
    const order = await Order.findByIdAndUpdate(
        req.params.id,
        {
            status: req.body.status,
            
        },
        {new:true}
        )
        if (!order) {
            return res.status(404).send('the Order cannot be updated!')
        }
        res.send(order);
})

// Deleting Order

router.delete('/:id', (req, res)=>{
    Order.findByIdAndRemove(req.params.id).then(async order =>{
        if(order) {
            await order.orderItems.map(async orderItem => {
                await OrderItem.findByIdAndRemove(orderItem)
            })
            return res.status(200).json({success: true, message: 'the order is deleted!'})
        } else {
            return res.status(404).json({success: false , message: "order not found!"})
        }
    }).catch(err=>{
       return res.status(500).json({success: false, error: err}) 
    })
})

// For Order Count

router.get('/get/count', async (req,res) =>{
    const orderCount = await Order.countDocuments((count) => count)
    if (!orderCount) {
        res.status(500).json({success:false})
    }
    res.send({
        orderCount: orderCount
    });
})

// For total Sales

router.get('/get/totalsales', async (req,res)=>{
    const totalSales = await Order.aggregate([
        {$group: { _id:null , totalsales : { $sum : '$totalPrice'}}}
    ])

    if (!totalSales) {
        return res.status(400).send('The order sales cannot be generated')
    }
    res.send({totalsales: totalSales.pop().totalsales})
})


// For User Order History

router.get(`/get/userorders/:userid`, async (req, res) =>{
    const userorderList = await Order.find({user: req.params.userid})
    .populate({ path: 'orderItems', populate: { path:'product', populate: 'category'}}).sort({'dateOrdered': -1});
    
    if (!userorderList) {
        res.status(500).json({success:false})
    }
    res.send(userorderList);
})


module.exports= router;