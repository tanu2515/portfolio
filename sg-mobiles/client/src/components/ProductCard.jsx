import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiHeart, FiEye, FiShoppingCart } from 'react-icons/fi';
import { FaHeart } from 'react-icons/fa';
import { Img, Price, Stars } from './ui';
import QuickView from './QuickView';
import { discountPct } from '../api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export function useWishlistToggle() {
  const { user, toggleWishlist } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  return async (p) => {
    if (!user) {
      toast('Please log in to use your wishlist', 'error');
      return nav('/login');
    }
    try {
      const added = await toggleWishlist(p._id);
      toast(added ? 'Added to wishlist' : 'Removed from wishlist');
    } catch (e) {
      toast(e.message, 'error');
    }
  };
}

export default function ProductCard({ product: p, style }) {
  const { add } = useCart();
  const { user } = useAuth();
  const toggle = useWishlistToggle();
  const [quick, setQuick] = useState(false);
  const off = discountPct(p);
  const inWish = user?.wishlist?.includes(p._id);
  const unavailable = p.comingSoon || p.stock <= 0;
  const hasVariants = p.variants?.length > 0;

  return (
    <article className="card" style={style}>
      <div className="card-media">
        <Link to={`/product/${p.slug}`} aria-label={p.name}>
          <Img src={p.images?.[0]} alt={p.name} />
        </Link>
        <div className="card-flags">
          {p.comingSoon ? <span className="flag soon">Coming soon</span>
            : p.stock <= 0 ? <span className="flag out">Sold out</span>
            : off > 0 && <span className="flag">-{off}%</span>}
          {p.tags?.includes('new') && !p.comingSoon && <span className="flag new">New</span>}
        </div>
        <div className="card-actions">
          <button className={inWish ? 'on' : ''} onClick={() => toggle(p)} aria-label="Wishlist" title="Wishlist">
            {inWish ? <FaHeart /> : <FiHeart />}
          </button>
          <button onClick={() => setQuick(true)} aria-label="Quick view" title="Quick view"><FiEye /></button>
        </div>
        <div className="card-cart">
          {/* Products with variants need a choice first, so open quick view instead. */}
          <button className="btn btn-dark btn-block btn-sm" disabled={unavailable} onClick={() => (hasVariants ? setQuick(true) : add(p))}>
            <FiShoppingCart /> {p.comingSoon ? 'Coming Soon' : p.stock <= 0 ? 'Out of Stock' : hasVariants ? 'Choose Options' : 'Add to Cart'}
          </button>
        </div>
      </div>
      <div className="card-body">
        {p.category?.name && <span className="card-cat">{p.category.name}</span>}
        <Link to={`/product/${p.slug}`} className="card-name">{p.name}</Link>
        {p.numReviews > 0 && <Stars value={p.rating} count={p.numReviews} />}
        <Price product={p} />
        {hasVariants && <span className="card-opts">{p.variants.length} {(p.optionName || 'option').toLowerCase()}s available</span>}
      </div>
      {quick && <QuickView product={p} onClose={() => setQuick(false)} />}
    </article>
  );
}
