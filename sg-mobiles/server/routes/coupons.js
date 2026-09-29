import { Router } from 'express';
import Coupon from '../models/Coupon.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { ah, httpError } from '../middleware/error.js';

const r = Router();

r.post('/apply', ah(async (req, res) => {
  const { code, subtotal } = req.body;
  const c = await Coupon.findOne({ code: (code || '').toUpperCase().trim() });
  if (!c) throw httpError(404, 'Invalid coupon code');
  res.json({ code: c.code, discount: c.discountFor(Number(subtotal) || 0) });
}));

r.get('/', protect, adminOnly, ah(async (req, res) => res.json(await Coupon.find().sort({ createdAt: -1 }))));

r.post('/', protect, adminOnly, ah(async (req, res) => res.status(201).json(await Coupon.create(req.body))));

r.put('/:id', protect, adminOnly, ah(async (req, res) => {
  const c = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!c) throw httpError(404, 'Coupon not found');
  res.json(c);
}));

r.delete('/:id', protect, adminOnly, ah(async (req, res) => {
  await Coupon.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

export default r;
