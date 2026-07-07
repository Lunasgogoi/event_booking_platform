const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const test = require('node:test')
const jwt = require('jsonwebtoken')
const ApiError = require('../src/utils/ApiError')
const {
  ensureEventCanBePublished,
  ensureEventIsBookable,
  ensureEventIsPublic,
} = require('../src/utils/eventLifecycle')
const generateToken = require('../src/utils/generateToken')
const env = require('../src/config/env')
const { verifyPaymentSignature } = require('../src/services/razorpayService')

test('ApiError carries status code and message', () => {
  const error = new ApiError(404, 'Not found')

  assert.equal(error.statusCode, 404)
  assert.equal(error.message, 'Not found')
  assert.equal(error.isOperational, true)
})

test('generateToken signs user id into JWT payload', () => {
  const token = generateToken('507f1f77bcf86cd799439011')
  const decoded = jwt.verify(token, env.JWT_SECRET)

  assert.equal(decoded.id, '507f1f77bcf86cd799439011')
})

test('event lifecycle allows upcoming published events to be public and bookable', () => {
  const event = {
    status: 'published',
    startsAt: new Date(Date.now() + 60 * 60 * 1000),
    totalSeats: 10,
    seats: [{ number: 'G1' }],
  }

  assert.doesNotThrow(() => ensureEventIsPublic(event))
  assert.doesNotThrow(() => ensureEventIsBookable(event))
  assert.doesNotThrow(() => ensureEventCanBePublished({ ...event, status: 'draft' }))
})

test('event lifecycle rejects past events', () => {
  const event = {
    status: 'published',
    startsAt: new Date(Date.now() - 60 * 60 * 1000),
    totalSeats: 10,
    seats: [{ number: 'G1' }],
  }

  assert.throws(() => ensureEventIsPublic(event), /Event not found/)
  assert.throws(() => ensureEventIsBookable(event), /Event has already started/)
  assert.throws(() => ensureEventCanBePublished({ ...event, status: 'draft' }), /Past events cannot be published/)
})

test('Razorpay signature verification accepts authentic checkout response', (t) => {
  const originalSecret = env.RAZORPAY_KEY_SECRET
  env.RAZORPAY_KEY_SECRET = 'test_razorpay_secret'
  t.after(() => {
    env.RAZORPAY_KEY_SECRET = originalSecret
  })

  const orderId = 'order_test_123'
  const paymentId = 'pay_test_456'
  const signature = crypto
    .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex')

  assert.equal(verifyPaymentSignature({ orderId, paymentId, signature }), true)
})

test('Razorpay signature verification rejects tampered checkout response', (t) => {
  const originalSecret = env.RAZORPAY_KEY_SECRET
  env.RAZORPAY_KEY_SECRET = 'test_razorpay_secret'
  t.after(() => {
    env.RAZORPAY_KEY_SECRET = originalSecret
  })

  assert.equal(
    verifyPaymentSignature({
      orderId: 'order_test_123',
      paymentId: 'pay_tampered',
      signature: '0'.repeat(64),
    }),
    false,
  )
})
