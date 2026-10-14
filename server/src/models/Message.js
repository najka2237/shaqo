import mongoose from 'mongoose';

// A message inside the conversation attached to one job application.
const messageSchema = new mongoose.Schema(
  {
    application: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: [true, 'Message cannot be empty'], trim: true, maxlength: [2000, 'Message is too long'] },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

messageSchema.set('toJSON', { transform: (_d, ret) => { delete ret.__v; return ret; } });

export default mongoose.model('Message', messageSchema);
