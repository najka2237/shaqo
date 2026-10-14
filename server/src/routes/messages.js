import { Router } from 'express';
import Message from '../models/Message.js';
import Application from '../models/Application.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { isValidId, httpError } from '../utils/helpers.js';
import { notify } from '../utils/notify.js';

const router = Router();
router.use(authMiddleware, requireRole('jobseeker', 'employer'));

// Only the applicant and the employer who owns the job can read or write in a conversation.
async function loadThread(req) {
  if (!isValidId(req.params.appId)) throw httpError(404, 'Conversation not found');
  const application = await Application.findById(req.params.appId)
    .populate('job', 'title postedBy')
    .populate('applicant', 'name');
  if (!application || !application.job) throw httpError(404, 'Conversation not found');
  const me = req.user.id;
  const isApplicant = String(application.applicant._id) === me;
  const isEmployer = String(application.job.postedBy) === me;
  if (!isApplicant && !isEmployer) throw httpError(403, 'Access denied: this conversation is private');
  return { application, isApplicant, otherUserId: isApplicant ? application.job.postedBy : application.applicant._id };
}

// GET /api/messages/application/:appId
router.get('/application/:appId', async (req, res) => {
  const { application, isApplicant } = await loadThread(req);
  await Message.updateMany({ application: application._id, sender: { $ne: req.user.id }, read: false }, { read: true });
  const messages = await Message.find({ application: application._id }).sort({ createdAt: 1 }).limit(500).populate('sender', 'name role');
  res.json({
    application: { _id: application._id, jobTitle: application.job.title, jobId: application.job._id, applicantName: application.fullName || application.applicant.name },
    backTo: isApplicant ? '/seeker/applications' : `/employer/jobs/${application.job._id}/applications`,
    messages,
  });
});

// POST /api/messages/application/:appId
router.post('/application/:appId', async (req, res) => {
  const { application, isApplicant, otherUserId } = await loadThread(req);
  const text = String((req.body || {}).text || '').trim();
  if (!text) throw httpError(400, 'Message cannot be empty');
  const message = await Message.create({ application: application._id, sender: req.user.id, text });
  await notify(
    otherUserId,
    'message',
    `New message from ${isApplicant ? application.fullName || application.applicant.name : req.user.name} about ${application.job.title}`,
    `/messages/${application._id}`
  );
  res.status(201).json(message);
});

export default router;
