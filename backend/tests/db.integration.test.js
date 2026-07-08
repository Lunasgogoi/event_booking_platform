process.env.NODE_ENV = 'test'
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/event_booking_platform_test'
process.env.REDIS_URL = 'redis://127.0.0.1:6379'
process.env.AUTH_RATE_LIMIT_MAX = '1000'
process.env.BOOKING_RATE_LIMIT_MAX = '1000'
process.env.EMAIL_HOST = ''
process.env.EMAIL_USER = ''
process.env.EMAIL_PASS = ''
process.env.RAZORPAY_KEY_ID = ''
process.env.RAZORPAY_KEY_SECRET = ''

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

test('organizer access request can be approved by admin', { timeout: 30000 }, async (t) => {
  if (!mongoAvailable) t.skip('MongoDB is unavailable')

  const admin = await createUser('admin', 'admin-organizers')
  const user = await createUser('user', 'organizer-applicant')

  const requestResponse = await api('POST', '/api/auth/organizer-request', {
    headers: bearer(user._id),
    body: {
      organizationName: 'Small Hall Collective',
      phone: '+91 9876543210',
      message: 'We host local music showcases.',
    },
  })

  assert.equal(requestResponse.status, 200)
  assert.equal(requestResponse.body.user.organizerProfile.status, 'pending')

  const listResponse = await api('GET', '/api/admin/organizer-requests?status=pending', {
    headers: bearer(admin._id),
  })

  assert.equal(listResponse.status, 200)
  assert.equal(listResponse.body.organizerRequests.length, 1)
  assert.equal(listResponse.body.organizerRequests[0].email, 'organizer-applicant@example.com')

  const approveResponse = await api('PATCH', `/api/admin/organizer-requests/${user._id}/status`, {
    headers: bearer(admin._id),
    body: {
      status: 'approved',
    },
  })

  assert.equal(approveResponse.status, 200)
  assert.equal(approveResponse.body.user.role, 'organizer')
  assert.equal(approveResponse.body.user.organizerProfile.status, 'approved')

  const activeListResponse = await api('GET', '/api/admin/organizer-requests?status=approved', {
    headers: bearer(admin._id),
  })

  assert.equal(activeListResponse.status, 200)
  assert.equal(activeListResponse.body.organizerRequests.length, 1)

  const removeResponse = await api('PATCH', `/api/admin/users/${user._id}/remove-organizer`, {
    headers: bearer(admin._id),
    body: {
      reviewNote: 'Please re-verify your organizer details.',
    },
  })

  assert.equal(removeResponse.status, 200)
  assert.equal(removeResponse.body.user.role, 'user')
  assert.equal(removeResponse.body.user.organizerProfile.status, 'revoked')

  const reapplyResponse = await api('POST', '/api/auth/organizer-request', {
    headers: bearer(user._id),
    body: {
      organizationName: 'Small Hall Collective',
      phone: '+91 9876543210',
      message: 'Reapplying with current details.',
    },
  })

  assert.equal(reapplyResponse.status, 200)
  assert.equal(reapplyResponse.body.user.organizerProfile.status, 'pending')
})

test('organizers can manage only their own draft events', { timeout: 30000 }, async (t) => {
  if (!mongoAvailable) t.skip('MongoDB is unavailable')

  const organizer = await createUser('organizer', 'draft-organizer')
  const otherOrganizer = await createUser('organizer', 'other-draft-organizer')

  const createResponse = await api('POST', '/api/events/organizer', {
    headers: bearer(organizer._id),
    body: eventPayload({
      title: 'Organizer Draft Event',
      status: 'published',
      totalSeats: 3,
    }),
  })

  assert.equal(createResponse.status, 201)
  assert.equal(createResponse.body.event.status, 'draft')
  assert.equal(createResponse.body.event.createdBy, String(organizer._id))

  const publicListResponse = await api('GET', '/api/events?search=Organizer%20Draft')
  assert.equal(publicListResponse.status, 200)
  assert.equal(publicListResponse.body.events.length, 0)

  const ownListResponse = await api('GET', '/api/events/organizer/manage', {
    headers: bearer(organizer._id),
  })

  assert.equal(ownListResponse.status, 200)
  assert.equal(ownListResponse.body.events.length, 1)

  const eventId = createResponse.body.event._id
  const blockedUpdateResponse = await api('PATCH', `/api/events/organizer/${eventId}`, {
    headers: bearer(otherOrganizer._id),
    body: {
      title: 'Hijacked Draft Event',
    },
  })

  assert.equal(blockedUpdateResponse.status, 403)

  const updateResponse = await api('PATCH', `/api/events/organizer/${eventId}`, {
    headers: bearer(organizer._id),
    body: {
      title: 'Updated Organizer Draft Event',
      totalSeats: 5,
    },
  })

  assert.equal(updateResponse.status, 200)
  assert.equal(updateResponse.body.event.title, 'Updated Organizer Draft Event')
  assert.equal(updateResponse.body.event.totalSeats, 5)
  assert.equal(updateResponse.body.event.seats.length, 5)

  const deleteResponse = await api('DELETE', `/api/events/organizer/${eventId}`, {
    headers: bearer(organizer._id),
  })

  assert.equal(deleteResponse.status, 200)
})

test('organizer draft submission and zero-fee publish workflow', { timeout: 30000 }, async (t) => {
  if (!mongoAvailable) t.skip('MongoDB is unavailable')

  const admin = await createUser('admin', 'admin-event-review')
  const organizer = await createUser('organizer', 'event-review-organizer')

  const createResponse = await api('POST', '/api/events/organizer', {
    headers: bearer(organizer._id),
    body: eventPayload({
      title: 'Reviewed Organizer Event',
      totalSeats: 3,
    }),
  })

  assert.equal(createResponse.status, 201)
  const eventId = createResponse.body.event._id

  const earlyPublishResponse = await api('PATCH', `/api/events/organizer/${eventId}/publish`, {
    headers: bearer(organizer._id),
  })

  assert.equal(earlyPublishResponse.status, 400)
  assert.equal(earlyPublishResponse.body.message, 'Only approved organizer events can be published')

  const submitResponse = await api('PATCH', `/api/events/organizer/${eventId}/submit`, {
    headers: bearer(organizer._id),
  })

  assert.equal(submitResponse.status, 200)
  assert.equal(submitResponse.body.event.status, 'submitted')

  const blockedEditResponse = await api('PATCH', `/api/events/organizer/${eventId}`, {
    headers: bearer(organizer._id),
    body: {
      title: 'Edited Submitted Event',
    },
  })

  assert.equal(blockedEditResponse.status, 400)

  const reviewListResponse = await api('GET', '/api/events/admin/review?status=submitted', {
    headers: bearer(admin._id),
  })

  assert.equal(reviewListResponse.status, 200)
  assert.equal(reviewListResponse.body.events.length, 1)

  const underReviewResponse = await api('PATCH', `/api/events/${eventId}/review`, {
    headers: bearer(admin._id),
    body: {
      status: 'under_review',
    },
  })

  assert.equal(underReviewResponse.status, 200)
  assert.equal(underReviewResponse.body.event.status, 'under_review')

  const approveResponse = await api('PATCH', `/api/events/${eventId}/review`, {
    headers: bearer(admin._id),
    body: {
      status: 'approved',
      reviewNote: 'Approved for the payment step.',
    },
  })

  assert.equal(approveResponse.status, 200)
  assert.equal(approveResponse.body.event.status, 'approved')
  assert.equal(approveResponse.body.event.publishing.feeAmount, 0)
  assert.equal(approveResponse.body.event.publishing.paymentStatus, 'not_required')

  const publicListResponse = await api('GET', '/api/events?search=Reviewed%20Organizer')
  assert.equal(publicListResponse.status, 200)
  assert.equal(publicListResponse.body.events.length, 0)

  const publishResponse = await api('PATCH', `/api/events/${eventId}/publish`, {
    headers: bearer(admin._id),
  })

  assert.equal(publishResponse.status, 400)
  assert.equal(publishResponse.body.message, 'Only draft events can be published directly')

  const organizerPublishResponse = await api('PATCH', `/api/events/organizer/${eventId}/publish`, {
    headers: bearer(organizer._id),
  })

  assert.equal(organizerPublishResponse.status, 200)
  assert.equal(organizerPublishResponse.body.event.status, 'published')
  assert.ok(organizerPublishResponse.body.event.publishing.publishedAt)

  const publishedListResponse = await api('GET', '/api/events?search=Reviewed%20Organizer')
  assert.equal(publishedListResponse.status, 200)
  assert.equal(publishedListResponse.body.events.length, 1)
})

test('users can remove only closed bookings from My bookings', { timeout: 30000 }, async (t) => {
  if (!mongoAvailable) t.skip('MongoDB is unavailable')

  const admin = await createUser('admin', 'admin-archive-booking')
  const user = await createUser('user', 'user-archive-booking')
  const baseEvent = {
    description: 'A complete integration event payload for booking archive testing.',
    category: 'Music',
    venue: {
      name: 'Archive Venue',
      address: '123 Archive Street',
      city: 'Mumbai',
    },
    priceFrom: 500,
    totalSeats: 1,
    availableSeats: 0,
    seats: [{ number: 'G1', section: 'General', price: 500, status: 'booked' }],
    status: 'published',
    createdBy: admin._id,
  }

  const [futureEvent, pastEvent] = await Event.create([
    {
      ...baseEvent,
      title: 'Future Archive Test Event',
      slug: 'future-archive-test-event',
      startsAt: futureDate(120),
    },
    {
      ...baseEvent,
      title: 'Past Archive Test Event',
      slug: 'past-archive-test-event',
      startsAt: new Date(Date.now() - 60 * 60 * 1000),
    },
  ])

  const amount = {
    subtotal: 500,
    fees: 99,
    total: 599,
    currency: 'INR',
  }

  const [futureBooking, pastBooking] = await Booking.create([
    {
      bookingCode: 'BK-FUTURE-ARCHIVE',
      user: user._id,
      event: futureEvent._id,
      seats: [{ number: 'G1', section: 'General', price: 500 }],
      amount,
      status: 'confirmed',
      paymentStatus: 'paid',
      confirmedAt: new Date(),
    },
    {
      bookingCode: 'BK-PAST-ARCHIVE',
      user: user._id,
      event: pastEvent._id,
      seats: [{ number: 'G1', section: 'General', price: 500 }],
      amount,
      status: 'confirmed',
      paymentStatus: 'paid',
      confirmedAt: new Date(),
    },
  ])

  const blockedRemoveResponse = await api('DELETE', `/api/bookings/${futureBooking._id}`, {
    headers: bearer(user._id),
  })

  assert.equal(blockedRemoveResponse.status, 400)
  assert.equal(blockedRemoveResponse.body.message, 'Only cancelled or past event bookings can be removed')

  const removeResponse = await api('DELETE', `/api/bookings/${pastBooking._id}`, {
    headers: bearer(user._id),
  })

  assert.equal(removeResponse.status, 200)
  assert.equal(removeResponse.body.message, 'Booking removed from My bookings')

  const listResponse = await api('GET', '/api/bookings/my', {
    headers: bearer(user._id),
  })

  assert.equal(listResponse.status, 200)
  assert.equal(listResponse.body.bookings.length, 1)
  assert.equal(listResponse.body.bookings[0].bookingCode, 'BK-FUTURE-ARCHIVE')

  const hiddenBooking = await Booking.findById(pastBooking._id)
  assert.ok(hiddenBooking.hiddenFromUserAt)
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
