const mongoose = require('mongoose')
const Booking = require('../models/Booking')
const Event = require('../models/Event')
const ApiError = require('../utils/ApiError')
const generateQR = require('../utils/generateQR')
const { ensureEventIsBookable } = require('../utils/eventLifecycle')
const { sendEmail } = require('../services/emailService')
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

async function createBooking(req, res, next) {
  const session = await mongoose.startSession()

  try {
    const { eventId, seatNumbers } = req.body

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      throw new ApiError(400, 'Invalid event id')
    }

    await session.withTransaction(async () => {
      const event = await Event.findById(eventId).session(session)
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

      const missingLock = lockOwners.find((lock) => lock.owner !== String(req.user._id))
      if (missingLock) {
        throw new ApiError(409, `Seat lock expired or belongs to another user: ${missingLock.seatNumber}`)
      }

      const seatUpdate = await Event.updateOne(
        {
          _id: event._id,
          status: 'published',
          startsAt: { $gt: new Date() },
          $and: uniqueSeatNumbers.map((seatNumber) => ({
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
              'seat.number': { $in: uniqueSeatNumbers },
              'seat.status': 'available',
            },
          ],
          session,
        },
      )

      if (seatUpdate.modifiedCount !== 1) {
        throw new ApiError(409, 'One or more seats are no longer available')
      }

      const subtotal = selectedSeats.reduce((total, seat) => total + seat.price, 0)
      const fees = selectedSeats.length ? 99 : 0
      const bookingCode = generateBookingCode()
      const qrCode = await generateQR({
        bookingCode,
        userId: req.user._id,
        eventId: event._id,
        seats: uniqueSeatNumbers,
      })

      const [booking] = await Booking.create(
        [
          {
            bookingCode,
            user: req.user._id,
            event: event._id,
            seats: selectedSeats.map((seat) => ({
              number: seat.number,
              section: seat.section,
              price: seat.price,
            })),
            amount: {
              subtotal,
              fees,
              total: subtotal + fees,
            },
            status: 'confirmed',
            paymentStatus: 'not_required',
            qrCode,
            confirmedAt: new Date(),
          },
        ],
        { session },
      )

      await booking.populate('event')

      req.bookedSeatNumbers = uniqueSeatNumbers
      req.createdBooking = booking
    })

    if (req.bookedSeatNumbers?.length) {
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

module.exports = {
  createBooking,
  getMyBookings,
  lockSeatForBooking,
  releaseSeatLock,
}
