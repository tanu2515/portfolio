import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './config/db.js';
import { notFound, errorHandler } from './middleware/error.js';
import { seedIfEmpty } from './seed.js';
import authRoutes from './routes/auth.js';
import categoryRoutes from './routes/categories.js';
import productRoutes from './routes/products.js';
import orderRoutes, { startUnpaidOrderSweeper } from './routes/orders.js';
import couponRoutes from './routes/coupons.js';
import bannerRoutes from './routes/banners.js';
import adminRoutes from './routes/admin.js';
import siteRoutes from './routes/site.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.chdir(__dirname);
if (!process.env.JWT_SECRET) process.env.JWT_SECRET = 'dev-only-secret';

const app = express();
app.set('trust proxy', 1);
app.use(cors({ origin: process.env.CLIENT_URL || true }));
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', siteRoutes);

// In production, serve the built React app from ../client/dist.
const dist = path.join(__dirname, '../client/dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^\/(?!api|uploads).*/, (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
connectDB()
  .then(seedIfEmpty)
  .then(startUnpaidOrderSweeper)
  .then(() => app.listen(PORT, () => console.log(`SG Mobiles API running on http://localhost:${PORT}`)))
  .catch((err) => {
    console.error('Failed to start:', err.message);
    process.exit(1);
  });
