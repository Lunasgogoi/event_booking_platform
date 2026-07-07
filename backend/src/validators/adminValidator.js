const { z } = require('zod')

const updateUserRoleSchema = z.object({
  role: z.enum(['user', 'organizer', 'admin']),
})

const updateUserStatusSchema = z.object({
  isActive: z.boolean(),
})

const reviewOrganizerRequestSchema = z.object({
  status: z.enum(['approved', 'rejected', 'suspended']),
  reviewNote: z.string().trim().max(1000).optional().default(''),
})

module.exports = {
  reviewOrganizerRequestSchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
}
