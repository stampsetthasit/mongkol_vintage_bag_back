const Users = require('../models/user_schema');
const Products = require('../models/product_schema')
const firebase = require('../firebase');
const Orders = require('../models/order_schema');
const generatePayload = require("promptpay-qr");
const QRCode = require('qrcode'); 

const { mailer } = require('../services/utilities')

exports.checkout = async (req, res, next) => {
    let userProducts, total = 0;
    const useremail = req.useremail
    const productID = req.body.productID
    const priceTotal = req.body.priceTotal
    const status = req.body.status

    try {
        const user_data = await Users.findOne({'email': useremail})
        if(!user_data) return res.status(404).json({result: 'Not found', message: 'User not found', data: user_data});

        const address = await Users.findOne({'email': useremail})
        if(address.address.address_line1 === "") return res.status(404).json({result: 'Not found', message: 'address not found', data: address.address});
        if(address.address.city === "") return res.status(404).json({result: 'Not found', message: 'city not found', data: address.address});
        if(address.address.province === "") return res.status(404).json({result: 'Not found', message: 'province not found', data: address.address});
        if(address.address.zip === "") return res.status(404).json({result: 'Not found', message: 'zip not found', data: address.address});
        if(address.address.mobile === "") return res.status(404).json({result: 'Not found', message: 'mobile not found', data: address.address});

        const data = await Products.findById(productID)
        if(!data) return res.status(404).json({result: 'Not found', message: 'Product not found', data: data});
        
        const amount = parseFloat(priceTotal) //parse float from front price
        const payload = generatePayload('0983187837', {amount}); //generate QR promtpay
        const option = { //set qr color
            color: {
                dark: '#000',
                light: '#fff'
            }
        }
        QRCode.toDataURL(payload, option, (error, qrUrl) => {
            if (error) return res.status(400).json({result: 'Bad Request', message: 'QR generate failed', data: error})
            req.products_data = productID

            req.qrPayment = qrUrl // QRCode

            req.status = status // cannot use auto verify qr because we need verify from bank api

            if (status == "success") {
                next()
            }
            else if (status == "failure") {
                res.status(406).json({result: 'Not Acceptable', message: 'payment failed', error: status});
            }
            else {
                res.status(500).json({result: 'Internal Server Error', message: 'Something Went Wrong, Please Try Again', error: status});
            }
        })

    }
    catch (error) {
        res.status(500).json({result: 'Internal Server Error', message: '', error: error});
    }

};

exports.checkoutComplete = async (req, res, next) => {
    const useremail = req.useremail
    const products_data= req.products_data

    try {
        const orderStatus = req.body.status
        if (!orderStatus) return res.status(404).json({ result: 'Not found', message: 'required order status', data: {}})

        const user_data = await Users.findOne({'email': useremail})
        if(!user_data) return res.status(404).json({result: 'Not found', message: '', data: user_data});

        const products = products_data.map((item, index) => {
            return {_id: item}
        })
        
        const order = await Orders.create({ //create order to DB
            user: {
                email: user_data.email,
                firstname: user_data.firstname,
                lastname: user_data.lastname,
                address: user_data.address
            },
            products: products
        });
        
        console.log("Order: ", order)
        const data = {orderID: order._id, firstname: order.user.firstname}
        req.data = data //req this data for send mail
        next()
    }
    catch (error) {
        res.status(500).json({result: 'Internal Server Error', message: '', error: error});
    }
}

exports.sendMail = async (req, res) => {
    const useremail = req.useremail
    const {orderID, firstname } = req.data

    console.log("Order ID:", String(orderID))

    mailer(useremail, `Order confirmation ${String(orderID)}`,  //send mail
    `<p>Dear ${firstname},</p>
    <br>
    <p>Thank you so much for order with Mongkol!</p>
    <br>
    <p>Your order is being prepared and packed with loving care. By the way, you have great taste.</p>
    <br>
    <p>Let us know if we can do anything to make your experience better!</p>
    <br>
    <p>Thanks again,</p>
    <p>Mongkol</p>
    `)

    firebase.firestore().collection("mail").doc(String(orderID)).set({ //create mail collection in firestore
        to: useremail,
        message: {
            subject: `Order confirmation #${String(orderID)}`,
            html: `
            <p>Dear ${firstname},</p>
            <br>
            <p>Thank you so much for order with Mongkol!</p>
            <br>
            <p>Your order is being prepared and packed with loving care. By the way, you have great taste.</p>
            <br>
            <p>Let us know if we can do anything to make your experience better!</p>
            <br>
            <p>Thanks again,</p>
            <p>Mongkol</p>
            `
        },
        created_at: firebase.firestore.FieldValue.serverTimestamp()
    })
    res.status(200).json({result: 'OK', message: 'payment complete and also send email', data: {}});
}