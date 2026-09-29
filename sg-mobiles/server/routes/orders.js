import { Router } from 'express';
import Order, { ORDER_STATUSES } from '../models/Order.js';
import Product from '../models/Product.js';
import Coupon from '../models/Coupon.js';
import Setting from '../models/Setting.js';
import User from '../models/User.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { ah, httpError } from '../middleware/error.js';
import { sendMail, orderPlacedMail, statusMail } from '../utils/mailer.js';
import { razorpayEnabled, createRazorpayOrder, verifySignature } from '../utils/razorpay.js';
import { toCSV } from '../utils/csv.js';

const r = Router();

// ---- stock helpers (variant-aware) ----
async function takeStock(line) {
  const res = line.variant
    ? await Product.updateOne(
        { _id: line.product, variants: { $elemMatch: { _id: line.variant, stock: { $gte: line.qty } } } },
        { $inc: { 'variants.$.stock': -line.qty, stock: -line.qty } }
      )
    : await Product.updateOne({ _id: line.product, stock: { $gte: line.qty } }, { $inc: { stock: -line.qty } });
  return res.modifiedCount === 1;
}

function returnStock(line) {
  return line.variant
    ? Product.updateOne({ _id: line.product, 'variants._id': line.variant }, { $inc: { 'variants.$.stock': line.qty, stock: line.qty } })
    : Product.updateOne({ _id: line.product }, { $inc: { stock: line.qty } });
}

const restock = (order) => Promise.all(order.items.map(returnStock));

async function releaseCoupon(order) {
  if (order.couponCode) await Coupon.updateOne({ code: order.couponCode, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } });
}

const userCouponUses = (userId, code) =>
  Order.countDocuments({ user: userId, couponCode: code, status: { $ne: 'Cancelled' } });

async function notifyStatus(order) {
  const user = await User.findById(order.user);
  if (!user) return;
  const { storeName } = await Setting.getSingleton();
  sendMail(statusMail(order, user, storeName));
}

async function startPayment(order) {
  const rp = await createRazorpayOrder({ amount: order.total, receipt: order.orderNo });
  order.payment = { razorpayOrderId: rp.id };
  await order.save();
  return { key: process.env.RAZORPAY_KEY_ID, orderId: rp.id, amount: rp.amount, currency: rp.currency };
}

// Prices are always recomputed on the server; the client only sends ids, variant ids and quantities.
r.post('/', protect, ah(async (req, res) => {
  const { items, shippingAddress, paymentMethod = 'COD', couponCode } = req.body;
  if (!Array.isArray(items) || !items.length) throw httpError(400, 'Your cart is empty');
  const addr = { ...(shippingAddress || {}) };
  for (const f of ['name', 'phone', 'line1', 'city', 'state', 'pincode'])
    if (!String(addr[f] || '').trim()) throw httpError(400, `Shipping ${f} is required`);
  if (!/^\d{6}$/.test(addr.pincode)) throw httpError(400, 'Enter a valid 6-digit pincode');
  if (String(addr.phone).replace(/\D/g, '').length < 10) throw httpError(400, 'Enter a valid phone number');

  const settings = await Setting.getSingleton();
  if (!settings.isServiceable(addr.pincode)) throw httpError(400, `Sorry, we don't deliver to pincode ${addr.pincode} yet`);
  if (!['COD', 'UPI', 'Online'].includes(paymentMethod)) throw httpError(400, 'Invalid payment method');
  if (paymentMethod === 'Online' && !razorpayEnabled()) throw httpError(400, 'Online payment is not available right now');

  const products = await Product.find({ _id: { $in: items.map((i) => i.product) }, active: true });
  const lines = items.map((i) => {
    const p = products.find((x) => x._id.toString() === i.product);
    if (!p) throw httpError(400, 'A product in your cart is no longer available');
    if (p.comingSoon) throw httpError(400, `${p.name} is not released yet`);
    const resolved = p.resolve(i.variant);
    if (!resolved) throw httpError(400, `Please choose a ${p.optionName || 'variant'} for ${p.name}`);
    const qty = Math.max(1, parseInt(i.qty) || 1);
    const label = resolved.variant ? `${p.name} (${resolved.variant.name})` : p.name;
    if (resolved.stock < qty) throw httpError(400, resolved.stock ? `Only ${resolved.stock} left of ${label}` : `${label} is out of stock`);
    return {
      product: p._id,
      variant: resolved.variant?._id,
      variantName: resolved.variant?.name,
      name: p.name,
      image: resolved.variant?.image || p.images?.[0],
      price: resolved.price,
      qty,
    };
  });

  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const shipping = subtotal >= settings.freeShippingOver ? 0 : settings.shippingFee;
  const onDelivery = paymentMethod !== 'Online';
  if (onDelivery && !settings.codEnabled) throw httpError(400, 'Pay on delivery is currently unavailable');
  if (onDelivery && settings.codMaxOrder > 0 && subtotal > settings.codMaxOrder)
    throw httpError(400, `Pay on delivery is available for orders up to Rs ${settings.codMaxOrder}. Please pay online.`);
  const codCharge = onDelivery ? settings.codCharge || 0 : 0;

  let discount = 0;
  let coupon;
  if (couponCode) {
    coupon = await Coupon.findOne({ code: String(couponCode).toUpperCase().trim() });
    if (!coupon) throw httpError(400, 'Invalid coupon code');
    discount = coupon.discountFor(subtotal, await userCouponUses(req.user._id, coupon.code));
  }

  // Reserve stock atomically; roll back if any line fails (e.g. concurrent purchase).
  const reserved = [];
  for (const l of lines) {
    if (!(await takeStock(l))) {
      await Promise.all(reserved.map(returnStock));
      throw httpError(400, `${l.name}${l.variantName ? ` (${l.variantName})` : ''} just went out of stock`);
    }
    reserved.push(l);
  }
  if (coupon) {
    // Atomic check against the total usage limit.
    const ok = await Coupon.updateOne(
      { _id: coupon._id, ...(coupon.usageLimit > 0 ? { usedCount: { $lt: coupon.usageLimit } } : {}) },
      { $inc: { usedCount: 1 } }
    );
    if (!ok.modifiedCount) {
      await Promise.all(reserved.map(returnStock));
      throw httpError(400, 'Coupon usage limit reached');
    }
  }

  const order = await Order.create({
    user: req.user._id,
    items: lines,
    shippingAddress: addr,
    paymentMethod,
    subtotal,
    shipping,
    codCharge,
    discount,
    couponCode: coupon?.code,
    total: subtotal + shipping + codCharge - discount,
    expectedDelivery: settings.deliveryEta().to,
    statusHistory: [{ status: 'Pending', note: 'Order placed' }],
  });
  if (!req.user.address?.line1) {
    req.user.address = addr;
    await req.user.save();
  }

  if (paymentMethod === 'Online') {
    try {
      return res.status(201).json({ order, razorpay: await startPayment(order) });
    } catch (err) {
      // Keep the order; the customer can retry payment from the order page.
      return res.status(201).json({ order, paymentError: err.message });
    }
  }
  sendMail(orderPlacedMail(order, req.user, settings.storeName));
  res.status(201).json({ order });
}));

r.get('/mine', protect, ah(async (req, res) => {
  res.json(await Order.find({ user: req.user._id }).sort({ createdAt: -1 }));
}));

// Public tracking by order number + phone on the order.
r.get('/track/:orderNo', ah(async (req, res) => {
  const o = await Order.findOne({ orderNo: req.params.orderNo.trim().toUpperCase() });
  const digits = (s) => String(s || '').replace(/\D/g, '').slice(-10);
  if (!o || digits(o.shippingAddress.phone) !== digits(req.query.phone))
    throw httpError(404, 'No order found for that order number and phone');
  res.json({
    orderNo: o.orderNo, status: o.status, statusHistory: o.statusHistory, total: o.total, createdAt: o.createdAt,
    courier: o.courier, trackingId: o.trackingId, trackingUrl: o.trackingUrl, expectedDelivery: o.expectedDelivery,
    city: o.shippingAddress.city,
    items: o.items.map(({ name, variantName, qty, image }) => ({ name, variantName, qty, image })),
  });
}));

// ---- admin list & export (before /:id) ----
function adminFilter(q) {
  const filter = {};
  if (q.status) filter.status = q.status;
  if (q.returns === 'true') filter['returnRequest.status'] = { $exists: true };
  if (q.q) filter.orderNo = new RegExp(String(q.q).replace(/[^a-z0-9]/gi, ''), 'i');
  if (q.from || q.to) {
    filter.createdAt = {};
    if (q.from) filter.createdAt.$gte = new Date(q.from);
    if (q.to) filter.createdAt.$lte = new Date(new Date(q.to).setHours(23, 59, 59, 999));
  }
  return filter;
}

r.get('/', protect, adminOnly, ah(async (req, res) => {
  res.json(await Order.find(adminFilter(req.query)).populate('user', 'name email').sort({ createdAt: -1 }).limit(500));
}));

r.get('/admin/export', protect, adminOnly, ah(async (req, res) => {
  const orders = await Order.find(adminFilter(req.query)).populate('user', 'name email').sort({ createdAt: -1 }).lean();
  const rows = orders.map((o) => ({
    orderNo: o.orderNo,
    date: new Date(o.createdAt).toISOString().slice(0, 10),
    customer: o.user?.name, email: o.user?.email, phone: o.shippingAddress?.phone,
    city: o.shippingAddress?.city, pincode: o.shippingAddress?.pincode,
    items: o.items.map((i) => `${i.name}${i.variantName ? ` (${i.variantName})` : ''} x${i.qty}`).join('; '),
    subtotal: o.subtotal, shipping: o.shipping, codCharge: o.codCharge, discount: o.discount, coupon: o.couponCode,
    total: o.total, payment: o.paymentMethod, paid: o.isPaid ? 'yes' : 'no', status: o.status,
    courier: o.courier, trackingId: o.trackingId,
  }));
  const cols = ['orderNo', 'date', 'customer', 'email', 'phone', 'city', 'pincode', 'items', 'subtotal', 'shipping', 'codCharge', 'discount', 'coupon', 'total', 'payment', 'paid', 'status', 'courier', 'trackingId'];
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="orders.csv"');
  res.send('﻿' + toCSV(rows, cols));
}));

async function ownOrder(req) {
  const o = await Order.findOne({ _id: req.params.id, user: req.user._id });
  if (!o) throw httpError(404, 'Order not found');
  return o;
}

r.get('/:id', protect, ah(async (req, res) => {
  const o = await Order.findById(req.params.id).populate('user', 'name email phone');
  if (!o) throw httpError(404, 'Order not found');
  if (req.user.role !== 'admin' && o.user._id.toString() !== req.user._id.toString())
    throw httpError(403, 'Not your order');
  res.json(o);
}));

// Retry payment for an unpaid online order.
r.post('/:id/pay', protect, ah(async (req, res) => {
  const o = await ownOrder(req);
  if (o.paymentMethod !== 'Online' || o.isPaid) throw httpError(400, 'This order does not need payment');
  if (o.status === 'Cancelled') throw httpError(400, 'This order was cancelled');
  if (!razorpayEnabled()) throw httpError(400, 'Online payment is not available right now');
  res.json({ razorpay: await startPayment(o) });
}));

r.post('/:id/verify', protect, ah(async (req, res) => {
  const o = await ownOrder(req);
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  if (o.isPaid) return res.json(o);
  if (razorpay_order_id !== o.payment?.razorpayOrderId || !verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature))
    throw httpError(400, 'Payment verification failed');
  o.isPaid = true;
  o.paidAt = new Date();
  o.payment.razorpayPaymentId = razorpay_payment_id;
  o.statusHistory.push({ status: o.status, note: 'Payment received' });
  await o.save();
  const { storeName } = await Setting.getSingleton();
  sendMail(orderPlacedMail(o, req.user, storeName));
  res.json(o);
}));

r.put('/:id/cancel', protect, ah(async (req, res) => {
  const o = await ownOrder(req);
  if (!['Pending', 'Processing'].includes(o.status)) throw httpError(400, 'This order can no longer be cancelled');
  o.status = 'Cancelled';
  o.statusHistory.push({ status: 'Cancelled', note: 'Cancelled by customer' });
  await o.save();
  await Promise.all([restock(o), releaseCoupon(o)]);
  res.json(o);
}));

r.post('/:id/return', protect, ah(async (req, res) => {
  const o = await ownOrder(req);
  const { reason, details } = req.body;
  if (!reason) throw httpError(400, 'Please choose a reason');
  if (o.status !== 'Delivered') throw httpError(400, 'Only delivered orders can be returned');
  if (o.returnRequest?.status) throw httpError(400, 'A return has already been requested for this order');
  const { returnDays } = await Setting.getSingleton();
  const deliveredAt = o.deliveredAt || o.updatedAt;
  if (Date.now() - deliveredAt.getTime() > returnDays * 86400000)
    throw httpError(400, `The ${returnDays}-day return window has closed`);
  o.returnRequest = { reason, details, status: 'Requested', requestedAt: new Date() };
  o.statusHistory.push({ status: o.status, note: `Return requested: ${reason}` });
  await o.save();
  res.json(o);
}));

// ---- admin updates ----
r.put('/:id/status', protect, adminOnly, ah(async (req, res) => {
  const { status, isPaid, note, courier, trackingId, trackingUrl, expectedDelivery, adminNote } = req.body;
  const o = await Order.findById(req.params.id);
  if (!o) throw httpError(404, 'Order not found');
  let changed = false;
  if (status && status !== o.status) {
    if (!ORDER_STATUSES.includes(status) || status === 'Returned') throw httpError(400, 'Invalid status');
    if (['Cancelled', 'Returned'].includes(o.status)) throw httpError(400, `${o.status} orders cannot be changed`);
    o.status = status;
    o.statusHistory.push({ status, note });
    if (status === 'Cancelled') await Promise.all([restock(o), releaseCoupon(o)]);
    if (status === 'Delivered') {
      o.deliveredAt = new Date();
      if (o.paymentMethod !== 'Online' && !o.isPaid) { o.isPaid = true; o.paidAt = new Date(); }
    }
    changed = true;
  }
  if (typeof isPaid === 'boolean' && isPaid !== o.isPaid) {
    o.isPaid = isPaid;
    o.paidAt = isPaid ? new Date() : undefined;
  }
  for (const [k, v] of Object.entries({ courier, trackingId, trackingUrl, adminNote })) if (v !== undefined) o[k] = v;
  if (expectedDelivery !== undefined) o.expectedDelivery = expectedDelivery || undefined;
  await o.save();
  if (changed && o.status !== 'Pending') notifyStatus(o);
  res.json(await o.populate('user', 'name email phone'));
}));

r.put('/:id/return', protect, adminOnly, ah(async (req, res) => {
  const { status, adminNote } = req.body;
  const o = await Order.findById(req.params.id);
  if (!o?.returnRequest?.status) throw httpError(404, 'No return request on this order');
  const current = o.returnRequest.status;
  const allowed = { Requested: ['Approved', 'Rejected'], Approved: ['Completed', 'Rejected'] }[current] || [];
  if (!allowed.includes(status)) throw httpError(400, `Cannot change a ${current} return to ${status}`);
  o.returnRequest.status = status;
  if (adminNote !== undefined) o.returnRequest.adminNote = adminNote;
  if (status !== 'Approved') o.returnRequest.resolvedAt = new Date();
  o.statusHistory.push({ status: o.status, note: `Return ${status.toLowerCase()}${adminNote ? `: ${adminNote}` : ''}` });
  if (status === 'Completed') {
    o.status = 'Returned';
    o.statusHistory.push({ status: 'Returned', note: 'Items received back' });
    await restock(o);
  }
  await o.save();
  notifyStatus(o);
  res.json(await o.populate('user', 'name email phone'));
}));

// Cancel online orders left unpaid for 30 minutes so their stock is released.
export function startUnpaidOrderSweeper() {
  setInterval(async () => {
    try {
      const stale = await Order.find({
        paymentMethod: 'Online', isPaid: false, status: 'Pending',
        createdAt: { $lt: new Date(Date.now() - 30 * 60 * 1000) },
      });
      for (const o of stale) {
        o.status = 'Cancelled';
        o.statusHistory.push({ status: 'Cancelled', note: 'Payment not completed' });
        await o.save();
        await Promise.all([restock(o), releaseCoupon(o)]);
      }
    } catch (err) {
      console.error('Unpaid order sweep failed:', err.message);
    }
  }, 5 * 60 * 1000).unref();
}

export default r;
