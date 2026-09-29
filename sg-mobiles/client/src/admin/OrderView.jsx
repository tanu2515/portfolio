import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FiArrowLeft, FiFileText, FiPhone, FiMessageCircle, FiTruck, FiRotateCcw, FiExternalLink } from 'react-icons/fi';
import { api, inr } from '../api';
import { useToast } from '../context/ToastContext';
import Loader from '../components/Loader';
import { StatusPill, STATUS_COLORS, RETURN_COLORS, COURIERS, fmtDate } from './common';

// 'Returned' is only reached through the return flow, so it isn't offered here.
const SELECTABLE = Object.keys(STATUS_COLORS).filter((s) => s !== 'Returned');

const RETURN_ACTIONS = {
  Requested: [['Approved', 'Approve', 'ad-btn-primary'], ['Rejected', 'Reject', 'ad-btn-ghost ad-danger']],
  Approved: [['Completed', 'Mark item received', 'ad-btn-primary'], ['Rejected', 'Reject', 'ad-btn-ghost ad-danger']],
};

const shipFields = (o) => ({
  courier: o.courier || '',
  trackingId: o.trackingId || '',
  trackingUrl: o.trackingUrl || '',
  expectedDelivery: o.expectedDelivery ? o.expectedDelivery.slice(0, 10) : '',
  adminNote: o.adminNote || '',
});

export default function OrderView() {
  const { id } = useParams();
  const toast = useToast();
  const [o, setO] = useState(null);
  const [status, setStatus] = useState('');
  const [note, setNote] = useState('');
  const [ship, setShip] = useState(null);
  const [returnNote, setReturnNote] = useState('');
  const [saving, setSaving] = useState(false);

  const apply = (d) => {
    setO(d);
    setStatus(d.status);
    setShip(shipFields(d));
    setReturnNote(d.returnRequest?.adminNote || '');
  };

  useEffect(() => {
    api(`/orders/${id}`).then(apply).catch((e) => toast(e.message, 'error'));
  }, [id, toast]);

  if (!o) return <Loader />;

  const update = async (body, msg = 'Order updated') => {
    setSaving(true);
    try {
      apply(await api(`/orders/${id}/status`, { method: 'PUT', body }));
      toast(msg);
      return true;
    } catch (e) {
      toast(e.message, 'error');
      setStatus(o.status);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveStatus = async () => {
    if (status === o.status) return;
    if (status === 'Cancelled' && !window.confirm('Cancel this order? Stock will be returned to inventory.')) return setStatus(o.status);
    // Shipping details go along so "Shipped" emails include the tracking number.
    if (await update({ status, note: note.trim() || undefined, ...ship }, `Status changed to ${status}`)) setNote('');
  };

  const saveShipping = (e) => {
    e.preventDefault();
    update(ship, 'Shipping details saved');
  };

  const resolveReturn = async (next) => {
    const verb = { Approved: 'approve', Rejected: 'reject', Completed: 'complete (stock will be added back)' }[next];
    if (!window.confirm(`Are you sure you want to ${verb} this return?`)) return;
    setSaving(true);
    try {
      apply(await api(`/orders/${id}/return`, { method: 'PUT', body: { status: next, adminNote: returnNote.trim() || undefined } }));
      toast(`Return ${next.toLowerCase()}`);
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const a = o.shippingAddress || {};
  const locked = ['Cancelled', 'Returned'].includes(o.status);
  const rr = o.returnRequest?.status ? o.returnRequest : null;
  const phoneDigits = String(a.phone || '').replace(/\D/g, '');
  const wa = `https://wa.me/${phoneDigits.length === 10 ? '91' + phoneDigits : phoneDigits}?text=${encodeURIComponent(
    `Hi ${a.name || ''}, this is regarding your order #${o.orderNo}.`
  )}`;
  const setS = (k) => (e) => setShip((x) => ({ ...x, [k]: e.target.value }));

  return (
    <div className="ad-stack">
      <div className="ad-toolbar">
        <Link to="/admin/orders" className="ad-btn ad-btn-ghost"><FiArrowLeft /> Orders</Link>
        <h2 className="ad-order-no">#{o.orderNo} <StatusPill status={o.status} /></h2>
        <a href={`/invoice/${o._id}`} target="_blank" rel="noreferrer" className="ad-btn ad-btn-ghost ad-ml-auto"><FiFileText /> Invoice</a>
      </div>

      <div className="ad-grid-2 ad-grid-wide-left">
        <div className="ad-stack">
          <section className="ad-card ad-card-flush">
            <div className="ad-card-head ad-pad"><h3>Items</h3><span className="ad-muted">{fmtDate(o.createdAt, true)}</span></div>
            <div className="ad-table-wrap">
              <table className="ad-table">
                <thead><tr><th></th><th>Product</th><th>Price</th><th>Qty</th><th className="ad-right">Total</th></tr></thead>
                <tbody>
                  {o.items.map((i) => (
                    <tr key={i._id}>
                      <td><img className="ad-thumb" src={i.image || '/favicon.svg'} alt="" onError={(e) => { e.currentTarget.src = '/favicon.svg'; }} /></td>
                      <td>
                        <div className="ad-strong">{i.name}</div>
                        {i.variantName && <div className="ad-muted ad-small">{i.variantName}</div>}
                      </td>
                      <td>{inr(i.price)}</td>
                      <td>× {i.qty}</td>
                      <td className="ad-right">{inr(i.price * i.qty)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="ad-totals">
              <div><span>Subtotal</span><span>{inr(o.subtotal)}</span></div>
              <div><span>Shipping</span><span>{o.shipping ? inr(o.shipping) : 'Free'}</span></div>
              {o.codCharge > 0 && <div><span>COD charge</span><span>{inr(o.codCharge)}</span></div>}
              {o.discount > 0 && <div className="ad-text-green"><span>Discount {o.couponCode && `(${o.couponCode})`}</span><span>− {inr(o.discount)}</span></div>}
              <div className="ad-totals-grand"><span>Total</span><span>{inr(o.total)}</span></div>
            </div>
          </section>

          {rr && (
            <section className="ad-card ad-return">
              <div className="ad-section-head">
                <h3 className="ad-section-title"><FiRotateCcw /> Return request</h3>
                <span className={`ad-pill ad-pill-${RETURN_COLORS[rr.status]}`}>{rr.status}</span>
              </div>
              <dl className="ad-kv">
                <dt>Reason</dt><dd>{rr.reason}</dd>
                {rr.details && <><dt>Details</dt><dd>{rr.details}</dd></>}
                <dt>Requested</dt><dd>{fmtDate(rr.requestedAt, true)}</dd>
                {rr.resolvedAt && <><dt>Resolved</dt><dd>{fmtDate(rr.resolvedAt, true)}</dd></>}
              </dl>
              {RETURN_ACTIONS[rr.status] ? (
                <>
                  <label className="ad-field ad-mt">
                    <span>Note to customer (optional)</span>
                    <input className="ad-input" value={returnNote} onChange={(e) => setReturnNote(e.target.value)} placeholder="e.g. Pickup scheduled for tomorrow" />
                  </label>
                  <div className="ad-row ad-mt">
                    {RETURN_ACTIONS[rr.status].map(([next, label, cls]) => (
                      <button key={next} className={`ad-btn ${cls}`} disabled={saving} onClick={() => resolveReturn(next)}>{label}</button>
                    ))}
                  </div>
                  {rr.status === 'Approved' && <p className="ad-help">Mark as received once the item is back; stock is added back and the order becomes Returned. Issue any refund manually.</p>}
                </>
              ) : rr.adminNote && <p className="ad-help">Note: {rr.adminNote}</p>}
            </section>
          )}

          <section className="ad-card">
            <h3 className="ad-section-title">Status timeline</h3>
            <ol className="ad-timeline">
              {[...o.statusHistory].reverse().map((h, i) => (
                <li key={h._id || i} className={`ad-tl-${STATUS_COLORS[h.status] || 'gray'}`}>
                  <strong>{h.status}</strong>
                  <span className="ad-muted ad-small">{fmtDate(h.at, true)}</span>
                  {h.note && <span className="ad-tl-note">{h.note}</span>}
                </li>
              ))}
            </ol>
          </section>
        </div>

        <div className="ad-stack">
          <section className="ad-card">
            <h3 className="ad-section-title">Order status</h3>
            <label className="ad-field">
              <span>Status</span>
              <select className="ad-input" value={status} disabled={saving || locked} onChange={(e) => setStatus(e.target.value)}>
                {(locked ? [o.status] : SELECTABLE).map((s) => <option key={s}>{s}</option>)}
              </select>
            </label>
            {!locked && status !== o.status && (
              <>
                <label className="ad-field ad-mt">
                  <span>Note for timeline (optional)</span>
                  <input className="ad-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Packed and handed to courier" />
                </label>
                <button className="ad-btn ad-btn-primary ad-mt" disabled={saving} onClick={saveStatus}>Update to {status}</button>
                <p className="ad-help">The customer is emailed about the new status.</p>
              </>
            )}
            {locked && <p className="ad-muted ad-small">{o.status} orders can't be changed.</p>}
          </section>

          <section className="ad-card">
            <h3 className="ad-section-title"><FiTruck /> Shipping & tracking</h3>
            <form className="ad-form-grid ad-form-1" onSubmit={saveShipping}>
              <label className="ad-field">
                <span>Courier</span>
                <input className="ad-input" list="ad-couriers" value={ship.courier} onChange={setS('courier')} placeholder="Select or type" />
                <datalist id="ad-couriers">{COURIERS.map((c) => <option key={c} value={c} />)}</datalist>
              </label>
              <label className="ad-field">
                <span>Tracking ID / AWB</span>
                <input className="ad-input" value={ship.trackingId} onChange={setS('trackingId')} />
              </label>
              <label className="ad-field">
                <span>Tracking link</span>
                <input className="ad-input" value={ship.trackingUrl} onChange={setS('trackingUrl')} placeholder="https://…" />
              </label>
              <label className="ad-field">
                <span>Expected delivery</span>
                <input type="date" className="ad-input" value={ship.expectedDelivery} onChange={setS('expectedDelivery')} />
              </label>
              <label className="ad-field">
                <span>Internal note (not shown to customer)</span>
                <textarea className="ad-input" rows={2} value={ship.adminNote} onChange={setS('adminNote')} />
              </label>
              <div className="ad-row">
                <button className="ad-btn ad-btn-primary" disabled={saving}>Save shipping details</button>
                {o.trackingUrl && <a href={o.trackingUrl} target="_blank" rel="noreferrer" className="ad-btn ad-btn-ghost"><FiExternalLink /> Track</a>}
              </div>
            </form>
          </section>

          <section className="ad-card">
            <h3 className="ad-section-title">Payment</h3>
            <dl className="ad-kv">
              <dt>Method</dt><dd>{o.paymentMethod === 'Online' ? 'Online (Razorpay)' : o.paymentMethod === 'UPI' ? 'UPI on delivery' : 'Cash on delivery'}</dd>
              <dt>Status</dt><dd><span className={`ad-pill ${o.isPaid ? 'ad-pill-green' : 'ad-pill-gray'}`}>{o.isPaid ? 'Paid' : 'Unpaid'}</span></dd>
              {o.paidAt && <><dt>Paid on</dt><dd>{fmtDate(o.paidAt, true)}</dd></>}
              {o.payment?.razorpayOrderId && <><dt>Razorpay order</dt><dd>{o.payment.razorpayOrderId}</dd></>}
              {o.payment?.razorpayPaymentId && <><dt>Payment ID</dt><dd>{o.payment.razorpayPaymentId}</dd></>}
            </dl>
            {o.paymentMethod !== 'Online' && (
              <label className="ad-switch-row ad-mt">
                <span>Payment received</span>
                <input type="checkbox" className="ad-switch" checked={o.isPaid} disabled={saving} onChange={(e) => update({ isPaid: e.target.checked })} />
              </label>
            )}
          </section>

          <section className="ad-card">
            <h3 className="ad-section-title">Customer</h3>
            <p className="ad-strong">{o.user?.name}</p>
            <p className="ad-muted">{o.user?.email}</p>
            <h4 className="ad-subtitle ad-mt">Ship to</h4>
            <address className="ad-address">
              <strong>{a.name}</strong><br />
              {a.line1}<br />
              {a.city}, {a.state} – {a.pincode}<br />
              {a.phone}
            </address>
            <div className="ad-contact-btns">
              <a href={`tel:${a.phone}`} className="ad-btn ad-btn-ghost ad-btn-sm"><FiPhone /> Call</a>
              <a href={wa} target="_blank" rel="noreferrer" className="ad-btn ad-btn-sm ad-wa"><FiMessageCircle /> WhatsApp</a>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
