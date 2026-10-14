import Application from '../models/Application.js';
import Message from '../models/Message.js';
import SavedJob from '../models/SavedJob.js';
import Report from '../models/Report.js';
import Alert from '../models/Alert.js';

/** Delete one or many jobs' dependent data (applications, messages, saved bookmarks, reports). */
export async function removeJobData(jobIds) {
  const ids = Array.isArray(jobIds) ? jobIds : [jobIds];
  const appIds = await Application.find({ job: { $in: ids } }).distinct('_id');
  await Promise.all([
    Message.deleteMany({ application: { $in: appIds } }),
    Application.deleteMany({ job: { $in: ids } }),
    SavedJob.deleteMany({ job: { $in: ids } }),
    Report.deleteMany({ job: { $in: ids } }),
  ]);
}

/** Delete everything a job seeker owns (applications, messages, bookmarks, alerts, reports). */
export async function removeSeekerData(userId) {
  const appIds = await Application.find({ applicant: userId }).distinct('_id');
  await Promise.all([
    Message.deleteMany({ application: { $in: appIds } }),
    Application.deleteMany({ applicant: userId }),
    SavedJob.deleteMany({ user: userId }),
    Alert.deleteMany({ user: userId }),
    Report.deleteMany({ reporter: userId }),
  ]);
}
