import mongoose from 'mongoose';
import multer from 'multer';

export function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// Central error handler: gives consistent error messages across the whole API.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof mongoose.Error.ValidationError) {
    const errors = Object.fromEntries(
      Object.entries(err.errors).map(([field, e]) => [field, e.message])
    );
    return res.status(400).json({ message: Object.values(errors)[0], errors });
  }
  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ message: `Invalid value for ${err.path}` });
  }
  if (err?.code === 11000) {
    const field = Object.keys(err.keyPattern || err.keyValue || {})[0];
    if (field === 'email') {
      return res.status(409).json({ message: 'Email is already registered' });
    }
    if (field === 'job' || field === 'applicant') {
      return res.status(409).json({ message: 'You have already applied for this job' });
    }
    return res.status(409).json({ message: 'Duplicate value' });
  }
  if (err instanceof multer.MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE' ? 'File is too large' : `Upload error: ${err.message}`;
    return res.status(400).json({ message });
  }
  if (err?.status && err.status < 500) {
    return res.status(err.status).json({ message: err.message });
  }
  console.error(err);
  res.status(500).json({ message: 'Server error' });
}
