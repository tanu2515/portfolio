import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiX, FiTrash2, FiShoppingBag } from 'react-icons/fi';
import { useCart } from '../context/CartContext';
import { useShop } from '../context/ShopContext';
import { Img, Qty } from './ui';
import { inr } from '../api';

export function ShippingProgress({ subtotal }) {
  const { settings } = useShop();
  const goal = settings.freeShippingOver || 0;
  if (!goal) return null;
  const left = Math.max(0, goal - subtotal);
  return (
    <div className="ship-progress">
      {left > 0 ? <>Add <b>{inr(left)}</b> more for <b>FREE shipping</b></> : <>🎉 You've unlocked <b>FREE shipping</b>!</>}
      <div className="bar"><i style={{ width: `${Math.min(100, (subtotal / goal) * 100)}%` }} /></div>
    </div>
  );
}

export default function CartDrawer() {
  const { items, setQty, remove, subtotal, drawerOpen: open, setDrawerOpen } = useCart();
  const close = () => setDrawerOpen(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && close();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  return (
    <>
      <div className={`overlay ${open ? 'open' : ''}`} onClick={close} />
      <aside className={`offcanvas right ${open ? 'open' : ''}`} aria-hidden={!open} aria-label="Shopping cart">
        <div className="offcanvas-head">
          <h3>Shopping Cart ({items.length})</h3>
          <button className="close-btn" onClick={close} aria-label="Close cart"><FiX /></button>
        </div>
        <div className="offcanvas-body">
          {items.length === 0 ? (
            <div className="empty">
              <FiShoppingBag />
              <p>Your cart is currently empty.</p>
              <Link to="/shop" className="btn" onClick={close}>Start Shopping</Link>
            </div>
          ) : (
            items.map((i, idx) => (
              <div className="drawer-item" key={i.key} style={{ animationDelay: `${idx * 60}ms` }}>
                <Link to={`/product/${i.slug}`} onClick={close}><Img src={i.image} alt={i.name} /></Link>
                <div className="info">
                  <Link to={`/product/${i.slug}`} onClick={close} className="name">{i.name}</Link>
                  {i.variantName && <div className="line-variant">{i.variantName}</div>}
                  <div className="muted" style={{ fontSize: 13, margin: '4px 0 8px' }}>{inr(i.price)}</div>
                  <Qty value={i.qty} max={i.stock} onChange={(v) => setQty(i.key, v)} />
                </div>
                <button className="rm" onClick={() => remove(i.key)} aria-label="Remove"><FiTrash2 /></button>
              </div>
            ))
          )}
        </div>
        {items.length > 0 && (
          <div className="drawer-foot">
            <ShippingProgress subtotal={subtotal} />
            <div className="row"><span>Subtotal</span><span>{inr(subtotal)}</span></div>
            <Link to="/cart" className="btn btn-outline btn-block" onClick={close}>View Cart</Link>
            <Link to="/checkout" className="btn btn-block" onClick={close}>Checkout</Link>
          </div>
        )}
      </aside>
    </>
  );
}
