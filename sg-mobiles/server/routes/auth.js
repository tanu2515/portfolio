import { Router } from 'express';
import crypto from 'crypto';
import User from '../models/User.js';
import Setting from '../models/Setting.js';
import { protect, signToken } from '../middleware/auth.js';
import { ah, httpError } from '../middleware/error.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { sendMail, resetMail } from '../utils/mailer.js';

const r = Router();
const authLimit = rateLimit({ max: 20 });
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

const publicUser = (u) => ({
  _id: u._id,
  name: u.name,
  email: u.email,
  phone: u.phone,
  role: u.role,
  address: u.address,
  wishlist: u.wishlist,
});

r.post('/register', authLimit, ah(async (req, res) => {
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password) throw httpError(400, 'Name, email and password are required');
  if (password.length < 6) throw httpError(400, 'Password must be at least 6 characters');
  if (await User.exists({ email: email.toLowerCase() })) throw httpError(400, 'Email is already registered');
  const user = await User.create({ name, email, password, phone });
  res.status(201).json({ token: signToken(user._id), user: publicUser(user) });
}));

r.post('/login', authLimit, ah(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: (email || '').toLowerCase() }).select('+password');
  if (!user || !(await user.matchPassword(password || ''))) throw httpError(401, 'Invalid email or password');
  if (user.blocked) throw httpError(403, 'Your account has been blocked');
  res.json({ token: signToken(user._id), user: publicUser(user) });
}));

// Always answers the same way so the endpoint can't be used to discover registered emails.
r.post('/forgot', authLimit, ah(async (req, res) => {
  const user = await User.findOne({ email: String(req.body.email || '').toLowerCase().trim() });
  if (user && !user.blocked) {
    const token = crypto.randomBytes(32).toString('hex');
    user.resetToken = sha(token);
    user.resetExpires = new Date(Date.now() + 30 * 60 * 1000);
    await user.save();
    const base = process.env.CLIENT_URL || `${req.protocol}://${req.get('host')}`;
    const { storeName } = await Setting.getSingleton();
    await sendMail(resetMail(user, `${base}/reset-password/${token}`, storeName));
  }
  res.json({ message: 'If that email is registered, a reset link has been sent.' });
}));

r.post('/reset', authLimit, ah(async (req, res) => {
  const { token, password } = req.body;
  if (!password || password.length < 6) throw httpError(400, 'Password must be at least 6 characters');
  const user = await User.findOne({ resetToken: sha(String(token || '')), resetExpires: { $gt: new Date() } });
  if (!user) throw httpError(400, 'This reset link is invalid or has expired');
  user.password = password;
  user.resetToken = undefined;
  user.resetExpires = undefined;
  await user.save();
  res.json({ token: signToken(user._id), user: publicUser(user) });
}));

r.get('/me', protect, (req, res) => res.json(publicUser(req.user)));

r.put('/me', protect, ah(async (req, res) => {
  const { name, phone, address, currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');
  if (name) user.name = name;
  if (phone !== undefined) user.phone = phone;
  if (address) user.address = address;
  if (newPassword) {
    if (!(await user.matchPassword(currentPassword || ''))) throw httpError(400, 'Current password is wrong');
    if (newPassword.length < 6) throw httpError(400, 'New password must be at least 6 characters');
    user.password = newPassword;
  }
  await user.save();
  res.json(publicUser(user));
}));

r.get('/wishlist', protect, ah(async (req, res) => {
  const user = await User.findById(req.user._id).populate({ path: 'wishlist', match: { active: true } });
  res.json(user.wishlist);
}));

// Toggle a product in the wishlist; returns the new list of ids.
r.post('/wishlist/:productId', protect, ah(async (req, res) => {
  const id = req.params.productId;
  const user = req.user;
  const has = user.wishlist.some((w) => w.toString() === id);
  user.wishlist = has ? user.wishlist.filter((w) => w.toString() !== id) : [...user.wishlist, id];
  await user.save();
  res.json(user.wishlist);
}));

export default r;
