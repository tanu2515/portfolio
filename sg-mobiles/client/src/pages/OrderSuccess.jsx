import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FiCheck } from 'react-icons/fi';
import { api, inr } from '../api';
import Loader from '../components/Loader';
import { useTitle } from '../components/lib';

export default function OrderSuccess() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  useTitle('Order Placed');

  useEffect(() => { api(`/orders/${id}`).then(setOrder).catch(() => {}); }, [id]);

  if (!order) return <Loader full />;
  return (
    <div className="container center" style={{ padding: '70px 16px', maxWidth: 620 }}>
      <div className="success-ic"><FiCheck /></div>
      <h1>Thank you for your order!</h1>
      <p className="muted">
        Your order <b style={{ color: 'var(--ink)' }}>#{order.orderNo}</b> of <b style={{ color: 'var(--ink)' }}>{inr(order.total)}</b> has been placed.
        We'll call you on {order.shippingAddress.phone} to confirm.
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24, flexWrap: 'wrap' }}>
        <Link to={`/account/orders/${order._id}`} className="btn">View Order</Link>
        <Link to="/shop" className="btn btn-outline">Continue Shopping</Link>
      </div>
    </div>
  );
}
