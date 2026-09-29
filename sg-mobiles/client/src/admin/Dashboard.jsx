import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiDollarSign, FiShoppingBag, FiBox, FiUsers, FiMail, FiAlertTriangle, FiRotateCcw, FiCreditCard, FiClock } from 'react-icons/fi';
import { api, inr } from '../api';
import { useToast } from '../context/ToastContext';
import Loader from '../components/Loader';
import { StatusPill, STATUS_COLORS, fmtDate, Empty } from './common';

function RevenueChart({ days }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(1, ...days.map((d) => d.revenue));
  return (
    <div className="ad-chart">
      <div className="ad-chart-bars">
        {days.map((d, i) => {
          const h = (d.revenue / max) * 100;
          const label = new Date(d.date + 'T00:00:00Z').toLocaleDateString('en-IN', { weekday: 'short', timeZone: 'UTC' });
          return (
            <div
              key={d.date}
              className="ad-chart-col"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              {hover === i && (
                <div className="ad-chart-tip">
                  <strong>{inr(d.revenue)}</strong>
                  <span>{d.orders} order{d.orders === 1 ? '' : 's'}</span>
                  <span>{d.date}</span>
                </div>
              )}
              <div className="ad-chart-track">
                <div className="ad-chart-bar" style={{ height: `${Math.max(h, d.revenue ? 3 : 0)}%`, animationDelay: `${i * 60}ms` }} />
              </div>
              <span className="ad-chart-label">{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const toast = useToast();
  const [s, setS] = useState(null);

  useEffect(() => {
    api('/admin/stats').then(setS).catch((e) => toast(e.message, 'error'));
  }, [toast]);

  if (!s) return <Loader />;

  const cards = [
    { label: 'Revenue', value: inr(s.revenue), icon: FiDollarSign, tone: 'orange' },
    { label: 'Orders', value: s.orders, icon: FiShoppingBag, tone: 'blue', to: '/admin/orders' },
    { label: 'Products', value: s.products, icon: FiBox, tone: 'violet', to: '/admin/products' },
    { label: 'Customers', value: s.users, icon: FiUsers, tone: 'green', to: '/admin/users' },
    { label: 'Unread Messages', value: s.unread, icon: FiMail, tone: 'red', to: '/admin/messages' },
  ];
  const pending = s.byStatus.Pending || 0;
  const alerts = [
    s.returns > 0 && { to: '/admin/orders?returns=true', tone: 'amber', icon: FiRotateCcw, title: `${s.returns} return request${s.returns > 1 ? 's' : ''}`, text: 'Waiting for your review' },
    pending > 0 && { to: '/admin/orders?status=Pending', tone: 'blue', icon: FiClock, title: `${pending} new order${pending > 1 ? 's' : ''} to process`, text: 'Confirm and start packing' },
    s.unpaidOnline > 0 && { to: '/admin/orders?status=Pending', tone: 'red', icon: FiCreditCard, title: `${s.unpaidOnline} unpaid online order${s.unpaidOnline > 1 ? 's' : ''}`, text: 'Auto-cancelled after 30 min if unpaid' },
    s.lowStock.length > 0 && { to: '/admin/products', tone: 'amber', icon: FiAlertTriangle, title: `${s.lowStock.length} product${s.lowStock.length > 1 ? 's' : ''} low on stock`, text: `At or below ${s.lowStockThreshold ?? 5} units` },
  ].filter(Boolean);
  const totalStatus = Object.values(s.byStatus).reduce((a, b) => a + b, 0) || 1;
  const weekRevenue = s.daily.reduce((a, d) => a + d.revenue, 0);

  return (
    <div className="ad-stack">
      {alerts.length > 0 && (
        <div className="ad-alerts">
          {alerts.map(({ to, tone, icon: Icon, title, text }) => (
            <Link key={title} to={to} className={`ad-alert ad-alert-${tone}`}>
              <Icon />
              <div><b>{title}</b><span>{text}</span></div>
            </Link>
          ))}
        </div>
      )}
      <div className="ad-stat-grid">
        {cards.map(({ label, value, icon: Icon, tone, to }, i) => {
          const inner = (
            <>
              <span className={`ad-stat-icon ad-tone-${tone}`}><Icon /></span>
              <div>
                <div className="ad-stat-value">{value}</div>
                <div className="ad-stat-label">{label}</div>
              </div>
            </>
          );
          return to ? (
            <Link key={label} to={to} className="ad-card ad-stat" style={{ animationDelay: `${i * 70}ms` }}>{inner}</Link>
          ) : (
            <div key={label} className="ad-card ad-stat" style={{ animationDelay: `${i * 70}ms` }}>{inner}</div>
          );
        })}
      </div>

      <div className="ad-grid-2">
        <section className="ad-card">
          <div className="ad-card-head">
            <h3>Revenue · last 7 days</h3>
            <span className="ad-muted">{inr(weekRevenue)}</span>
          </div>
          <RevenueChart days={s.daily} />
        </section>

        <section className="ad-card">
          <div className="ad-card-head"><h3>Orders by status</h3></div>
          <div className="ad-status-list">
            {Object.keys(STATUS_COLORS).map((st) => {
              const n = s.byStatus[st] || 0;
              return (
                <Link to={`/admin/orders?status=${encodeURIComponent(st)}`} key={st} className="ad-status-row">
                  <div className="ad-status-row-top">
                    <StatusPill status={st} />
                    <strong>{n}</strong>
                  </div>
                  <div className="ad-progress">
                    <div className={`ad-progress-fill ad-bg-${STATUS_COLORS[st]}`} style={{ width: `${(n / totalStatus) * 100}%` }} />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </div>

      <div className="ad-grid-2 ad-grid-wide-left">
        <section className="ad-card">
          <div className="ad-card-head">
            <h3>Recent orders</h3>
            <Link to="/admin/orders" className="ad-link">View all</Link>
          </div>
          {s.recent.length ? (
            <div className="ad-table-wrap">
              <table className="ad-table">
                <thead>
                  <tr><th>Order</th><th>Customer</th><th>Date</th><th>Total</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {s.recent.map((o) => (
                    <tr key={o._id}>
                      <td><Link to={`/admin/orders/${o._id}`} className="ad-link">#{o.orderNo}</Link></td>
                      <td>{o.user?.name || '—'}</td>
                      <td>{fmtDate(o.createdAt)}</td>
                      <td>{inr(o.total)}</td>
                      <td><StatusPill status={o.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <Empty>No orders yet.</Empty>}
        </section>

        <section className="ad-card">
          <div className="ad-card-head"><h3><FiAlertTriangle className="ad-warn-icon" /> Low stock <span className="ad-muted ad-small">(≤ {s.lowStockThreshold ?? 5})</span></h3></div>
          {s.lowStock.length ? (
            <ul className="ad-lowstock">
              {s.lowStock.map((p) => (
                <li key={p._id}>
                  <Link to={`/admin/products/${p._id}`}>{p.name}</Link>
                  <span className={`ad-pill ${p.stock === 0 ? 'ad-pill-red' : 'ad-pill-amber'}`}>
                    {p.stock === 0 ? 'Out of stock' : `${p.stock} left`}
                  </span>
                </li>
              ))}
            </ul>
          ) : <Empty>All products are well stocked.</Empty>}
        </section>
      </div>
    </div>
  );
}
