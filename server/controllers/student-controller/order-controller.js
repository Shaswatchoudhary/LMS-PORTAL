const paypal = require("../../helpers/paypal");
const Order = require("../../models/Order");
const Course = require("../../models/Course");
const StudentCourses = require("../../models/StudentCourses");

const createOrder = async (req, res) => {
  try {
    // Check PayPal configuration
    if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_SECRET_ID) {
      return res.status(500).json({
        success: false,
        message: "PayPal configuration missing. Please set PAYPAL_CLIENT_ID and PAYPAL_SECRET_ID in your environment variables."
      });
    }

    // Get CLIENT_URL with fallback for development
    const clientUrl = process.env.CLIENT_URL || 
                     (process.env.NODE_ENV === 'development' ? 
                      'http://localhost:3000' : null);
                      
    if (!clientUrl) {
      console.error('CLIENT_URL environment variable is not defined and no fallback is available');
      return res.status(500).json({
        success: false,
        message: "Missing CLIENT_URL configuration. Please set the CLIENT_URL environment variable."
      });
    }

    const {
      userId,
      userName,
      userEmail,
      instructorId,
      instructorName,
      courseImage,
      courseTitle,
      courseId,
      coursePricing,
    } = req.body;

    // Validate required fields
    if (!userId || !courseId || !coursePricing || !courseTitle) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields for payment creation"
      });
    }

    // Validate price format
    const priceValue = parseFloat(coursePricing);
    if (isNaN(priceValue) || priceValue <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid course pricing value"
      });
    }

    const formattedPrice = priceValue.toFixed(2);

    // Create the order FIRST (before PayPal request)
    const newOrder = new Order({
      userId,
      userName,
      userEmail,
      orderStatus: "pending",
      paymentMethod: "paypal",
      paymentStatus: "initiated",
      orderDate: new Date(),
      paymentId: null,
      payerId: null,
      instructorId,
      instructorName,
      courseImage,
      courseTitle,
      courseId,
      coursePricing: formattedPrice,
    });

    const savedOrder = await newOrder.save();

    // Simplified PayPal request with only required fields
    const create_payment_json = {
      intent: "sale",
      payer: {
        payment_method: "paypal",
      },
      redirect_urls: {
        return_url: `${clientUrl}/payment-return?order_id=${savedOrder._id}`,
        cancel_url: `${clientUrl}/payment-cancel`
      },
      transactions: [
        {
          item_list: {
            items: [
              {
                name: courseTitle.substring(0, 127),
                sku: courseId.toString(),
                price: formattedPrice,
                currency: "USD",
                quantity: 1,
              },
            ],
          },
          amount: {
            currency: "USD",
            total: formattedPrice,
          },
          description: `Purchase of ${courseTitle.substring(0, 127)}`,
        },
      ],
    };

    console.log("PayPal request payload:", JSON.stringify(create_payment_json, null, 2));

    paypal.payment.create(create_payment_json, async (error, paymentInfo) => {
      if (error) {
        console.error("PayPal API error:", JSON.stringify(error, null, 2));
        
        await Order.findByIdAndUpdate(savedOrder._id, {
          orderStatus: "failed",
          paymentStatus: "failed"
        });
        
        return res.status(500).json({
          success: false,
          message: "Error while creating PayPal payment",
          error: error.response || error.message || "Unknown PayPal error"
        });
      }

      // Safely find and extract the approval URL
      let approveUrl = null;
      if (paymentInfo && paymentInfo.links && Array.isArray(paymentInfo.links)) {
        const approvalLink = paymentInfo.links.find(link => link.rel === "approval_url");
        if (approvalLink && approvalLink.href) {
          approveUrl = approvalLink.href;
        }
      }
      
      if (!approveUrl) {
        console.error("Missing approval URL in PayPal response:", paymentInfo);
        await Order.findByIdAndUpdate(savedOrder._id, {
          orderStatus: "failed",
          paymentStatus: "failed"
        });
        return res.status(500).json({
          success: false,
          message: "PayPal response missing approval URL"
        });
      }

      // Update order with payment ID
      await Order.findByIdAndUpdate(savedOrder._id, {
        paymentId: paymentInfo.id
      });

      res.status(201).json({
        success: true,
        data: {
          approveUrl,
          orderId: savedOrder._id,
          paymentId: paymentInfo.id
        }
      });
    });
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({
      success: false,
      message: "Server error occurred",
      error: error.message
    });
  }
};

const capturePaymentAndFinalizeOrder = async (req, res) => {
  try {
    const { paymentId, payerId, orderId } = req.body;
    if (!paymentId || !payerId || !orderId) {
      return res.status(400).json({ success: false, message: "Missing required payment information" });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order cannot be found" });
    }

    const execute_payment_json = { payer_id: payerId };
    paypal.payment.execute(paymentId, execute_payment_json, async (error, payment) => {
      if (error) {
        console.error("PayPal execution error:", error);
        await Order.findByIdAndUpdate(orderId, { orderStatus: "failed", paymentStatus: "failed" });
        return res.status(500).json({ success: false, message: "Error executing PayPal payment", error: error.response || error.message });
      }

      order.paymentStatus = "paid";
      order.orderStatus = "confirmed";
      order.paymentId = paymentId;
      await order.save();

      // Update StudentCourses collection
      try {
        await StudentCourses.findOneAndUpdate(
          { userId: order.userId },
          { $push: { courses: { courseId: order.courseId, title: order.courseTitle, instructorId: order.instructorId, instructorName: order.instructorName, dateOfPurchase: new Date(), courseImage: order.courseImage } } },
          { upsert: true, new: true }
        );
        console.log(`Successfully updated StudentCourses for user ${order.userId}`);
      } catch (e) {
        console.error(`Error updating StudentCourses:`, e);
      }

      // Update Course students array
      try {
        await Course.findByIdAndUpdate(
          order.courseId,
          { $addToSet: { students: { studentId: order.userId, studentName: order.userName, studentEmail: order.userEmail, paidAmount: order.coursePricing } } },
          { new: true }
        );
        console.log(`Added student ${order.userId} to course ${order.courseId}`);
      } catch (e) {
        console.error(`Error updating Course students array:`, e);
      }

      return res.status(200).json({ success: true, message: "Payment successful", data: { orderId: order._id, paymentId, payerId } });
    });
  } catch (err) {
    console.error("Server error in payment capture:", err);
    res.status(500).json({ success: false, message: "Server error occurred while processing payment", error: err.message });
  }
};

module.exports = { createOrder, capturePaymentAndFinalizeOrder };