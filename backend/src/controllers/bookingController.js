const mongoose = require('mongoose')
const Booking = require('../models/Booking')
const Event = require('../models/Event')
const ApiError = require('../utils/ApiError')
const generateQR = require('../utils/generateQR')
const { ensureEventIsBookable } = require('../utils/eventLifecycle')
const { deleteCachePattern } = require('../services/cacheService')
const { sendEmail } = require('../services/emailService')
const {
  requireRazorpay,
  toRazorpayAmount,
  verifyPaymentSignature,
} = require('../services/razorpayService')
const { getSeatLockOwner, lockSeat, releaseSeatForUser, releaseSeatsForUser } = require('../services/seatLockService')
const env = require('../config/env')

async function findBookableSeat(eventId, seatNumber) {
  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    throw new ApiError(400, 'Invalid event id')
  }

  const event = await Event.findById(eventId)
  if (!event) {
    throw new ApiError(404, 'Event not found')
  }

  ensureEventIsBookable(event)

  const seat = event.seats.find((item) => item.number === seatNumber)
  if (!seat) {
    throw new ApiError(404, 'Seat not found')
  }

  if (seat.status !== 'available') {
    throw new ApiError(409, 'Seat is not available')
  }

  return { event, seat }
}

async function lockSeatForBooking(req, res, next) {
  try {
    const { eventId, seatNumber } = req.body
    await findBookableSeat(eventId, seatNumber)

    const locked = await lockSeat({
      eventId,
      seatNumber,
      userId: req.user._id,
    })

    if (!locked) {
      throw new ApiError(409, 'Seat is temporarily locked by another user')
    }

    res.status(200).json({
      success: true,
      message: 'Seat locked',
      lock: {
        eventId,
        seatNumber,
        expiresInSeconds: env.SEAT_LOCK_TTL_SECONDS,
      },
    })
  } catch (error) {
    next(error)
  }
}

async function releaseSeatLock(req, res, next) {
  try {
    const { eventId, seatNumber } = req.body
    const released = await releaseSeatForUser({
      eventId,
      seatNumber,
      userId: req.user._id,
    })

    if (!released) {
      throw new ApiError(403, 'You do not own this seat lock')
    }

    res.status(200).json({
      success: true,
      message: 'Seat lock released',
    })
  } catch (error) {
    next(error)
  }
}

function generateBookingCode() {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase()
  return `BK-${Date.now().toString(36).toUpperCase()}-${random}`
}

async function getBookingQuote({ eventId, seatNumbers, userId, session }) {
  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    throw new ApiError(400, 'Invalid event id')
  }

  const query = Event.findById(eventId)
  const event = session ? await query.session(session) : await query
  if (!event) {
    throw new ApiError(404, 'Event not found')
  }

  ensureEventIsBookable(event)

  const uniqueSeatNumbers = [...new Set(seatNumbers)]
  const selectedSeats = uniqueSeatNumbers.map((seatNumber) => {
    const seat = event.seats.find((item) => item.number === seatNumber)

    if (!seat) {
      throw new ApiError(404, `Seat not found: ${seatNumber}`)
    }

    if (seat.status !== 'available') {
      throw new ApiError(409, `Seat is not available: ${seatNumber}`)
    }

    return seat
  })

  const lockOwners = await Promise.all(
    uniqueSeatNumbers.map(async (seatNumber) => ({
      seatNumber,
      owner: await getSeatLockOwner({ eventId, seatNumber }),
    })),
  )

  const missingLock = lockOwners.find((lock) => lock.owner !== String(userId))
  if (missingLock) {
    throw new ApiError(409, `Seat lock expired or belongs to another user: ${missingLock.seatNumber}`)
  }

  const subtotal = selectedSeats.reduce((total, seat) => total + seat.price, 0)
  const fees = selectedSeats.length ? 99 : 0
  const total = subtotal + fees

  return {
    event,
    uniqueSeatNumbers,
    selectedSeats,
    amount: {
      subtotal,
      fees,
      total,
      currency: env.RAZORPAY_CURRENCY,
    },
  }
}

function buildRazorpayReceipt(userId) {
  return `rcpt_${Date.now().toString(36)}_${String(userId).slice(-8)}`.slice(0, 40)
}

async function createBookingOrder(req, res, next) {
  try {
    const { eventId, seatNumbers } = req.body
    const razorpay = requireRazorpay()
    const quote = await getBookingQuote({
      eventId,
      seatNumbers,
      userId: req.user._id,
    })
    const amountInSubunits = toRazorpayAmount(quote.amount.total)

    if (amountInSubunits <= 0) {
      throw new ApiError(400, 'Booking amount must be greater than zero')
    }

    const order = await razorpay.orders.create({
      amount: amountInSubunits,
      currency: quote.amount.currency,
      receipt: buildRazorpayReceipt(req.user._id),
      notes: {
        eventId: String(quote.event._id),
        userId: String(req.user._id),
        seatNumbers: quote.uniqueSeatNumbers.join(','),
      },
    })

    res.status(201).json({
      success: true,
      message: 'Payment order created successfully',
      payment: {
        provider: 'razorpay',
        keyId: env.RAZORPAY_KEY_ID,
        businessName: env.RAZORPAY_BUSINESS_NAME,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
      },
      booking: {
        eventId: String(quote.event._id),
        seatNumbers: quote.uniqueSeatNumbers,
        amount: quote.amount,
      },
      user: {
        name: req.user.name,
        email: req.user.email,
      },
    })
  } catch (error) {
    next(error)
  }
}

async function verifyPaymentAndCreateBooking(req, res, next) {
  const session = await mongoose.startSession()

  try {
    const {
      eventId,
      seatNumbers,
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: razorpaySignature,
    } = req.body
    const razorpay = requireRazorpay()

    const existingBooking = await Booking.findOne({
      'payment.razorpayPaymentId': razorpayPaymentId,
      user: req.user._id,
    }).populate('event')

    if (existingBooking) {
      return res.status(200).json({
        success: true,
        message: 'Booking already confirmed',
        booking: existingBooking,
      })
    }

    const order = await razorpay.orders.fetch(razorpayOrderId)
    if (!order || order.id !== razorpayOrderId) {
      throw new ApiError(400, 'Invalid Razorpay order')
    }

    if (order.notes?.eventId !== String(eventId) || order.notes?.userId !== String(req.user._id)) {
      throw new ApiError(400, 'Payment order does not match this booking')
    }

    const uniqueSeatNumbers = [...new Set(seatNumbers)]
    if (order.notes?.seatNumbers !== uniqueSeatNumbers.join(',')) {
      throw new ApiError(400, 'Payment order seats do not match this booking')
    }

    const isValidSignature = verifyPaymentSignature({
      orderId: order.id,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature,
    })

    if (!isValidSignature) {
      throw new ApiError(400, 'Invalid payment signature')
    }

    const payment = await razorpay.payments.fetch(razorpayPaymentId)
    if (!payment || payment.order_id !== order.id) {
      throw new ApiError(400, 'Payment does not match this order')
    }

    if (payment.status !== 'captured') {
      throw new ApiError(409, 'Payment is not captured yet')
    }

    await session.withTransaction(async () => {
      const quote = await getBookingQuote({
        eventId,
        seatNumbers,
        userId: req.user._id,
        session,
      })

      const amountInSubunits = toRazorpayAmount(quote.amount.total)
      if (order.amount !== amountInSubunits || payment.amount !== amountInSubunits) {
        throw new ApiError(400, 'Payment amount does not match this booking')
      }

      if (order.currency !== quote.amount.currency || payment.currency !== quote.amount.currency) {
        throw new ApiError(400, 'Payment currency does not match this booking')
      }

      const seatUpdate = await Event.updateOne(
        {
          _id: quote.event._id,
          status: 'published',
          startsAt: { $gt: new Date() },
          $and: quote.uniqueSeatNumbers.map((seatNumber) => ({
            seats: {
              $elemMatch: {
                number: seatNumber,
                status: 'available',
              },
            },
          })),
        },
        {
          $set: {
            'seats.$[seat].status': 'booked',
          },
          $inc: {
            availableSeats: -uniqueSeatNumbers.length,
          },
        },
        {
          arrayFilters: [
            {
              'seat.number': { $in: quote.uniqueSeatNumbers },
              'seat.status': 'available',
            },
          ],
          session,
        },
      )

      if (seatUpdate.modifiedCount !== 1) {
        throw new ApiError(409, 'One or more seats are no longer available')
      }

      const bookingCode = generateBookingCode()
      const qrCode = await generateQR({
        bookingCode,
        userId: req.user._id,
        eventId: quote.event._id,
        seats: quote.uniqueSeatNumbers,
      })

      const [booking] = await Booking.create(
        [
          {
            bookingCode,
            user: req.user._id,
            event: quote.event._id,
            seats: quote.selectedSeats.map((seat) => ({
              number: seat.number,
              section: seat.section,
              price: seat.price,
            })),
            amount: quote.amount,
            status: 'confirmed',
            paymentStatus: 'paid',
            payment: {
              provider: 'razorpay',
              razorpayOrderId,
              razorpayPaymentId,
              razorpaySignature,
              paidAt: new Date(),
            },
            qrCode,
            confirmedAt: new Date(),
          },
        ],
        { session },
      )

      await booking.populate('event')

      req.bookedSeatNumbers = quote.uniqueSeatNumbers
      req.createdBooking = booking
    })

    if (req.bookedSeatNumbers?.length) {
      deleteCachePattern('events:public:*').catch((error) => {
        console.warn('Event cache cleanup failed:', error.message)
      })

      releaseSeatsForUser({
        eventId,
        seatNumbers: req.bookedSeatNumbers,
        userId: req.user._id,
      }).catch((error) => {
        console.warn('Seat lock cleanup failed:', error.message)
      })
    }

    res.status(201).json({
      success: true,
      message: 'Booking confirmed successfully',
      booking: req.createdBooking,
    })

    sendBookingConfirmation(req.user, req.createdBooking).catch((error) => {
      console.warn('Booking confirmation email failed:', error.message)
    })
  } catch (error) {
    next(error)
  } finally {
    await session.endSession()
  }
}

async function sendBookingConfirmation(user, booking) {
  const event = booking.event
  const seatNumbers = booking.seats.map((seat) => seat.number).join(', ')
  const total = `${booking.amount.currency} ${booking.amount.total.toLocaleString('en-IN')}`

  await sendEmail({
    to: user.email,
    subject: `Booking confirmed: ${event.title}`,
    text: `Your booking ${booking.bookingCode} is confirmed for ${event.title}. Seats: ${seatNumbers}. Total: ${total}.`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #111827;">
        <h2>Booking confirmed</h2>
        <p>Hello ${user.name},</p>
        <p>Your booking for <strong>${event.title}</strong> is confirmed.</p>
        <p><strong>Booking code:</strong> ${booking.bookingCode}</p>
        <p><strong>Seats:</strong> ${seatNumbers}</p>
        <p><strong>Total:</strong> ${total}</p>
        <p>You can view your QR ticket from My Bookings.</p>
      </div>
    `,
  })
}

async function getMyBookings(req, res, next) {
  try {
    const { page = 1, limit = 20 } = req.query
    const pageNumber = Math.max(Number(page), 1)
    const pageSize = Math.min(Math.max(Number(limit), 1), 100)
    const [bookings, total] = await Promise.all([
      Booking.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .skip((pageNumber - 1) * pageSize)
        .limit(pageSize)
        .populate('event'),
      Booking.countDocuments({ user: req.user._id }),
    ])

    res.status(200).json({
      success: true,
      message: 'Bookings fetched successfully',
      bookings,
      pagination: {
        page: pageNumber,
        limit: pageSize,
        total,
        pages: Math.ceil(total / pageSize),
      },
    })
  } catch (error) {
    next(error)
  }
}

async function cancelBooking(req, res, next) {
  try {
    const { bookingId } = req.params

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      throw new ApiError(400, 'Invalid booking id')
    }

    const booking = await Booking.findOne({ _id: bookingId, user: req.user._id }).populate('event')
    if (!booking) {
      throw new ApiError(404, 'Booking not found')
    }

    if (booking.status !== 'confirmed') {
      throw new ApiError(400, 'Only confirmed bookings can be cancelled')
    }

    if (booking.event?.startsAt && booking.event.startsAt <= new Date()) {
      throw new ApiError(400, 'Past or started event bookings cannot be cancelled')
    }

    const seatNumbers = booking.seats.map((seat) => seat.number)

    if (booking.event?._id && seatNumbers.length) {
      await Event.updateOne(
        { _id: booking.event._id },
        {
          $set: {
            'seats.$[seat].status': 'available',
          },
          $inc: {
            availableSeats: seatNumbers.length,
          },
        },
        {
          arrayFilters: [
            {
              'seat.number': { $in: seatNumbers },
              'seat.status': 'booked',
            },
          ],
        },
      )
      await deleteCachePattern('events:public:*').catch(() => null)
    }

    booking.status = 'cancelled'
    booking.paymentStatus = booking.paymentStatus === 'paid' ? 'refunded' : booking.paymentStatus
    booking.cancelledAt = new Date()
    await booking.save()

    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully',
      booking,
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  cancelBooking,
  createBookingOrder,
  getMyBookings,
  lockSeatForBooking,
  releaseSeatLock,
  verifyPaymentAndCreateBooking,
}
