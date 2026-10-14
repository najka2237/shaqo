import mongoose from 'mongoose';

const companySchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      minlength: [2, 'Company name must be at least 2 characters'],
      maxlength: [120, 'Company name must be at most 120 characters'],
    },
    industry: { type: String, trim: true, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 3000 },
    logoUrl: { type: String },
    logoFile: { type: String, select: false },
    contactEmail: { type: String, trim: true },
    contactPhone: { type: String, trim: true },
    website: { type: String, trim: true },
    address: { type: String, trim: true },
  },
  { timestamps: true }
);

companySchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.logoFile;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model('Company', companySchema);
