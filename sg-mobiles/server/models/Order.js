import mongoose from 'mongoose';

export const ORDER_STATUSES = ['Pending', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled', 'Returned'];
export const RETURN_STATUSES = ['Requested', 'Approved', 'Rejected', 'Completed'];

const orderSchema = new mongoose.Schema(
  {
    orderNo: { type: String, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        variant: { type: mongoose.Schema.Types.ObjectId },
        variantName: String,
        name: String,
        image: String,
        price: Number,
        qty: { type: Number, min: 1 },
      },
    ],
    shippingAddress: {
      name: String, phone: String, line1: String, city: String, state: String, pincode: String,
    },
    paymentMethod: { type: String, enum: ['COD', 'UPI', 'Online'], default: 'COD' },
    isPaid: { type: Boolean, default: false },
    paidAt: Date,
    payment: { razorpayOrderId: String, razorpayPaymentId: String },
    subtotal: Number,
    shipping: Number,
    codCharge: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    couponCode: String,
    total: Number,
    status: { type: String, enum: ORDER_STATUSES, default: 'Pending' },
    statusHistory: [{ status: String, note: String, at: { type: Date, default: Date.now } }],
    // Delivery details filled in by the admin when the parcel ships.
    courier: String,
    trackingId: String,
    trackingUrl: String,
    expectedDelivery: Date,
    deliveredAt: Date,
    adminNote: String,
    returnRequest: {
      reason: String,
      details: String,
      status: { type: String, enum: RETURN_STATUSES },
      adminNote: String,
      requestedAt: Date,
      resolvedAt: Date,
    },
  },
  { timestamps: true }
);

orderSchema.pre('save', function () {
  if (!this.orderNo) {
    this.orderNo = 'SG' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 90 + 10);
  }
});

export default mongoose.model('Order', orderSchema);
