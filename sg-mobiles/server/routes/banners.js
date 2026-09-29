import { Router } from 'express';
import Banner from '../models/Banner.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { ah, httpError } from '../middleware/error.js';

const r = Router();

r.get('/', ah(async (req, res) => {
  res.json(await Banner.find({ active: true }).sort({ order: 1, createdAt: 1 }));
}));

r.get('/all', protect, adminOnly, ah(async (req, res) => {
  res.json(await Banner.find().sort({ placement: 1, order: 1 }));
}));

r.post('/', protect, adminOnly, ah(async (req, res) => res.status(201).json(await Banner.create(req.body))));

r.put('/:id', protect, adminOnly, ah(async (req, res) => {
  const b = await Banner.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!b) throw httpError(404, 'Banner not found');
  res.json(b);
}));

r.delete('/:id', protect, adminOnly, ah(async (req, res) => {
  await Banner.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

export default r;
