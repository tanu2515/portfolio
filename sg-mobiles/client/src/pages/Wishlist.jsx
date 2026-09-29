import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiHeart } from 'react-icons/fi';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import ProductCard from '../components/ProductCard';
import { PageHead } from '../components/ui';
import Loader from '../components/Loader';
import { useTitle } from '../components/lib';

export default function Wishlist() {
  const { user } = useAuth();
  const [items, setItems] = useState(null);
  useTitle('Wishlist');

  // Refetch whenever the wishlist ids change (e.g. an item is un-hearted here).
  const ids = user.wishlist.join(',');
  useEffect(() => { api('/auth/wishlist').then(setItems).catch(() => setItems([])); }, [ids]);

  return (
    <>
      <PageHead title="Wishlist" crumbs={['Wishlist']} />
      <div className="container section">
        {!items ? <Loader /> : items.length === 0 ? (
          <div className="empty"><FiHeart /><p>Your wishlist is empty.</p><Link to="/shop" className="btn">Discover Products</Link></div>
        ) : (
          <div className="grid">{items.map((p) => <ProductCard key={p._id} product={p} />)}</div>
        )}
      </div>
    </>
  );
}
