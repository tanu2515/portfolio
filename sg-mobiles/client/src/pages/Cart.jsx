import { Link, useNavigate } from 'react-router-dom';
import { FiTrash2, FiShoppingBag, FiArrowLeft } from 'react-icons/fi';
import { useCart } from '../context/CartContext';
import { useShop } from '../context/ShopContext';
import { Img, PageHead, Qty } from '../components/ui';
import { ShippingProgress } from '../components/CartDrawer';
import { inr } from '../api';
import { useTitle } from '../components/lib';

export default function Cart() {
  const { items, setQty, remove, clear, subtotal } = useCart();
  const { settings } = useShop();
  const nav = useNavigate();
  useTitle('Shopping Cart');
  const shipping = subtotal >= settings.freeShippingOver ? 0 : settings.shippingFee;

  if (!items.length) {
    return (
      <>
        <PageHead title="Shopping Cart" crumbs={['Cart']} />
        <div className="empty" style={{ padding: '80px 16px' }}>
          <FiShoppingBag />
          <h3>Your cart is currently empty</h3>
          <Link to="/shop" className="btn">Return to Shop</Link>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHead title="Shopping Cart" crumbs={['Cart']} />
      <div className="container cart-layout">
        <div>
          <table className="table">
            <thead>
              <tr><th>Product</th><th>Price</th><th>Quantity</th><th>Total</th><th /></tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.key} className="page-fade">
                  <td>
                    <div className="cart-prod">
                      <Img src={i.image} alt={i.name} />
                      <div><Link to={`/product/${i.slug}`} className="card-name">{i.name}</Link>{i.variantName && <div className="line-variant">{i.variantName}</div>}</div>
                    </div>
                  </td>
                  <td className="hide-sm">{inr(i.price)}</td>
                  <td><Qty value={i.qty} max={i.stock} onChange={(v) => setQty(i.key, v)} /></td>
                  <td><b>{inr(i.price * i.qty)}</b></td>
                  <td><button className="icon-btn" onClick={() => remove(i.key)} aria-label="Remove"><FiTrash2 /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20, gap: 10, flexWrap: 'wrap' }}>
            <Link to="/shop" className="btn btn-outline"><FiArrowLeft /> Continue Shopping</Link>
            <button className="btn btn-dark" onClick={clear}>Clear Cart</button>
          </div>
        </div>
        <aside className="summary">
          <h3>Cart Totals</h3>
          <div className="sum-row"><span>Subtotal</span><span>{inr(subtotal)}</span></div>
          <div className="sum-row"><span>Shipping</span><span>{shipping ? inr(shipping) : 'FREE'}</span></div>
          <div className="sum-row total"><span>Total</span><span>{inr(subtotal + shipping)}</span></div>
          <div style={{ margin: '14px 0' }}><ShippingProgress subtotal={subtotal} /></div>
          <p className="muted" style={{ fontSize: 13 }}>Have a coupon? Apply it at checkout.</p>
          <button className="btn btn-block" onClick={() => nav('/checkout')}>Proceed to Checkout</button>
        </aside>
      </div>
    </>
  );
}
