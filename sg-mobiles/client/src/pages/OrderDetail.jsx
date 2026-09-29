import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FiTruck, FiExternalLink, FiFileText, FiCreditCard, FiRotateCcw, FiCopy } from 'react-icons/fi';
import { api, inr, fmtDay, statusKey } from '../api';
import { useAuth } from '../context/AuthContext';
import { useShop } from '../context/ShopContext';
import { useToast } from '../context/ToastContext';
import { Img, PageHead } from '../components/ui';
import OrderTracker from '../components/OrderTracker';
import Loader from '../components/Loader';
import { payWithRazorpay, useTitle } from '../components/lib';

const RETURN_REASONS = ['Damaged product', 'Defective / not working', 'Wrong item received', 'Missing parts', 'Other'];

export default function OrderDetail() {
  const { id } = useParams();
  const toast = useToast();
  const { user } = useAuth();
  const { settings } = useShop();
  const [o, setO] = useState(null);
  const [err, setErr] = useState('');
  const [paying, setPaying] = useState(false);
  useTitle(o ? `Order #${o.orderNo}` : 'Order');

  useEffect(() => { api(`/orders/${id}`).then(setO).catch((e) => setErr(e.message)); }, [id]);

  const cancel = async () => {
    if (!window.confirm('Cancel this order?')) return;
    try {
      setO(await api(`/orders/${id}/cancel`, { method: 'PUT' }));
      toast('Order cancelled');
    } catch (e) { toast(e.message, 'error'); }
  };

  const payNow = async () => {
    setPaying(true);
    try {
      const { razorpay } = await api(`/orders/${id}/pay`, { method: 'POST' });
      const paid = await payWithRazorpay({ razorpay, order: o, user, storeName: settings.storeName });
      if (paid) { setO(paid); toast('Payment successful, thank you!'); }
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setPaying(false);
    }
  };

  if (err) return <div className="container empty"><p>{err}</p><Link to="/account?tab=orders" className="btn">My Orders</Link></div>;
  if (!o) return <Loader full />;
  const a = o.shippingAddress;
  const awaitingPayment = o.paymentMethod === 'Online' && !o.isPaid && o.status !== 'Cancelled';
  const deliveredAt = new Date(o.deliveredAt || o.updatedAt);
  const returnUntil = new Date(deliveredAt.getTime() + settings.returnDays * 86400000);
  const canReturn = o.status === 'Delivered' && !o.returnRequest?.status && Date.now() < returnUntil.getTime();

  return (
    <>
      <PageHead title={`Order #${o.orderNo}`} crumbs={[['My Account', '/account'], ['Orders', '/account?tab=orders'], o.orderNo]} />
      <div className="container" style={{ padding: '30px 16px' }}>
        {awaitingPayment && (
          <div className="alert-pay page-fade">
            <div><b>Payment pending.</b> Complete payment within 30 minutes of ordering, or the order will be cancelled automatically.</div>
            <button className="btn btn-sm" onClick={payNow} disabled={paying}><FiCreditCard /> {paying ? 'Opening…' : `Pay ${inr(o.total)} now`}</button>
          </div>
        )}
        <div className="box">
          <div className="order-top">
            <div>Placed on <b>{new Date(o.createdAt).toLocaleString('en-IN')}</b> · <span className={`status status-${statusKey(o.status)}`}>{o.status}</span></div>
            <div className="order-actions">
              <Link to={`/invoice/${o._id}`} target="_blank" className="btn btn-outline btn-sm"><FiFileText /> Invoice</Link>
              {['Pending', 'Processing'].includes(o.status) && <button className="btn btn-outline btn-sm" onClick={cancel}>Cancel Order</button>}
            </div>
          </div>
          <OrderTracker status={o.status} history={o.statusHistory} />
          <ShipmentInfo o={o} />
        </div>

        {o.returnRequest?.status && <ReturnStatus r={o.returnRequest} />}
        {canReturn && <ReturnForm id={o._id} until={returnUntil} onDone={setO} />}

        <div className="cart-layout" style={{ padding: 0 }}>
          <div className="box">
            <h3>Items</h3>
            {o.items.map((i) => (
              <div className="mini-item" key={i._id}>
                <Img src={i.image} alt="" />
                <span className="n">
                  {i.name} <span className="muted">× {i.qty}</span>
                  {i.variantName && <span className="line-variant">{i.variantName}</span>}
                </span>
                <b>{inr(i.price * i.qty)}</b>
              </div>
            ))}
            {o.statusHistory?.length > 0 && (
              <>
                <h3 style={{ marginTop: 24 }}>Order Updates</h3>
                <ul className="timeline">
                  {[...o.statusHistory].reverse().map((h, idx) => (
                    <li key={h._id || idx}>
                      <b>{h.status}</b>{h.note && <span> — {h.note}</span>}
                      <small className="muted">{new Date(h.at).toLocaleString('en-IN')}</small>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
          <div>
            <div className="box">
              <h3>Summary</h3>
              <div className="sum-row"><span>Subtotal</span><span>{inr(o.subtotal)}</span></div>
              <div className="sum-row"><span>Shipping</span><span>{o.shipping ? inr(o.shipping) : 'FREE'}</span></div>
              {o.codCharge > 0 && <div className="sum-row"><span>Pay-on-delivery fee</span><span>{inr(o.codCharge)}</span></div>}
              {o.discount > 0 && <div className="sum-row"><span>Discount ({o.couponCode})</span><span>−{inr(o.discount)}</span></div>}
              <div className="sum-row total"><span>Total</span><span>{inr(o.total)}</span></div>
              <p className="muted" style={{ fontSize: 13 }}>
                Payment: {o.paymentMethod === 'Online' ? 'Online' : o.paymentMethod === 'UPI' ? 'UPI on delivery' : 'Cash on delivery'} · {o.isPaid ? 'Paid' : 'Not paid yet'}
              </p>
            </div>
            <div className="box">
              <h3>Shipping To</h3>
              <p style={{ margin: 0 }}><b>{a.name}</b><br />{a.line1}<br />{a.city}, {a.state} - {a.pincode}<br />📞 {a.phone}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export function ShipmentInfo({ o }) {
  const toast = useToast();
  const done = ['Delivered', 'Cancelled', 'Returned'].includes(o.status);
  if (!o.trackingId && !o.courier && (!o.expectedDelivery || done)) return null;
  return (
    <div className="ship-info">
      {o.courier && <div><small>Courier</small><b><FiTruck /> {o.courier}</b></div>}
      {o.trackingId && (
        <div>
          <small>Tracking ID</small>
          <b>
            {o.trackingId}
            <button type="button" className="copy-btn" aria-label="Copy tracking ID"
              onClick={() => navigator.clipboard?.writeText(o.trackingId).then(() => toast('Tracking ID copied'))}><FiCopy /></button>
          </b>
        </div>
      )}
      {o.expectedDelivery && !done && <div><small>Expected delivery</small><b>{fmtDay(o.expectedDelivery)}</b></div>}
      {o.trackingUrl && <a className="btn btn-sm" href={o.trackingUrl} target="_blank" rel="noreferrer">Track parcel <FiExternalLink /></a>}
    </div>
  );
}

function ReturnStatus({ r }) {
  const text = {
    Requested: 'We have received your request and will review it within 24–48 hours.',
    Approved: 'Approved. Our team will contact you to arrange pickup or replacement.',
    Rejected: 'Your return request was not approved.',
    Completed: 'Return completed. Refund/replacement has been processed.',
  }[r.status];
  return (
    <div className={`box return-box rs-${statusKey(r.status)} page-fade`}>
      <h3><FiRotateCcw /> Return / Replacement: {r.status}</h3>
      <p style={{ margin: '0 0 6px' }}>{text}</p>
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>Reason: {r.reason}{r.details ? ` — ${r.details}` : ''}</p>
      {r.adminNote && <p style={{ margin: '8px 0 0', fontSize: 14 }}><b>Note from store:</b> {r.adminNote}</p>}
    </div>
  );
}

function ReturnForm({ id, until, onDone }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(RETURN_REASONS[0]);
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      onDone(await api(`/orders/${id}/return`, { method: 'POST', body: { reason, details } }));
      toast('Return request submitted');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <div className="box return-cta">
        <span>Problem with your order? You can request a return or replacement until <b>{fmtDay(until)}</b>.</span>
        <button className="btn btn-outline btn-sm" onClick={() => setOpen(true)}><FiRotateCcw /> Request Return</button>
      </div>
    );
  }
  return (
    <form className="box page-fade" onSubmit={submit}>
      <h3>Request Return / Replacement</h3>
      <div className="reason-list">
        {RETURN_REASONS.map((r) => (
          <label key={r} className={`pay-opt ${reason === r ? 'active' : ''}`}>
            <input type="radio" name="reason" checked={reason === r} onChange={() => setReason(r)} /> {r}
          </label>
        ))}
      </div>
      <div className="field">
        <label>Details {reason === 'Other' && '*'}</label>
        <textarea className="input" required={reason === 'Other'} value={details} onChange={(e) => setDetails(e.target.value)}
          placeholder="Tell us what's wrong. Keep photos/video handy, our team may ask for them." />
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn" disabled={busy}>{busy ? 'Submitting…' : 'Submit Request'}</button>
        <button type="button" className="btn btn-outline" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}
