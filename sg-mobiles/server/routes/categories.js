import { Router } from 'express';
import Category from '../models/Category.js';
import Product from '../models/Product.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { ah, httpError, slugify } from '../middleware/error.js';

const r = Router();

// Flat list; the client builds the menu tree from `parent`.
r.get('/', ah(async (req, res) => {
  res.json(await Category.find().sort({ order: 1, name: 1 }).lean());
}));

r.post('/', protect, adminOnly, ah(async (req, res) => {
  const { name, parent, image, banner, description, showInMenu, showOnHome, order } = req.body;
  if (!name) throw httpError(400, 'Name is required');
  const cat = await Category.create({
    name, image, banner, description, showInMenu, showOnHome, order, parent: parent || null, slug: slugify(req.body.slug || name),
  });
  res.status(201).json(cat);
}));

r.put('/:id', protect, adminOnly, ah(async (req, res) => {
  const { name, parent, image, banner, description, showInMenu, showOnHome, order, slug } = req.body;
  if (parent && parent === req.params.id) throw httpError(400, 'A category cannot be its own parent');
  const cat = await Category.findByIdAndUpdate(
    req.params.id,
    { name, image, banner, description, showInMenu, showOnHome, order, parent: parent || null, slug: slugify(slug || name) },
    { new: true, runValidators: true }
  );
  if (!cat) throw httpError(404, 'Category not found');
  res.json(cat);
}));

r.delete('/:id', protect, adminOnly, ah(async (req, res) => {
  const id = req.params.id;
  if (await Product.exists({ category: id })) throw httpError(400, 'Category has products; move them first');
  if (await Category.exists({ parent: id })) throw httpError(400, 'Category has sub-categories; delete them first');
  await Category.findByIdAndDelete(id);
  res.json({ ok: true });
}));

export default r;
