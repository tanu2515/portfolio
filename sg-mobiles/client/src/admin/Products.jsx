import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiPlus, FiEdit2, FiTrash2, FiSearch, FiChevronLeft, FiChevronRight, FiCopy, FiDownload, FiUpload, FiFileText,
} from 'react-icons/fi';
import { api, apiText, download, inr } from '../api';
import { useToast } from '../context/ToastContext';
import { useShop } from '../context/ShopContext';
import Loader from '../components/Loader';
import { Empty, Modal, flattenCategories, readText } from './common';

const STATUS = [
  ['', 'All'],
  ['active', 'Active'],
  ['hidden', 'Hidden'],
  ['lowstock', 'Low stock'],
];

const TEMPLATE = [
  'name,category,brand,sku,price,salePrice,stock,image,tags,description,active',
  '"Silicone Back Cover",silicon-cover,SG,SG-SIL-01,599,399,40,https://example.com/cover.jpg,featured|new,"Soft silicone case with microfibre lining",true',
  '"65W GaN Fast Charger",charger,SG,SG-CHG-65,2499,1799,15,,bestseller,"Charges laptop and phone together",true',
].join('\n');

const COLUMNS = [
  ['name', 'Product name (required). Existing products are matched by SKU, then by name.'],
  ['category', 'Category slug or name (required), e.g. charger or Smart Watch'],
  ['price', 'Regular price in ₹ (required)'],
  ['salePrice', 'Sale price in ₹ (optional)'],
  ['stock', 'Quantity in stock'],
  ['brand, sku', 'Optional'],
  ['image', 'Image URLs separated by |'],
  ['tags', 'featured | bestseller | new | todaydeal, separated by |'],
  ['description', 'Product description'],
  ['active', 'true / false (default true)'],
];

export default function Products() {
  const toast = useToast();
  const nav = useNavigate();
  const { categories, settings } = useShop();
  const [data, setData] = useState(null);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [importing, setImporting] = useState(null); // null | { busy } | { result }
  const fileRef = useRef();

  const load = useCallback(() => {
    const params = new URLSearchParams({ page, limit: 15, q: search, category, status, threshold: settings.lowStockThreshold ?? 5 });
    api(`/products/admin/all?${params}`).then(setData).catch((e) => toast(e.message, 'error'));
  }, [page, search, category, status, settings.lowStockThreshold, toast]);

  useEffect(load, [load]);

  // Debounce the search box.
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      setSearch(q.trim());
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const toggleActive = async (p) => {
    try {
      await api(`/products/${p._id}`, { method: 'PUT', body: { active: !p.active } });
      toast(`${p.name} ${p.active ? 'hidden' : 'published'}`);
      load();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const del = async (p) => {
    if (!window.confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    try {
      await api(`/products/${p._id}`, { method: 'DELETE' });
      toast('Product deleted');
      load();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const duplicate = async (p) => {
    try {
      const copy = await api(`/products/${p._id}/duplicate`, { method: 'POST' });
      toast('Copy created (hidden until you publish it)');
      nav(`/admin/products/${copy._id}`);
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const exportCsv = () => download('/products/admin/export', 'products.csv').catch((e) => toast(e.message, 'error'));

  const downloadTemplate = () => {
    const url = URL.createObjectURL(new Blob(['﻿' + TEMPLATE], { type: 'text/csv' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: 'products-template.csv' });
    a.click();
    URL.revokeObjectURL(url);
  };

  const onImportFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImporting({ busy: true });
    try {
      const result = await apiText('/products/admin/import', await readText(file));
      setImporting({ result });
      if (result.created || result.updated) load();
    } catch (err) {
      setImporting({});
      toast(err.message, 'error');
    }
  };

  const lowAt = settings.lowStockThreshold ?? 5;

  return (
    <div className="ad-stack">
      <div className="ad-toolbar">
        <div className="ad-search">
          <FiSearch />
          <input placeholder="Search name, brand, SKU…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="ad-input ad-select-sm" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
          <option value="">All categories</option>
          {flattenCategories(categories).map((c) => (
            <option key={c._id} value={c.slug}>{c.depth ? '— ' : ''}{c.name}</option>
          ))}
        </select>
        <div className="ad-tabs">
          {STATUS.map(([k, label]) => (
            <button key={k || 'all'} className={`ad-tab ${status === k ? 'active' : ''}`} onClick={() => { setStatus(k); setPage(1); }}>{label}</button>
          ))}
        </div>
        <div className="ad-toolbar-group ad-ml-auto">
          <button className="ad-btn ad-btn-ghost" onClick={() => setImporting({})}><FiUpload /> Import CSV</button>
          <button className="ad-btn ad-btn-ghost" onClick={exportCsv}><FiDownload /> Export CSV</button>
          <Link to="/admin/products/new" className="ad-btn ad-btn-primary"><FiPlus /> Add product</Link>
        </div>
      </div>

      <section className="ad-card ad-card-flush">
        {!data ? <Loader /> : data.products.length === 0 ? <Empty>No products found.</Empty> : (
          <div className="ad-table-wrap">
            <table className="ad-table">
              <thead>
                <tr><th></th><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th className="ad-right">Actions</th></tr>
              </thead>
              <tbody>
                {data.products.map((p) => (
                  <tr key={p._id}>
                    <td><img className="ad-thumb" src={p.images?.[0] || '/favicon.svg'} alt="" onError={(e) => { e.currentTarget.src = '/favicon.svg'; }} /></td>
                    <td>
                      <Link to={`/admin/products/${p._id}`} className="ad-strong">{p.name}</Link>
                      {p.variants?.length > 0 && <span className="ad-hint">{p.variants.length} {(p.optionName || 'variant').toLowerCase()}s</span>}
                      <div className="ad-muted ad-small">
                        {[p.brand, p.sku].filter(Boolean).join(' · ')}
                        {p.tags?.map((t) => <span key={t} className="ad-tag">{t}</span>)}
                        {p.comingSoon && <span className="ad-tag ad-tag-violet">coming soon</span>}
                      </div>
                    </td>
                    <td>{p.category?.name || '—'}</td>
                    <td>
                      {p.salePrice && p.salePrice < p.price ? (
                        <><strong>{inr(p.salePrice)}</strong> <s className="ad-muted ad-small">{inr(p.price)}</s></>
                      ) : <strong>{inr(p.price)}</strong>}
                    </td>
                    <td><span className={p.stock <= lowAt ? 'ad-text-red ad-strong' : ''}>{p.stock}</span></td>
                    <td>
                      <button className={`ad-pill ad-pill-btn ${p.active ? 'ad-pill-green' : 'ad-pill-gray'}`} onClick={() => toggleActive(p)} title="Toggle visibility">
                        {p.active ? 'Active' : 'Hidden'}
                      </button>
                    </td>
                    <td className="ad-right ad-nowrap">
                      <Link to={`/admin/products/${p._id}`} className="ad-icon-btn" title="Edit"><FiEdit2 /></Link>
                      <button className="ad-icon-btn" onClick={() => duplicate(p)} title="Duplicate"><FiCopy /></button>
                      <button className="ad-icon-btn ad-danger" onClick={() => del(p)} title="Delete"><FiTrash2 /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {data && data.pages > 1 && (
        <div className="ad-pager">
          <button className="ad-btn ad-btn-ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}><FiChevronLeft /> Prev</button>
          <span>Page {data.page} of {data.pages} · {data.total} products</span>
          <button className="ad-btn ad-btn-ghost" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next <FiChevronRight /></button>
        </div>
      )}

      {importing && (
        <Modal title="Import products from CSV" onClose={() => setImporting(null)} wide>
          {importing.result ? (
            <>
              <div className="ad-result">
                <div><b className="ad-text-green">{importing.result.created}</b>created</div>
                <div><b>{importing.result.updated}</b>updated</div>
                <div><b className={importing.result.errors.length ? 'ad-text-red' : ''}>{importing.result.errors.length}</b>errors</div>
              </div>
              {importing.result.errors.length > 0 && (
                <ul className="ad-errors">{importing.result.errors.map((e) => <li key={e}>{e}</li>)}</ul>
              )}
              <div className="ad-row ad-justify-end ad-mt">
                <button className="ad-btn ad-btn-ghost" onClick={() => setImporting({})}>Import another file</button>
                <button className="ad-btn ad-btn-primary" onClick={() => setImporting(null)}>Done</button>
              </div>
            </>
          ) : (
            <>
              <p className="ad-muted">Upload a .csv file (e.g. saved from Excel or Google Sheets) with a header row. Columns:</p>
              <div className="ad-cols">
                {COLUMNS.map(([c, d]) => <Fragment key={c}><code>{c}</code><span>{d}</span></Fragment>)}
              </div>
              <div className="ad-code">{TEMPLATE}</div>
              <div className="ad-row ad-justify-end ad-mt">
                <button className="ad-btn ad-btn-ghost" onClick={downloadTemplate}><FiFileText /> Download template</button>
                <button className="ad-btn ad-btn-primary" disabled={importing.busy} onClick={() => fileRef.current.click()}>
                  <FiUpload /> {importing.busy ? 'Importing…' : 'Choose CSV file'}
                </button>
                <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={onImportFile} />
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}
