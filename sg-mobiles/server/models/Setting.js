import mongoose from 'mongoose';

// Single-document store for site-wide settings editable from the admin panel.
const settingSchema = new mongoose.Schema({
  storeName: { type: String, default: 'SG Mobiles' },
  topbarText: { type: String, default: 'Free Shipping On All Orders Over ₹500' },
  phone: { type: String, default: '+91 98765 43210' },
  whatsapp: { type: String, default: '919876543210' }, // digits with country code, used for the chat button
  email: { type: String, default: 'support@sgmobiles.com' },
  address: { type: String, default: 'Main Market, Your City, India' },
  gstin: String,
  freeShippingOver: { type: Number, default: 500 },
  shippingFee: { type: Number, default: 50 },
  // Delivery
  deliveryDaysMin: { type: Number, default: 2 },
  deliveryDaysMax: { type: Number, default: 5 },
  // Comma/space separated pincodes or prefixes (e.g. "411, 400001"). Empty = deliver everywhere.
  serviceablePincodes: { type: String, default: '' },
  codEnabled: { type: Boolean, default: true },
  codCharge: { type: Number, default: 0 },
  codMaxOrder: { type: Number, default: 0 }, // 0 = no limit
  returnDays: { type: Number, default: 7 },
  lowStockThreshold: { type: Number, default: 5 },
  social: { facebook: String, instagram: String, twitter: String, youtube: String },
});

settingSchema.statics.getSingleton = async function () {
  return (await this.findOne()) || (await this.create({}));
};

settingSchema.methods.isServiceable = function (pincode) {
  const list = (this.serviceablePincodes || '').split(/[\s,]+/).filter(Boolean);
  return !list.length || list.some((p) => String(pincode).startsWith(p));
};

// Delivery window counted in calendar days from today, skipping Sundays.
settingSchema.methods.deliveryEta = function (from = new Date()) {
  const add = (n) => {
    const d = new Date(from);
    while (n > 0) {
      d.setDate(d.getDate() + 1);
      if (d.getDay() !== 0) n--;
    }
    return d;
  };
  return { from: add(this.deliveryDaysMin), to: add(this.deliveryDaysMax) };
};

export default mongoose.model('Setting', settingSchema);
