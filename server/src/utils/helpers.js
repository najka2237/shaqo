import mongoose from 'mongoose';

export const isValidId = (id) => mongoose.Types.ObjectId.isValid(id) && String(id).length === 24;

export function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Throw an HTTP error that the central error handler turns into a JSON response. */
export function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

export function parseSkills(input) {
  if (Array.isArray(input)) {
    return [...new Set(input.map((s) => String(s).trim()).filter(Boolean))].slice(0, 40);
  }
  if (typeof input === 'string') return parseSkills(input.split(','));
  return [];
}
