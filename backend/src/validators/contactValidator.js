const { z } = require('zod')

const contactCategories = ['booking', 'event', 'account', 'payment', 'organizer', 'other']

const createContactMessageSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  category: z.enum(contactCategories).default('other'),
  subject: z.string().trim().min(4, 'Subject must be at least 4 characters').max(120),
  message: z.string().trim().min(10, 'Message must be at least 10 characters').max(2000),
})

const updateContactMessageStatusSchema = z.object({
  status: z.enum(['new', 'in_progress', 'resolved']),
})

module.exports = {
  contactCategories,
  createContactMessageSchema,
  updateContactMessageStatusSchema,
}
