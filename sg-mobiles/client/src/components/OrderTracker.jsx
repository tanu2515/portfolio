import { FiClock, FiSettings, FiTruck, FiCheck, FiX, FiMapPin, FiRotateCcw } from 'react-icons/fi';

const STEPS = [
  ['Pending', FiClock, 'Order placed'],
  ['Processing', FiSettings, 'Processing'],
  ['Shipped', FiTruck, 'Shipped'],
  ['Out for Delivery', FiMapPin, 'Out for delivery'],
  ['Delivered', FiCheck, 'Delivered'],
];
const LAST = STEPS.length - 1;

export default function OrderTracker({ status, history = [] }) {
  const cancelled = status === 'Cancelled';
  const returned = status === 'Returned';
  const idx = (s) => STEPS.findIndex(([name]) => name === s);
  // Cancelled: progress up to the last real step reached. Returned: it was delivered first.
  const reached = cancelled
    ? Math.max(0, ...history.map((h) => idx(h.status)))
    : returned ? LAST : idx(status);
  const when = (s) => history.find((h) => h.status === s)?.at;

  return (
    <div className={`tracker ${cancelled ? 'cancelled' : ''} ${returned ? 'returned' : ''}`}>
      <span className="fill" style={{ width: `${(Math.max(0, reached) / LAST) * 84}%` }} />
      {STEPS.map(([s, Icon, label], i) => {
        const cancelHere = cancelled && i === reached + 1;
        const returnHere = returned && i === LAST;
        const at = when(returnHere ? 'Returned' : s);
        return (
          <div key={s} className={`step ${i <= reached ? 'done' : ''} ${cancelHere ? 'x' : ''}`}>
            <span className="dot">{cancelHere ? <FiX /> : returnHere ? <FiRotateCcw /> : <Icon />}</span>
            <span>{cancelHere ? 'Cancelled' : returnHere ? 'Returned' : label}</span>
            {at && <small className="muted">{new Date(at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</small>}
          </div>
        );
      })}
    </div>
  );
}
