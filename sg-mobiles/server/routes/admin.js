import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import User from '../models/User.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Message from '../models/Message.js';
import Setting from '../models/Setting.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { ah, httpError } from '../middleware/error.js';

const r = Router();
r.use(protect, adminOnly);

r.get('/stats', ah(async (req, res) => {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 6);
  since.setUTCHours(0, 0, 0, 0);

  const { lowStockThreshold = 5 } = await Setting.getSingleton();
  const [users, products, orders, revenueAgg, byStatus, daily, lowStock, recent, unread, returns, unpaidOnline] = await Promise.all([
    User.countDocuments({ role: 'user' }),
    Product.countDocuments(),
    Order.countDocuments(),
    Order.aggregate([{ $match: { status: { $nin: ['Cancelled', 'Returned'] }, $or: [{ paymentMethod: { $ne: 'Online' } }, { isPaid: true }] } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
    Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Order.aggregate([
      { $match: { createdAt: { $gte: since }, status: { $nin: ['Cancelled', 'Returned'] }, $or: [{ paymentMethod: { $ne: 'Online' } }, { isPaid: true }] } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
    ]),
    Product.find({ stock: { $lte: lowStockThreshold }, comingSoon: false }).select('name stock slug').sort({ stock: 1 }).limit(8),
    Order.find().populate('user', 'name').sort({ createdAt: -1 }).limit(6),
    Message.countDocuments({ read: false }),
    Order.countDocuments({ 'returnRequest.status': { $in: ['Requested', 'Approved'] } }),
    Order.countDocuments({ paymentMethod: 'Online', isPaid: false, status: { $ne: 'Cancelled' } }),
  ]);

  // Fill in days with no orders so the chart always has 7 points.
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(since);
    d.setUTCDate(since.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);
    const hit = daily.find((x) => x._id === key);
    days.push({ date: key, revenue: hit?.revenue || 0, orders: hit?.orders || 0 });
  }

  res.json({
    users, products, orders, unread, returns, unpaidOnline, lowStockThreshold,
    revenue: revenueAgg[0]?.total || 0,
    byStatus: Object.fromEntries(byStatus.map((s) => [s._id, s.count])),
    daily: days, lowStock, recent,
  });
}));

r.get('/users', ah(async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 }).lean();
  const counts = await Order.aggregate([{ $group: { _id: '$user', n: { $sum: 1 }, spent: { $sum: '$total' } } }]);
  res.json(users.map((u) => {
    const c = counts.find((x) => x._id.toString() === u._id.toString());
    return { ...u, orders: c?.n || 0, spent: c?.spent || 0 };
  }));
}));

r.put('/users/:id', ah(async (req, res) => {
  if (req.params.id === req.user._id.toString()) throw httpError(400, 'You cannot change your own account here');
  const { role, blocked } = req.body;
  const u = await User.findByIdAndUpdate(req.params.id, { role, blocked }, { new: true, runValidators: true });
  if (!u) throw httpError(404, 'User not found');
  res.json(u);
}));

r.get('/messages', ah(async (req, res) => res.json(await Message.find().sort({ createdAt: -1 }))));

r.put('/messages/:id', ah(async (req, res) => {
  res.json(await Message.findByIdAndUpdate(req.params.id, { read: !!req.body.read }, { new: true }));
}));

r.delete('/messages/:id', ah(async (req, res) => {
  await Message.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

r.put('/settings', ah(async (req, res) => {
  const s = await Setting.getSingleton();
  s.set(req.body);
  await s.save();
  res.json(s);
}));

const upload = multer({
  storage: multer.diskStorage({
    destination: 'uploads/',
    filename: (req, file, cb) =>
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) =>
    /^image\/(png|jpe?g|webp|gif|avif)$/.test(file.mimetype) ? cb(null, true) : cb(httpError(400, 'Only image files are allowed')),
});

r.post('/upload', upload.array('images', 8), (req, res) => {
  res.json(req.files.map((f) => `/uploads/${f.filename}`));
});

export default r;
