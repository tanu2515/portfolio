import { useState } from 'react';
import { FiPackage } from 'react-icons/fi';
import { api, inr, statusKey } from '../api';
import { useTitle } from '../components/lib';
import { ShipmentInfo } from './OrderDetail';
import { PageHead, Img } from '../components/ui';
import OrderTracker from '../components/OrderTracker';

export default function TrackOrder() {
  const [form, setForm] = useState({ orderNo: '', phone: '' });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useTitle('Track Order');

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setResult(null);
    try {
      setResult(await api(`/orders/track/${encodeURIComponent(form.orderNo.replace('#', '').trim())}?phone=${encodeURIComponent(form.phone)}`));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHead title="Track Your Order" crumbs={['Track Order']} />
      <div className="container" style={{ padding: '40px 16px', maxWidth: 760 }}>
        <form className="box" onSubmit={submit}>
          <p className="muted">Enter your order number (from your confirmation) and the phone number used at checkout.</p>
          {error && <div className="error-box">{error}</div>}
          <div className="grid-2">
            <div className="field"><label>Order number</label><input className="input" required placeholder="e.g. SG1234567890" value={form.orderNo} onChange={(e) => setForm({ ...form, orderNo: e.target.value })} /></div>
            <div className="field"><label>Phone number</label><input className="input" required type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          </div>
          <button className="btn" disabled={busy}><FiPackage /> {busy ? 'Tracking…' : 'Track'}</button>
        </form>
        {result && (
          <div className="box page-fade">
            <h3>Order #{result.orderNo} <span className={`status status-${statusKey(result.status)}`}>{result.status}</span></h3>
            <p className="muted" style={{ margin: 0 }}>Placed {new Date(result.createdAt).toLocaleDateString('en-IN')} · Total {inr(result.total)}</p>
            <OrderTracker status={result.status} history={result.statusHistory} />
            <ShipmentInfo o={result} />
            {result.items.map((i, idx) => (
              <div className="mini-item" key={idx}><Img src={i.image} alt="" /><span className="n">{i.name}{i.variantName && <span className="line-variant">{i.variantName}</span>}</span><span className="muted">× {i.qty}</span></div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
