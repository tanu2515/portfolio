import { useEffect } from 'react';
import { api, effectivePrice } from '../api';
import { useShop } from '../context/ShopContext';

// Sets the browser tab title, e.g. "Cart | SG Mobiles".
export function useTitle(title) {
  const { settings } = useShop();
  useEffect(() => {
    document.title = title ? `${title} | ${settings.storeName}` : `${settings.storeName} - Mobile Accessories Store`;
  }, [title, settings.storeName]);
}

// ---- variants (mirrors server Product.resolve) ----
const priceOf = (price, sale) => (sale && sale < price ? sale : price);

export const findVariant = (p, id) => p?.variants?.find((v) => v._id === id) || null;
export const firstInStock = (p) => (p?.variants?.find((v) => v.stock > 0) || p?.variants?.[0])?._id || null;

// Unit price, MRP, stock and image for a product or one of its variants.
export function variantPricing(p, v) {
  if (!v) return { price: effectivePrice(p), mrp: p.price, stock: p.stock, image: p.images?.[0] };
  const mrp = v.price || p.price;
  const price = v.price ? priceOf(v.price, v.salePrice) : priceOf(p.price, v.salePrice || p.salePrice);
  return { price, mrp, stock: v.stock, image: v.image || p.images?.[0] };
}

// ---- recently viewed ----
const RECENT_KEY = 'sg_recent';
export const getRecent = () => {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY)) || [];
  } catch {
    return [];
  }
};
export const pushRecent = (id) => {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify([id, ...getRecent().filter((x) => x !== id)].slice(0, 12)));
  } catch { /* storage unavailable */ }
};

// ---- Razorpay ----
let rzpScript;
function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve();
  rzpScript ||= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = resolve;
    s.onerror = () => {
      rzpScript = null;
      reject(new Error('Could not load the payment gateway. Check your connection and try again.'));
    };
    document.body.appendChild(s);
  });
  return rzpScript;
}

// Opens Razorpay checkout. Resolves with the verified (paid) order, or null if the customer closed it.
export async function payWithRazorpay({ razorpay, order, user, storeName }) {
  await loadRazorpay();
  return new Promise((resolve, reject) => {
    const rz = new window.Razorpay({
      key: razorpay.key,
      order_id: razorpay.orderId,
      amount: razorpay.amount,
      currency: razorpay.currency,
      name: storeName,
      description: `Order #${order.orderNo}`,
      prefill: { name: user?.name, email: user?.email, contact: order.shippingAddress?.phone || user?.phone },
      theme: { color: '#ff5a1f' },
      handler: async (resp) => {
        try {
          resolve(await api(`/orders/${order._id}/verify`, { method: 'POST', body: resp }));
        } catch (e) {
          reject(e);
        }
      },
      modal: { ondismiss: () => resolve(null) },
    });
    rz.open();
  });
}

export const waLink = (digits, text) =>
  `https://wa.me/${String(digits || '').replace(/\D/g, '')}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
