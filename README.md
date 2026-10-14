# ShaqoDoon - MERN Job Portal

MongoDB + Express + React + Node. Matches the thesis book (roles: jobseeker / employer / admin).

## 1. Requirements
- Node.js LTS
- MongoDB Atlas (free): https://www.mongodb.com/cloud/atlas
  1. Create an account -> create a **free (M0)** cluster
  2. Database Access -> add a user (username + password)
  3. Network Access -> Add IP -> **Allow access from anywhere** (0.0.0.0/0)
  4. Connect -> Drivers -> copy the **connection string** (`mongodb+srv://...`)

## 2. Server (backend)
```
cd server
copy .env.example .env
```
Edit `server\.env`: put your Atlas string in `MONGO_URI` (replace USER and PASSWORD; add `/shaqodoon` before the `?`) and set `JWT_SECRET` to a long random text.
```
npm install
npm run seed      (demo data: admin, employers, jobs, seekers)
npm start         (http://localhost:5000)
```

## 3. Client (frontend) - in a new window
```
cd client
npm install
npm run dev       (http://localhost:5173)
```

## 4. Demo accounts (after `npm run seed`)
| Role | Email | Password |
|---|---|---|
| Admin | admin@shaqodoon.so | Admin12345 |
| Employer | employer@shaqodoon.so | Password123 |
| Job seeker | seeker@shaqodoon.so | Password123 |

## 5. The book's 20 test cases
They run on a separate database (`shaqodoon_test`); your data is untouched:
```
cd server
npm test
```

## 6. New features (added after the thesis book)
- Forgot / reset / change password (emailed link, valid 1 hour). Password rule: 8+ characters with letters and numbers
- Email, SMS and WhatsApp notifications (each user chooses in **Account**); in-app notifications are always on
- Withdraw an application; employers can **close / reopen** a job
- Saved jobs (♡), job alerts, search by minimum salary, sorting, pagination
- Interview scheduling (employer proposes, applicant accepts/declines) and messages between employer and applicant
- Employer dashboard with statistics; richer admin statistics
- Verified employers (✔) and featured jobs (★), set by the admin
- Report a job (admin reviews under **Reports**)
- Somali / English switch (top bar). Main pages are translated; add more text in `client/src/i18n.jsx`
- Security: security headers, rate limit on login/register/forgot-password (failed attempts only)

After updating, run `npm install` in `server` (adds `nodemailer`).

### Email (optional)
Fill `SMTP_*` in `server/.env` (any SMTP service: Gmail app password, Brevo, Mailgun...). Without it, nothing is emailed; the reset link is printed in the server terminal during development.

### SMS / WhatsApp (optional)
Needs a Twilio account (`TWILIO_*` in `.env`). Phone numbers must include the country code (+252...).

### Not included
- **Mobile money payments** (EVC Plus / eDahab) need a merchant agreement with the operator. Featured jobs are set manually by the admin for now.
- **CV storage**: CVs are still stored inside MongoDB (fine for a demo; move to Cloudinary/S3 for heavy use).

## 7. Deploy (Vercel)
Client: Root Directory = `client`, `VITE_API_URL` = server URL + `/api`. Server: Vercel/Render with env vars MONGO_URI, JWT_SECRET, CLIENT_URL.

### Deploy the server on Render
1. Push the project to GitHub (never commit `.env`).
2. Render -> New -> Web Service -> root directory `server`, build `npm install`, start `npm start`.
3. Environment: `MONGO_URI`, `JWT_SECRET`, `CLIENT_URL` (your Vercel address), `APP_URL` (same), `NODE_ENV=production`, plus optional `SMTP_*` / `TWILIO_*`.
