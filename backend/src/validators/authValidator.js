const { z } = require('zod')

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
})

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

const updateProfileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
})

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters').max(128),
})

const requestOrganizerAccessSchema = z.object({
  organizationName: z.string().trim().min(2, 'Organization name must be at least 2 characters').max(120),
  contactEmail: z.string().trim().toLowerCase().email('Enter a valid contact email').optional(),
  phone: z.string().trim().max(30).optional().default(''),
  city: z.string().trim().max(80).optional().default(''),
  website: z.string().trim().url('Enter a valid website URL').or(z.literal('')).optional().default(''),
  eventTypes: z.array(z.string().trim().min(1).max(80)).max(8).optional().default([]),
  message: z.string().trim().max(1000).optional().default(''),
})

module.exports = {
  changePasswordSchema,
  registerSchema,
  loginSchema,
  requestOrganizerAccessSchema,
  updateProfileSchema,
}
