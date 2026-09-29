import { useEffect, useState } from 'react';
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { api, inr } from '../api';
import { useToast } from '../context/ToastContext';
import Loader from '../components/Loader';
import { Empty, Modal, fmtDate } from './common';

const EMPTY = {
  code: '', description: '', type: 'percent', value: '', minOrder: 0, maxDiscount: 0,
  usageLimit: 0, perUserLimit: 0, expiresAt: '', active: true,
};

export default function Coupons() {
  const toast = useToast();
  const [list, setList] = useState(null);
  const [editing, setEditing] = useState(null); // null = closed, {} = new, coupon = edit
  const [f, setF] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = () => api('/coupons').then(setList).catch((e) => toast(e.message, 'error'));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const open = (c) => {
    setEditing(c || {});
    setF(c ? { ...EMPTY, ...c, expiresAt: c.expiresAt ? c.expiresAt.slice(0, 10) : '' } : EMPTY);
  };
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    if (!f.code.trim()) return toast('Coupon code is required', 'error');
    const value = Number(f.value);
    if (!(value > 0)) return toast('Value must be greater than 0', 'error');
    if (f.type === 'percent' && value > 100) return toast('Percent value cannot exceed 100', 'error');
    setSaving(true);
    const body = {
      code: f.code.trim().toUpperCase(), description: f.description?.trim() || '', type: f.type, value,
      usageLimit: Math.max(0, parseInt(f.usageLimit) || 0), perUserLimit: Math.max(0, parseInt(f.perUserLimit) || 0),
      minOrder: Number(f.minOrder) || 0, maxDiscount: Number(f.maxDiscount) || 0,
      expiresAt: f.expiresAt ? new Date(f.expiresAt + 'T23:59:59').toISOString() : null,
      active: f.active,
    };
    try {
      if (editing._id) await api(`/coupons/${editing._id}`, { method: 'PUT', body });
      else await api('/coupons', { method: 'POST', body });
      toast(editing._id ? 'Coupon updated' : 'Coupon created');
      setEditing(null);
      load();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const del = async (c) => {
    if (!window.confirm(`Delete coupon ${c.code}?`)) return;
    try {
      await api(`/coupons/${c._id}`, { method: 'DELETE' });
      toast('Coupon deleted');
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const expired = (c) => (c.expiresAt && new Date(c.expiresAt) < new Date()) || (c.usageLimit > 0 && c.usedCount >= c.usageLimit);

  return (
    <div className="ad-stack">
      <div className="ad-toolbar">
        <p className="ad-muted">Discount codes customers can apply at checkout.</p>
        <button className="ad-btn ad-btn-primary ad-ml-auto" onClick={() => open(null)}><FiPlus /> New coupon</button>
      </div>

      {!list ? <Loader /> : list.length === 0 ? <section className="ad-card"><Empty>No coupons yet.</Empty></section> : (
        <div className="ad-coupon-grid">
          {list.map((c) => (
            <div key={c._id} className={`ad-card ad-coupon ${!c.active || expired(c) ? 'ad-coupon-off' : ''}`}>
              <div className="ad-coupon-top">
                <span className="ad-coupon-code">{c.code}</span>
                <span className={`ad-pill ${expired(c) ? 'ad-pill-red' : c.active ? 'ad-pill-green' : 'ad-pill-gray'}`}>
                  {c.usageLimit > 0 && c.usedCount >= c.usageLimit ? 'Used up' : expired(c) ? 'Expired' : c.active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="ad-coupon-value">{c.type === 'percent' ? `${c.value}% OFF` : `${inr(c.value)} OFF`}</div>
              {c.description && <p className="ad-muted ad-small">{c.description}</p>}
              <ul className="ad-coupon-meta">
                <li>Min order: {c.minOrder ? inr(c.minOrder) : 'None'}</li>
                {c.type === 'percent' && <li>Max discount: {c.maxDiscount ? inr(c.maxDiscount) : 'No cap'}</li>}
                <li>Expires: {c.expiresAt ? fmtDate(c.expiresAt) : 'Never'}</li>
                <li>Used: <strong>{c.usedCount || 0}</strong>{c.usageLimit ? ` / ${c.usageLimit}` : ' (no limit)'}</li>
                <li>Per customer: {c.perUserLimit ? `${c.perUserLimit} time${c.perUserLimit > 1 ? 's' : ''}` : 'Unlimited'}</li>
              </ul>
              <div className="ad-row ad-coupon-actions">
                <button className="ad-btn ad-btn-ghost ad-btn-sm" onClick={() => open(c)}><FiEdit2 /> Edit</button>
                <button className="ad-btn ad-btn-ghost ad-btn-sm ad-danger" onClick={() => del(c)}><FiTrash2 /> Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <Modal title={editing._id ? `Edit ${editing.code}` : 'New coupon'} onClose={() => setEditing(null)}>
          <form className="ad-form-grid" onSubmit={save}>
            <label className="ad-field ad-span-2">
              <span>Code *</span>
              <input className="ad-input ad-upper" value={f.code} onChange={set('code')} placeholder="e.g. SALE35" autoFocus />
            </label>
            <label className="ad-field ad-span-2">
              <span>Description (shown to customers)</span>
              <input className="ad-input" value={f.description || ''} onChange={set('description')} placeholder="e.g. 35% off on orders above ₹999" />
            </label>
            <label className="ad-field">
              <span>Type</span>
              <select className="ad-input" value={f.type} onChange={set('type')}>
                <option value="percent">Percentage (%)</option>
                <option value="flat">Flat amount (₹)</option>
              </select>
            </label>
            <label className="ad-field">
              <span>Value *</span>
              <input type="number" min="0" className="ad-input" value={f.value} onChange={set('value')} />
            </label>
            <label className="ad-field">
              <span>Minimum order (₹)</span>
              <input type="number" min="0" className="ad-input" value={f.minOrder} onChange={set('minOrder')} />
            </label>
            <label className="ad-field">
              <span>Max discount (₹, 0 = no cap)</span>
              <input type="number" min="0" className="ad-input" value={f.maxDiscount} onChange={set('maxDiscount')} disabled={f.type === 'flat'} />
            </label>
            <label className="ad-field">
              <span>Total uses allowed (0 = unlimited)</span>
              <input type="number" min="0" className="ad-input" value={f.usageLimit} onChange={set('usageLimit')} />
            </label>
            <label className="ad-field">
              <span>Uses per customer (0 = unlimited)</span>
              <input type="number" min="0" className="ad-input" value={f.perUserLimit} onChange={set('perUserLimit')} />
            </label>
            <label className="ad-field">
              <span>Expires on</span>
              <input type="date" className="ad-input" value={f.expiresAt} onChange={set('expiresAt')} />
            </label>
            <label className="ad-switch-row ad-field-end">
              <span>Active</span>
              <input type="checkbox" className="ad-switch" checked={f.active} onChange={set('active')} />
            </label>
            <div className="ad-row ad-span-2 ad-justify-end">
              <button type="button" className="ad-btn ad-btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
              <button className="ad-btn ad-btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save coupon'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
