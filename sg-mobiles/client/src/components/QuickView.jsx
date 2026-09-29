import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { FiX, FiShoppingCart } from 'react-icons/fi';
import { Img, Price, Qty, Stars } from './ui';
import VariantPicker from './VariantPicker';
import { findVariant, firstInStock, variantPricing } from './lib';
import { useCart } from '../context/CartContext';

export default function QuickView({ product: p, onClose }) {
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  const [variantId, setVariantId] = useState(() => firstInStock(p));

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const variant = findVariant(p, variantId);
  const pr = variantPricing(p, variant);
  const unavailable = p.comingSoon || pr.stock <= 0;

  return createPortal(
    <div className="modal-wrap" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={p.name}>
        <button className="close-btn" onClick={onClose} aria-label="Close"><FiX /></button>
        <div className="qv">
          <Img key={pr.image} className="img-fade" src={pr.image} alt={p.name} />
          <div className="qv-info">
            {p.brand && <span className="card-cat">{p.brand}</span>}
            <h2>{p.name}</h2>
            {p.numReviews > 0 && <Stars value={p.rating} count={p.numReviews} />}
            <Price product={{ price: pr.mrp, salePrice: pr.price }} />
            {p.description && <p className="muted">{p.description.slice(0, 180)}</p>}
            <VariantPicker product={p} value={variantId} onChange={(id) => { setVariantId(id); setQty(1); }} />
            {!p.comingSoon && pr.stock > 0 && pr.stock <= 5 && <span className="stock-low">Only {pr.stock} left</span>}
            <div className="buy-row">
              {!unavailable && <Qty value={qty} onChange={setQty} max={pr.stock} />}
              <button className="btn" disabled={unavailable} onClick={() => { add(p, qty, variant); onClose(); }}>
                <FiShoppingCart /> {p.comingSoon ? 'Coming Soon' : pr.stock <= 0 ? 'Out of Stock' : 'Add to Cart'}
              </button>
            </div>
            <Link to={`/product/${p.slug}`} className="link" onClick={onClose}>View full details →</Link>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
