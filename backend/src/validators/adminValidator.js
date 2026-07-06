const { z } = require('zod')

const updateUserRoleSchema = z.object({
  role: z.enum(['user', 'admin']),
})

const updateUserStatusSchema = z.object({
  isActive: z.boolean(),
})

module.exports = {
  updateUserRoleSchema,
  updateUserStatusSchema,
}
