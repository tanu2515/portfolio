import { useState } from 'react';
import { FiEdit2, FiTrash2, FiPlus, FiCornerDownRight } from 'react-icons/fi';
import { api } from '../api';
import { useToast } from '../context/ToastContext';
import { useShop } from '../context/ShopContext';
import { Empty, ImageField, flattenCategories } from './common';

const EMPTY = {
  name: '', slug: '', parent: '', order: 0, image: '', banner: '', description: '', showInMenu: false, showOnHome: false,
};

export default function Categories() {
  const toast = useToast();
  const { categories, refresh } = useShop();
  const [f, setF] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const rows = flattenCategories(categories);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const setVal = (k) => (v) => setF((x) => ({ ...x, [k]: v }));

  const startEdit = (c) => {
    setEditing(c._id);
    setF({
      name: c.name, slug: c.slug || '', parent: c.parent || '', order: c.order ?? 0, image: c.image || '',
      banner: c.banner || '', description: c.description || '', showInMenu: !!c.showInMenu, showOnHome: !!c.showOnHome,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const reset = () => {
    setEditing(null);
    setF(EMPTY);
  };

  const save = async (e) => {
    e.preventDefault();
    if (!f.name.trim()) return toast('Category name is required', 'error');
    setSaving(true);
    const body = {
      ...f, name: f.name.trim(), slug: f.slug.trim() || undefined, order: Number(f.order) || 0, parent: f.parent || null,
    };
    try {
      if (editing) await api(`/categories/${editing}`, { method: 'PUT', body });
      else await api('/categories', { method: 'POST', body });
      toast(editing ? 'Category updated' : 'Category added');
      reset();
      refresh();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const del = async (c) => {
    if (!window.confirm(`Delete category "${c.name}"?`)) return;
    try {
      await api(`/categories/${c._id}`, { method: 'DELETE' });
      toast('Category deleted');
      if (editing === c._id) reset();
      refresh();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  // Quick toggle straight from the list.
  const flip = async (c, key) => {
    try {
      await api(`/categories/${c._id}`, { method: 'PUT', body: { ...c, [key]: !c[key] } });
      refresh();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  // Only top-level categories can be parents (the store menu is two levels deep).
  const parentOptions = categories.filter((c) => !c.parent && c._id !== editing);

  return (
    <div className="ad-grid-2 ad-grid-narrow-left">
      <section className="ad-card ad-sticky">
        <h3 className="ad-section-title">{editing ? 'Edit category' : 'Add category'}</h3>
        <form className="ad-form-grid ad-form-1" onSubmit={save}>
          <label className="ad-field">
            <span>Name *</span>
            <input className="ad-input" value={f.name} onChange={set('name')} autoFocus />
          </label>
          <label className="ad-field">
            <span>Slug <em>(optional)</em></span>
            <input className="ad-input" value={f.slug} onChange={set('slug')} placeholder="auto-generated from name" />
          </label>
          <label className="ad-field">
            <span>Parent category</span>
            <select className="ad-input" value={f.parent} onChange={set('parent')}>
              <option value="">— None (top level) —</option>
              {parentOptions.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </label>
          <label className="ad-field">
            <span>Description</span>
            <textarea className="ad-input" rows={2} value={f.description} onChange={set('description')} placeholder="Shown at the top of the category page" />
          </label>
          <ImageField label="Icon / thumbnail" value={f.image} onChange={setVal('image')} />
          <ImageField label="Banner (category page header)" value={f.banner} onChange={setVal('banner')} wide />
          <label className="ad-field">
            <span>Sort order</span>
            <input type="number" className="ad-input" value={f.order} onChange={set('order')} />
          </label>
          <label className="ad-switch-row">
            <span>Show in main menu</span>
            <input type="checkbox" className="ad-switch" checked={f.showInMenu} onChange={set('showInMenu')} />
          </label>
          <label className="ad-switch-row">
            <span>Show a product row on the homepage</span>
            <input type="checkbox" className="ad-switch" checked={f.showOnHome} onChange={set('showOnHome')} />
          </label>
          <div className="ad-row">
            <button className="ad-btn ad-btn-primary" disabled={saving}>
              {editing ? 'Save changes' : <><FiPlus /> Add category</>}
            </button>
            {editing && <button type="button" className="ad-btn ad-btn-ghost" onClick={reset}>Cancel</button>}
          </div>
        </form>
      </section>

      <section className="ad-card ad-card-flush">
        <div className="ad-card-head ad-pad"><h3>All categories</h3><span className="ad-muted">{categories.length}</span></div>
        {rows.length === 0 ? <Empty>No categories yet.</Empty> : (
          <ul className="ad-tree">
            {rows.map((c) => (
              <li key={c._id} className={`ad-tree-row ${c.depth ? 'ad-tree-child' : ''} ${editing === c._id ? 'ad-tree-editing' : ''}`}>
                {c.depth > 0 && <FiCornerDownRight className="ad-muted" />}
                {c.image && <img src={c.image} alt="" className="ad-tree-thumb" />}
                <span className={c.depth ? '' : 'ad-strong'}>{c.name}</span>
                <span className="ad-muted ad-small">/{c.slug}</span>
                {c.showInMenu && <span className="ad-badge-sm ad-badge-menu">Menu</span>}
                {c.showOnHome && <span className="ad-badge-sm ad-badge-home">Home</span>}
                <span className="ad-ml-auto ad-nowrap">
                  <button className="ad-btn ad-btn-ghost ad-btn-sm" onClick={() => flip(c, 'showInMenu')} title="Toggle main menu">{c.showInMenu ? '− Menu' : '+ Menu'}</button>
                  <button className="ad-btn ad-btn-ghost ad-btn-sm" onClick={() => flip(c, 'showOnHome')} title="Toggle homepage row">{c.showOnHome ? '− Home' : '+ Home'}</button>
                  <button className="ad-icon-btn" onClick={() => startEdit(c)} title="Edit"><FiEdit2 /></button>
                  <button className="ad-icon-btn ad-danger" onClick={() => del(c)} title="Delete"><FiTrash2 /></button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
