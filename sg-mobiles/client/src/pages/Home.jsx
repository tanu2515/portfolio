import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiTruck, FiRefreshCw, FiShield, FiHeadphones, FiArrowRight, FiWatch, FiSmartphone,
  FiBatteryCharging, FiSpeaker, FiCamera, FiZap, FiMic, FiBox,
} from 'react-icons/fi';
import { api } from '../api';
import HeroSlider from '../components/HeroSlider';
import ProductCard from '../components/ProductCard';
import { Countdown, Img, Reveal } from '../components/ui';
import { useShop } from '../context/ShopContext';
import { useToast } from '../context/ToastContext';
import RecentlyViewed from '../components/RecentlyViewed';
import { useTitle } from '../components/lib';

const TABS = [
  ['featured', 'Featured'],
  ['bestseller', 'Best Sellers'],
  ['new', 'New Arrivals'],
];

const CAT_ICONS = {
  'smart-watch': FiWatch, 'ear-music': FiHeadphones, cover: FiSmartphone, charger: FiZap,
  'power-bank': FiBatteryCharging, speaker: FiSpeaker, camera: FiCamera, microphone: FiMic, phone: FiSmartphone,
};

const BRANDS = ['boAt', 'Noise', 'Fire-Boltt', 'JBL', 'Apple', 'Samsung', 'Mi', 'Pebble', 'Ambrane', 'Realme', 'OnePlus', 'Spigen'];

const TESTIMONIALS = [
  ['Rahul S.', 'Ordered a Fire-Boltt watch — got it in 2 days, genuine product and great price. Highly recommended!'],
  ['Priya K.', 'Loved the collection of phone covers. Packaging was premium and the support team was very helpful.'],
  ['Aman V.', 'Best place for earbuds and chargers. Prices are lower than other sites and COD made it easy.'],
];

// One homepage row per category flagged "Show on homepage" in admin.
function CategoryRow({ cat, alt }) {
  const [products, setProducts] = useState(null);
  useEffect(() => {
    api(`/products?category=${cat.slug}&limit=8`).then((d) => setProducts(d.products)).catch(() => setProducts([]));
  }, [cat.slug]);
  if (products && !products.length) return null;
  return (
    <section className={`section ${alt ? 'section-alt' : ''}`}>
      <div className="container">
        <div className="section-head">
          <div>
            <h2 className="section-title">{cat.name}</h2>
            {cat.children.length > 0 && (
              <div className="sub-chips" style={{ marginTop: 14 }}>
                {cat.children.map((s) => <Link key={s._id} to={`/shop?category=${s.slug}`} className="sub-chip">{s.name}</Link>)}
              </div>
            )}
          </div>
          <Link to={`/shop?category=${cat.slug}`} className="link">View all <FiArrowRight style={{ verticalAlign: -2 }} /></Link>
        </div>
        {products === null ? <SkeletonGrid n={4} /> : (
          <div className="grid cols-4">
            {products.slice(0, 8).map((p, i) => <ProductCard key={p._id} product={p} style={{ animationDelay: `${(i % 4) * 60}ms` }} />)}
          </div>
        )}
      </div>
    </section>
  );
}

function SkeletonGrid({ n = 8 }) {
  return (
    <div className="grid cols-4">
      {Array.from({ length: n }, (_, i) => <div key={i} className="skeleton" style={{ aspectRatio: '0.72' }} />)}
    </div>
  );
}

export default function Home() {
  const { tree } = useShop();
  const toast = useToast();
  const [banners, setBanners] = useState([]);
  const [tab, setTab] = useState('featured');
  const [tabProducts, setTabProducts] = useState(null);
  const [deals, setDeals] = useState([]);
  const [soon, setSoon] = useState(null);
  useTitle(null);

  useEffect(() => {
    api('/banners').then(setBanners).catch(() => {});
    api('/products?tag=todaydeal&limit=4').then((d) => setDeals(d.products)).catch(() => {});
    api('/products?limit=40').then((d) => setSoon(d.products.find((p) => p.comingSoon) || null)).catch(() => {});
  }, []);

  useEffect(() => {
    setTabProducts(null);
    api(`/products?tag=${tab}&limit=8`).then((d) => setTabProducts(d.products)).catch(() => setTabProducts([]));
  }, [tab]);

  const hero = banners.filter((b) => b.placement === 'hero');
  const dealTiles = banners.filter((b) => b.placement === 'deal');
  const promo = banners.find((b) => b.placement === 'promo');

  return (
    <>
      <HeroSlider slides={hero} />

      <div className="container">
        <div className="services">
          {[
            [FiTruck, 'Free Shipping', 'On orders over ₹500'],
            [FiRefreshCw, 'Easy Returns', '7-day replacement'],
            [FiShield, 'Secure Payment', '100% protected checkout'],
            [FiHeadphones, '24/7 Support', 'Dedicated help line'],
          ].map(([Icon, title, sub], i) => (
            <Reveal className="service" key={title} delay={i * 100}>
              <span className="ic"><Icon /></span>
              <div><h4>{title}</h4><p>{sub}</p></div>
            </Reveal>
          ))}
        </div>
      </div>

      {/* Today's Deal tiles */}
      {dealTiles.length > 0 && (
        <section className="section" style={{ paddingTop: 10 }}>
          <div className="container">
            <div className="section-head">
              <h2 className="section-title">Today's Deal <span className="hot">HOT</span></h2>
            </div>
            <div className="deals">
              {dealTiles.map((b, i) => (
                <Reveal key={b._id} className="deal" style={{ background: b.bgColor }} delay={i * 120} variant="zoom">
                  <span className="kicker">{b.kicker}</span>
                  <h3>{b.title}</h3>
                  {b.subtitle && <div className="from">{b.subtitle.replace(/₹.*/, '')}<b>{b.subtitle.match(/₹.*/)?.[0]}</b></div>}
                  <Link to={b.link} className="btn btn-sm">{b.buttonText || 'Shop Now'} <FiArrowRight /></Link>
                  <Img src={b.image} alt="" />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Categories */}
      <section className="section section-alt">
        <div className="container">
          <div className="section-head">
            <h2 className="section-title">Shop By Category</h2>
            <Link to="/shop" className="link">View all <FiArrowRight style={{ verticalAlign: -2 }} /></Link>
          </div>
          <div className="cat-chips">
            {tree.slice(0, 12).map((c, i) => {
              const Icon = CAT_ICONS[c.slug] || FiBox;
              return (
                <Reveal key={c._id} delay={(i % 6) * 70}>
                  <Link to={`/shop?category=${c.slug}`} className="chip">
                    <span className={`ic ${c.image ? 'has-img' : ''}`}>{c.image ? <Img src={c.image} alt="" /> : <Icon />}</span>{c.name}
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Product tabs */}
      <section className="section">
        <div className="container">
          <div className="section-head">
            <h2 className="section-title">Trending Products</h2>
            <div className="tabs" role="tablist">
              {TABS.map(([key, label]) => (
                <button key={key} role="tab" aria-selected={tab === key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{label}</button>
              ))}
            </div>
          </div>
          {tabProducts === null ? <SkeletonGrid /> : (
            <div className="grid cols-4" key={tab}>
              {tabProducts.map((p, i) => <ProductCard key={p._id} product={p} style={{ animationDelay: `${i * 60}ms` }} />)}
            </div>
          )}
        </div>
      </section>

      {/* Promo strip with countdown */}
      {promo && (
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="container">
            <Reveal className="promo" style={{ background: `linear-gradient(120deg, ${promo.bgColor}, #1f2937)` }}>
              <div>
                <span className="kicker">{promo.kicker}</span>
                <h2>{promo.title}</h2>
                <p>{promo.subtitle}</p>
                <Countdown />
                <Link to={promo.link} className="btn">{promo.buttonText} <FiArrowRight /></Link>
              </div>
              <Img src={promo.image} alt="" />
            </Reveal>
          </div>
        </section>
      )}

      {/* Deals of the day grid */}
      {deals.length > 0 && (
        <section className="section section-alt">
          <div className="container">
            <div className="section-head">
              <h2 className="section-title">Deals Of The Day</h2>
              <Link to="/shop?tag=todaydeal" className="link">See all deals <FiArrowRight style={{ verticalAlign: -2 }} /></Link>
            </div>
            <div className="grid cols-4">
              {deals.map((p, i) => <ProductCard key={p._id} product={p} style={{ animationDelay: `${i * 60}ms` }} />)}
            </div>
          </div>
        </section>
      )}

      {/* Category-wise rows */}
      {tree.filter((c) => c.showOnHome).map((c, i) => <CategoryRow key={c._id} cat={c} alt={i % 2 === 1} />)}

      {/* Coming soon */}
      {soon && (
        <section className="section">
          <div className="container">
            <div className="soon-box">
              <Reveal variant="from-left"><Img src={soon.images?.[0]} alt={soon.name} /></Reveal>
              <Reveal variant="from-right">
                <span className="tag">NEW PRODUCT</span>
                <h2 style={{ fontSize: 'clamp(26px,3.5vw,40px)' }}>{soon.name}</h2>
                <p className="muted">Will release soon. Be the first to know when it lands.</p>
                <button className="btn" onClick={() => toast("We'll notify you when it launches!")}>Notify Me</button>
              </Reveal>
            </div>
          </div>
        </section>
      )}

      {/* Brands marquee */}
      <section className="section section-alt" style={{ padding: '36px 0' }}>
        <div className="marquee">
          <div className="marquee-track">
            {[...BRANDS, ...BRANDS].map((b, i) => <span key={i}>{b}</span>)}
          </div>
        </div>
      </section>

      <RecentlyViewed />

      {/* Testimonials */}
      <section className="section">
        <div className="container">
          <div className="section-head"><h2 className="section-title">What Our Customers Say</h2></div>
          <div className="testis">
            {TESTIMONIALS.map(([name, text], i) => (
              <Reveal className="testi" key={name} delay={i * 120}>
                <span className="stars">★★★★★</span>
                <p>“{text}”</p>
                <div className="who"><span className="av">{name[0]}</span><div><b>{name}</b><div className="muted" style={{ fontSize: 13 }}>Verified buyer</div></div></div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="container">
        <Reveal className="newsletter">
          <div>
            <h3>Subscribe & get ₹100 off</h3>
            <p>Use code <b style={{ color: '#ffb347' }}>WELCOME100</b> on your first order above ₹499.</p>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); e.target.reset(); toast('Thanks for subscribing!'); }}>
            <input type="email" required placeholder="Enter your email" aria-label="Email" />
            <button className="btn">Subscribe</button>
          </form>
        </Reveal>
      </section>
    </>
  );
}
