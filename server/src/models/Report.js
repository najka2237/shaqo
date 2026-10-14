import mongoose from 'mongoose';

export const REPORT_REASONS = ['scam', 'misleading', 'discrimination', 'duplicate', 'other'];

const reportSchema = new mongoose.Schema(
  {
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, enum: { values: REPORT_REASONS, message: 'Reason must be one of: ' + REPORT_REASONS.join(', ') }, required: true },
    details: { type: String, trim: true, maxlength: 1000 },
    status: { type: String, enum: ['open', 'resolved', 'dismissed'], default: 'open' },
  },
  { timestamps: true }
);
reportSchema.index({ job: 1, reporter: 1 }, { unique: true });

reportSchema.set('toJSON', { transform: (_d, ret) => { delete ret.__v; return ret; } });

export default mongoose.model('Report', reportSchema);
