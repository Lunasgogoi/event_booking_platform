const { z } = require('zod')

const seatLockSchema = z.object({
  eventId: z.string().trim().min(1, 'Event id is required'),
  seatNumber: z.string().trim().min(1, 'Seat number is required'),
})

const createBookingSchema = z.object({
  eventId: z.string().trim().min(1, 'Event id is required'),
  seatNumbers: z.array(z.string().trim().min(1)).min(1, 'Select at least one seat').max(20),
})

module.exports = {
  createBookingSchema,
  seatLockSchema,
}
