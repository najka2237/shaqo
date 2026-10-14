import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDb, ensureAdmin } from './db.js';
import User from './models/User.js';
import Company from './models/Company.js';
import Job from './models/Job.js';
import Application from './models/Application.js';
import Notification from './models/Notification.js';

await connectDb();
await Promise.all([User, Company, Job, Application, Notification].map((m) => m.deleteMany({})));
await ensureAdmin();

const pw = await bcrypt.hash('Password123', 10);
const day = 86400000;
const future = (d) => new Date(Date.now() + d * day);

const employers = [
  ['Hodan Warsame', 'employer@shaqodoon.so', 'Hormuud Telecom', 'Telecommunications', 'Garowe'],
  ['Abdi Farah', 'employer2@shaqodoon.so', 'Puntland Health Care', 'Health', 'Bosaso'],
  ['Amina Jama', 'employer3@shaqodoon.so', 'Nomad Tech Hub', 'Technology', 'Garowe'],
];
const companies = [];
for (const [name, email, cname, industry, address] of employers) {
  const u = await User.create({ name, email, password: pw, role: 'employer' });
  companies.push({ user: u, company: await Company.create({ owner: u._id, name: cname, industry, address, contactEmail: email, description: `${cname} - a company based in ${address}.` }) });
}

const jobDefs = [
  [0, 'Software Developer', 'Technology', 'Garowe', 'full-time', 'Develop web and mobile apps. Strong knowledge of JavaScript, React and Node.js is required.', 'JavaScript, React, Node.js', '$600 - $900', 20],
  [0, 'Customer Care Officer', 'Customer Service', 'Garowe', 'full-time', 'Respond to customers and resolve their complaints.', 'Communication, Somali, English', '$300 - $450', 15],
  [1, 'Registered Nurse', 'Health', 'Bosaso', 'full-time', 'Provide patient care and supervise medication in the hospital.', 'Nursing diploma, 2 years experience', '$400 - $600', 25],
  [1, 'Pharmacy Assistant', 'Health', 'Bosaso', 'part-time', 'Assist the pharmacist and manage stock.', 'Pharmacy certificate', '$200 - $300', 12],
  [2, 'Graphic Designer', 'Design', 'Garowe', 'contract', 'Design posters, logos and presentations.', 'Photoshop, Illustrator', '$350 - $500', 18],
  [2, 'IT Internship', 'Technology', 'Garowe', 'internship', 'Work placement for university students.', 'Student, interest in programming', 'Stipend', 30],
  [0, 'Accountant', 'Finance', 'Galkayo', 'full-time', 'Prepare financial reports and accounts.', 'Accounting degree, Excel', '$500 - $700', 22],
  [2, 'Content Writer', 'Marketing', 'Remote', 'part-time', 'Write articles and reports in Somali and English.', 'Writing, SEO', '$250 - $400', 14],
];
const jobs = [];
for (const [ci, title, category, location, jobType, description, requirements, salaryRange, d] of jobDefs) {
  jobs.push(await Job.create({ title, category, location, jobType, description, requirements, salaryRange, deadline: future(d), employer: companies[ci].company._id, postedBy: companies[ci].user._id }));
}

const seekers = [
  ['Xasan Cali', 'seeker@shaqodoon.so', 'Garowe', 'Computer Science graduate', ['JavaScript', 'React', 'Node.js', 'MongoDB']],
  ['Fartuun Axmed', 'seeker2@shaqodoon.so', 'Bosaso', 'Registered nurse', ['Nursing', 'Patient care', 'First aid']],
  ['Cabdi Maxamed', 'seeker3@shaqodoon.so', 'Garowe', 'Graphic designer', ['Photoshop', 'Illustrator', 'Branding']],
];
const seekerDocs = [];
for (const [name, email, location, headline, skills] of seekers) {
  seekerDocs.push(await User.create({ name, email, password: pw, role: 'jobseeker', location, headline, skills, summary: `${headline} looking for work.`, education: [{ degree: 'Bachelor', school: 'Puntland State University', gradYear: '2026' }] }));
}
await Application.create({ job: jobs[0]._id, applicant: seekerDocs[0]._id, status: 'shortlisted', coverNote: 'I would love to join your team.' });
await Application.create({ job: jobs[5]._id, applicant: seekerDocs[0]._id, status: 'pending' });
await Application.create({ job: jobs[2]._id, applicant: seekerDocs[1]._id, status: 'hired' });
await Application.create({ job: jobs[4]._id, applicant: seekerDocs[2]._id, status: 'rejected' });
await Notification.create({ user: seekerDocs[0]._id, type: 'status_changed', message: 'Your application for Software Developer is now shortlisted', link: '/seeker/applications' });

console.log('Seed done.\n  admin:    admin@shaqodoon.so / Admin12345\n  employer: employer@shaqodoon.so / Password123\n  seeker:   seeker@shaqodoon.so / Password123');
await mongoose.disconnect();
