import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: String,
    type: { type: String, enum: ['percent', 'flat'], default: 'percent' },
    value: { type: Number, required: true, min: 0 },
    minOrder: { type: Number, default: 0 },
    maxDiscount: { type: Number, default: 0 }, // 0 = no cap
    usageLimit: { type: Number, default: 0 }, // total uses allowed, 0 = unlimited
    perUserLimit: { type: Number, default: 0 }, // uses per customer, 0 = unlimited
    usedCount: { type: Number, default: 0 },
    expiresAt: Date,
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const fail = (message) => Object.assign(new Error(message), { status: 400 });

// Returns the discount amount for a subtotal, or throws with a user-facing reason.
// `userUses` is how many non-cancelled orders this customer already placed with the code.
couponSchema.methods.discountFor = function (subtotal, userUses = 0) {
  if (!this.active) throw fail('Coupon is not active');
  if (this.expiresAt && this.expiresAt < new Date()) throw fail('Coupon has expired');
  if (this.usageLimit > 0 && this.usedCount >= this.usageLimit) throw fail('Coupon usage limit reached');
  if (this.perUserLimit > 0 && userUses >= this.perUserLimit) throw fail('You have already used this coupon');
  if (subtotal < this.minOrder) throw fail(`Minimum order of Rs ${this.minOrder} required`);
  let d = this.type === 'percent' ? (subtotal * this.value) / 100 : this.value;
  if (this.maxDiscount > 0) d = Math.min(d, this.maxDiscount);
  return Math.round(Math.min(d, subtotal));
};

export default mongoose.model('Coupon', couponSchema);
