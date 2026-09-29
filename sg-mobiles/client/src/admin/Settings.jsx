import { useEffect, useState } from 'react';
import { FiFacebook, FiInstagram, FiTwitter, FiYoutube, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import { api } from '../api';
import { useToast } from '../context/ToastContext';
import { useShop } from '../context/ShopContext';
import Loader from '../components/Loader';

const SOCIAL = [
  ['facebook', 'Facebook', FiFacebook],
  ['instagram', 'Instagram', FiInstagram],
  ['twitter', 'Twitter / X', FiTwitter],
  ['youtube', 'YouTube', FiYoutube],
];

const TEXT = ['storeName', 'topbarText', 'phone', 'whatsapp', 'email', 'address', 'gstin', 'serviceablePincodes'];
const NUM = ['freeShippingOver', 'shippingFee', 'deliveryDaysMin', 'deliveryDaysMax', 'codCharge', 'codMaxOrder', 'returnDays', 'lowStockThreshold'];

export default function Settings() {
  const toast = useToast();
  const { refresh } = useShop();
  const [f, setF] = useState(null);
  const [online, setOnline] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = (s) => {
    setOnline(!!s.onlinePayment);
    setF({ ...s, social: s.social || {} });
  };

  useEffect(() => {
    api('/settings').then(load).catch((e) => toast(e.message, 'error'));
  }, [toast]);

  if (!f) return <Loader />;

  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const setSocial = (k) => (e) => setF((x) => ({ ...x, social: { ...x.social, [k]: e.target.value } }));

  const save = async (e) => {
    e.preventDefault();
    if (!f.storeName?.trim()) return toast('Store name is required', 'error');
    if (Number(f.deliveryDaysMin) > Number(f.deliveryDaysMax)) return toast('Minimum delivery days cannot exceed the maximum', 'error');
    if (f.whatsapp && !/^\d{10,15}$/.test(f.whatsapp)) return toast('WhatsApp number: digits only, with country code (e.g. 919876543210)', 'error');
    setSaving(true);
    try {
      const body = { codEnabled: !!f.codEnabled, social: f.social };
      TEXT.forEach((k) => { body[k] = (f[k] || '').trim(); });
      NUM.forEach((k) => { body[k] = Math.max(0, Number(f[k]) || 0); });
      const saved = await api('/admin/settings', { method: 'PUT', body });
      load({ ...saved, onlinePayment: online });
      refresh();
      toast('Settings saved');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const num = (k, label, help) => (
    <label className="ad-field">
      <span>{label}</span>
      <input type="number" min="0" className="ad-input" value={f[k] ?? ''} onChange={set(k)} />
      {help && <span className="ad-help">{help}</span>}
    </label>
  );

  return (
    <form className="ad-stack ad-settings" onSubmit={save}>
      <section className="ad-card">
        <h3 className="ad-section-title">Store</h3>
        <div className="ad-form-grid">
          <label className="ad-field">
            <span>Store name *</span>
            <input className="ad-input" value={f.storeName || ''} onChange={set('storeName')} />
          </label>
          <label className="ad-field">
            <span>Top bar announcement</span>
            <input className="ad-input" value={f.topbarText || ''} onChange={set('topbarText')} />
          </label>
          <label className="ad-field">
            <span>GSTIN</span>
            <input className="ad-input ad-upper" value={f.gstin || ''} onChange={set('gstin')} placeholder="Printed on invoices" />
          </label>
        </div>
      </section>

      <section className="ad-card">
        <h3 className="ad-section-title">Contact</h3>
        <div className="ad-form-grid">
          <label className="ad-field">
            <span>Helpline phone</span>
            <input className="ad-input" value={f.phone || ''} onChange={set('phone')} />
          </label>
          <label className="ad-field">
            <span>WhatsApp number</span>
            <input className="ad-input" value={f.whatsapp || ''} onChange={set('whatsapp')} placeholder="919876543210" inputMode="numeric" />
            <span className="ad-help">Digits with country code, no + or spaces. Powers the chat button on the store.</span>
          </label>
          <label className="ad-field">
            <span>Support email</span>
            <input type="email" className="ad-input" value={f.email || ''} onChange={set('email')} />
          </label>
          <label className="ad-field">
            <span>Store address</span>
            <textarea className="ad-input" rows={2} value={f.address || ''} onChange={set('address')} />
          </label>
        </div>
      </section>

      <section className="ad-card">
        <h3 className="ad-section-title">Shipping & delivery</h3>
        <div className="ad-form-grid">
          {num('freeShippingOver', 'Free shipping on orders over (₹)')}
          {num('shippingFee', 'Shipping fee below that (₹)')}
          {num('deliveryDaysMin', 'Delivery time – from (days)', 'Working days; Sundays are skipped')}
          {num('deliveryDaysMax', 'Delivery time – up to (days)')}
          <label className="ad-field ad-span-2">
            <span>Serviceable pincodes</span>
            <textarea className="ad-input" rows={3} value={f.serviceablePincodes || ''} onChange={set('serviceablePincodes')} placeholder="e.g. 411, 400001, 400002" />
            <span className="ad-help">Comma or space separated pincodes or prefixes (411 = every pincode starting with 411). Leave empty to deliver all over India.</span>
          </label>
        </div>
      </section>

      <section className="ad-card">
        <h3 className="ad-section-title">Payments</h3>
        <div className={`ad-info ${online ? 'ad-info-on' : 'ad-info-off'}`}>
          {online ? <FiCheckCircle /> : <FiAlertCircle />}
          <div>
            <strong>Online payments (Razorpay): {online ? 'Enabled' : 'Not configured'}</strong>
            <p className="ad-help">
              {online
                ? 'Customers can pay by UPI, cards and netbanking at checkout.'
                : <>To accept online payments, add <code>RAZORPAY_KEY_ID</code> and <code>RAZORPAY_KEY_SECRET</code> to <code>server/.env</code> and restart the server.</>}
            </p>
          </div>
        </div>
        <div className="ad-form-grid ad-mt">
          <label className="ad-switch-row ad-span-2">
            <span>Allow pay on delivery (cash / UPI)</span>
            <input type="checkbox" className="ad-switch" checked={!!f.codEnabled} onChange={set('codEnabled')} />
          </label>
          {num('codCharge', 'COD handling charge (₹)', '0 = free')}
          {num('codMaxOrder', 'COD allowed up to order value (₹)', '0 = no limit')}
        </div>
      </section>

      <section className="ad-card">
        <h3 className="ad-section-title">Returns & inventory</h3>
        <div className="ad-form-grid">
          {num('returnDays', 'Return window (days after delivery)')}
          {num('lowStockThreshold', 'Low stock alert at (units)')}
        </div>
      </section>

      <section className="ad-card">
        <h3 className="ad-section-title">Social links</h3>
        <div className="ad-form-grid">
          {SOCIAL.map(([k, label, Icon]) => (
            <label key={k} className="ad-field">
              <span><Icon /> {label}</span>
              <input className="ad-input" value={f.social?.[k] || ''} onChange={setSocial(k)} placeholder="https://…" />
            </label>
          ))}
        </div>
      </section>

      <div className="ad-row ad-justify-end">
        <button className="ad-btn ad-btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</button>
      </div>
    </form>
  );
}
