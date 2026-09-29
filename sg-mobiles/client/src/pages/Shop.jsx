import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTitle } from '../components/lib';
import { FiFilter, FiX, FiSearch } from 'react-icons/fi';
import { api } from '../api';
import ProductCard from '../components/ProductCard';
import { PageHead } from '../components/ui';
import { useShop } from '../context/ShopContext';

const TAG_LABELS = { todaydeal: "Today's Deal", featured: 'Featured', bestseller: 'Best Sellers', new: 'New Arrivals' };

export default function Shop() {
  const [params, setParams] = useSearchParams();
  const { tree, categories } = useShop();
  const [data, setData] = useState(null);
  const [brands, setBrands] = useState([]);
  const [open, setOpen] = useState(false);
  const [min, setMin] = useState(params.get('min') || '');
  const [max, setMax] = useState(params.get('max') || '');

  const key = params.toString();
  useEffect(() => {
    setData(null);
    api(`/products?limit=12&${key}`).then(setData).catch(() => setData({ products: [], total: 0, pages: 0 }));
  }, [key]);

  useEffect(() => { api('/products/brands').then(setBrands).catch(() => {}); }, []);

  const set = (k, v) => {
    const sp = new URLSearchParams(params);
    if (v) sp.set(k, v); else sp.delete(k);
    if (k !== 'page') sp.delete('page');
    setParams(sp);
    setOpen(false);
  };

  const current = categories.find((c) => c.slug === params.get('category'));
  const title = current?.name || (params.get('q') ? `Search: "${params.get('q')}"` : TAG_LABELS[params.get('tag')] || 'Shop');
  const page = Number(params.get('page')) || 1;
  useTitle(title);

  // Sub-category chips: children of the current category, or its siblings when a child is selected.
  const parent = current && (current.parent ? tree.find((c) => c._id === current.parent) : tree.find((c) => c._id === current._id));
  const chips = parent?.children || [];

  return (
    <>
      <PageHead
        title={title}
        image={current?.banner || parent?.banner}
        description={current?.description}
        crumbs={[['Shop', '/shop'], ...(parent && parent._id !== current._id ? [[parent.name, `/shop?category=${parent.slug}`]] : []), ...(current ? [current.name] : [])]}
      />
      {chips.length > 0 && (
        <div className="container">
          <div className="sub-chips shop-chips">
            <Link to={`/shop?category=${parent.slug}`} className={`sub-chip ${current._id === parent._id ? 'active' : ''}`}>All {parent.name}</Link>
            {chips.map((c) => (
              <Link key={c._id} to={`/shop?category=${c.slug}`} className={`sub-chip ${current._id === c._id ? 'active' : ''}`}>{c.name}</Link>
            ))}
          </div>
        </div>
      )}
      <div className="container shop">
        <div className={`overlay ${open ? 'open' : ''}`} onClick={() => setOpen(false)} style={{ zIndex: 95 }} />
        <aside className={`filters ${open ? 'open' : ''}`}>
          <div className="offcanvas-head filter-toggle" style={{ padding: 0, border: 0, justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0 }}>Filters</h3>
            <button className="close-btn" onClick={() => setOpen(false)} aria-label="Close filters"><FiX /></button>
          </div>
          <div className="filter-box">
            <h4>Categories</h4>
            <ul className="filter-list">
              <li><button className={!params.get('category') ? 'active' : ''} onClick={() => set('category', '')}>All Products</button></li>
              {tree.map((c) => (
                <li key={c._id}>
                  <button className={params.get('category') === c.slug ? 'active' : ''} onClick={() => set('category', c.slug)}>{c.name}</button>
                  {c.children.length > 0 && (
                    <ul className="filter-list child" style={{ maxHeight: 'none' }}>
                      {c.children.map((s) => (
                        <li key={s._id}><button className={params.get('category') === s.slug ? 'active' : ''} onClick={() => set('category', s.slug)}>{s.name}</button></li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <div className="filter-box">
            <h4>Price</h4>
            <form
              className="price-inputs"
              onSubmit={(e) => {
                e.preventDefault();
                const sp = new URLSearchParams(params);
                min ? sp.set('min', min) : sp.delete('min');
                max ? sp.set('max', max) : sp.delete('max');
                sp.delete('page');
                setParams(sp);
                setOpen(false);
              }}
            >
              <input className="input" type="number" min="0" placeholder="Min" value={min} onChange={(e) => setMin(e.target.value)} />
              <span>–</span>
              <input className="input" type="number" min="0" placeholder="Max" value={max} onChange={(e) => setMax(e.target.value)} />
              <button className="btn btn-sm" aria-label="Apply price"><FiSearch /></button>
            </form>
          </div>
          {brands.length > 0 && (
            <div className="filter-box">
              <h4>Brand</h4>
              <ul className="filter-list">
                {brands.map((b) => (
                  <li key={b}><button className={params.get('brand') === b ? 'active' : ''} onClick={() => set('brand', params.get('brand') === b ? '' : b)}>{b}</button></li>
                ))}
              </ul>
            </div>
          )}
          <div className="filter-box">
            <h4>Availability</h4>
            <label className="check">
              <input type="checkbox" checked={params.get('inStock') === 'true'} onChange={(e) => set('inStock', e.target.checked ? 'true' : '')} />
              In stock only
            </label>
            <label className="check">
              <input type="checkbox" checked={params.get('onSale') === 'true'} onChange={(e) => set('onSale', e.target.checked ? 'true' : '')} />
              On sale
            </label>
          </div>
          {key && <button className="btn btn-outline" onClick={() => { setMin(''); setMax(''); setParams({}); setOpen(false); }}>Clear all filters</button>}
        </aside>

        <div>
          <div className="shop-bar">
            <button className="btn btn-outline btn-sm filter-toggle" onClick={() => setOpen(true)}><FiFilter /> Filters</button>
            <span className="muted">{data ? `Showing ${data.products.length} of ${data.total} products` : 'Loading…'}</span>
            <select className="input" value={params.get('sort') || 'newest'} onChange={(e) => set('sort', e.target.value)} aria-label="Sort by">
              <option value="newest">Newest first</option>
              <option value="popular">Most popular</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
              <option value="rating">Top rated</option>
              <option value="name">Name A–Z</option>
            </select>
          </div>

          {!data ? (
            <div className="grid">{Array.from({ length: 8 }, (_, i) => <div key={i} className="skeleton" style={{ aspectRatio: '0.72' }} />)}</div>
          ) : data.products.length === 0 ? (
            <div className="empty"><FiSearch /><p>No products match your filters.</p></div>
          ) : (
            <div className="grid">
              {data.products.map((p, i) => <ProductCard key={p._id} product={p} style={{ animationDelay: `${i * 50}ms` }} />)}
            </div>
          )}

          {data?.pages > 1 && (
            <div className="pagination">
              <button disabled={page <= 1} onClick={() => set('page', page - 1)}>‹</button>
              {Array.from({ length: data.pages }, (_, i) => i + 1).map((n) => (
                <button key={n} className={n === page ? 'active' : ''} onClick={() => set('page', n)}>{n}</button>
              ))}
              <button disabled={page >= data.pages} onClick={() => set('page', page + 1)}>›</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
