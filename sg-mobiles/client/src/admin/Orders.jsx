import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FiSearch, FiDownload, FiRotateCcw } from 'react-icons/fi';
import { api, download, inr } from '../api';
import { useToast } from '../context/ToastContext';
import Loader from '../components/Loader';
import { Empty, StatusPill, STATUS_COLORS, RETURN_COLORS, fmtDate } from './common';

const TABS = ['', ...Object.keys(STATUS_COLORS), 'returns'];

export default function Orders() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || '';
  const returns = params.get('returns') === 'true';
  const from = params.get('from') || '';
  const to = params.get('to') || '';
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [orders, setOrders] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setSearch(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (status) p.set('status', status);
    if (returns) p.set('returns', 'true');
    if (search) p.set('q', search);
    if (from) p.set('from', from);
    if (to) p.set('to', to);
    return p.toString();
  }, [status, returns, search, from, to]);

  useEffect(() => {
    setOrders(null);
    api(`/orders?${query}`).then(setOrders).catch((e) => toast(e.message, 'error'));
  }, [query, toast]);

  const setParam = (updates) => {
    const p = new URLSearchParams(params);
    Object.entries(updates).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)));
    setParams(p);
  };

  const pickTab = (t) =>
    setParam(t === 'returns' ? { returns: 'true', status: '' } : { status: t, returns: '' });

  const exportCsv = () =>
    download(`/orders/admin/export?${query}`, `orders${from ? `-${from}` : ''}${to ? `-to-${to}` : ''}.csv`)
      .catch((e) => toast(e.message, 'error'));

  const activeTab = returns ? 'returns' : status;
  const total = orders?.reduce((s, o) => s + (['Cancelled', 'Returned'].includes(o.status) ? 0 : o.total), 0) || 0;

  return (
    <div className="ad-stack">
      <div className="ad-toolbar">
        <div className="ad-tabs">
          {TABS.map((t) => (
            <button key={t || 'all'} className={`ad-tab ${activeTab === t ? 'active' : ''}`} onClick={() => pickTab(t)}>
              {t === 'returns' ? <><FiRotateCcw /> Returns</> : t || 'All'}
            </button>
          ))}
        </div>
      </div>
      <div className="ad-toolbar">
        <div className="ad-search">
          <FiSearch />
          <input placeholder="Search order no…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="ad-toolbar-group">
          <label className="ad-muted ad-small">From</label>
          <input type="date" className="ad-input ad-date" value={from} max={to || undefined} onChange={(e) => setParam({ from: e.target.value })} />
          <label className="ad-muted ad-small">To</label>
          <input type="date" className="ad-input ad-date" value={to} min={from || undefined} onChange={(e) => setParam({ to: e.target.value })} />
          {(from || to) && <button className="ad-btn ad-btn-ghost ad-btn-sm" onClick={() => setParam({ from: '', to: '' })}>Clear dates</button>}
        </div>
        <button className="ad-btn ad-btn-ghost ad-ml-auto" onClick={exportCsv}><FiDownload /> Export CSV</button>
      </div>

      <section className="ad-card ad-card-flush">
        {!orders ? <Loader /> : orders.length === 0 ? <Empty>No orders found.</Empty> : (
          <>
            <div className="ad-card-head ad-pad">
              <span className="ad-muted">{orders.length} order{orders.length === 1 ? '' : 's'}</span>
              <span className="ad-muted">Value: <strong>{inr(total)}</strong></span>
            </div>
            <div className="ad-table-wrap">
              <table className="ad-table">
                <thead>
                  <tr><th>Order</th><th>Customer</th><th>Date</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {orders.map((o) => {
                    const rr = o.returnRequest?.status;
                    return (
                      <tr key={o._id} className={`ad-row-link ${rr === 'Requested' || rr === 'Approved' ? 'ad-row-return' : ''}`}>
                        <td>
                          <Link to={`/admin/orders/${o._id}`} className="ad-link ad-strong">#{o.orderNo}</Link>
                          {o.trackingId && <div className="ad-muted ad-small">{o.courier} · {o.trackingId}</div>}
                        </td>
                        <td>
                          <div>{o.user?.name || o.shippingAddress?.name}</div>
                          <div className="ad-muted ad-small">{o.shippingAddress?.city} {o.shippingAddress?.pincode}</div>
                        </td>
                        <td className="ad-nowrap">{fmtDate(o.createdAt, true)}</td>
                        <td>{o.items.reduce((s, i) => s + i.qty, 0)}</td>
                        <td className="ad-strong">{inr(o.total)}</td>
                        <td>
                          <span className={`ad-pill ${o.isPaid ? 'ad-pill-green' : o.paymentMethod === 'Online' ? 'ad-pill-red' : 'ad-pill-gray'}`}>
                            {o.isPaid ? 'Paid' : 'Unpaid'}
                          </span>
                          <span className="ad-pay">{o.paymentMethod === 'Online' ? 'Online' : o.paymentMethod === 'UPI' ? 'UPI on delivery' : 'Cash on delivery'}</span>
                        </td>
                        <td>
                          <StatusPill status={o.status} />
                          {rr && <div className="ad-mt-xs"><span className={`ad-pill ad-pill-${RETURN_COLORS[rr]}`}>Return {rr.toLowerCase()}</span></div>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
