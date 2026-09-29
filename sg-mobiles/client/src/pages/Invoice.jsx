import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FiPrinter, FiArrowLeft } from 'react-icons/fi';
import { api, inr } from '../api';
import { useShop } from '../context/ShopContext';
import { useAuth } from '../context/AuthContext';
import Loader from '../components/Loader';
import { useTitle } from '../components/lib';

const PAY_LABEL = { COD: 'Cash on Delivery', UPI: 'UPI on Delivery', Online: 'Online (Razorpay)' };

// Printable tax invoice. Rendered outside the store layout so it prints cleanly on A4.
export default function Invoice() {
  const { id } = useParams();
  const { settings } = useShop();
  const { user } = useAuth();
  const [o, setO] = useState(null);
  const [err, setErr] = useState('');
  useTitle(o ? `Invoice ${o.orderNo}` : 'Invoice');

  useEffect(() => { api(`/orders/${id}`).then(setO).catch((e) => setErr(e.message)); }, [id]);

  if (err) return <div className="empty"><p>{err}</p><Link className="btn" to="/">Home</Link></div>;
  if (!o) return <Loader full />;
  const a = o.shippingAddress;
  const back = user?.role === 'admin' ? `/admin/orders/${o._id}` : `/account/orders/${o._id}`;

  return (
    <div className="invoice-page">
      <div className="invoice-tools no-print">
        <Link to={back} className="btn btn-outline btn-sm"><FiArrowLeft /> Back to order</Link>
        <button className="btn btn-sm" onClick={() => window.print()}><FiPrinter /> Print / Save PDF</button>
      </div>
      <article className="invoice">
        <header className="inv-head">
          <div>
            <div className="inv-brand"><span className="logo-mark">SG</span>{settings.storeName}</div>
            <p>{settings.address}<br />{settings.phone}{settings.email && ` · ${settings.email}`}</p>
            {settings.gstin && <p><b>GSTIN:</b> {settings.gstin}</p>}
          </div>
          <div className="inv-meta">
            <h1>{settings.gstin ? 'TAX INVOICE' : 'INVOICE'}</h1>
            <p><b>Invoice No:</b> {o.orderNo}<br />
              <b>Date:</b> {new Date(o.createdAt).toLocaleDateString('en-IN')}<br />
              <b>Payment:</b> {PAY_LABEL[o.paymentMethod] || o.paymentMethod} ({o.isPaid ? 'Paid' : 'Unpaid'})<br />
              <b>Status:</b> {o.status}</p>
          </div>
        </header>

        <section className="inv-parties">
          <div>
            <h4>Bill To</h4>
            <p><b>{o.user?.name || a.name}</b><br />{o.user?.email}<br />{o.user?.phone || a.phone}</p>
          </div>
          <div>
            <h4>Ship To</h4>
            <p><b>{a.name}</b><br />{a.line1}<br />{a.city}, {a.state} - {a.pincode}<br />Phone: {a.phone}</p>
          </div>
        </section>

        <table className="inv-table">
          <thead>
            <tr><th>#</th><th>Item</th><th className="r">Qty</th><th className="r">Rate</th><th className="r">Amount</th></tr>
          </thead>
          <tbody>
            {o.items.map((i, idx) => (
              <tr key={i._id || idx}>
                <td>{idx + 1}</td>
                <td>{i.name}{i.variantName && <div className="muted">{i.variantName}</div>}</td>
                <td className="r">{i.qty}</td>
                <td className="r">{inr(i.price)}</td>
                <td className="r">{inr(i.price * i.qty)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="inv-totals">
          <div><span>Subtotal</span><span>{inr(o.subtotal)}</span></div>
          <div><span>Shipping</span><span>{o.shipping ? inr(o.shipping) : 'FREE'}</span></div>
          {o.codCharge > 0 && <div><span>Pay-on-delivery fee</span><span>{inr(o.codCharge)}</span></div>}
          {o.discount > 0 && <div><span>Discount{o.couponCode ? ` (${o.couponCode})` : ''}</span><span>−{inr(o.discount)}</span></div>}
          <div className="grand"><span>Grand Total</span><span>{inr(o.total)}</span></div>
        </div>

        <footer className="inv-foot">
          <p>All prices are inclusive of applicable GST. Goods once sold are covered by our {settings.returnDays}-day replacement policy for manufacturing defects.</p>
          <p>Thank you for shopping with {settings.storeName}! This is a computer-generated invoice and does not require a signature.</p>
        </footer>
      </article>
    </div>
  );
}
