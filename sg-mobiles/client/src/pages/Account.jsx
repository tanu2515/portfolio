import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FiUser, FiPackage, FiMapPin, FiLock, FiLogOut, FiHeart } from 'react-icons/fi';
import { api, inr, statusKey } from '../api';
import { useTitle } from '../components/lib';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { PageHead } from '../components/ui';
import Loader from '../components/Loader';

const TABS = [
  ['profile', 'Dashboard', FiUser],
  ['orders', 'Orders', FiPackage],
  ['address', 'Address', FiMapPin],
  ['password', 'Password', FiLock],
];

export default function Account() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'profile';
  const { user, logout } = useAuth();
  const nav = useNavigate();
  useTitle('My Account');

  return (
    <>
      <PageHead title="My Account" crumbs={['My Account']} />
      <div className="container account">
        <nav className="acc-nav">
          {TABS.map(([key, label, Icon]) => (
            <button key={key} className={tab === key ? 'active' : ''} onClick={() => setParams({ tab: key })}><Icon /> {label}</button>
          ))}
          <button onClick={() => nav('/wishlist')}><FiHeart /> Wishlist</button>
          <button onClick={() => { logout(); nav('/'); }}><FiLogOut /> Logout</button>
        </nav>
        <div key={tab} className="page-fade">
          {tab === 'profile' && <Profile user={user} />}
          {tab === 'orders' && <Orders />}
          {tab === 'address' && <Address />}
          {tab === 'password' && <Password />}
        </div>
      </div>
    </>
  );
}

function Profile({ user }) {
  const { setUser } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ name: user.name, phone: user.phone || '' });
  const save = async (e) => {
    e.preventDefault();
    try {
      setUser(await api('/auth/me', { method: 'PUT', body: form }));
      toast('Profile updated');
    } catch (err) { toast(err.message, 'error'); }
  };
  return (
    <div className="box">
      <p>Hello <b>{user.name}</b>! From your account dashboard you can view your <Link className="link" to="/account?tab=orders">recent orders</Link>, manage your <Link className="link" to="/account?tab=address">shipping address</Link> and <Link className="link" to="/account?tab=password">change your password</Link>.</p>
      <form onSubmit={save} style={{ maxWidth: 520, marginTop: 20 }}>
        <div className="field"><label>Name</label><input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div className="field"><label>Email</label><input className="input" value={user.email} disabled /></div>
        <div className="field"><label>Phone</label><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
        <button className="btn">Save Changes</button>
      </form>
    </div>
  );
}

function Orders() {
  const [orders, setOrders] = useState(null);
  useEffect(() => { api('/orders/mine').then(setOrders).catch(() => setOrders([])); }, []);
  if (!orders) return <Loader />;
  if (!orders.length) {
    return <div className="box empty"><FiPackage /><p>No orders yet.</p><Link to="/shop" className="btn">Browse Products</Link></div>;
  }
  return (
    <div className="box" style={{ overflowX: 'auto' }}>
      <table className="table">
        <thead><tr><th>Order</th><th>Date</th><th>Status</th><th>Total</th><th /></tr></thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o._id}>
              <td><b>#{o.orderNo}</b></td>
              <td className="hide-sm">{new Date(o.createdAt).toLocaleDateString('en-IN')}</td>
              <td><span className={`status status-${statusKey(o.status)}`}>{o.status}</span></td>
              <td>{inr(o.total)} <span className="muted" style={{ fontSize: 12 }}>for {o.items.reduce((s, i) => s + i.qty, 0)} item(s)</span></td>
              <td><Link to={`/account/orders/${o._id}`} className="btn btn-sm btn-outline">View</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Address() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [a, setA] = useState({ name: '', phone: '', line1: '', city: '', state: '', pincode: '', ...user.address });
  const f = (k) => ({ value: a[k] || '', onChange: (e) => setA({ ...a, [k]: e.target.value }), className: 'input', required: true });
  const save = async (e) => {
    e.preventDefault();
    try {
      setUser(await api('/auth/me', { method: 'PUT', body: { address: a } }));
      toast('Address saved');
    } catch (err) { toast(err.message, 'error'); }
  };
  return (
    <form className="box" onSubmit={save}>
      <h3>Shipping Address</h3>
      <div className="grid-2">
        <div className="field"><label>Full name</label><input {...f('name')} /></div>
        <div className="field"><label>Phone</label><input {...f('phone')} /></div>
      </div>
      <div className="field"><label>Address</label><input {...f('line1')} /></div>
      <div className="grid-2">
        <div className="field"><label>City</label><input {...f('city')} /></div>
        <div className="field"><label>State</label><input {...f('state')} /></div>
        <div className="field"><label>Pincode</label><input {...f('pincode')} /></div>
      </div>
      <button className="btn">Save Address</button>
    </form>
  );
}

function Password() {
  const toast = useToast();
  const [p, setP] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const save = async (e) => {
    e.preventDefault();
    if (p.newPassword !== p.confirm) return toast('Passwords do not match', 'error');
    try {
      await api('/auth/me', { method: 'PUT', body: { currentPassword: p.currentPassword, newPassword: p.newPassword } });
      setP({ currentPassword: '', newPassword: '', confirm: '' });
      toast('Password changed');
    } catch (err) { toast(err.message, 'error'); }
  };
  const f = (k) => ({ value: p[k], onChange: (e) => setP({ ...p, [k]: e.target.value }), className: 'input', type: 'password', required: true, minLength: 6 });
  return (
    <form className="box" onSubmit={save} style={{ maxWidth: 520 }}>
      <h3>Change Password</h3>
      <div className="field"><label>Current password</label><input {...f('currentPassword')} autoComplete="current-password" /></div>
      <div className="field"><label>New password</label><input {...f('newPassword')} autoComplete="new-password" /></div>
      <div className="field"><label>Confirm new password</label><input {...f('confirm')} autoComplete="new-password" /></div>
      <button className="btn">Update Password</button>
    </form>
  );
}
