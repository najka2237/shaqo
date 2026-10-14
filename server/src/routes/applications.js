import { Router } from 'express';
import multer from 'multer';
import Application, { APPLICATION_STATUSES } from '../models/Application.js';
import Job from '../models/Job.js';
import User from '../models/User.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { isValidId, httpError, parseSkills } from '../utils/helpers.js';
import { notify } from '../utils/notify.js';

const router = Router();
router.use(authMiddleware);

const ALLOWED = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) =>
    ALLOWED[file.mimetype] ? cb(null, true) : cb(httpError(400, 'Only PDF, DOC or DOCX files are allowed')),
});

const str = (v) => (v === undefined || v === null ? undefined : String(v).trim());

// Accepts an array or a JSON string (multipart forms send arrays as JSON text).
function parseRows(input, keys) {
  let rows = input;
  if (typeof rows === 'string') {
    try { rows = JSON.parse(rows); } catch { rows = []; }
  }
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((r) => r && keys.some((k) => r[k]))
    .slice(0, 20)
    .map((r) => Object.fromEntries(keys.map((k) => [k, String(r[k] || '').trim()])));
}

// Adds a protected CV link to an application so the client can open it.
const withCv = (a) => {
  const o = a.toJSON();
  if (a.resumeName) o.resumeUrl = `/applications/${a._id}/cv`;
  return o;
};

const APPLICANT_FIELDS =
  'name email phone location headline summary education experience skills resumeUrl resumeName';

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// POST /api/applications - submit a job application (job seeker only).
// Accepts JSON, or multipart/form-data with an optional CV file (field name "cv").
router.post('/', requireRole('jobseeker'), upload.single('cv'), async (req, res) => {
  const b = req.body || {};
  const { jobId } = b;
  if (!jobId || !isValidId(jobId)) throw httpError(400, 'A valid jobId is required');

  const job = await Job.findById(jobId).populate('employer', 'name');
  if (!job || job.status !== 'active') throw httpError(404, 'Job not found');
  if (job.deadline && job.deadline < startOfToday()) {
    throw httpError(400, 'The application deadline for this job has passed');
  }

  const user = await User.findById(req.user.id).select('+resumeFile');

  // Use what the applicant typed in the form; fall back to their saved profile.
  const data = {
    job: job._id,
    applicant: req.user.id,
    coverNote: str(b.coverNote) || undefined,
    fullName: str(b.fullName) || user.name,
    phone: str(b.phone) || user.phone,
    location: str(b.location) || user.location,
    headline: str(b.headline) || user.headline,
    summary: str(b.summary) || user.summary,
    skills: b.skills !== undefined ? parseSkills(b.skills) : user.skills,
    education: b.education !== undefined ? parseRows(b.education, ['degree', 'school', 'gradYear']) : user.education,
    experience: b.experience !== undefined ? parseRows(b.experience, ['title', 'company', 'duration']) : user.experience,
  };

  // CV: a file uploaded with this application, otherwise the CV saved on the profile.
  if (req.file) {
    data.resumeFile = `${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    data.resumeName = req.file.originalname;
  } else if (String(b.useProfileCv) !== 'false' && user.resumeFile) {
    data.resumeFile = user.resumeFile;
    data.resumeName = user.resumeName;
  }

  // The unique (job, applicant) index guarantees one application per seeker even under concurrent requests.
  data.history = [{ status: 'pending', note: 'Application submitted' }];
  const application = await Application.create(data);

  await notify(
    job.postedBy,
    'application_received',
    `${data.fullName || 'A job seeker'} applied for ${job.title}`,
    `/employer/jobs/${job._id}/applications`
  );

  res.status(201).json(application);
});

// GET /api/applications/me - applications submitted by the logged-in job seeker.
router.get('/me', requireRole('jobseeker'), async (req, res) => {
  res.json(await listForApplicant(req.user.id));
});

// GET /api/applications/user/:userId - application history of a job seeker (the seeker or an admin).
router.get('/user/:userId', async (req, res) => {
  if (!isValidId(req.params.userId)) throw httpError(404, 'User not found');
  if (req.user.role !== 'admin' && req.user.id !== req.params.userId) {
    throw httpError(403, 'Access denied: you can only view your own applications');
  }
  res.json(await listForApplicant(req.params.userId));
});

async function listForApplicant(userId) {
  return Application.find({ applicant: userId })
    .sort({ createdAt: -1 })
    .populate({ path: 'job', select: 'title location jobType deadline status employer', populate: { path: 'employer', select: 'name logoUrl' } });
}

// GET /api/applications/job/:jobId - all applications received for a job (owning employer or admin).
router.get('/job/:jobId', requireRole('employer', 'admin'), async (req, res) => {
  if (!isValidId(req.params.jobId)) throw httpError(404, 'Job not found');
  const job = await Job.findById(req.params.jobId).select('title postedBy');
  if (!job) throw httpError(404, 'Job not found');
  if (req.user.role === 'employer' && String(job.postedBy) !== req.user.id) {
    throw httpError(403, 'Access denied: this job belongs to another employer');
  }

  const applications = await Application.find({ job: job._id })
    .sort({ createdAt: -1 })
    .populate('applicant', APPLICANT_FIELDS);

  res.json({ job: { _id: job._id, title: job.title }, applications: applications.map(withCv) });
});

// GET /api/applications/:id/cv - the CV attached to an application (applicant, the job's employer, or admin).
router.get('/:id/cv', async (req, res) => {
  if (!isValidId(req.params.id)) throw httpError(404, 'CV not found');
  const application = await Application.findById(req.params.id)
    .select('+resumeFile resumeName applicant job')
    .populate('job', 'postedBy');
  if (!application || !application.resumeFile) throw httpError(404, 'CV not found');
  const { id, role } = req.user;
  const allowed =
    role === 'admin' ||
    String(application.applicant) === id ||
    (role === 'employer' && String(application.job?.postedBy) === id);
  if (!allowed) throw httpError(403, 'Access denied: you cannot view this CV');
  const [mime, data] = application.resumeFile.split(';base64,');
  res.set('Content-Type', mime);
  res.set('Content-Disposition', `inline; filename="${encodeURIComponent(application.resumeName || 'cv')}"`);
  res.send(Buffer.from(data, 'base64'));
});

async function updateStatus(req, res) {
  const { status } = req.body || {};
  if (!APPLICATION_STATUSES.includes(status)) {
    throw httpError(400, 'Status must be one of: ' + APPLICATION_STATUSES.join(', '));
  }
  if (!isValidId(req.params.id)) throw httpError(404, 'Application not found');

  const application = await Application.findById(req.params.id).populate('job', 'title postedBy');
  if (!application) throw httpError(404, 'Application not found');
  if (String(application.job.postedBy) !== req.user.id) {
    throw httpError(403, 'Access denied: you can only manage applications for your own jobs');
  }

  const note = String(req.body.note || '').trim().slice(0, 1000);
  application.status = status;
  application.history.push({ status, note: note || undefined });
  await application.save();

  await notify(
    application.applicant,
    'status_changed',
    `Your application for ${application.job.title} is now ${status}` + (note ? `. Message from employer: ${note}` : ''),
    '/seeker/applications'
  );

  res.json(application);
}

// PATCH /api/applications/:id/status (and PUT /api/applications/:id) - update status (employer only).
router.patch('/:id/status', requireRole('employer'), updateStatus);
router.put('/:id', requireRole('employer'), updateStatus);

// DELETE /api/applications/:id - a job seeker withdraws their own application (only while pending).
router.delete('/:id', requireRole('jobseeker'), async (req, res) => {
  if (!isValidId(req.params.id)) throw httpError(404, 'Application not found');
  const application = await Application.findById(req.params.id).populate('job', 'title postedBy');
  if (!application || String(application.applicant) !== req.user.id) throw httpError(404, 'Application not found');
  if (application.status !== 'pending') {
    throw httpError(400, 'You can only withdraw an application that is still pending');
  }
  await Application.deleteOne({ _id: application._id });
  if (application.job) {
    await notify(application.job.postedBy, 'application_received', `${req.user.name} withdrew the application for ${application.job.title}`, `/employer/jobs/${application.job._id}/applications`);
  }
  res.json({ message: 'Application withdrawn' });
});

export default router;
