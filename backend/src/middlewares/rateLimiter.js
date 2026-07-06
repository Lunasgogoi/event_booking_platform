const rateLimit = require('express-rate-limit')
const env = require('../config/env')

const authLimiter = rateLimit({
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
  limit: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many auth attempts. Please try again later.',
    errors: [],
  },
})

const bookingLimiter = rateLimit({
  windowMs: env.BOOKING_RATE_LIMIT_WINDOW_MS,
  limit: env.BOOKING_RATE_LIMIT_MAX,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many booking attempts. Please try again shortly.',
    errors: [],
  },
})

module.exports = {
  authLimiter,
  bookingLimiter,
}
