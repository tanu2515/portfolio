import { Img } from './ui';

export default function VariantPicker({ product, value, onChange }) {
  if (!product.variants?.length) return null;
  const selected = product.variants.find((v) => v._id === value);
  return (
    <div className="variants">
      <div className="variants-label">
        {product.optionName || 'Option'}: <b>{selected?.name || 'Select'}</b>
      </div>
      <div className="variant-list" role="radiogroup" aria-label={product.optionName || 'Option'}>
        {product.variants.map((v) => {
          const out = v.stock <= 0;
          return (
            <button
              type="button"
              key={v._id}
              role="radio"
              aria-checked={value === v._id}
              className={`variant ${value === v._id ? 'active' : ''} ${out ? 'out' : ''}`}
              disabled={out}
              onClick={() => onChange(v._id)}
              title={out ? `${v.name} (out of stock)` : v.name}
            >
              {v.image && <Img src={v.image} alt="" />}
              <span>{v.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
