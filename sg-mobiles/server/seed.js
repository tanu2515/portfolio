import 'dotenv/config';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import User from './models/User.js';
import Category from './models/Category.js';
import Product from './models/Product.js';
import Banner from './models/Banner.js';
import Coupon from './models/Coupon.js';
import Setting from './models/Setting.js';
import { slugify } from './middleware/error.js';

const img = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=70`;

const IMG = {
  cover: img('photo-1601784551446-20c9e07cdbdb'),
  watch: img('photo-1523275335684-37898b6baf30'),
  smartwatch: img('photo-1546868871-7041f2a55e12'),
  applewatch: img('photo-1579586337278-3befd40fd17a'),
  headphone: img('photo-1505740420928-5e560c06d30e'),
  headphone2: img('photo-1583394838336-acd977736f90'),
  airpods: img('photo-1590658268037-6bf12165a8df'),
  buds: img('photo-1606220588913-b3aacb4d2f46'),
  charger: img('photo-1583863788434-e58a36330cf0'),
  powerbank: img('photo-1609091839311-d5365f9ff1c5'),
  speaker: img('photo-1608043152269-423dbba4e7e1'),
  phone: img('photo-1511707171634-5f897ff02aa9'),
  iphone: img('photo-1592750475338-74b7b21085ab'),
  laptop: img('photo-1517336714731-489689fd1ca8'),
};

// Mirrors the reference store's menu: top-level categories with optional children.
const CATEGORIES = [
  ['Back Lamination'], ['Camera'], ['Charger'],
  ['Cover', ['iPhone Cover', 'Girls Cover', 'Leather Cover', 'Silicon Cover', 'Transparent Cover']],
  ['Laptop / Mac'], ['Data Cable'],
  ['Ear Music', ['Airdopes', 'Airpods', 'Buds', 'Overhead']],
  ['Glass Guard'], ['iPhone'], ['Microphone'], ['Other Gadgets'], ['Phone'], ['Power Bank'],
  ['Ring Light'], ['Smart Watch', ['Fire-Boltt', 'Pebble']], ['Straps'], ['Speaker'],
  ['Stands', ['Gimbal', 'Selfie Stick']], ['Wallets'],
];

const P = (name, cat, price, salePrice, image, extra = {}) => ({ name, cat, price, salePrice, images: [image], ...extra });

const MENU = ['Smart Watch', 'Ear Music', 'Cover', 'Charger'];
const HOME_ROWS = ['Smart Watch', 'Ear Music', 'Cover'];

const WATCH_SPECS = [
  { key: 'Display', value: '1.96" AMOLED' }, { key: 'Bluetooth calling', value: 'Yes' },
  { key: 'Battery life', value: 'Up to 7 days' }, { key: 'Water resistance', value: 'IP67' },
];
const BUDS_SPECS = [
  { key: 'Playback', value: 'Up to 40 hours with case' }, { key: 'Bluetooth', value: 'v5.3' },
  { key: 'Charging', value: 'Type-C fast charging' }, { key: 'Low latency mode', value: 'Yes' },
];

const PRODUCTS = [
  P('Designer Silicon Back Cover', 'Silicon Cover', 899, 650, IMG.cover, { brand: 'SG', tags: ['todaydeal', 'featured'], stock: 40 }),
  P('Crystal Clear Transparent Case', 'Transparent Cover', 699, 449, IMG.cover, { brand: 'SG', tags: ['bestseller'], stock: 60 }),
  P('Premium Leather Flip Cover', 'Leather Cover', 1299, 899, IMG.cover, { brand: 'SG', tags: ['new'], stock: 25 }),
  P('iPhone MagSafe Case', 'iPhone Cover', 1499, 1099, IMG.cover, { brand: 'Spigen', tags: ['featured'], optionName: 'Model', variants: [{ name: 'iPhone 13', stock: 6 }, { name: 'iPhone 14', stock: 8 }, { name: 'iPhone 15', stock: 10 }, { name: 'iPhone 15 Pro Max', price: 1799, salePrice: 1299, stock: 4 }], specs: [{ key: 'Material', value: 'Polycarbonate + TPU' }, { key: 'MagSafe', value: 'Yes' }] }),
  P('Fire-Boltt Ninja Call Pro', 'Fire-Boltt', 2999, 1650, IMG.smartwatch, { brand: 'Fire-Boltt', tags: ['todaydeal', 'bestseller'], optionName: 'Colour', variants: [{ name: 'Black', stock: 12 }, { name: 'Silver', stock: 10, image: IMG.watch }, { name: 'Rose Gold', stock: 8, image: IMG.applewatch }], specs: WATCH_SPECS, warranty: '1 year manufacturer warranty' }),
  P('Fire-Boltt Phoenix AMOLED', 'Fire-Boltt', 4999, 2499, IMG.applewatch, { brand: 'Fire-Boltt', tags: ['featured'], stock: 12 }),
  P('Pebble Cosmos Ultra', 'Pebble', 5999, 3499, IMG.watch, { brand: 'Pebble', tags: ['new'], stock: 15 }),
  P('Pebble Smart Watch Nova', 'Pebble', 6499, null, IMG.watch, { brand: 'Pebble', tags: ['new'], stock: 0, comingSoon: true }),
  P('Wireless Overhead Headphone', 'Overhead', 2049, 1540, IMG.headphone, { brand: 'boAt', tags: ['todaydeal', 'featured'], stock: 22 }),
  P('Studio Bass Headphone Pro', 'Overhead', 3999, 2799, IMG.headphone2, { brand: 'JBL', tags: ['bestseller'], stock: 9 }),
  P('Airpods Pro (2nd Gen) Copy', 'Airpods', 2499, 1299, IMG.airpods, { brand: 'SG', tags: ['bestseller', 'featured'], stock: 50 }),
  P('boAt Airdopes 141', 'Airdopes', 2990, 1199, IMG.buds, { brand: 'boAt', tags: ['bestseller'], stock: 45, specs: BUDS_SPECS, warranty: '1 year manufacturer warranty' }),
  P('Noise Buds VS104', 'Buds', 2499, 999, IMG.buds, { brand: 'Noise', tags: ['new'], stock: 4 }),
  P('33W Dual Port Fast Charger', 'Charger', 1199, 699, IMG.charger, { brand: 'SG', tags: ['featured'], stock: 70 }),
  P('20W USB-C PD Adapter', 'Charger', 999, 549, IMG.charger, { brand: 'Apple', tags: ['bestseller'], stock: 35 }),
  P('Type-C to Type-C Braided Cable', 'Data Cable', 499, 249, IMG.charger, { brand: 'SG', tags: ['new'], stock: 120 }),
  P('20000mAh Power Bank 22.5W', 'Power Bank', 2499, 1499, IMG.powerbank, { brand: 'Mi', tags: ['featured', 'bestseller'], stock: 20 }),
  P('10000mAh Slim Power Bank', 'Power Bank', 1599, 899, IMG.powerbank, { brand: 'Ambrane', tags: ['new'], stock: 3 }),
  P('Portable Bluetooth Speaker', 'Speaker', 2999, 1799, IMG.speaker, { brand: 'JBL', tags: ['featured'], stock: 14 }),
  P('Redmi Note 13 5G (8/128)', 'Phone', 20999, 17999, IMG.phone, { brand: 'Redmi', tags: ['new'], stock: 6 }),
  P('iPhone 15 (128GB)', 'iPhone', 79900, 69900, IMG.iphone, { brand: 'Apple', tags: ['featured'], stock: 5 }),
  P('MacBook Air M2 Sleeve', 'Laptop / Mac', 1999, 1199, IMG.laptop, { brand: 'SG', tags: [], stock: 10 }),
].map((p) => ({
  sku: 'SG-' + p.name.replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase(),
  ...p,
  description: `${p.name} from ${p.brand || 'SG Mobiles'}. Genuine quality, tested before dispatch, with 7-day replacement warranty. Perfect for everyday use.`,
}));

const BANNERS = [
  { placement: 'hero', kicker: 'USE CODE: SALE35', title: 'Heavy On Features, Light On Price', subtitle: 'Smart watches, earbuds and accessories at unbeatable prices.', image: IMG.smartwatch, bgColor: '#0b1f3a', link: '/shop?category=smart-watch', order: 1 },
  { placement: 'hero', kicker: 'NEW ARRIVALS', title: 'Amazing Discounts And Deals', subtitle: 'Premium covers for every phone. Up to 50% off.', image: IMG.cover, bgColor: '#3b0a45', link: '/shop?category=cover', order: 2 },
  { placement: 'hero', kicker: 'MUSIC ON THE GO', title: 'Feel Every Beat', subtitle: 'Headphones & buds from top brands starting at Rs 999.', image: IMG.headphone, bgColor: '#12372a', link: '/shop?category=ear-music', order: 3 },
  { placement: 'deal', kicker: 'Amazing Discounts And Deals', title: 'All New Mobile Case For You', subtitle: 'Starting From ₹650', image: IMG.cover, bgColor: '#fde7e9', link: '/shop?category=cover', order: 1 },
  { placement: 'deal', kicker: 'Deals At A Glance', title: 'Best Smart Watch', subtitle: 'Starting From ₹1650', image: IMG.applewatch, bgColor: '#e5f0ff', link: '/shop?category=smart-watch', order: 2 },
  { placement: 'deal', kicker: 'On Sale Up To 25% Off', title: 'Headphone', subtitle: 'Starting From ₹1540', image: IMG.headphone2, bgColor: '#e8f7ee', link: '/shop?category=overhead', order: 3 },
  { placement: 'promo', kicker: 'Exclusive Offer', title: 'Discounts 50% On All Watch', subtitle: 'Limited time only. While stocks last.', image: IMG.watch, bgColor: '#111827', link: '/shop?category=smart-watch', buttonText: 'Shop Now', order: 1 },
];

export async function seed({ reset = false } = {}) {
  if (reset) {
    await Promise.all([User, Category, Product, Banner, Coupon, Setting].map((m) => m.deleteMany({})));
  }

  const catIds = {};
  let order = 0;
  for (const [name, children = []] of CATEGORIES) {
    const parent = await Category.create({ name, slug: slugify(name), order: order++, showInMenu: MENU.includes(name), showOnHome: HOME_ROWS.includes(name) });
    catIds[name] = parent._id;
    for (const child of children) {
      const c = await Category.create({ name: child, slug: slugify(child), parent: parent._id, order: order++ });
      catIds[child] = c._id;
    }
  }

  // create() (not insertMany) so the pre-save hook totals variant stock.
  for (const { cat, ...p } of PRODUCTS) {
    await Product.create({ ...p, slug: slugify(p.name), category: catIds[cat], salePrice: p.salePrice || undefined });
  }
  await Banner.insertMany(BANNERS);
  await Coupon.insertMany([
    { code: 'SALE35', description: '35% off (up to Rs 1000) on orders above Rs 999', type: 'percent', value: 35, minOrder: 999, maxDiscount: 1000, perUserLimit: 1 },
    { code: 'WELCOME100', description: 'Flat Rs 100 off on orders above Rs 499', type: 'flat', value: 100, minOrder: 499, perUserLimit: 1 },
  ]);
  await Setting.create({});
  await User.create({
    name: 'Store Admin',
    email: process.env.ADMIN_EMAIL || 'admin@sgmobiles.com',
    password: process.env.ADMIN_PASSWORD || 'admin123',
    role: 'admin',
  });
  console.log(`Seeded ${PRODUCTS.length} products, ${Object.keys(catIds).length} categories, admin: ${process.env.ADMIN_EMAIL || 'admin@sgmobiles.com'}`);
}

export async function seedIfEmpty() {
  if (!(await Category.estimatedDocumentCount())) await seed();
}

// `npm run seed` wipes and reseeds the configured database.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { connectDB } = await import('./config/db.js');
  await connectDB();
  await seed({ reset: true });
  await mongoose.disconnect();
  process.exit(0);
}
