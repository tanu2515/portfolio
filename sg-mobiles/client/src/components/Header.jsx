import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  FiSearch, FiUser, FiHeart, FiShoppingBag, FiMenu, FiX, FiChevronDown, FiPhoneCall,
  FiTruck, FiMail, FiLogOut, FiPackage, FiGrid, FiSettings,
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useShop } from '../context/ShopContext';
import { api, inr, effectivePrice } from '../api';
import { Img } from './ui';

export function Logo() {
  return (
    <Link to="/" className="logo" aria-label="SG Mobiles home">
      <span className="logo-mark">SG</span>
      <span>SG <b>Mobiles</b></span>
    </Link>
  );
}

// Search box with a debounced suggestions dropdown (categories + products).
function SearchBox({ tree }) {
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const [cat, setCat] = useState('');
  const [sugg, setSugg] = useState({ products: [], categories: [] });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const nav = useNavigate();
  const loc = useLocation();

  useEffect(() => setOpen(false), [loc.pathname, loc.search]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return setSugg({ products: [], categories: [] });
    let live = true;
    const t = setTimeout(() => {
      api(`/products/suggest?q=${encodeURIComponent(term)}`)
        .then((d) => { if (live) { setSugg(d); setActive(-1); } })
        .catch(() => {});
    }, 250);
    return () => { live = false; clearTimeout(t); };
  }, [q]);

  const items = [
    ...sugg.categories.map((c) => ({ key: `c${c._id}`, to: `/shop?category=${c.slug}`, cat: c })),
    ...sugg.products.map((p) => ({ key: `p${p._id}`, to: `/product/${p.slug}`, product: p })),
  ];
  const show = open && q.trim().length >= 2;

  const go = (to) => { setOpen(false); nav(to); };

  const submit = (e) => {
    e.preventDefault();
    if (active >= 0 && items[active]) return go(items[active].to);
    const sp = new URLSearchParams();
    if (q.trim()) sp.set('q', q.trim());
    if (cat) sp.set('category', cat);
    go(`/shop?${sp}`);
  };

  const onKey = (e) => {
    if (e.key === 'Escape') return setOpen(false);
    if (!items.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => (a + 1) % items.length); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => (a <= 0 ? items.length - 1 : a - 1)); }
  };

  return (
    <div className="search-wrap">
      <form className="search" onSubmit={submit} role="search">
        <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category">
          <option value="">All Categories</option>
          {tree.map((c) => <option key={c._id} value={c.slug}>{c.name}</option>)}
        </select>
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKey}
          placeholder="Search for products, brands..."
          aria-label="Search"
          aria-expanded={show}
          aria-autocomplete="list"
          autoComplete="off"
        />
        <button aria-label="Search"><FiSearch /></button>
      </form>
      {show && (
        <div className="suggest" role="listbox">
          {items.length === 0 ? (
            <div className="suggest-empty">No matches for “{q.trim()}”. Press Enter to search.</div>
          ) : (
            <>
              {items.map((it, i) => (
                <Link
                  key={it.key}
                  to={it.to}
                  role="option"
                  aria-selected={i === active}
                  className={`suggest-item ${i === active ? 'active' : ''}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => setOpen(false)}
                >
                  {it.cat ? (
                    <><span className="suggest-ic"><FiGrid /></span><span className="n">{it.cat.name}<small>Category</small></span></>
                  ) : (
                    <>
                      <Img src={it.product.images?.[0]} alt="" />
                      <span className="n">{it.product.name}</span>
                      <b>{inr(effectivePrice(it.product))}</b>
                    </>
                  )}
                </Link>
              ))}
              <button type="button" className="suggest-all" onMouseDown={(e) => e.preventDefault()} onClick={submit}>
                See all results for “{q.trim()}”
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const { settings, tree } = useShop();
  const { user, logout } = useAuth();
  const { count, subtotal, setDrawerOpen } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [openSub, setOpenSub] = useState(null);
  const nav = useNavigate();
  const loc = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setMenuOpen(false), [loc.pathname, loc.search]);

  // Re-trigger the badge "pop" animation whenever the count changes.
  const [pop, setPop] = useState(false);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setPop(true);
    const t = setTimeout(() => setPop(false), 400);
    return () => clearTimeout(t);
  }, [count]);

  // Admin picks nav categories via "Show in menu"; fall back to the first few.
  const menuCats = tree.filter((c) => c.showInMenu);
  const featured = (menuCats.length ? menuCats : tree.slice(0, 4)).slice(0, 6);
  const wishCount = user?.wishlist?.length || 0;

  return (
    <>
      <div className="topbar">
        <div className="container">
          <span className="topbar-marquee"><FiTruck style={{ verticalAlign: -2, marginRight: 6 }} />{settings.topbarText}</span>
          <div className="topbar-links">
            <Link to="/track-order"><FiPackage /> Track Order</Link>
            <Link to="/contact"><FiMail /> Contact</Link>
            {settings.phone && <a href={`tel:${settings.phone}`}><FiPhoneCall /> {settings.phone}</a>}
          </div>
        </div>
      </div>

      <header className={`header ${scrolled ? 'scrolled' : ''}`}>
        <div className="container header-main">
          <button className="icon-btn hamburger" onClick={() => setMenuOpen(true)} aria-label="Open menu"><FiMenu /></button>
          <Logo />
          <SearchBox tree={tree} />
          <div className="header-actions">
            <div className="account-menu">
              <Link to={user ? '/account' : '/login'} className="icon-btn">
                <FiUser />
                <span className="label"><small>{user ? 'Hello,' : 'Sign in'}</small><strong>{user ? user.name.split(' ')[0] : 'Account'}</strong></span>
              </Link>
              <div className="dropdown">
                {user ? (
                  <>
                    {user.role === 'admin' && <Link to="/admin"><FiGrid /> Admin Panel</Link>}
                    <Link to="/account"><FiSettings /> My Account</Link>
                    <Link to="/account?tab=orders"><FiPackage /> My Orders</Link>
                    <Link to="/wishlist"><FiHeart /> Wishlist</Link>
                    <hr />
                    <button onClick={() => { logout(); nav('/'); }}><FiLogOut /> Logout</button>
                  </>
                ) : (
                  <>
                    <Link to="/login"><FiUser /> Login</Link>
                    <Link to="/register"><FiUser /> Create Account</Link>
                    <Link to="/track-order"><FiPackage /> Track Order</Link>
                  </>
                )}
              </div>
            </div>
            <Link to="/wishlist" className="icon-btn" aria-label="Wishlist">
              <FiHeart />
              <span className="badge">{wishCount}</span>
            </Link>
            <button className="icon-btn" onClick={() => setDrawerOpen(true)} aria-label="Cart">
              <FiShoppingBag />
              <span className={`badge ${pop ? 'pop' : ''}`}>{count}</span>
              <span className="label"><small>My Cart</small><strong>{inr(subtotal)}</strong></span>
            </button>
          </div>
        </div>

        <nav className="navbar">
          <div className="container">
            <div className="cat-toggle">
              <button className="cat-btn"><FiMenu /> Browse Categories <FiChevronDown className="chev" /></button>
              <ul className="cat-list">
                {tree.map((c) => (
                  <li key={c._id}>
                    <Link to={`/shop?category=${c.slug}`}>{c.name} {c.children.length > 0 && <FiChevronDown />}</Link>
                    {c.children.length > 0 && (
                      <ul className="sub">
                        {c.children.map((s) => <li key={s._id}><Link to={`/shop?category=${s.slug}`}>{s.name}</Link></li>)}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            <ul className="nav-links">
              <li><NavLink to="/" end>Home</NavLink></li>
              <li><NavLink to="/shop" end>Shop</NavLink></li>
              <li><Link to="/shop?tag=todaydeal">Today Deal</Link></li>
              {featured.map((c) => (
                <li key={c._id}>
                  <Link to={`/shop?category=${c.slug}`}>{c.name} {c.children.length > 0 && <FiChevronDown />}</Link>
                  {c.children.length > 0 && (
                    <ul className="mega">
                      {c.children.map((s) => <li key={s._id}><Link to={`/shop?category=${s.slug}`}>{s.name}</Link></li>)}
                    </ul>
                  )}
                </li>
              ))}
              <li><NavLink to="/contact">Contact</NavLink></li>
            </ul>
            {settings.phone && (
              <div className="nav-help">
                <FiPhoneCall />
                <div>Need Help?<strong>{settings.phone}</strong></div>
              </div>
            )}
          </div>
        </nav>
      </header>

      {/* mobile off-canvas menu */}
      <div className={`overlay ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(false)} />
      <aside className={`offcanvas left ${menuOpen ? 'open' : ''}`} aria-hidden={!menuOpen}>
        <div className="offcanvas-head">
          <Logo />
          <button className="close-btn" onClick={() => setMenuOpen(false)} aria-label="Close menu"><FiX /></button>
        </div>
        <div className="offcanvas-body">
          <ul className="m-nav">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/shop">Shop All</Link></li>
            <li><Link to="/shop?tag=todaydeal">Today Deal</Link></li>
            {tree.map((c) => (
              <li key={c._id}>
                <div className="row">
                  <Link to={`/shop?category=${c.slug}`}>{c.name}</Link>
                  {c.children.length > 0 && (
                    <button className={openSub === c._id ? 'open' : ''} onClick={() => setOpenSub(openSub === c._id ? null : c._id)} aria-label={`Toggle ${c.name}`}>
                      <FiChevronDown />
                    </button>
                  )}
                </div>
                {c.children.length > 0 && (
                  <ul className={`m-sub ${openSub === c._id ? 'open' : ''}`}>
                    {c.children.map((s) => <li key={s._id}><Link to={`/shop?category=${s.slug}`}>{s.name}</Link></li>)}
                  </ul>
                )}
              </li>
            ))}
            <li><Link to="/track-order">Track Order</Link></li>
            <li><Link to="/contact">Contact</Link></li>
            <li><Link to={user ? '/account' : '/login'}>{user ? 'My Account' : 'Login / Register'}</Link></li>
          </ul>
        </div>
      </aside>
    </>
  );
}
