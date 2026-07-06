const assert = require('node:assert/strict')
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
