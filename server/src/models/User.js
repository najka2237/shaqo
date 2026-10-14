import mongoose from 'mongoose';

const educationSchema = new mongoose.Schema(
  { degree: String, school: String, gradYear: String },
  { _id: false }
);

const experienceSchema = new mongoose.Schema(
  { title: String, company: String, duration: String },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name must be at most 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    // Bcrypt-hashed password; never returned unless explicitly selected.
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ['jobseeker', 'employer', 'admin'],
      default: 'jobseeker',
    },
    status: { type: String, enum: ['active', 'suspended'], default: 'active' },
    phone: { type: String, trim: true },

    // Job seeker profile
    location: { type: String, trim: true },
    headline: { type: String, trim: true, maxlength: 150 },
    summary: { type: String, trim: true, maxlength: 2000 },
    education: [educationSchema],
    experience: [experienceSchema],
    skills: [{ type: String, trim: true }],
    resumeUrl: { type: String },
    resumeName: { type: String },
    resumeFile: { type: String, select: false },
    // Privacy: employers can only browse profiles that are visible.
    profileVisible: { type: Boolean, default: true },
    savedJobs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Job' }],
  },
  { timestamps: true }
);

userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.password;
    delete ret.resumeFile;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model('User', userSchema);
