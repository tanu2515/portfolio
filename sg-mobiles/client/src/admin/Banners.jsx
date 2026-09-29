import { useEffect, useRef, useState } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiUpload } from 'react-icons/fi';
import { api } from '../api';
import { useToast } from '../context/ToastContext';
import Loader from '../components/Loader';
import { Empty, Modal, uploadImages } from './common';

const PLACEMENTS = [
  ['hero', 'Hero slider', 'Large rotating slides at the top of the homepage.'],
  ['deal', "Today's Deal tiles", 'Three promo tiles below the slider.'],
  ['promo', 'Promo strip', 'Wide offer banner further down the homepage.'],
];

const EMPTY = {
  placement: 'hero', kicker: '', title: '', subtitle: '', buttonText: 'Shop Now',
  link: '/shop', image: '', bgColor: '#0f172a', order: 0, active: true,
};

const FIELDS = Object.keys(EMPTY);

// Light backgrounds need dark text in the preview.
const isLight = (hex) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return false;
  const n = parseInt(m[1], 16);
  const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b > 160;
};

function Preview({ b }) {
  return (
    <div className={`ad-banner-preview ad-bp-${b.placement} ${isLight(b.bgColor) ? 'ad-bp-light' : ''}`} style={{ background: b.bgColor }}>
      <div className="ad-bp-text">
        {b.kicker && <span className="ad-bp-kicker">{b.kicker}</span>}
        <strong className="ad-bp-title">{b.title || 'Banner title'}</strong>
        {b.subtitle && <span className="ad-bp-sub">{b.subtitle}</span>}
        {b.buttonText && <span className="ad-bp-btn">{b.buttonText}</span>}
      </div>
      {b.image && <img src={b.image} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
    </div>
  );
}

export default function Banners() {
  const toast = useToast();
  const [list, setList] = useState(null);
  const [editing, setEditing] = useState(null);
  const [f, setF] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const load = () => api('/banners/all').then(setList).catch((e) => toast(e.message, 'error'));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const open = (b, placement) => {
    setEditing(b || {});
    setF(b ? Object.fromEntries(FIELDS.map((k) => [k, b[k] ?? EMPTY[k]])) : { ...EMPTY, placement: placement || 'hero' });
  };
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const onFile = async (e) => {
    if (!e.target.files?.length) return;
    setUploading(true);
    try {
      const [url] = await uploadImages([e.target.files[0]]);
      setF((x) => ({ ...x, image: url }));
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const save = async (e) => {
    e.preventDefault();
    if (!f.title.trim()) return toast('Title is required', 'error');
    setSaving(true);
    const body = { ...f, order: Number(f.order) || 0 };
    try {
      if (editing._id) await api(`/banners/${editing._id}`, { method: 'PUT', body });
      else await api('/banners', { method: 'POST', body });
      toast(editing._id ? 'Banner updated' : 'Banner created');
      setEditing(null);
      load();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (b) => {
    try {
      await api(`/banners/${b._id}`, { method: 'PUT', body: { active: !b.active } });
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const del = async (b) => {
    if (!window.confirm(`Delete banner "${b.title}"?`)) return;
    try {
      await api(`/banners/${b._id}`, { method: 'DELETE' });
      toast('Banner deleted');
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  if (!list) return <Loader />;

  return (
    <div className="ad-stack">
      {PLACEMENTS.map(([key, label, hint]) => {
        const items = list.filter((b) => b.placement === key);
        return (
          <section key={key} className="ad-card">
            <div className="ad-card-head">
              <div>
                <h3>{label}</h3>
                <p className="ad-muted ad-small">{hint}</p>
              </div>
              <button className="ad-btn ad-btn-primary ad-btn-sm" onClick={() => open(null, key)}><FiPlus /> Add</button>
            </div>
            {items.length === 0 ? <Empty>No banners here yet.</Empty> : (
              <div className="ad-banner-grid">
                {items.map((b) => (
                  <div key={b._id} className={`ad-banner-item ${b.active ? '' : 'ad-banner-off'}`}>
                    <Preview b={b} />
                    <div className="ad-banner-foot">
                      <span className="ad-muted ad-small">Order {b.order} · {b.link}</span>
                      <span className="ad-ml-auto ad-nowrap">
                        <button className={`ad-pill ad-pill-btn ${b.active ? 'ad-pill-green' : 'ad-pill-gray'}`} onClick={() => toggle(b)}>
                          {b.active ? 'Active' : 'Hidden'}
                        </button>
                        <button className="ad-icon-btn" onClick={() => open(b)} title="Edit"><FiEdit2 /></button>
                        <button className="ad-icon-btn ad-danger" onClick={() => del(b)} title="Delete"><FiTrash2 /></button>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}

      {editing && (
        <Modal title={editing._id ? 'Edit banner' : 'New banner'} onClose={() => setEditing(null)} wide>
          <div className="ad-banner-editor">
            <form className="ad-form-grid" onSubmit={save}>
              <label className="ad-field">
                <span>Placement</span>
                <select className="ad-input" value={f.placement} onChange={set('placement')}>
                  {PLACEMENTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </label>
              <label className="ad-field">
                <span>Sort order</span>
                <input type="number" className="ad-input" value={f.order} onChange={set('order')} />
              </label>
              <label className="ad-field ad-span-2">
                <span>Kicker (small text above title)</span>
                <input className="ad-input" value={f.kicker} onChange={set('kicker')} />
              </label>
              <label className="ad-field ad-span-2">
                <span>Title *</span>
                <input className="ad-input" value={f.title} onChange={set('title')} />
              </label>
              <label className="ad-field ad-span-2">
                <span>Subtitle</span>
                <input className="ad-input" value={f.subtitle} onChange={set('subtitle')} />
              </label>
              <label className="ad-field">
                <span>Button text</span>
                <input className="ad-input" value={f.buttonText} onChange={set('buttonText')} />
              </label>
              <label className="ad-field">
                <span>Link</span>
                <input className="ad-input" value={f.link} onChange={set('link')} placeholder="/shop?category=cover" />
              </label>
              <label className="ad-field ad-span-2">
                <span>Image</span>
                <div className="ad-row">
                  <input className="ad-input ad-grow" value={f.image} onChange={set('image')} placeholder="Image URL" />
                  <button type="button" className="ad-btn ad-btn-ghost" onClick={() => fileRef.current.click()} disabled={uploading}>
                    <FiUpload /> {uploading ? 'Uploading…' : 'Upload'}
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
                </div>
              </label>
              <label className="ad-field">
                <span>Background colour</span>
                <div className="ad-row">
                  <input type="color" className="ad-color" value={f.bgColor} onChange={set('bgColor')} />
                  <input className="ad-input ad-grow" value={f.bgColor} onChange={set('bgColor')} />
                </div>
              </label>
              <label className="ad-switch-row ad-field-end">
                <span>Active</span>
                <input type="checkbox" className="ad-switch" checked={f.active} onChange={set('active')} />
              </label>
              <div className="ad-row ad-span-2 ad-justify-end">
                <button type="button" className="ad-btn ad-btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
                <button className="ad-btn ad-btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save banner'}</button>
              </div>
            </form>
            <div className="ad-banner-live">
              <span className="ad-muted ad-small">Live preview</span>
              <Preview b={f} />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
