import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: String,
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: String,
  },
  { timestamps: true }
);

// A purchasable option, e.g. "Black" or "iPhone 15 Pro". Price fields fall back to the product's.
const variantSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  sku: String,
  price: { type: Number, min: 0 },
  salePrice: { type: Number, min: 0 },
  stock: { type: Number, default: 0, min: 0 },
  image: String,
});

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    sku: String,
    description: String,
    brand: String,
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    price: { type: Number, required: true, min: 0 },
    salePrice: { type: Number, min: 0 },
    images: [String],
    // With variants, this is kept equal to the sum of variant stock.
    stock: { type: Number, default: 0, min: 0 },
    optionName: { type: String, default: 'Option' }, // label shown above variant buttons, e.g. "Colour"
    variants: [variantSchema],
    specs: [{ key: String, value: String, _id: false }],
    warranty: String,
    tags: [{ type: String, enum: ['featured', 'bestseller', 'new', 'todaydeal'] }],
    comingSoon: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    reviews: [reviewSchema],
    rating: { type: Number, default: 0 },
    numReviews: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const priceOf = (price, salePrice) => (salePrice && salePrice < price ? salePrice : price);

productSchema.virtual('finalPrice').get(function () {
  return priceOf(this.price, this.salePrice);
});

// Resolves the unit price and available stock for a product or one of its variants.
productSchema.methods.resolve = function (variantId) {
  if (!this.variants?.length) return { price: this.finalPrice, stock: this.stock, variant: null };
  const v = this.variants.id(variantId);
  if (!v) return null;
  const price = v.price ? priceOf(v.price, v.salePrice) : priceOf(this.price, v.salePrice || this.salePrice);
  return { price, stock: v.stock, variant: v };
};

productSchema.pre('save', function () {
  if (this.variants?.length) this.stock = this.variants.reduce((s, v) => s + (v.stock || 0), 0);
});

productSchema.set('toJSON', { virtuals: true });
productSchema.index({ name: 'text', description: 'text', brand: 'text' });

export default mongoose.model('Product', productSchema);
