const { z } = require('zod')

const categorySchema = z.enum(['Music', 'Comedy', 'Business', 'Sports', 'Food', 'Arts', 'Technology', 'Other'])
const statusSchema = z.enum(['draft', 'submitted', 'under_review', 'changes_requested', 'approved', 'rejected', 'published', 'cancelled', 'completed'])

const seatSchema = z.object({
  number: z.string().trim().min(1).max(20),
  section: z.string().trim().min(1).max(80).default('General'),
  price: z.coerce.number().min(0),
  status: z.enum(['available', 'booked', 'blocked']).default('available'),
})

const eventPayloadSchema = z.object({
  title: z.string().trim().min(3).max(140),
  description: z.string().trim().min(20).max(5000),
  category: categorySchema,
  venue: z.object({
    name: z.string().trim().min(2).max(140),
    address: z.string().trim().min(5).max(240),
    city: z.string().trim().min(2).max(80),
  }),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date().optional(),
  poster: z
    .object({
      url: z.string().url().optional(),
      publicId: z.string().trim().optional(),
    })
    .optional(),
  priceFrom: z.coerce.number().min(0),
  totalSeats: z.coerce.number().int().positive().max(5000),
  seats: z.array(seatSchema).optional(),
  status: statusSchema.default('draft'),
})

const createEventSchema = eventPayloadSchema.refine(
  (data) => !data.endsAt || data.endsAt > data.startsAt,
  {
    path: ['endsAt'],
    message: 'End date must be after start date',
  },
)

const updateEventSchema = eventPayloadSchema
  .partial()
  .refine((data) => !data.endsAt || !data.startsAt || data.endsAt > data.startsAt, {
    path: ['endsAt'],
    message: 'End date must be after start date',
  })

const reviewEventSchema = z.object({
  status: z.enum(['under_review', 'approved', 'rejected', 'changes_requested']),
  reviewNote: z.string().trim().max(1000).optional().default(''),
})

module.exports = {
  createEventSchema,
  reviewEventSchema,
  updateEventSchema,
}
