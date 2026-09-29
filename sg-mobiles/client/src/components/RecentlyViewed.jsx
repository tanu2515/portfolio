import { useEffect, useState } from 'react';
import { api } from '../api';
import { getRecent } from './lib';
import ProductCard from './ProductCard';

export default function RecentlyViewed({ exclude, alt }) {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const ids = getRecent().filter((id) => id !== exclude).slice(0, 8);
    if (!ids.length) return setProducts([]);
    api(`/products?ids=${ids.join(',')}&limit=8`)
      .then((d) => setProducts(ids.map((id) => d.products.find((p) => p._id === id)).filter(Boolean)))
      .catch(() => {});
  }, [exclude]);

  if (!products.length) return null;
  return (
    <section className={`section ${alt ? 'section-alt' : ''}`}>
      <div className="container">
        <div className="section-head"><h2 className="section-title">Recently Viewed</h2></div>
        <div className="grid cols-4">
          {products.slice(0, 4).map((p, i) => <ProductCard key={p._id} product={p} style={{ animationDelay: `${i * 60}ms` }} />)}
        </div>
      </div>
    </section>
  );
}
