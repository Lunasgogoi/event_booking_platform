process.env.NODE_ENV = 'test'
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/event_booking_platform_test'
process.env.REDIS_URL = 'redis://127.0.0.1:6379'
process.env.AUTH_RATE_LIMIT_MAX = '1000'
process.env.BOOKING_RATE_LIMIT_MAX = '1000'

const assert = require('node:assert/strict')
const { after, before, beforeEach, test } = require('node:test')
const mongoose = require('mongoose')
const app = require('../src/app')
const connectDB = require('../src/config/db')
const { connectRedis, disconnectRedis, redisClient } = require('../src/config/redis')
const Booking = require('../src/models/Booking')
const Event = require('../src/models/Event')
const User = require('../src/models/User')
const generateToken = require('../src/utils/generateToken')

let server
let baseUrl
let mongoAvailable = false
let redisAvailable = false

function futureDate(minutes = 60) {
  return new Date(Date.now() + minutes * 60 * 1000)
}

function eventPayload(overrides = {}) {
  return {
    title: 'Integration Event',
    description: 'A complete integration event payload for backend testing.',
    category: 'Music',
    venue: {
      name: 'Integration Venue',
      address: '123 Test Street',
      city: 'Mumbai',
    },
    startsAt: futureDate(120).toISOString(),
    priceFrom: 500,
    totalSeats: 4,
    ...overrides,
  }
}

async function startServer() {
  return new Promise((resolve) => {
    server = app.listen(0, () => {
      const { port } = server.address()
      baseUrl = `http://127.0.0.1:${port}`
      resolve()
    })
  })
}

async function closeServer() {
  if (!server) return

  await new Promise((resolve) => server.close(resolve))
  server = null
  baseUrl = null
}

async function api(method, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  const json = await response.json()
  return {
    status: response.status,
    body: json,
  }
}

function bearer(userId) {
  return {
    Authorization: `Bearer ${generateToken(userId)}`,
  }
}

async function clearDatabase() {
  await Promise.all([Booking.deleteMany({}), Event.deleteMany({}), User.deleteMany({})])
}

async function clearSeatLocks() {
  if (!redisClient.isOpen) return

  const keys = await redisClient.keys('seat-lock:*')
  if (keys.length) {
    await redisClient.del(keys)
  }
}

async function createUser(role = 'user', suffix = role) {
  return User.create({
    name: `${role} User`,
    email: `${suffix}@example.com`,
    password: 'password123',
    role,
  })
}

async function createPublishedEvent(admin, overrides = {}) {
  const createResponse = await api('POST', '/api/events', {
    headers: bearer(admin._id),
    body: eventPayload(overrides),
  })
  const eventId = createResponse.body.event._id

  const publishResponse = await api('PATCH', `/api/events/${eventId}/publish`, {
    headers: bearer(admin._id),
  })

  assert.equal(publishResponse.status, 200)
  return eventId
}

before(async () => {
  try {
    await connectDB()
    mongoAvailable = true
  } catch (error) {
    console.warn(`Skipping DB-backed tests because MongoDB is unavailable: ${error.message}`)
    return
  }

  try {
    await connectRedis()
    redisAvailable = true
  } catch (error) {
    console.warn(`Skipping Redis-backed booking tests because Redis is unavailable: ${error.message}`)
  }

  await startServer()
})

beforeEach(async () => {
  if (!mongoAvailable) return

  await clearDatabase()
  await clearSeatLocks()
})

after(async () => {
  await closeServer()

  if (mongoAvailable) {
    await clearDatabase()
    await mongoose.disconnect()
  }

  if (redisAvailable) {
    await clearSeatLocks()
    await disconnectRedis()
  }
})

test('auth register, login, and me work against MongoDB', { timeout: 30000 }, async (t) => {
  if (!mongoAvailable) t.skip('MongoDB is unavailable')

  const registerResponse = await api('POST', '/api/auth/register', {
    body: {
      name: 'Registered User',
      email: 'registered@example.com',
      password: 'password123',
    },
  })

  assert.equal(registerResponse.status, 201)
  assert.equal(registerResponse.body.user.role, 'user')

  const loginResponse = await api('POST', '/api/auth/login', {
    body: {
      email: 'registered@example.com',
      password: 'password123',
    },
  })

  assert.equal(loginResponse.status, 200)
  assert.ok(loginResponse.body.token)

  const meResponse = await api('GET', '/api/auth/me', {
    headers: {
      Authorization: `Bearer ${loginResponse.body.token}`,
    },
  })

  assert.equal(meResponse.status, 200)
  assert.equal(meResponse.body.user.email, 'registered@example.com')
})

test('admin event lifecycle controls public visibility', { timeout: 30000 }, async (t) => {
  if (!mongoAvailable) t.skip('MongoDB is unavailable')

  const admin = await createUser('admin', 'admin-lifecycle')

  const createResponse = await api('POST', '/api/events', {
    headers: bearer(admin._id),
    body: eventPayload({
      title: 'Lifecycle Test Event',
      status: 'published',
    }),
  })

  assert.equal(createResponse.status, 201)
  assert.equal(createResponse.body.event.status, 'draft')

  const draftListResponse = await api('GET', '/api/events?search=Lifecycle')
  assert.equal(draftListResponse.status, 200)
  assert.equal(draftListResponse.body.events.length, 0)

  const eventId = createResponse.body.event._id
  const publishResponse = await api('PATCH', `/api/events/${eventId}/publish`, {
    headers: bearer(admin._id),
  })

  assert.equal(publishResponse.status, 200)
  assert.equal(publishResponse.body.event.status, 'published')

  const publishedListResponse = await api('GET', '/api/events?search=Lifecycle')
  assert.equal(publishedListResponse.status, 200)
  assert.equal(publishedListResponse.body.events.length, 1)

  const partialSearchResponse = await api('GET', '/api/events?search=Life')
  assert.equal(partialSearchResponse.status, 200)
  assert.equal(partialSearchResponse.body.events.length, 1)

  const statusPatchResponse = await api('PATCH', `/api/events/${eventId}`, {
    headers: bearer(admin._id),
    body: {
      status: 'cancelled',
    },
  })

  assert.equal(statusPatchResponse.status, 400)

  const pastPatchResponse = await api('PATCH', `/api/events/${eventId}`, {
    headers: bearer(admin._id),
    body: {
      startsAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    },
  })

  assert.equal(pastPatchResponse.status, 400)

  const cancelResponse = await api('PATCH', `/api/events/${eventId}/cancel`, {
    headers: bearer(admin._id),
  })

  assert.equal(cancelResponse.status, 200)
  assert.equal(cancelResponse.body.event.status, 'cancelled')

  const publicDetailResponse = await api('GET', `/api/events/${eventId}`)
  assert.equal(publicDetailResponse.status, 404)
})

test('admin user management lists and updates users', { timeout: 30000 }, async (t) => {
  if (!mongoAvailable) t.skip('MongoDB is unavailable')

  const admin = await createUser('admin', 'admin-users')
  const user = await createUser('user', 'managed-user')

  const listResponse = await api('GET', '/api/admin/users?search=managed&page=1&limit=10', {
    headers: bearer(admin._id),
  })

  assert.equal(listResponse.status, 200)
  assert.equal(listResponse.body.success, true)
  assert.equal(listResponse.body.users.length, 1)
  assert.equal(listResponse.body.users[0].email, 'managed-user@example.com')
  assert.equal(listResponse.body.pagination.total, 1)

  const roleResponse = await api('PATCH', `/api/admin/users/${user._id}/role`, {
    headers: bearer(admin._id),
    body: {
      role: 'admin',
    },
  })

  assert.equal(roleResponse.status, 200)
  assert.equal(roleResponse.body.user.role, 'admin')

  const statusResponse = await api('PATCH', `/api/admin/users/${user._id}/status`, {
    headers: bearer(admin._id),
    body: {
      isActive: false,
    },
  })

  assert.equal(statusResponse.status, 200)
  assert.equal(statusResponse.body.user.isActive, false)

  const selfDemoteResponse = await api('PATCH', `/api/admin/users/${admin._id}/role`, {
    headers: bearer(admin._id),
    body: {
      role: 'user',
    },
  })

  assert.equal(selfDemoteResponse.status, 400)
  assert.equal(selfDemoteResponse.body.message, 'You cannot remove your own admin role')

  const selfDeactivateResponse = await api('PATCH', `/api/admin/users/${admin._id}/status`, {
    headers: bearer(admin._id),
    body: {
      isActive: false,
    },
  })

  assert.equal(selfDeactivateResponse.status, 400)
  assert.equal(selfDeactivateResponse.body.message, 'You cannot deactivate your own account')
})

test('seat lock and release flow works against MongoDB and Redis', { timeout: 30000 }, async (t) => {
  if (!mongoAvailable) t.skip('MongoDB is unavailable')
  if (!redisAvailable) t.skip('Redis is unavailable')

  const admin = await createUser('admin', 'admin-booking')
  const user = await createUser('user', 'user-booking')
  const eventId = await createPublishedEvent(admin, {
    title: 'Lock Release Test Event',
    totalSeats: 2,
  })

  const lockResponse = await api('POST', '/api/bookings/lock-seat', {
    headers: bearer(user._id),
    body: {
      eventId,
      seatNumber: 'G1',
    },
  })

  assert.equal(lockResponse.status, 200)

  const lockedSeatsResponse = await api('GET', `/api/events/${eventId}/seats`)
  assert.equal(lockedSeatsResponse.status, 200)
  assert.equal(lockedSeatsResponse.body.seats.find((seat) => seat.number === 'G1').status, 'locked')

  const releaseResponse = await api('POST', '/api/bookings/release-seat', {
    headers: bearer(user._id),
    body: {
      eventId,
      seatNumber: 'G1',
    },
  })

  assert.equal(releaseResponse.status, 200)

  const releasedSeatsResponse = await api('GET', `/api/events/${eventId}/seats`)
  assert.equal(releasedSeatsResponse.status, 200)
  assert.equal(releasedSeatsResponse.body.seats.find((seat) => seat.number === 'G1').status, 'available')
})

test('booking order creation requires configured Razorpay after seat lock', { timeout: 30000 }, async (t) => {
  if (!mongoAvailable) t.skip('MongoDB is unavailable')
  if (!redisAvailable) t.skip('Redis is unavailable')

  const admin = await createUser('admin', 'admin-confirm-booking')
  const user = await createUser('user', 'user-confirm-booking')
  const eventId = await createPublishedEvent(admin, {
    title: 'Booking Confirmation Test Event',
    totalSeats: 2,
  })

  const lockResponse = await api('POST', '/api/bookings/lock-seat', {
    headers: bearer(user._id),
    body: {
      eventId,
      seatNumber: 'G1',
    },
  })

  assert.equal(lockResponse.status, 200)

  const bookingResponse = await api('POST', '/api/bookings', {
    headers: bearer(user._id),
    body: {
      eventId,
      seatNumbers: ['G1'],
    },
  })

  assert.equal(bookingResponse.status, 503, JSON.stringify(bookingResponse.body))
  assert.equal(bookingResponse.body.message, 'Payment gateway is not configured')

  const duplicateLockResponse = await api('POST', '/api/bookings/lock-seat', {
    headers: bearer(user._id),
    body: {
      eventId,
      seatNumber: 'G1',
    },
  })

  assert.equal(duplicateLockResponse.status, 409)
})
