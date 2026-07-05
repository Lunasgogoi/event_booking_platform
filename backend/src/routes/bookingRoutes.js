const express = require('express')
const { createBooking, getMyBookings, lockSeatForBooking, releaseSeatLock } = require('../controllers/bookingController')
const { protect } = require('../middlewares/authMiddleware')
const { bookingLimiter } = require('../middlewares/rateLimiter')
const validateRequest = require('../middlewares/validateRequest')
const { createBookingSchema, seatLockSchema } = require('../validators/bookingValidator')

const router = express.Router()

router.post('/lock-seat', protect, bookingLimiter, validateRequest(seatLockSchema), lockSeatForBooking)
router.post('/release-seat', protect, validateRequest(seatLockSchema), releaseSeatLock)
router.post('/', protect, bookingLimiter, validateRequest(createBookingSchema), createBooking)
router.get('/my', protect, getMyBookings)

module.exports = router
