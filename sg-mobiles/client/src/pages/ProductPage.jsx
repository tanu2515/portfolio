import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FiShoppingCart, FiHeart, FiTruck, FiRefreshCw, FiShield, FiZap } from 'react-icons/fi';
import { FaHeart, FaStar, FaWhatsapp } from 'react-icons/fa';
import { api } from '../api';
import { Img, Price, Qty, Stars, Reveal } from '../components/ui';
import ProductCard, { useWishlistToggle } from '../components/ProductCard';
import VariantPicker from '../components/VariantPicker';
import DeliveryCheck from '../components/DeliveryCheck';
import RecentlyViewed from '../components/RecentlyViewed';
import Loader from '../components/Loader';
import { findVariant, firstInStock, pushRecent, useTitle, variantPricing, waLink } from '../components/lib';
import NotFound from './NotFound';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useShop } from '../context/ShopContext';
import { useToast } from '../context/ToastContext';

export default function ProductPage() {
  const { slug } = useParams();
  const [data, setData] = useState(undefined);
  const [img, setImg] = useState(0);
  const [qty, setQty] = useState(1);
  const [variantId, setVariantId] = useState(null);
  const [tab, setTab] = useState('desc');
  const [origin, setOrigin] = useState('50% 50%');
  const { add } = useCart();
  const { user } = useAuth();
  const { settings } = useShop();
  const toggle = useWishlistToggle();
  const nav = useNavigate();
  useTitle(data?.product?.name || (data === null ? 'Product not found' : 'Product'));

  useEffect(() => {
    setData(undefined);
    setImg(0);
    setQty(1);
    setTab('desc');
    api(`/products/${slug}`)
      .then((d) => {
        setData(d);
        setVariantId(firstInStock(d.product));
        pushRecent(d.product._id);
      })
      .catch(() => setData(null));
  }, [slug]);

  if (data === undefined) return <Loader full />;
  if (data === null) return <NotFound />;
  const { product: p, related, parentCategory } = data;
  const variant = findVariant(p, variantId);
  const pr = variantPricing(p, variant);

  // Variant images that aren't already in the gallery are shown first.
  const base = p.images?.length ? p.images : [''];
  const gallery = variant?.image && !base.includes(variant.image) ? [variant.image, ...base] : base;
  const unavailable = p.comingSoon || pr.stock <= 0;
  const inWish = user?.wishlist?.includes(p._id);
  const sku = variant?.sku || p.sku;

  const pickVariant = (id) => {
    const v = findVariant(p, id);
    setVariantId(id);
    setQty(1);
    const next = v?.image && !base.includes(v.image) ? [v.image, ...base] : base;
    setImg(v?.image ? Math.max(0, next.indexOf(v.image)) : 0);
  };

  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
  };

  const tabs = [
    ['desc', 'Description'],
    ...(p.specs?.length ? [['specs', 'Specifications']] : []),
    ['rev', `Reviews (${p.numReviews})`],
  ];

  return (
    <>
      <div className="container" style={{ paddingTop: 20 }}>
        <div className="crumbs" style={{ color: 'var(--muted)' }}>
          <Link to="/">Home</Link> / <Link to="/shop">Shop</Link> /{' '}
          {parentCategory && <><Link to={`/shop?category=${parentCategory.slug}`}>{parentCategory.name}</Link> / </>}
          <Link to={`/shop?category=${p.category.slug}`}>{p.category.name}</Link> / <span>{p.name}</span>
        </div>
      </div>
      <div className="container pdp">
        <Reveal variant="from-left">
          <div className="gallery-main" onMouseMove={onMove}>
            <Img key={gallery[img]} className="img-fade" src={gallery[img]} alt={p.name} style={{ transformOrigin: origin }} />
          </div>
          {gallery.length > 1 && (
            <div className="thumbs">
              {gallery.map((src, i) => (
                <button key={src + i} className={i === img ? 'active' : ''} onClick={() => setImg(i)} aria-label={`Image ${i + 1}`}>
                  <Img src={src} alt="" />
                </button>
              ))}
            </div>
          )}
        </Reveal>

        <Reveal variant="from-right" className="pdp-info">
          {p.brand && <span className="card-cat">{p.brand}</span>}
          <h1>{p.name}</h1>
          <div style={{ marginBottom: 12 }}>
            {p.numReviews > 0
              ? <button className="link-btn" onClick={() => setTab('rev')}><Stars value={p.rating} count={p.numReviews} /></button>
              : <span className="muted" style={{ fontSize: 13 }}>No reviews yet</span>}
          </div>
          <Price product={{ price: pr.mrp, salePrice: pr.price }} />
          <p className="muted" style={{ fontSize: 13, margin: '4px 0 0' }}>Inclusive of all taxes</p>
          {p.description && <p className="muted" style={{ marginTop: 14 }}>{p.description.split('.')[0]}.</p>}

          <VariantPicker product={p} value={variantId} onChange={pickVariant} />

          <ul className="pdp-meta">
            <li><b>Availability:</b> {p.comingSoon ? <span className="stock-low">Coming soon</span>
              : pr.stock <= 0 ? <span className="stock-out">Out of stock</span>
              : pr.stock <= 5 ? <span className="stock-low">Only {pr.stock} left — hurry!</span>
              : <span className="stock-ok">In stock</span>}</li>
            <li><b>Category:</b> <Link className="link" to={`/shop?category=${p.category.slug}`}>{p.category.name}</Link></li>
            {p.brand && <li><b>Brand:</b> {p.brand}</li>}
            {sku && <li><b>SKU:</b> {sku}</li>}
            {p.warranty && <li><b>Warranty:</b> {p.warranty}</li>}
          </ul>
          <div className="buy-row">
            {!unavailable && <Qty large value={qty} onChange={setQty} max={pr.stock} />}
            <button className="btn" disabled={unavailable} onClick={() => add(p, qty, variant)}><FiShoppingCart /> Add to Cart</button>
            <button className="btn btn-dark" disabled={unavailable} onClick={() => { add(p, qty, variant); nav('/checkout'); }}><FiZap /> Buy Now</button>
            <button className="icon-btn" onClick={() => toggle(p)} aria-label="Wishlist" style={{ color: inWish ? 'var(--danger)' : undefined }}>
              {inWish ? <FaHeart /> : <FiHeart />}
            </button>
          </div>
          {settings.whatsapp && (
            <a
              className="wa-ask"
              target="_blank"
              rel="noreferrer"
              href={waLink(settings.whatsapp, `Hi, I'm interested in ${p.name}${variant ? ` (${variant.name})` : ''}: ${window.location.href}`)}
            >
              <FaWhatsapp /> Ask about this product on WhatsApp
            </a>
          )}
          {!p.comingSoon && <DeliveryCheck />}
          <div className="perks">
            <div><FiTruck />Free shipping over ₹{settings.freeShippingOver}</div>
            <div><FiRefreshCw />{settings.returnDays}-day replacement</div>
            <div><FiShield />Genuine products</div>
          </div>
        </Reveal>
      </div>

      <div className="container">
        <div className="pdp-tabs">
          <div className="tabs" style={{ marginBottom: 20 }}>
            {tabs.map(([key, label]) => (
              <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{label}</button>
            ))}
          </div>
          {tab === 'desc' && <p className="page-fade" style={{ whiteSpace: 'pre-line' }}>{p.description || 'No description available.'}</p>}
          {tab === 'specs' && (
            <table className="specs page-fade">
              <tbody>
                {p.specs.map((s) => <tr key={s.key}><th>{s.key}</th><td>{s.value}</td></tr>)}
                {p.warranty && <tr><th>Warranty</th><td>{p.warranty}</td></tr>}
              </tbody>
            </table>
          )}
          {tab === 'rev' && <Reviews product={p} onChange={(np) => setData({ ...data, product: { ...np, category: p.category } })} />}
        </div>
      </div>

      {related.length > 0 && (
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="section-head"><h2 className="section-title">Related Products</h2></div>
            <div className="grid cols-4">{related.slice(0, 4).map((r) => <ProductCard key={r._id} product={r} />)}</div>
          </div>
        </section>
      )}
      <RecentlyViewed exclude={p._id} alt />
    </>
  );
}

function Reviews({ product, onChange }) {
  const { user } = useAuth();
  const toast = useToast();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const mine = user && product.reviews.some((r) => r.user === user._id);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      onChange(await api(`/products/${product._id}/reviews`, { method: 'POST', body: { rating, comment } }));
      setComment('');
      toast('Thanks for your review!');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-fade">
      {product.reviews.length === 0 && <p className="muted">Be the first to review this product.</p>}
      {product.reviews.map((r) => (
        <div className="review" key={r._id}>
          <Stars value={r.rating} /> <b style={{ marginLeft: 8 }}>{r.name}</b>
          <span className="muted" style={{ fontSize: 12, marginLeft: 8 }}>{new Date(r.createdAt).toLocaleDateString('en-IN')}</span>
          {r.comment && <p style={{ margin: '6px 0 0' }}>{r.comment}</p>}
        </div>
      ))}
      {!user ? (
        <p><Link to="/login" className="link">Log in</Link> to write a review.</p>
      ) : !mine && (
        <form onSubmit={submit} style={{ marginTop: 20, maxWidth: 520 }}>
          <h4>Write a review</h4>
          <div className="star-input">
            {[1, 2, 3, 4, 5].map((n) => (
              <button type="button" key={n} onClick={() => setRating(n)} aria-label={`${n} stars`} style={{ opacity: n <= rating ? 1 : 0.3 }}><FaStar /></button>
            ))}
          </div>
          <textarea className="input" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Share your experience" />
          <button className="btn" style={{ marginTop: 10 }} disabled={busy}>Submit Review</button>
        </form>
      )}
    </div>
  );
}
