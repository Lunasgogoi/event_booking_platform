const assert = require('node:assert/strict')
const test = require('node:test')
const {
  changePasswordSchema,
  loginSchema,
  registerSchema,
  updateProfileSchema,
} = require('../src/validators/authValidator')
const { createBookingSchema, seatLockSchema, verifyPaymentSchema } = require('../src/validators/bookingValidator')
const { createContactMessageSchema, updateContactMessageStatusSchema } = require('../src/validators/contactValidator')
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

test('profile update schema normalizes email', () => {
  const result = updateProfileSchema.safeParse({
    name: 'Regular User',
    email: 'USER@Example.COM',
  })

  assert.equal(result.success, true)
  assert.equal(result.data.email, 'user@example.com')
})

test('password change schema requires strong new password', () => {
  const result = changePasswordSchema.safeParse({
    currentPassword: 'old-password',
    newPassword: 'short',
  })

  assert.equal(result.success, false)
})

test('contact schema accepts a support message', () => {
  const result = createContactMessageSchema.safeParse({
    name: 'Regular User',
    email: 'USER@Example.COM',
    category: 'booking',
    subject: 'Ticket delivery',
    message: 'I need help finding my booking confirmation.',
  })

  assert.equal(result.success, true)
  assert.equal(result.data.email, 'user@example.com')
})

test('contact status schema rejects unknown status', () => {
  const result = updateContactMessageStatusSchema.safeParse({
    status: 'archived',
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

test('payment verification schema requires Razorpay checkout fields', () => {
  const result = verifyPaymentSchema.safeParse({
    eventId: '507f1f77bcf86cd799439011',
    seatNumbers: ['G1'],
    razorpay_order_id: 'order_test_123',
    razorpay_payment_id: 'pay_test_456',
  })

  assert.equal(result.success, false)
})
