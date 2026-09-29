import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft, FiUpload, FiTrash2, FiStar, FiChevronLeft, FiChevronRight, FiLink, FiPlus, FiChevronUp, FiChevronDown } from 'react-icons/fi';
import { api } from '../api';
import { useToast } from '../context/ToastContext';
import { useShop } from '../context/ShopContext';
import Loader from '../components/Loader';
import { flattenCategories, uploadImages } from './common';

const TAGS = [
  ['featured', 'Featured'],
  ['bestseller', 'Best Seller'],
  ['new', 'New Arrival'],
  ['todaydeal', "Today's Deal"],
];

const EMPTY = {
  name: '', slug: '', brand: '', category: '', price: '', salePrice: '', stock: 0,
  description: '', tags: [], comingSoon: false, active: true, images: [],
  sku: '', warranty: '', optionName: 'Colour', variants: [], specs: [],
};

const blankVariant = () => ({ key: Math.random().toString(36).slice(2), name: '', sku: '', price: '', salePrice: '', stock: 0, image: '' });
const str = (v) => (v === undefined || v === null ? '' : v);

export default function ProductForm() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const { categories } = useShop();
  const [f, setF] = useState(id ? null : EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const fileRef = useRef();

  useEffect(() => {
    if (!id) return;
    api(`/products/admin/${id}`)
      .then((p) => setF({
        ...EMPTY, ...p,
        category: p.category?._id || p.category || '',
        salePrice: p.salePrice ?? '',
        images: p.images || [],
        sku: p.sku || '', warranty: p.warranty || '', optionName: p.optionName || 'Option',
        specs: (p.specs || []).map((x) => ({ key: x.key || '', value: x.value || '' })),
        variants: (p.variants || []).map((v) => ({
          key: v._id, _id: v._id, name: v.name || '', sku: v.sku || '', price: str(v.price), salePrice: str(v.salePrice), stock: v.stock ?? 0, image: v.image || '',
        })),
      }))
      .catch((e) => {
        toast(e.message, 'error');
        nav('/admin/products');
      });
  }, [id, nav, toast]);

  if (!f) return <Loader />;

  const set = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setF((x) => ({ ...x, [k]: v }));
  };
  const toggleTag = (t) =>
    setF((x) => ({ ...x, tags: x.tags.includes(t) ? x.tags.filter((y) => y !== t) : [...x.tags, t] }));

  const onFiles = async (e) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    try {
      const urls = await uploadImages(files);
      setF((x) => ({ ...x, images: [...x.images, ...urls] }));
      toast(`${urls.length} image${urls.length > 1 ? 's' : ''} uploaded`);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const addUrl = () => {
    const u = urlInput.trim();
    if (!/^(https?:\/\/|\/)/.test(u)) return toast('Enter a valid image URL', 'error');
    setF((x) => ({ ...x, images: [...x.images, u] }));
    setUrlInput('');
  };

  const moveImg = (i, dir) =>
    setF((x) => {
      const imgs = [...x.images];
      const j = i + dir;
      if (j < 0 || j >= imgs.length) return x;
      [imgs[i], imgs[j]] = [imgs[j], imgs[i]];
      return { ...x, images: imgs };
    });
  const makePrimary = (i) =>
    setF((x) => ({ ...x, images: [x.images[i], ...x.images.filter((_, k) => k !== i)] }));
  const removeImg = (i) => setF((x) => ({ ...x, images: x.images.filter((_, k) => k !== i) }));

  const validate = () => {
    const e = {};
    if (!f.name.trim()) e.name = 'Name is required';
    if (!f.category) e.category = 'Choose a category';
    const price = Number(f.price);
    if (f.price === '' || !(price >= 0)) e.price = 'Enter a valid price';
    if (f.salePrice !== '' && f.salePrice !== null) {
      const sp = Number(f.salePrice);
      if (!(sp >= 0)) e.salePrice = 'Enter a valid sale price';
      else if (sp >= price) e.salePrice = 'Sale price must be lower than the regular price';
    }
    if (!(Number(f.stock) >= 0)) e.stock = 'Stock cannot be negative';
    f.variants.forEach((v, i) => {
      const vp = v.price === '' ? price : Number(v.price);
      if (!v.name.trim()) e[`v${i}`] = 'Variant name is required';
      else if (v.price !== '' && !(Number(v.price) >= 0)) e[`v${i}`] = 'Invalid variant price';
      else if (v.salePrice !== '' && !(Number(v.salePrice) < vp)) e[`v${i}`] = 'Variant sale price must be lower than its price';
      else if (!(Number(v.stock) >= 0)) e[`v${i}`] = 'Variant stock cannot be negative';
    });
    const names = f.variants.map((v) => v.name.trim().toLowerCase()).filter(Boolean);
    if (new Set(names).size !== names.length) e.variants = 'Variant names must be unique';
    if (f.variants.length && !f.optionName.trim()) e.optionName = 'Give the option a label, e.g. Colour';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const save = async (e) => {
    e.preventDefault();
    if (!validate()) return toast('Please fix the highlighted fields', 'error');
    setSaving(true);
    const body = {
      ...f,
      price: Number(f.price),
      salePrice: f.salePrice === '' || f.salePrice === null ? null : Number(f.salePrice),
      stock: f.variants.length ? variantStock : Number(f.stock),
      specs: f.specs.filter((x) => x.key.trim()).map((x) => ({ key: x.key.trim(), value: x.value.trim() })),
      variants: f.variants.map(({ key, ...v }) => ({
        ...v, name: v.name.trim(),
        price: v.price === '' ? null : Number(v.price),
        salePrice: v.salePrice === '' ? null : Number(v.salePrice),
        stock: Number(v.stock) || 0,
      })),
    };
    try {
      if (id) await api(`/products/${id}`, { method: 'PUT', body });
      else await api('/products', { method: 'POST', body });
      toast(id ? 'Product updated' : 'Product created');
      nav('/admin/products');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const variantStock = f.variants.reduce((s2, v) => s2 + (Number(v.stock) || 0), 0);

  const setSpec = (i, k, v) => setF((x) => ({ ...x, specs: x.specs.map((sp, j) => (j === i ? { ...sp, [k]: v } : sp)) }));
  const moveSpec = (i, dir) => setF((x) => {
    const arr = [...x.specs]; const j = i + dir;
    if (j < 0 || j >= arr.length) return x;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    return { ...x, specs: arr };
  });
  const setVar = (i, k, v) => setF((x) => ({ ...x, variants: x.variants.map((vr, j) => (j === i ? { ...vr, [k]: v } : vr)) }));

  const err = (k) => errors[k] && <span className="ad-field-error">{errors[k]}</span>;

  return (
    <form className="ad-stack" onSubmit={save} noValidate>
      <div className="ad-toolbar">
        <Link to="/admin/products" className="ad-btn ad-btn-ghost"><FiArrowLeft /> Back</Link>
        <div className="ad-ml-auto ad-row">
          <button type="button" className="ad-btn ad-btn-ghost" onClick={() => nav('/admin/products')}>Cancel</button>
          <button className="ad-btn ad-btn-primary" disabled={saving}>{saving ? 'Saving…' : id ? 'Save changes' : 'Create product'}</button>
        </div>
      </div>

      <div className="ad-grid-2 ad-grid-wide-left">
        <div className="ad-stack">
          <section className="ad-card">
            <h3 className="ad-section-title">Basic information</h3>
            <div className="ad-form-grid">
              <label className="ad-field ad-span-2">
                <span>Product name *</span>
                <input className={`ad-input ${errors.name ? 'ad-invalid' : ''}`} value={f.name} onChange={set('name')} />
                {err('name')}
              </label>
              <label className="ad-field">
                <span>Slug <em>(optional)</em></span>
                <input className="ad-input" value={f.slug} onChange={set('slug')} placeholder="auto-generated from name" />
              </label>
              <label className="ad-field">
                <span>Brand</span>
                <input className="ad-input" value={f.brand || ''} onChange={set('brand')} />
              </label>
              <label className="ad-field">
                <span>SKU</span>
                <input className="ad-input" value={f.sku} onChange={set('sku')} placeholder="e.g. SG-CASE-15" />
              </label>
              <label className="ad-field">
                <span>Warranty</span>
                <input className="ad-input" value={f.warranty} onChange={set('warranty')} placeholder="e.g. 1 year manufacturer warranty" />
              </label>
              <label className="ad-field ad-span-2">
                <span>Category *</span>
                <select className={`ad-input ${errors.category ? 'ad-invalid' : ''}`} value={f.category} onChange={set('category')}>
                  <option value="">Select a category</option>
                  {flattenCategories(categories).map((c) => (
                    <option key={c._id} value={c._id}>{c.depth ? '    — ' : ''}{c.name}</option>
                  ))}
                </select>
                {err('category')}
              </label>
              <label className="ad-field ad-span-2">
                <span>Description</span>
                <textarea className="ad-input" rows={5} value={f.description || ''} onChange={set('description')} />
              </label>
            </div>
          </section>

          <section className="ad-card">
            <h3 className="ad-section-title">Images</h3>
            <div className="ad-images">
              {f.images.map((src, i) => (
                <div key={src + i} className={`ad-image ${i === 0 ? 'ad-image-primary' : ''}`}>
                  <img src={src} alt="" onError={(e) => { e.currentTarget.src = '/favicon.svg'; }} />
                  {i === 0 && <span className="ad-image-badge">Primary</span>}
                  <div className="ad-image-actions">
                    <button type="button" onClick={() => moveImg(i, -1)} disabled={i === 0} title="Move left"><FiChevronLeft /></button>
                    {i !== 0 && <button type="button" onClick={() => makePrimary(i)} title="Make primary"><FiStar /></button>}
                    <button type="button" onClick={() => removeImg(i)} title="Remove" className="ad-danger"><FiTrash2 /></button>
                    <button type="button" onClick={() => moveImg(i, 1)} disabled={i === f.images.length - 1} title="Move right"><FiChevronRight /></button>
                  </div>
                </div>
              ))}
              <button type="button" className="ad-image-add" onClick={() => fileRef.current.click()} disabled={uploading}>
                <FiUpload />
                <span>{uploading ? 'Uploading…' : 'Upload images'}</span>
              </button>
              <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={onFiles} />
            </div>
            <div className="ad-row ad-mt">
              <div className="ad-search ad-grow">
                <FiLink />
                <input
                  placeholder="…or paste an image URL"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addUrl(); } }}
                />
              </div>
              <button type="button" className="ad-btn ad-btn-ghost" onClick={addUrl}>Add URL</button>
            </div>
          </section>

          <section className="ad-card">
            <div className="ad-section-head">
              <h3 className="ad-section-title">
                Variants {f.variants.length > 0 && <span className="ad-hint">{f.variants.length} · {variantStock} in stock</span>}
              </h3>
              <button type="button" className="ad-btn ad-btn-ghost ad-btn-sm" onClick={() => setF((x) => ({ ...x, variants: [...x.variants, blankVariant()] }))}>
                <FiPlus /> Add variant
              </button>
            </div>
            {f.variants.length === 0 ? (
              <p className="ad-help">No variants. Add them when the product comes in different colours, phone models or storage sizes, each with its own stock (and optionally its own price).</p>
            ) : (
              <>
                <label className="ad-field" style={{ maxWidth: 280 }}>
                  <span>Option label</span>
                  <input className={`ad-input ${errors.optionName ? 'ad-invalid' : ''}`} value={f.optionName} onChange={set('optionName')} placeholder="Colour / Model / Storage" list="ad-option-names" />
                  <datalist id="ad-option-names"><option value="Colour" /><option value="Model" /><option value="Storage" /><option value="Size" /></datalist>
                  {err('optionName')}
                </label>
                <div className="ad-rows ad-mt">
                  <div className="ad-rows-head ad-var-grid"><span>Image</span><span>Name *</span><span>SKU</span><span>Price (₹)</span><span>Sale (₹)</span><span>Stock</span><span /></div>
                  {f.variants.map((v, i) => (
                    <div key={v.key}>
                      <div className="ad-rowline ad-var-grid">
                        <VariantImage value={v.image} images={f.images} onChange={(url) => setVar(i, 'image', url)} />
                        <input className={`ad-input ${errors[`v${i}`] ? 'ad-invalid' : ''}`} value={v.name} onChange={(e) => setVar(i, 'name', e.target.value)} placeholder={f.optionName === 'Model' ? 'iPhone 15' : 'Black'} />
                        <input className="ad-input" value={v.sku} onChange={(e) => setVar(i, 'sku', e.target.value)} placeholder="optional" />
                        <input type="number" min="0" className="ad-input" value={v.price} onChange={(e) => setVar(i, 'price', e.target.value)} placeholder={f.price ? String(f.price) : 'same'} />
                        <input type="number" min="0" className="ad-input" value={v.salePrice} onChange={(e) => setVar(i, 'salePrice', e.target.value)} placeholder={f.salePrice ? String(f.salePrice) : '—'} />
                        <input type="number" min="0" className="ad-input" value={v.stock} onChange={(e) => setVar(i, 'stock', e.target.value)} />
                        <div className="ad-row-actions">
                          <button type="button" className="ad-icon-btn ad-danger" title="Remove variant" onClick={() => setF((x) => ({ ...x, variants: x.variants.filter((_, j) => j !== i) }))}><FiTrash2 /></button>
                        </div>
                      </div>
                      {err(`v${i}`)}
                    </div>
                  ))}
                  {err('variants')}
                  <p className="ad-help">Leave a variant's price blank to use the product price. Product stock is the total of all variants.</p>
                </div>
              </>
            )}
          </section>

          <section className="ad-card">
            <div className="ad-section-head">
              <h3 className="ad-section-title">Specifications</h3>
              <button type="button" className="ad-btn ad-btn-ghost ad-btn-sm" onClick={() => setF((x) => ({ ...x, specs: [...x.specs, { key: '', value: '' }] }))}>
                <FiPlus /> Add row
              </button>
            </div>
            {f.specs.length === 0 ? (
              <p className="ad-help">Key details shown in the product's Specifications tab, e.g. Battery → 5000 mAh, Bluetooth → v5.3.</p>
            ) : (
              <div className="ad-rows">
                {f.specs.map((sp, i) => (
                  <div key={i} className="ad-rowline ad-spec-grid">
                    <input className="ad-input" value={sp.key} onChange={(e) => setSpec(i, 'key', e.target.value)} placeholder="Feature (e.g. Display)" />
                    <input className="ad-input" value={sp.value} onChange={(e) => setSpec(i, 'value', e.target.value)} placeholder="Value (e.g. 1.96 inch AMOLED)" />
                    <div className="ad-row-actions">
                      <button type="button" className="ad-icon-btn" onClick={() => moveSpec(i, -1)} disabled={i === 0} title="Move up"><FiChevronUp /></button>
                      <button type="button" className="ad-icon-btn" onClick={() => moveSpec(i, 1)} disabled={i === f.specs.length - 1} title="Move down"><FiChevronDown /></button>
                      <button type="button" className="ad-icon-btn ad-danger" onClick={() => setF((x) => ({ ...x, specs: x.specs.filter((_, j) => j !== i) }))} title="Remove"><FiTrash2 /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="ad-stack">
          <section className="ad-card">
            <h3 className="ad-section-title">Pricing & stock</h3>
            <div className="ad-form-grid ad-form-1">
              <label className="ad-field">
                <span>Regular price (₹) *</span>
                <input type="number" min="0" className={`ad-input ${errors.price ? 'ad-invalid' : ''}`} value={f.price} onChange={set('price')} />
                {err('price')}
              </label>
              <label className="ad-field">
                <span>Sale price (₹)</span>
                <input type="number" min="0" className={`ad-input ${errors.salePrice ? 'ad-invalid' : ''}`} value={f.salePrice ?? ''} onChange={set('salePrice')} placeholder="Leave empty for no sale" />
                {err('salePrice')}
              </label>
              <label className="ad-field">
                <span>Stock quantity</span>
                <input type="number" min="0" className={`ad-input ${errors.stock ? 'ad-invalid' : ''}`} value={f.stock} onChange={set('stock')} />
                {err('stock')}
              </label>
            </div>
          </section>

          <section className="ad-card">
            <h3 className="ad-section-title">Visibility</h3>
            <label className="ad-switch-row">
              <span>Active (visible in store)</span>
              <input type="checkbox" className="ad-switch" checked={!!f.active} onChange={set('active')} />
            </label>
            <label className="ad-switch-row">
              <span>Coming soon (can't be ordered)</span>
              <input type="checkbox" className="ad-switch" checked={!!f.comingSoon} onChange={set('comingSoon')} />
            </label>
            <h4 className="ad-subtitle">Homepage sections</h4>
            <div className="ad-checks">
              {TAGS.map(([t, label]) => (
                <label key={t} className={`ad-check ${f.tags.includes(t) ? 'on' : ''}`}>
                  <input type="checkbox" checked={f.tags.includes(t)} onChange={() => toggleTag(t)} />
                  {label}
                </label>
              ))}
            </div>
          </section>
        </div>
      </div>
    </form>
  );
}

// Small thumbnail button that lets a variant use one of the product's images.
function VariantImage({ value, images, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="ad-var-cell">
      <button type="button" className="ad-var-img" onClick={() => setOpen(!open)} title="Choose image">
        {value ? <img src={value} alt="" /> : 'Img'}
      </button>
      {open && (
        <div className="ad-var-picker" onMouseLeave={() => setOpen(false)}>
          <button type="button" className={!value ? 'on' : ''} onClick={() => { onChange(''); setOpen(false); }}>None</button>
          {images.map((src) => (
            <button type="button" key={src} className={value === src ? 'on' : ''} onClick={() => { onChange(src); setOpen(false); }}>
              <img src={src} alt="" />
            </button>
          ))}
          {!images.length && <span className="ad-help">Add product images first.</span>}
        </div>
      )}
    </div>
  );
}
