import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiLock, FiTag, FiTruck, FiXCircle } from 'react-icons/fi';
import { api, inr, fmtDay } from '../api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useShop } from '../context/ShopContext';
import { useToast } from '../context/ToastContext';
import { Img, PageHead } from '../components/ui';
import Loader from '../components/Loader';
import { payWithRazorpay, useTitle } from '../components/lib';

export default function Checkout() {
  const { items, subtotal, clear } = useCart();
  const { user } = useAuth();
  const { settings } = useShop();
  const toast = useToast();
  const nav = useNavigate();
  useTitle('Checkout');
  const saved = user.address || {};
  const [addr, setAddr] = useState({
    name: saved.name || user.name, phone: saved.phone || user.phone || '',
    line1: saved.line1 || '', city: saved.city || '', state: saved.state || '', pincode: saved.pincode || '',
  });
  const [payment, setPayment] = useState('');
  const [code, setCode] = useState('');
  const [coupon, setCoupon] = useState(null);
  const [delivery, setDelivery] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [placed, setPlaced] = useState(false);
  const autoFilled = useRef({ city: '', state: '' });

  // Pincode → delivery estimate + city/state auto-fill (India Post API; ignored if unreachable).
  useEffect(() => {
    const pin = addr.pincode;
    setDelivery(null);
    if (!/^\d{6}$/.test(pin)) return;
    let live = true;
    api(`/delivery/check?pincode=${pin}`).then((d) => live && setDelivery(d)).catch(() => {});
    fetch(`https://api.postalpincode.in/pincode/${pin}`)
      .then((r) => r.json())
      .then((d) => {
        const po = d?.[0]?.Status === 'Success' && d[0].PostOffice?.[0];
        if (!live || !po) return;
        const city = po.District, state = po.State;
        setAddr((a) => ({
          ...a,
          city: !a.city || a.city === autoFilled.current.city ? city : a.city,
          state: !a.state || a.state === autoFilled.current.state ? state : a.state,
        }));
        autoFilled.current = { city, state };
      })
      .catch(() => {});
    return () => { live = false; };
  }, [addr.pincode]);

  const codAllowed = settings.codEnabled && (!settings.codMaxOrder || subtotal <= settings.codMaxOrder);
  const options = [
    ...(codAllowed ? [
      ['COD', 'Cash on Delivery', 'Pay in cash when your order arrives'],
      ['UPI', 'UPI on Delivery', 'Scan & pay via GPay / PhonePe / Paytm at delivery'],
    ] : []),
    ...(settings.onlinePayment ? [['Online', 'Pay Online', 'UPI, cards, netbanking & wallets via Razorpay (secure)']] : []),
  ];

  // Keep the selected method valid when settings/subtotal change.
  useEffect(() => {
    if (!options.some(([v]) => v === payment)) setPayment(options[0]?.[0] || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codAllowed, settings.onlinePayment]);

  if (placed) return <Loader full />;
  if (!items.length) {
    return (
      <div className="empty" style={{ padding: '80px 16px' }}>
        <h3>Your cart is empty</h3>
        <Link to="/shop" className="btn">Go Shopping</Link>
      </div>
    );
  }

  const shipping = subtotal >= settings.freeShippingOver ? 0 : settings.shippingFee;
  const codCharge = payment && payment !== 'Online' ? settings.codCharge || 0 : 0;
  const discount = coupon?.discount || 0;
  const total = subtotal + shipping + codCharge - discount;
  const blocked = delivery && !delivery.serviceable;

  const applyCoupon = async () => {
    if (!code.trim()) return;
    try {
      const c = await api('/coupons/apply', { method: 'POST', body: { code, subtotal } });
      setCoupon(c);
      toast(`Coupon ${c.code} applied, you saved ${inr(c.discount)}`);
    } catch (e) {
      setCoupon(null);
      toast(e.message, 'error');
    }
  };

  const place = async (e) => {
    e.preventDefault();
    setError('');
    if (addr.phone.replace(/\D/g, '').length < 10) return setError('Enter a valid 10-digit phone number');
    if (!/^\d{6}$/.test(addr.pincode)) return setError('Enter a valid 6-digit pincode');
    if (blocked) return setError(delivery.message);
    if (!payment) return setError('No payment method is available for this order');
    setBusy(true);
    let res;
    try {
      res = await api('/orders', {
        method: 'POST',
        body: {
          items: items.map((i) => ({ product: i._id, variant: i.variant, qty: i.qty })),
          shippingAddress: addr,
          paymentMethod: payment,
          couponCode: coupon?.code,
        },
      });
    } catch (err) {
      setError(err.message);
      setBusy(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // The order exists now (stock reserved), so the cart is emptied whatever happens with payment.
    const { order, razorpay, paymentError } = res;
    setPlaced(true);
    clear();
    if (payment !== 'Online') return nav(`/order-success/${order._id}`, { replace: true });

    const pending = () => nav(`/account/orders/${order._id}`, { replace: true });
    if (!razorpay) {
      toast(`Order placed but payment could not start: ${paymentError || 'try again'}. You can pay from this page.`, 'error');
      return pending();
    }
    try {
      const paid = await payWithRazorpay({ razorpay, order, user, storeName: settings.storeName });
      if (paid) return nav(`/order-success/${order._id}`, { replace: true });
      toast('Payment not completed. You can pay from your order page within 30 minutes.', 'error');
    } catch (err) {
      toast(err.message, 'error');
    }
    pending();
  };

  const f = (k) => ({ value: addr[k], onChange: (e) => setAddr({ ...addr, [k]: e.target.value }), required: true, className: 'input' });

  return (
    <>
      <PageHead title="Checkout" crumbs={[['Cart', '/cart'], 'Checkout']} />
      <form className="container cart-layout" onSubmit={place}>
        <div>
          {error && <div className="error-box">{error}</div>}
          <div className="box">
            <h3>Shipping Address</h3>
            <div className="grid-2">
              <div className="field"><label>Full name</label><input {...f('name')} autoComplete="name" /></div>
              <div className="field"><label>Phone</label><input {...f('phone')} type="tel" autoComplete="tel" /></div>
            </div>
            <div className="field"><label>Address (house no, street, area, landmark)</label><input {...f('line1')} autoComplete="street-address" /></div>
            <div className="grid-3">
              <div className="field">
                <label>Pincode</label>
                <input {...f('pincode')} onChange={(e) => setAddr({ ...addr, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })} inputMode="numeric" maxLength={6} autoComplete="postal-code" />
              </div>
              <div className="field"><label>City</label><input {...f('city')} /></div>
              <div className="field"><label>State</label><input {...f('state')} /></div>
            </div>
            {delivery && (delivery.serviceable ? (
              <div className="eta-note page-fade"><FiTruck /> Estimated delivery <b>{fmtDay(delivery.eta.from)} – {fmtDay(delivery.eta.to)}</b></div>
            ) : (
              <div className="eta-note bad page-fade"><FiXCircle /> {delivery.message}</div>
            ))}
          </div>
          <div className="box">
            <h3>Payment Method</h3>
            {options.length === 0 && <p className="muted">No payment method is available for this order. Please contact us.</p>}
            {settings.codEnabled && !codAllowed && (
              <p className="muted" style={{ fontSize: 13 }}>Pay on delivery is available for orders up to {inr(settings.codMaxOrder)}.</p>
            )}
            {options.map(([val, label, sub]) => (
              <label key={val} className={`pay-opt ${payment === val ? 'active' : ''}`}>
                <input type="radio" name="pay" checked={payment === val} onChange={() => setPayment(val)} />
                <div>
                  <b>{label}</b>
                  {val !== 'Online' && settings.codCharge > 0 && <span className="muted"> (+{inr(settings.codCharge)} fee)</span>}
                  <div className="muted" style={{ fontSize: 13 }}>{sub}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <aside className="summary">
          <h3>Your Order</h3>
          {items.map((i) => (
            <div className="mini-item" key={i.key}>
              <Img src={i.image} alt="" />
              <span className="n">
                {i.name} <span className="muted">× {i.qty}</span>
                {i.variantName && <span className="line-variant">{i.variantName}</span>}
              </span>
              <b>{inr(i.price * i.qty)}</b>
            </div>
          ))}
          <div className="coupon-row">
            <input className="input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Coupon code" aria-label="Coupon code" />
            <button type="button" className="btn btn-dark btn-sm" onClick={applyCoupon}><FiTag /> Apply</button>
          </div>
          {coupon && (
            <div className="coupon-ok">
              <span><b>{coupon.code}</b> applied</span>
              <button type="button" onClick={() => { setCoupon(null); setCode(''); }}>Remove</button>
            </div>
          )}
          <div className="sum-row"><span>Subtotal</span><span>{inr(subtotal)}</span></div>
          <div className="sum-row"><span>Shipping</span><span>{shipping ? inr(shipping) : 'FREE'}</span></div>
          {codCharge > 0 && <div className="sum-row"><span>Pay-on-delivery fee</span><span>{inr(codCharge)}</span></div>}
          {discount > 0 && <div className="sum-row" style={{ color: 'var(--ok)' }}><span>Discount</span><span>−{inr(discount)}</span></div>}
          <div className="sum-row total"><span>Total</span><span>{inr(total)}</span></div>
          <button className="btn btn-block" style={{ marginTop: 14 }} disabled={busy || blocked || !payment}>
            <FiLock /> {busy ? 'Placing order…' : payment === 'Online' ? `Pay ${inr(total)}` : `Place Order · ${inr(total)}`}
          </button>
          <p className="muted center" style={{ fontSize: 12, marginTop: 10 }}>By placing the order you agree to our <Link className="link" to="/page/terms">terms</Link>.</p>
        </aside>
      </form>
    </>
  );
}
