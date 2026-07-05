# Event Booking Platform

MERN event booking platform scaffold.

## Structure

- `frontend/` - React + Vite UI
- `backend/` - Node.js, Express, MongoDB backend scaffold
- Root files only for repository-level docs and ignores

There is no root `package.json`. Run frontend and backend commands from their own folders.

## Frontend

Current status: initial UI prototype with dummy data only. Backend APIs are not connected yet.

```bash
cd frontend
npm install
npm run dev
```

Included UI screens:

- Home and event discovery
- Search/filter events
- Event details with dummy seat selection
- Login/register UI
- My bookings
- Admin dashboard
- Manage events

## Backend

Current status: backend environment, app bootstrap, MongoDB, Redis, Cloudinary, email, cache, and seat-lock config are scaffolded.

```bash
cd backend
npm install
copy .env.example .env
npm run dev
```

`npm run dev` starts `src/server.js`, connects MongoDB, connects Redis, and exposes a health endpoint at `GET /health`.

Required local services for the backend server:

- MongoDB at `MONGO_URI`
- Redis at `REDIS_URL`

Cloudinary and SMTP variables can stay blank until poster uploads and confirmation emails are implemented.

Planned backend features:

- JWT authentication
- Mongoose models
- Redis seat locks and caching
- Rate-limited auth and booking routes
- QR ticket generation
- Zod validation
- Poster uploads and booking emails later
