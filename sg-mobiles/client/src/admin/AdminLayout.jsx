import { useEffect, useState } from 'react';
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  FiGrid, FiBox, FiLayers, FiShoppingBag, FiUsers, FiTag, FiImage, FiMail, FiSettings,
  FiMenu, FiLogOut, FiExternalLink, FiChevronsLeft,
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import Loader from '../components/Loader';
import '../styles/admin.css';

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: FiGrid, end: true },
  { to: '/admin/products', label: 'Products', icon: FiBox },
  { to: '/admin/categories', label: 'Categories', icon: FiLayers },
  { to: '/admin/orders', label: 'Orders', icon: FiShoppingBag },
  { to: '/admin/users', label: 'Customers', icon: FiUsers },
  { to: '/admin/coupons', label: 'Coupons', icon: FiTag },
  { to: '/admin/banners', label: 'Banners', icon: FiImage },
  { to: '/admin/messages', label: 'Messages', icon: FiMail, badge: true },
  { to: '/admin/settings', label: 'Settings', icon: FiSettings },
];

function titleFor(path) {
  if (path === '/admin' || path === '/admin/') return 'Dashboard';
  if (path === '/admin/products/new') return 'Add Product';
  if (/^\/admin\/products\/.+/.test(path)) return 'Edit Product';
  if (/^\/admin\/orders\/.+/.test(path)) return 'Order Details';
  const hit = NAV.find((n) => n.to !== '/admin' && path.startsWith(n.to));
  return hit ? hit.label : 'Admin';
}

export default function AdminLayout() {
  const { user, ready, logout } = useAuth();
  const loc = useLocation();
  const nav = useNavigate();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('ad_collapsed') === '1');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  const isAdmin = user?.role === 'admin';

  useEffect(() => setMobileOpen(false), [loc.pathname]);
  useEffect(() => localStorage.setItem('ad_collapsed', collapsed ? '1' : '0'), [collapsed]);
  useEffect(() => {
    if (!isAdmin) return;
    api('/admin/messages')
      .then((m) => setUnread(m.filter((x) => !x.read).length))
      .catch(() => {});
  }, [isAdmin, loc.pathname]);

  useEffect(() => {
    document.title = `${titleFor(loc.pathname)} · SG Mobiles Admin`;
  }, [loc.pathname]);

  if (!ready) return <Loader full />;
  if (!isAdmin) return <Navigate to="/login?next=/admin" replace />;

  const doLogout = () => {
    logout();
    nav('/login');
  };

  return (
    <div className={`ad-shell ${collapsed ? 'ad-collapsed' : ''} ${mobileOpen ? 'ad-mobile-open' : ''}`}>
      <aside className="ad-sidebar">
        <div className="ad-brand">
          <span className="ad-logo">SG</span>
          <span className="ad-brand-text">SG Mobiles<small>Admin Panel</small></span>
        </div>
        <nav className="ad-nav">
          {NAV.map(({ to, label, icon: Icon, end, badge }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `ad-nav-link ${isActive ? 'active' : ''}`} title={label}>
              <Icon className="ad-nav-icon" />
              <span className="ad-nav-label">{label}</span>
              {badge && unread > 0 && <span className="ad-badge">{unread}</span>}
            </NavLink>
          ))}
        </nav>
        <button className="ad-collapse-btn" onClick={() => setCollapsed((c) => !c)} aria-label="Collapse sidebar">
          <FiChevronsLeft />
          <span className="ad-nav-label">Collapse</span>
        </button>
      </aside>
      <div className="ad-overlay" onClick={() => setMobileOpen(false)} />

      <div className="ad-main">
        <header className="ad-topbar">
          <button className="ad-icon-btn ad-menu-btn" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <FiMenu />
          </button>
          <h1 className="ad-page-title">{titleFor(loc.pathname)}</h1>
          <div className="ad-topbar-right">
            <Link to="/" target="_blank" className="ad-btn ad-btn-ghost ad-hide-sm">
              <FiExternalLink /> View Store
            </Link>
            <div className="ad-user">
              <span className="ad-avatar">{user.name?.[0]?.toUpperCase() || 'A'}</span>
              <span className="ad-hide-sm">{user.name}</span>
            </div>
            <button className="ad-icon-btn" onClick={doLogout} title="Log out" aria-label="Log out">
              <FiLogOut />
            </button>
          </div>
        </header>
        <main className="ad-content" key={loc.pathname}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
