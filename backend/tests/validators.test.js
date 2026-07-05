const assert = require('node:assert/strict')
const test = require('node:test')
const { loginSchema, registerSchema } = require('../src/validators/authValidator')
const { createBookingSchema, seatLockSchema } = require('../src/validators/bookingValidator')
const { createEventSchema } = require('../src/validators/eventValidator')

test('register schema accepts valid user payload', () => {
  const result = registerSchema.safeParse({
    name: 'Admin User',
    email: 'ADMIN@Example.COM',
    password: 'password123',
  })

  assert.equal(result.success, true)
  assert.equal(result.data.email, 'admin@example.com')
})

test('login schema rejects invalid email', () => {
  const result = loginSchema.safeParse({
    email: 'not-an-email',
    password: 'password123',
  })

  assert.equal(result.success, false)
})

test('event schema rejects end date before start date', () => {
  const result = createEventSchema.safeParse({
    title: 'Sample Event',
    description: 'This is a long enough event description.',
    category: 'Music',
    venue: {
      name: 'Main Hall',
      address: '123 Main Street',
      city: 'Mumbai',
    },
    startsAt: '2026-08-10T10:00:00.000Z',
    endsAt: '2026-08-10T09:00:00.000Z',
    priceFrom: 500,
    totalSeats: 50,
    status: 'draft',
  })

  assert.equal(result.success, false)
})

test('booking schema requires at least one seat', () => {
  const result = createBookingSchema.safeParse({
    eventId: '507f1f77bcf86cd799439011',
    seatNumbers: [],
  })

  assert.equal(result.success, false)
})

test('seat lock schema accepts event id and seat number', () => {
  const result = seatLockSchema.safeParse({
    eventId: '507f1f77bcf86cd799439011',
    seatNumber: 'G1',
  })

  assert.equal(result.success, true)
})
