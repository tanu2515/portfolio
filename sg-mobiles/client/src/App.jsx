import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import RequireAuth from './components/RequireAuth';
import Loader from './components/Loader';
import Home from './pages/Home';
import Shop from './pages/Shop';
import ProductPage from './pages/ProductPage';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import OrderSuccess from './pages/OrderSuccess';
import { Login, Register, ForgotPassword, ResetPassword } from './pages/AuthPages';
import Invoice from './pages/Invoice';
import Account from './pages/Account';
import OrderDetail from './pages/OrderDetail';
import Wishlist from './pages/Wishlist';
import TrackOrder from './pages/TrackOrder';
import Contact from './pages/Contact';
import InfoPage from './pages/InfoPage';
import NotFound from './pages/NotFound';

// The admin panel is split into its own bundle so shoppers never download it.
const AdminLayout = lazy(() => import('./admin/AdminLayout'));
const Dashboard = lazy(() => import('./admin/Dashboard'));
const AdminProducts = lazy(() => import('./admin/Products'));
const ProductForm = lazy(() => import('./admin/ProductForm'));
const AdminCategories = lazy(() => import('./admin/Categories'));
const AdminOrders = lazy(() => import('./admin/Orders'));
const AdminOrderView = lazy(() => import('./admin/OrderView'));
const AdminUsers = lazy(() => import('./admin/Users'));
const AdminCoupons = lazy(() => import('./admin/Coupons'));
const AdminBanners = lazy(() => import('./admin/Banners'));
const AdminMessages = lazy(() => import('./admin/Messages'));
const AdminSettings = lazy(() => import('./admin/Settings'));

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="shop" element={<Shop />} />
        <Route path="product/:slug" element={<ProductPage />} />
        <Route path="cart" element={<Cart />} />
        <Route path="checkout" element={<RequireAuth><Checkout /></RequireAuth>} />
        <Route path="order-success/:id" element={<RequireAuth><OrderSuccess /></RequireAuth>} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="reset-password/:token" element={<ResetPassword />} />
        <Route path="account" element={<RequireAuth><Account /></RequireAuth>} />
        <Route path="account/orders/:id" element={<RequireAuth><OrderDetail /></RequireAuth>} />
        <Route path="wishlist" element={<RequireAuth><Wishlist /></RequireAuth>} />
        <Route path="track-order" element={<TrackOrder />} />
        <Route path="contact" element={<Contact />} />
        <Route path="page/:slug" element={<InfoPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Printable invoice, outside the store layout */}
      <Route path="invoice/:id" element={<RequireAuth><Invoice /></RequireAuth>} />

      <Route
        path="admin"
        element={<Suspense fallback={<Loader full />}><AdminLayout /></Suspense>}
      >
        <Route index element={<Dashboard />} />
        <Route path="products" element={<AdminProducts />} />
        <Route path="products/new" element={<ProductForm />} />
        <Route path="products/:id" element={<ProductForm />} />
        <Route path="categories" element={<AdminCategories />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="orders/:id" element={<AdminOrderView />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="coupons" element={<AdminCoupons />} />
        <Route path="banners" element={<AdminBanners />} />
        <Route path="messages" element={<AdminMessages />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>
    </Routes>
  );
}
