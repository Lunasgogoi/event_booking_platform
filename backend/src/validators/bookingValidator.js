const { z } = require('zod')

const seatLockSchema = z.object({
  eventId: z.string().trim().min(1, 'Event id is required'),
  seatNumber: z.string().trim().min(1, 'Seat number is required'),
})

const createBookingSchema = z.object({
  eventId: z.string().trim().min(1, 'Event id is required'),
  seatNumbers: z.array(z.string().trim().min(1)).min(1, 'Select at least one seat').max(20),
})

const autoAssignSeatsSchema = z.object({
  eventId: z.string().trim().min(1, 'Event id is required'),
  sectionCode: z.string().trim().min(1, 'Section is required').max(8),
  quantity: z.coerce.number().int().min(1).max(10),
})

const verifyPaymentSchema = createBookingSchema.extend({
  razorpay_order_id: z.string().trim().min(1, 'Razorpay order id is required'),
  razorpay_payment_id: z.string().trim().min(1, 'Razorpay payment id is required'),
  razorpay_signature: z.string().trim().min(1, 'Razorpay signature is required'),
})

module.exports = {
  autoAssignSeatsSchema,
  createBookingSchema,
  seatLockSchema,
  verifyPaymentSchema,
}
