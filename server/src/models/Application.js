import mongoose from 'mongoose';

export const APPLICATION_STATUSES = ['pending', 'shortlisted', 'rejected', 'hired'];

const educationSchema = new mongoose.Schema(
  { degree: String, school: String, gradYear: String },
  { _id: false }
);
const experienceSchema = new mongoose.Schema(
  { title: String, company: String, duration: String },
  { _id: false }
);

const applicationSchema = new mongoose.Schema(
  {
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
    applicant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: {
        values: APPLICATION_STATUSES,
        message: 'Status must be one of: ' + APPLICATION_STATUSES.join(', '),
      },
      default: 'pending',
    },
    coverNote: { type: String, trim: true, maxlength: 2000 },

    // Details the applicant typed into the application form (a snapshot at apply time).
    fullName: { type: String, trim: true, maxlength: 100 },
    phone: { type: String, trim: true, maxlength: 40 },
    location: { type: String, trim: true, maxlength: 100 },
    headline: { type: String, trim: true, maxlength: 150 },
    summary: { type: String, trim: true, maxlength: 2000 },
    skills: [{ type: String, trim: true }],
    education: [educationSchema],
    experience: [experienceSchema],

    // Status timeline: every change with the employer's optional feedback note.
    history: [
      new mongoose.Schema(
        { status: String, note: { type: String, maxlength: 1000 }, at: { type: Date, default: Date.now } },
        { _id: false }
      ),
    ],

    // CV attached to THIS application.
    resumeName: { type: String },
    resumeFile: { type: String, select: false },
  },
  { timestamps: true }
);

// A job seeker can apply to a given job only once, even under concurrent requests.
applicationSchema.index({ job: 1, applicant: 1 }, { unique: true });
applicationSchema.index({ applicant: 1, createdAt: -1 });

applicationSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.resumeFile;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model('Application', applicationSchema);
