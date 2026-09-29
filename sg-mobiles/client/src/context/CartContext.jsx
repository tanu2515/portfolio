import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { variantPricing } from '../components/lib';

const CartCtx = createContext(null);
const KEY = 'sg_cart';

const lineKey = (productId, variantId) => `${productId}:${variantId || ''}`;

const load = () => {
  try {
    const list = JSON.parse(localStorage.getItem(KEY)) || [];
    // Lines saved before variants existed have no key.
    return list.map((l) => (l.key ? l : { ...l, key: lineKey(l._id, l.variant) }));
  } catch {
    return [];
  }
};

// Cart lives in localStorage; each line keeps a snapshot for display.
// The server recomputes prices at checkout, so stale snapshots are harmless.
export function CartProvider({ children }) {
  const [items, setItems] = useState(load);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => localStorage.setItem(KEY, JSON.stringify(items)), [items]);

  const add = (p, qty = 1, variant = null) => {
    const key = lineKey(p._id, variant?._id);
    const { price, mrp, stock, image } = variantPricing(p, variant);
    const max = stock ?? 99;
    setItems((list) => {
      const found = list.find((i) => i.key === key);
      if (found) return list.map((i) => (i.key === key ? { ...i, stock: max, qty: Math.min(max, i.qty + qty) } : i));
      return [...list, {
        key, _id: p._id, variant: variant?._id, variantName: variant?.name,
        slug: p.slug, name: p.name, image, price, mrp, stock: max, qty: Math.min(max, qty),
      }];
    });
    setDrawerOpen(true);
  };

  const setQty = (key, qty) =>
    setItems((list) => list.map((i) => (i.key === key ? { ...i, qty: Math.max(1, Math.min(i.stock ?? 99, qty)) } : i)));
  const remove = (key) => setItems((list) => list.filter((i) => i.key !== key));
  const clear = () => setItems([]);

  const count = items.reduce((s, i) => s + i.qty, 0);
  const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);

  const value = useMemo(
    () => ({ items, add, setQty, remove, clear, count, subtotal, drawerOpen, setDrawerOpen }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, drawerOpen]
  );
  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export const useCart = () => useContext(CartCtx);
