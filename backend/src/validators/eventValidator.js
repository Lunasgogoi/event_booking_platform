const { z } = require('zod')

const categorySchema = z.enum(['Music', 'Comedy', 'Business', 'Sports', 'Food', 'Arts', 'Technology', 'Other'])
const statusSchema = z.enum(['draft', 'submitted', 'under_review', 'changes_requested', 'approved', 'rejected', 'published', 'cancelled', 'completed'])

const seatSchema = z.object({
  number: z.string().trim().min(1).max(20),
  section: z.string().trim().min(1).max(80).default('General'),
  price: z.coerce.number().min(0),
  status: z.enum(['available', 'booked', 'blocked']).default('available'),
})

const eventSectionSchema = z.object({
  name: z.string().trim().min(2).max(80),
  code: z.string().trim().min(1).max(8).regex(/^[a-z0-9]+$/i, 'Section code must contain only letters and numbers').transform((value) => value.toUpperCase()),
  selectionMode: z.enum(['choose_seat', 'auto_assign']),
  rows: z.coerce.number().int().min(1).max(100),
  seatsPerRow: z.coerce.number().int().min(1).max(200),
  price: z.coerce.number().min(0),
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
  totalSeats: z.coerce.number().int().positive().max(20000),
  seats: z.array(seatSchema).optional(),
  seatingMode: z.enum(['single', 'sections']).optional(),
  sections: z.array(eventSectionSchema).max(20).optional(),
  status: statusSchema.optional(),
})

function validateEventConfiguration(data, context) {
  if (data.endsAt && data.startsAt && data.endsAt <= data.startsAt) {
    context.addIssue({
      code: 'custom',
      path: ['endsAt'],
      message: 'End date must be after start date',
    })
  }

  if (data.seatingMode !== 'sections') return

  if (!data.sections?.length) {
    context.addIssue({
      code: 'custom',
      path: ['sections'],
      message: 'Add at least one seating section',
    })
    return
  }

  const codes = data.sections.map((section) => section.code)
  if (new Set(codes).size !== codes.length) {
    context.addIssue({
      code: 'custom',
      path: ['sections'],
      message: 'Section codes must be unique',
    })
  }

  const configuredSeats = data.sections.reduce(
    (total, section) => total + section.rows * section.seatsPerRow,
    0,
  )
  if (configuredSeats > 20000) {
    context.addIssue({
      code: 'custom',
      path: ['sections'],
      message: 'Section capacity cannot exceed 20,000 seats',
    })
  }
}

const createEventSchema = eventPayloadSchema.superRefine(validateEventConfiguration)

const updateEventSchema = eventPayloadSchema
  .partial()
  .superRefine(validateEventConfiguration)

const reviewEventSchema = z.object({
  status: z.enum(['under_review', 'approved', 'rejected', 'changes_requested']),
  reviewNote: z.string().trim().max(1000).optional().default(''),
})

const updateEventPreviewSchema = z.object({
  enabled: z.boolean(),
})

module.exports = {
  createEventSchema,
  reviewEventSchema,
  updateEventPreviewSchema,
  updateEventSchema,
}
