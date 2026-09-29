import mongoose from 'mongoose';

// placement: hero = main slider, deal = "Today's Deal" tiles, promo = wide promo strip
const bannerSchema = new mongoose.Schema(
  {
    placement: { type: String, enum: ['hero', 'deal', 'promo'], default: 'hero' },
    kicker: String,
    title: { type: String, required: true },
    subtitle: String,
    buttonText: { type: String, default: 'Shop Now' },
    link: { type: String, default: '/shop' },
    image: String,
    bgColor: { type: String, default: '#0f172a' },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('Banner', bannerSchema);
