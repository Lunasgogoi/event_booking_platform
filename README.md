# Event Booking Platform

MERN event booking platform scaffold.

## Structure

- `frontend/` - React + Vite UI
- `backend/` - Node.js, Express, MongoDB backend scaffold
- Root files only for repository-level docs and ignores

There is no root `package.json`. Run frontend and backend commands from their own folders.

## Frontend

Current status: connected UI with auth, profile settings, avatar upload, public event browsing, event detail, admin event management, Cloudinary poster uploads, Redis seat locking, Razorpay payment checkout, booking confirmation, QR tickets, booking cancellation, support contact, confirmation emails, and My Bookings connected to the backend.

```bash
cd frontend
npm install
npm run dev
```

Included UI screens:

- Home and event discovery
- Search/filter events
- Event details with dummy seat selection
- Event details with Redis-backed temporary seat locking and Razorpay checkout for database events
- Login/register UI
- Profile menu, editable settings, password change, and avatar upload
- My bookings with QR ticket display, QR download, print, and cancellation
- Contact support form
- Admin dashboard with support queue
- Manage events with create, edit, publish, cancel, and safer delete confirmation
- Cloudinary-backed event poster and avatar uploads

Frontend environment:

```bash
VITE_API_BASE_URL=http://localhost:5000/api
```

## Backend

Current status: backend environment, app bootstrap, MongoDB, Redis, Razorpay payments, Cloudinary, email, cache, seat-lock config, data models, and auth APIs are scaffolded.

```bash
cd backend
npm install
copy .env.example .env
npm run seed:admin
npm run dev
npm test
```

`npm run dev` starts `src/server.js`, connects MongoDB, connects Redis, and exposes a health endpoint at `GET /health`.

Auth endpoints:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `PATCH /api/auth/me`
- `PATCH /api/auth/avatar`
- `PATCH /api/auth/password`

Event endpoints:

- `GET /api/events`
- `GET /api/events/:eventIdOrSlug`
- `GET /api/events/admin/manage`
- `POST /api/events/poster`
- `POST /api/events`
- `PATCH /api/events/:eventId`
- `PATCH /api/events/:eventId/publish`
- `PATCH /api/events/:eventId/cancel`
- `DELETE /api/events/:eventId`
- `GET /api/events/:eventId/seats`

Seat-lock endpoints:

- `POST /api/bookings/lock-seat`
- `POST /api/bookings/release-seat`

Booking endpoints:

- `POST /api/bookings` - creates a Razorpay order for the selected locked seats
- `POST /api/bookings/verify-payment` - verifies Razorpay payment signature and confirms the booking
- `GET /api/bookings/my`
- `PATCH /api/bookings/:bookingId/cancel`

Contact endpoints:

- `POST /api/contact`

Admin endpoints:

- `GET /api/admin/dashboard`
- `GET /api/admin/users`
- `PATCH /api/admin/users/:userId/role`
- `PATCH /api/admin/users/:userId/status`
- `GET /api/admin/contact-messages`
- `PATCH /api/admin/contact-messages/:messageId/status`

## Postman

Import these files into Postman:

- `postman/Event Booking Platform.postman_collection.json`
- `postman/Event Booking Platform.postman_environment.json`

The login/register requests automatically save the returned JWT into the `token` environment variable. The create event request saves `eventId` and `eventSlug`.

Admin bootstrap:

Set seed admin credentials in `backend/.env`, then run the seed script once.

```bash
SEED_ADMIN_NAME=Admin User
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PASSWORD=password123
npm run seed:admin
```

The seed script creates that user if missing, or promotes the existing user with that email to the `admin` role. After that, admin login uses the normal `POST /api/auth/login` endpoint. Registration always creates regular users.

Required local services for the backend server:

- MongoDB at `MONGO_URI`
- Redis at `REDIS_URL`

Cloudinary variables are required for poster and avatar uploads. SMTP variables are optional in development; confirmation and support emails are skipped if SMTP is not configured, but support messages are still stored in MongoDB.

Razorpay variables are required for paid bookings:

```bash
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_CURRENCY=INR
RAZORPAY_BUSINESS_NAME=Ticketo
```

The backend creates a Razorpay order before checkout, then confirms the booking only after server-side verification of `razorpay_payment_id`, `razorpay_order_id`, and `razorpay_signature`. Configure automatic payment capture in Razorpay so successful checkout payments reach the `captured` status before fulfilment.

Useful production checks:

- Set a strong `JWT_SECRET`; the default is rejected in production.
- Set `CLIENT_URL` to the deployed frontend URL so CORS and cookies work.
- Set `QR_CODE_BASE_URL` to the deployed ticket URL base.
- Set `SUPPORT_EMAIL` to the admin/support inbox.
- Set Razorpay live keys on the backend before accepting real payments.
- Configure Cloudinary before enabling poster or avatar uploads.
- Configure SMTP if booking confirmations and support notifications should be emailed.
- Use HTTPS in production so secure cookies work correctly.
- Deploy the frontend from `frontend/` on Vercel. `frontend/vercel.json` rewrites browser routes to `index.html`.
- Deploy the backend from `backend/` on Render with `npm install` as the build command and `npm start` as the start command.

Planned backend features:

- Broader integration tests for cancellation, support messages, and upload edge cases
