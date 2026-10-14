import Notification from '../models/Notification.js';
import User from '../models/User.js';

/** Create a single in-app notification. Never throws: notifications are best-effort. */
export async function notify(userId, type, message, link) {
  try {
    await Notification.create({ user: userId, type, message, link });
  } catch (err) {
    console.error('Failed to create notification:', err.message);
  }
}

/**
 * Notify job seekers whose skills match a newly posted job (FR9: "new matching
 * job postings"). Simple, transparent keyword matching - no AI involved.
 */
export async function notifyMatchingSeekers(job, companyName) {
  try {
    const haystack = [job.title, job.description, job.requirements, job.category]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    const seekers = await User.find({
      role: 'jobseeker',
      status: 'active',
      'skills.0': { $exists: true },
    })
      .select('skills')
      .limit(500)
      .lean();

    const docs = seekers
      .filter((s) =>
        s.skills.some((skill) => skill.trim().length >= 2 && haystack.includes(skill.trim().toLowerCase()))
      )
      .map((s) => ({
        user: s._id,
        type: 'new_job',
        message: `New job matching your skills: ${job.title} at ${companyName}`,
        link: `/jobs/${job._id}`,
      }));

    if (docs.length) await Notification.insertMany(docs);
  } catch (err) {
    console.error('Failed to notify matching seekers:', err.message);
  }
}
