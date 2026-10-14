import mongoose from 'mongoose';

export const JOB_TYPES = ['full-time', 'part-time', 'contract', 'internship'];

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

const jobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Job title is required'],
      trim: true,
      minlength: [3, 'Job title must be at least 3 characters'],
      maxlength: [120, 'Job title must be at most 120 characters'],
    },
    description: {
      type: String,
      required: [true, 'Job description is required'],
      trim: true,
      minlength: [10, 'Job description must be at least 10 characters'],
      maxlength: [5000, 'Job description is too long'],
    },
    requirements: { type: String, trim: true, maxlength: 3000 },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
    },
    jobType: {
      type: String,
      enum: { values: JOB_TYPES, message: 'Job type must be one of: ' + JOB_TYPES.join(', ') },
      default: 'full-time',
    },
    salaryRange: { type: String, trim: true, maxlength: 60 },
    deadline: {
      type: Date,
      validate: {
        validator: function (value) {
          if (!value) return true;
          // Only enforce the "future date" rule when the deadline is being set/changed.
          if (this.isNew || this.isModified('deadline')) {
            return value >= startOfToday();
          }
          return true;
        },
        message: 'Deadline must be a valid future date',
      },
    },
    employer: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // active: visible in listings; removed: taken down by an administrator.
    status: { type: String, enum: ['active', 'removed'], default: 'active' },
    // Set to true once an administrator has reviewed the posting.
    reviewed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

jobSchema.index({ status: 1, createdAt: -1 });
jobSchema.index({ postedBy: 1 });

jobSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model('Job', jobSchema);
