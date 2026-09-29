import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    description: String,
    image: String, // icon/thumbnail used in category chips
    banner: String, // wide image shown at the top of the category's shop page
    showInMenu: { type: Boolean, default: false }, // appears in the main nav bar
    showOnHome: { type: Boolean, default: false }, // gets its own product row on the homepage
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model('Category', categorySchema);
