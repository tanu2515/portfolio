import { useEffect, useState } from 'react';
import { FiMapPin, FiTruck, FiCheckCircle, FiXCircle, FiRefreshCw } from 'react-icons/fi';
import { api, fmtDay } from '../api';

const PIN_KEY = 'sg_pincode';
export const savedPincode = () => {
  try { return localStorage.getItem(PIN_KEY) || ''; } catch { return ''; }
};

export default function DeliveryCheck() {
  const [pin, setPin] = useState(savedPincode);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const check = async (code = pin) => {
    if (!/^\d{6}$/.test(code)) return setError('Enter a valid 6-digit pincode');
    setBusy(true);
    setError('');
    try {
      const r = await api(`/delivery/check?pincode=${code}`);
      setResult(r);
      try { localStorage.setItem(PIN_KEY, code); } catch { /* ignore */ }
    } catch (e) {
      setError(e.message);
      setResult(null);
    } finally {
      setBusy(false);
    }
  };

  // Re-check the remembered pincode when the product page opens.
  useEffect(() => {
    if (/^\d{6}$/.test(pin)) check(pin);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="delivery-box">
      <h4><FiTruck /> Delivery Options</h4>
      <form className="pin-row" onSubmit={(e) => { e.preventDefault(); check(); }}>
        <FiMapPin />
        <input
          value={pin}
          onChange={(e) => { setPin(e.target.value.replace(/\D/g, '').slice(0, 6)); setResult(null); }}
          inputMode="numeric"
          placeholder="Enter delivery pincode"
          aria-label="Delivery pincode"
        />
        <button disabled={busy}>{busy ? '...' : 'Check'}</button>
      </form>
      {error && <p className="pin-msg bad">{error}</p>}
      {result && (result.serviceable ? (
        <ul className="pin-result page-fade">
          <li><FiTruck /> Delivery by <b>{fmtDay(result.eta.from)} – {fmtDay(result.eta.to)}</b></li>
          <li className={result.cod ? '' : 'no'}>
            {result.cod ? <FiCheckCircle /> : <FiXCircle />}
            {result.cod ? `Cash on Delivery available${result.codCharge ? ` (+₹${result.codCharge})` : ''}` : 'Cash on Delivery not available'}
          </li>
          <li><FiRefreshCw /> {result.returnDays}-day easy returns</li>
        </ul>
      ) : (
        <p className="pin-msg bad"><FiXCircle /> {result.message}</p>
      ))}
    </div>
  );
}
