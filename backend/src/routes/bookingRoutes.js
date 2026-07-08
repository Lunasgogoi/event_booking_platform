const express = require('express')
const {
  cancelBooking,
  createBookingOrder,
  getMyBookings,
  lockSeatForBooking,
  removeMyBooking,
  releaseSeatLock,
  verifyPaymentAndCreateBooking,
} = require('../controllers/bookingController')
const { protect } = require('../middlewares/authMiddleware')
const { bookingLimiter } = require('../middlewares/rateLimiter')
const validateRequest = require('../middlewares/validateRequest')
const { createBookingSchema, seatLockSchema, verifyPaymentSchema } = require('../validators/bookingValidator')

const router = express.Router()

router.post('/lock-seat', protect, bookingLimiter, validateRequest(seatLockSchema), lockSeatForBooking)
router.post('/release-seat', protect, validateRequest(seatLockSchema), releaseSeatLock)
router.post('/', protect, bookingLimiter, validateRequest(createBookingSchema), createBookingOrder)
router.post('/verify-payment', protect, bookingLimiter, validateRequest(verifyPaymentSchema), verifyPaymentAndCreateBooking)
router.get('/my', protect, getMyBookings)
router.delete('/:bookingId', protect, removeMyBooking)
router.patch('/:bookingId/cancel', protect, cancelBooking)

module.exports = router
