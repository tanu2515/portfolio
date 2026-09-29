// Small shared pieces for admin pages.
import { useState } from 'react';
import { FiX, FiUpload } from 'react-icons/fi';
import { api } from '../api';

export const STATUS_COLORS = {
  Pending: 'amber',
  Processing: 'blue',
  Shipped: 'violet',
  'Out for Delivery': 'teal',
  Delivered: 'green',
  Cancelled: 'red',
  Returned: 'slate',
};

export const RETURN_COLORS = { Requested: 'amber', Approved: 'blue', Rejected: 'red', Completed: 'green' };

export const COURIERS = ['Delhivery', 'Blue Dart', 'DTDC', 'Ecom Express', 'XpressBees', 'Shadowfax', 'India Post', 'Shiprocket', 'Self delivery'];

// Reads a File as text (for CSV import).
export const readText = (file) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error('Could not read file'));
    r.readAsText(file);
  });

// Upload-or-URL image picker with preview, used for category image/banner.
export function ImageField({ label, value, onChange, wide }) {
  const [busy, setBusy] = useState(false);
  const pick = async (e) => {
    const files = e.target.files;
    if (!files?.length) return;
    setBusy(true);
    try {
      const [url] = await uploadImages(files);
      onChange(url);
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  };
  return (
    <div className="ad-field">
      <span>{label}</span>
      <div className="ad-row">
        <input className="ad-input ad-grow" value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder="https://… or upload" />
        <label className="ad-btn ad-btn-ghost ad-btn-sm">
          <FiUpload /> {busy ? '…' : 'Upload'}
          <input type="file" accept="image/*" hidden onChange={pick} />
        </label>
      </div>
      {value && (
        <div className={`ad-img-preview ${wide ? 'ad-img-preview-wide' : ''}`}>
          <img src={value} alt="" onError={(e) => { e.currentTarget.style.opacity = 0.2; }} />
          <button type="button" className="ad-icon-btn ad-danger" onClick={() => onChange('')} title="Remove"><FiX /></button>
        </div>
      )}
    </div>
  );
}

export function StatusPill({ status }) {
  return <span className={`ad-pill ad-pill-${STATUS_COLORS[status] || 'gray'}`}>{status}</span>;
}

export function Modal({ title, onClose, children, wide }) {
  return (
    <div className="ad-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`ad-modal ${wide ? 'ad-modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="ad-modal-head">
          <h3>{title}</h3>
          <button className="ad-icon-btn" onClick={onClose} aria-label="Close"><FiX /></button>
        </div>
        <div className="ad-modal-body">{children}</div>
      </div>
    </div>
  );
}

export function Empty({ children }) {
  return <div className="ad-empty">{children}</div>;
}

export const fmtDate = (d, time = false) =>
  d
    ? new Date(d).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        ...(time ? { hour: '2-digit', minute: '2-digit' } : {}),
      })
    : '—';

// Returns categories ordered as a tree with a depth for indentation.
export function flattenCategories(categories) {
  const out = [];
  const walk = (parent, depth) =>
    categories
      .filter((c) => (c.parent || null) === parent)
      .forEach((c) => {
        out.push({ ...c, depth });
        walk(c._id, depth + 1);
      });
  walk(null, 0);
  return out;
}

export async function uploadImages(files) {
  const fd = new FormData();
  [...files].forEach((f) => fd.append('images', f));
  return api('/admin/upload', { method: 'POST', form: fd });
}
