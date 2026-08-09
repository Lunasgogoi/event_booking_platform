<div align="center">

# 🎟️ Ticketo - Event Booking Platform

### A Modern Full-Stack MERN Event Booking Platform

Discover events • Book seats • Secure Payments • QR Tickets • Organizer Dashboard • Admin Panel

![MERN](https://img.shields.io/badge/MERN-Stack-green?style=for-the-badge)
![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)
![Node](https://img.shields.io/badge/Node.js-Express-success?style=for-the-badge&logo=node.js)
![MongoDB](https://img.shields.io/badge/MongoDB-Database-darkgreen?style=for-the-badge&logo=mongodb)
![Redis](https://img.shields.io/badge/Redis-Seat_Locking-red?style=for-the-badge&logo=redis)
![Razorpay](https://img.shields.io/badge/Razorpay-Payments-blue?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)

</div>

---

# 📖 Overview

Ticketo is a **production-ready MERN Event Booking Platform** that enables users to discover events, reserve seats using Redis-powered temporary seat locking, make secure online payments via Razorpay, and receive QR-code tickets instantly.

The platform also includes complete **Organizer** and **Admin** dashboards for managing events, users, support requests, approvals, bookings, and analytics.

---

# ✨ Features

## 👤 User

- User Authentication (JWT + Cookies)
- Register & Login
- Edit Profile
- Upload Avatar
- Change Password
- Browse Public Events
- Search & Filter Events
- Event Details Page
- Redis Seat Locking
- Razorpay Checkout
- Booking Confirmation
- QR Ticket Generation
- Download QR Ticket
- Print Ticket
- Cancel Booking
- Delete Past Bookings
- Contact Support
- Email Booking Confirmation

---

## 🎉 Organizer

- Organizer Request Workflow
- Create Events
- Upload Event Posters
- Edit Events
- Publish Events
- Submit Events for Review
- Cancel Events
- Delete Events
- View Organizer Events

---

## 🛠️ Admin

- Dashboard
- Review Organizer Requests
- Approve / Reject Organizers
- Manage Users
- Change User Roles
- Remove Organizer Access
- Suspend Users
- Manage Events
- Publish / Cancel Events
- Delete Events
- Support Inbox
- Update Support Ticket Status

---

## ⚡ Technical Features

- Redis Seat Locking
- Secure JWT Authentication
- Cookie-based Sessions
- Server-side Payment Verification
- QR Code Ticket Generation
- Cloudinary Image Upload
- Email Notifications
- Zod Validation
- REST API
- Responsive UI
- Production Ready Architecture

---

# 🏗️ Tech Stack

## Frontend

- React
- Vite
- React Router
- Tailwind CSS
- Base UI
- Axios

---

## Backend

- Node.js
- Express.js
- MongoDB
- Mongoose
- Redis
- JWT Authentication
- Cookie Parser
- Zod Validation

---

## Third Party Services

- Razorpay
- Cloudinary
- Nodemailer

---

# 📂 Project Structure

```
Ticketo
│
├── frontend/
│   ├── src/
│   ├── public/
│   └── vite.config.js
│
├── backend/
│   ├── src/
│   ├── uploads/
│   ├── tests/
│   └── server.js
│
├── postman/
│
└── README.md
```

---

# 🚀 Getting Started

## Clone Repository

```bash
git clone <repository-url>

cd Ticketo
```

---

# 💻 Frontend Setup

```bash
cd frontend

npm install

npm run dev
```

Frontend Environment

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

---

# ⚙️ Backend Setup

```bash
cd backend

npm install

cp .env.example .env
```

Windows

```bash
copy .env.example .env
```

Seed Admin

```bash
npm run seed:admin
```

Start Development Server

```bash
npm run dev
```

Run Tests

```bash
npm test
```

Health Check

```
GET /health
```

---

# 🔐 Environment Variables

## Required

```env
MONGO_URI=

REDIS_URL=

JWT_SECRET=

CLIENT_URL=

CLOUDINARY_CLOUD_NAME=

CLOUDINARY_API_KEY=

CLOUDINARY_API_SECRET=

RAZORPAY_KEY_ID=

RAZORPAY_KEY_SECRET=

RAZORPAY_CURRENCY=INR

RAZORPAY_BUSINESS_NAME=Ticketo
```

---

## Optional

```env
SMTP_HOST=

SMTP_PORT=

SMTP_USER=

SMTP_PASS=

SUPPORT_EMAIL=

QR_CODE_BASE_URL=
```

---

# 🎫 Booking Workflow

```text
Select Event
      │
      ▼
Lock Seats (Redis)
      │
      ▼
Create Razorpay Order
      │
      ▼
Payment Checkout
      │
      ▼
Verify Payment
      │
      ▼
Booking Created
      │
      ▼
Generate QR Ticket
      │
      ▼
Confirmation Email
```

---

# 🔒 Authentication API

| Method | Endpoint |
|---------|----------|
| POST | /api/auth/register |
| POST | /api/auth/login |
| POST | /api/auth/logout |
| GET | /api/auth/me |
| PATCH | /api/auth/me |
| PATCH | /api/auth/avatar |
| PATCH | /api/auth/password |
| POST | /api/auth/organizer-request |

---

# 🎉 Event API

| Method | Endpoint |
|---------|----------|
| GET | /api/events |
| GET | /api/events/:eventIdOrSlug |
| GET | /api/events/:eventId/seats |
| POST | /api/events |
| POST | /api/events/poster |
| PATCH | /api/events/:eventId |
| PATCH | /api/events/:eventId/publish |
| PATCH | /api/events/:eventId/cancel |
| DELETE | /api/events/:eventId |

---

# 💳 Booking API

| Method | Endpoint |
|---------|----------|
| POST | /api/bookings/lock-seat |
| POST | /api/bookings/release-seat |
| POST | /api/bookings |
| POST | /api/bookings/verify-payment |
| GET | /api/bookings/my |
| PATCH | /api/bookings/:bookingId/cancel |
| DELETE | /api/bookings/:bookingId |

---

# 👑 Admin API

- Dashboard
- User Management
- Organizer Requests
- Event Moderation
- Contact Messages
- User Role Management

---

# 📮 Postman

Import the following files into Postman.

```
postman/
├── Event Booking Platform.postman_collection.json
└── Event Booking Platform.postman_environment.json
```

The collection automatically stores

- JWT Token
- Event ID
- Event Slug

for subsequent requests.

---

# ☁️ Deployment

## Frontend

Deploy **frontend/** to

- Vercel

`frontend/vercel.json` already rewrites routes to `index.html`.

---

## Backend

Deploy **backend/** to

- Render

Build Command

```bash
npm install
```

Start Command

```bash
npm start
```

---

# ✅ Production Checklist

- Strong JWT Secret
- MongoDB Atlas
- Redis Cloud
- Razorpay Live Keys
- Cloudinary Configured
- SMTP Configured
- HTTPS Enabled
- Correct CLIENT_URL
- Secure Cookies Enabled

---

# 🧪 Testing

Backend uses the built-in Node.js Test Runner.

Run

```bash
npm test
```

Current coverage includes

- Authentication
- Routes
- Validation
- Booking Flow

---

# 🚀 Future Improvements

- Event Categories
- Event Reviews
- Wishlist
- Coupon System
- Real-time Notifications
- Analytics Dashboard
- Organizer Sales Reports
- Social Login
- Multi-language Support
- PWA Support
- Docker Deployment
- CI/CD Pipeline

---

# 🤝 Contributing

1. Fork the repository

2. Create a new branch

```bash
git checkout -b feature/your-feature
```

3. Commit your changes

```bash
git commit -m "Add new feature"
```

4. Push your branch

```bash
git push origin feature/your-feature
```

5. Open a Pull Request

---

# 📄 License

This project is licensed under the **MIT License**.

---

<div align="center">

### ⭐ If you found this project useful, consider giving it a Star!

Made with ❤️ using the MERN Stack

</div>