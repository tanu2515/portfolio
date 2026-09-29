import { Router } from 'express';
import Setting from '../models/Setting.js';
import Message from '../models/Message.js';
import { ah, httpError } from '../middleware/error.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { razorpayEnabled } from '../utils/razorpay.js';

const r = Router();

r.get('/settings', ah(async (req, res) => {
  const s = (await Setting.getSingleton()).toObject();
  res.json({ ...s, onlinePayment: razorpayEnabled() });
}));

// Pincode serviceability + estimated delivery window for the product page and checkout.
r.get('/delivery/check', ah(async (req, res) => {
  const pincode = String(req.query.pincode || '').trim();
  if (!/^\d{6}$/.test(pincode)) throw httpError(400, 'Enter a valid 6-digit pincode');
  const s = await Setting.getSingleton();
  if (!s.isServiceable(pincode)) {
    return res.json({ pincode, serviceable: false, message: `Sorry, we don't deliver to ${pincode} yet` });
  }
  const eta = s.deliveryEta();
  res.json({
    pincode,
    serviceable: true,
    cod: s.codEnabled,
    codCharge: s.codCharge,
    codMaxOrder: s.codMaxOrder,
    eta,
    freeShippingOver: s.freeShippingOver,
    shippingFee: s.shippingFee,
    returnDays: s.returnDays,
  });
}));

r.post('/contact', rateLimit({ max: 10, message: 'Too many messages, please try again later' }), ah(async (req, res) => {
  const { name, email, phone, subject, message } = req.body;
  if (!name || !email || !message) throw httpError(400, 'Name, email and message are required');
  await Message.create({ name, email, phone, subject, message });
  res.status(201).json({ ok: true });
}));

export default r;
