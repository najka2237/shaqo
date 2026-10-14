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

## 6. Deploy (Vercel)
Client: Root Directory = `client`, `VITE_API_URL` = server URL + `/api`. Server: Vercel/Render with env vars MONGO_URI, JWT_SECRET, CLIENT_URL.

## Haddii DNS error (`querySrv ETIMEOUT`) yimaado
Gudaha `server/src/db.js` bilowga ku dar: `import dns from 'node:dns'; dns.setServers(['8.8.8.8','1.1.1.1']);`
