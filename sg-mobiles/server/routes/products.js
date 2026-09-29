import { Router } from 'express';
import express from 'express';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { ah, httpError, slugify } from '../middleware/error.js';
import { toCSV, parseCSV } from '../utils/csv.js';

const r = Router();

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Shared filter builder for the shop page and the admin list.
async function buildQuery(q, { includeInactive = false } = {}) {
  const filter = includeInactive ? {} : { active: true };
  if (includeInactive && q.status === 'active') filter.active = true;
  if (includeInactive && q.status === 'hidden') filter.active = false;
  if (includeInactive && q.status === 'lowstock') filter.stock = { $lte: Number(q.threshold) || 5 };
  if (q.category) {
    const cat = await Category.findOne({ slug: q.category });
    if (!cat) return null;
    const children = await Category.find({ parent: cat._id }).select('_id');
    filter.category = { $in: [cat._id, ...children.map((c) => c._id)] };
  }
  if (q.ids) filter._id = { $in: String(q.ids).split(',').filter((id) => /^[a-f\d]{24}$/i.test(id)) };
  if (q.q) {
    const rx = new RegExp(escapeRegex(q.q.trim()), 'i');
    filter.$or = [{ name: rx }, { brand: rx }, { description: rx }, { sku: rx }, { 'variants.name': rx }];
  }
  if (q.tag) filter.tags = q.tag;
  if (q.brand) filter.brand = q.brand;
  if (q.inStock === 'true') filter.stock = { $gt: 0 };
  if (q.onSale === 'true') filter.$expr = { $and: [{ $gt: ['$salePrice', 0] }, { $lt: ['$salePrice', '$price'] }] };
  const min = Number(q.min), max = Number(q.max);
  if (min || max) {
    // Filter on the effective price (sale price when present).
    const expr = { $cond: [{ $and: [{ $gt: ['$salePrice', 0] }, { $lt: ['$salePrice', '$price'] }] }, '$salePrice', '$price'] };
    const conds = [];
    if (min) conds.push({ $gte: [expr, min] });
    if (max) conds.push({ $lte: [expr, max] });
    filter.$expr = filter.$expr ? { $and: [filter.$expr, ...conds] } : { $and: conds };
  }
  return filter;
}

const SORTS = {
  newest: { createdAt: -1 },
  'price-asc': { salePrice: 1, price: 1 },
  'price-desc': { salePrice: -1, price: -1 },
  rating: { rating: -1, numReviews: -1 },
  popular: { numReviews: -1, rating: -1 },
  name: { name: 1 },
};

async function list(req, res, opts) {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 12);
  const filter = await buildQuery(req.query, opts);
  if (!filter) return res.json({ products: [], total: 0, page, pages: 0 });
  const [products, total] = await Promise.all([
    Product.find(filter)
      .select('-reviews -description -specs')
      .populate('category', 'name slug')
      .sort(SORTS[req.query.sort] || SORTS.newest)
      .skip((page - 1) * limit)
      .limit(limit),
    Product.countDocuments(filter),
  ]);
  res.json({ products, total, page, pages: Math.ceil(total / limit) });
}

r.get('/', ah((req, res) => list(req, res)));
r.get('/admin/all', protect, adminOnly, ah((req, res) => list(req, res, { includeInactive: true })));

r.get('/brands', ah(async (req, res) => {
  res.json((await Product.distinct('brand', { active: true })).filter(Boolean).sort());
}));

// Lightweight results for the header search dropdown.
r.get('/suggest', ah(async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) return res.json({ products: [], categories: [] });
  const rx = new RegExp(escapeRegex(q), 'i');
  const [products, categories] = await Promise.all([
    Product.find({ active: true, $or: [{ name: rx }, { brand: rx }] })
      .select('name slug images price salePrice').limit(6),
    Category.find({ name: rx }).select('name slug').limit(4),
  ]);
  res.json({ products, categories });
}));

// ---- admin CSV (registered before /:slug so the paths don't collide) ----
const CSV_COLS = ['name', 'category', 'brand', 'sku', 'price', 'salePrice', 'stock', 'image', 'tags', 'description', 'active'];

r.get('/admin/export', protect, adminOnly, ah(async (req, res) => {
  const products = await Product.find().populate('category', 'slug').sort({ createdAt: -1 }).lean();
  const rows = products.map((p) => ({
    ...p, category: p.category?.slug, image: (p.images || []).join('|'), tags: (p.tags || []).join('|'),
  }));
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="products.csv"');
  res.send('﻿' + toCSV(rows, CSV_COLS));
}));

// Body: raw CSV text. Rows are matched to existing products by SKU, then by name; others are created.
r.post('/admin/import', protect, adminOnly, express.text({ type: '*/*', limit: '5mb' }), ah(async (req, res) => {
  const rows = parseCSV(String(req.body || '').replace(/^﻿/, ''));
  if (!rows.length) throw httpError(400, 'The CSV file is empty');
  const cats = await Category.find().lean();
  const catBy = (v) => cats.find((c) => c.slug === slugify(v || '') || c.name.toLowerCase() === String(v || '').toLowerCase());
  let created = 0, updated = 0;
  const errors = [];
  for (const [i, row] of rows.entries()) {
    const line = i + 2;
    try {
      if (!row.name) throw new Error('name is required');
      const cat = catBy(row.category);
      if (!cat) throw new Error(`unknown category "${row.category}"`);
      const price = Number(row.price);
      if (!(price >= 0) || row.price === '') throw new Error('invalid price');
      const data = {
        name: row.name, category: cat._id, brand: row.brand || undefined, sku: row.sku || undefined,
        price, salePrice: Number(row.saleprice) > 0 ? Number(row.saleprice) : undefined,
        stock: Math.max(0, parseInt(row.stock) || 0),
        images: row.image ? row.image.split('|').map((s) => s.trim()).filter(Boolean) : undefined,
        tags: row.tags ? row.tags.split('|').map((s) => s.trim()).filter((t) => ['featured', 'bestseller', 'new', 'todaydeal'].includes(t)) : undefined,
        description: row.description || undefined,
        active: row.active ? !/^(false|0|no)$/i.test(row.active) : true,
      };
      const existing = (data.sku && (await Product.findOne({ sku: data.sku }))) || (await Product.findOne({ name: data.name }));
      if (existing) {
        Object.entries(data).forEach(([k, v]) => v !== undefined && existing.set(k, v));
        if (!data.salePrice) existing.salePrice = undefined;
        await existing.save();
        updated++;
      } else {
        let slug = slugify(data.name);
        if (await Product.exists({ slug })) slug += '-' + Date.now().toString(36);
        await Product.create({ ...data, slug });
        created++;
      }
    } catch (e) {
      errors.push(`Row ${line}: ${e.message}`);
    }
  }
  res.json({ created, updated, errors });
}));

r.get('/admin/:id', protect, adminOnly, ah(async (req, res) => {
  const p = await Product.findById(req.params.id);
  if (!p) throw httpError(404, 'Product not found');
  res.json(p);
}));

r.get('/:slug', ah(async (req, res) => {
  const p = await Product.findOne({ slug: req.params.slug, active: true }).populate('category', 'name slug parent');
  if (!p) throw httpError(404, 'Product not found');
  const [related, parent] = await Promise.all([
    Product.find({ category: p.category._id, _id: { $ne: p._id }, active: true }).select('-reviews -description -specs').limit(8),
    p.category.parent ? Category.findById(p.category.parent).select('name slug') : null,
  ]);
  res.json({ product: p, related, parentCategory: parent });
}));

r.post('/:id/reviews', protect, ah(async (req, res) => {
  const { rating, comment } = req.body;
  const n = Number(rating);
  if (!(n >= 1 && n <= 5)) throw httpError(400, 'Rating must be between 1 and 5');
  const p = await Product.findById(req.params.id);
  if (!p) throw httpError(404, 'Product not found');
  if (p.reviews.some((rv) => rv.user?.toString() === req.user._id.toString()))
    throw httpError(400, 'You have already reviewed this product');
  p.reviews.push({ user: req.user._id, name: req.user.name, rating: n, comment });
  p.numReviews = p.reviews.length;
  p.rating = +(p.reviews.reduce((s, x) => s + x.rating, 0) / p.numReviews).toFixed(1);
  await p.save();
  res.status(201).json(p);
}));

const num = (v) => (v === '' || v === null || v === undefined ? undefined : Number(v));

const pick = (b) => ({
  name: b.name,
  sku: b.sku,
  description: b.description,
  brand: b.brand,
  category: b.category,
  price: num(b.price),
  salePrice: num(b.salePrice) || undefined,
  images: b.images,
  stock: num(b.stock),
  optionName: b.optionName,
  variants: Array.isArray(b.variants)
    ? b.variants.filter((v) => v?.name?.trim()).map((v) => ({
        ...(v._id ? { _id: v._id } : {}),
        name: v.name.trim(), sku: v.sku, image: v.image,
        price: num(v.price) || undefined, salePrice: num(v.salePrice) || undefined, stock: num(v.stock) || 0,
      }))
    : undefined,
  specs: Array.isArray(b.specs) ? b.specs.filter((s) => s?.key?.trim()) : undefined,
  warranty: b.warranty,
  tags: b.tags,
  comingSoon: b.comingSoon,
  active: b.active,
});

r.post('/', protect, adminOnly, ah(async (req, res) => {
  const data = pick(req.body);
  if (!data.name) throw httpError(400, 'Name is required');
  let slug = slugify(req.body.slug || data.name);
  if (await Product.exists({ slug })) slug += '-' + Date.now().toString(36);
  res.status(201).json(await Product.create({ ...data, slug }));
}));

r.post('/:id/duplicate', protect, adminOnly, ah(async (req, res) => {
  const src = await Product.findById(req.params.id).lean();
  if (!src) throw httpError(404, 'Product not found');
  const { _id, createdAt, updatedAt, reviews, rating, numReviews, ...rest } = src;
  const copy = await Product.create({
    ...rest,
    name: `${src.name} (Copy)`,
    slug: `${src.slug}-copy-${Date.now().toString(36)}`,
    sku: undefined,
    active: false,
    variants: (src.variants || []).map(({ _id: _v, ...v }) => v),
  });
  res.status(201).json(copy);
}));

r.put('/:id', protect, adminOnly, ah(async (req, res) => {
  const data = pick(req.body);
  if (req.body.slug) data.slug = slugify(req.body.slug);
  const p = await Product.findById(req.params.id);
  if (!p) throw httpError(404, 'Product not found');
  Object.entries(data).forEach(([k, v]) => v !== undefined && p.set(k, v));
  if (!num(req.body.salePrice) && 'salePrice' in req.body) p.salePrice = undefined;
  await p.save();
  res.json(p);
}));

r.delete('/:id', protect, adminOnly, ah(async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

export default r;
