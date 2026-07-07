const path = require('path')
const dotenv = require('dotenv')
const { z } = require('zod')

dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const optionalString = z.preprocess((value) => (value === '' ? undefined : value), z.string().optional())
const optionalUrlList = z.preprocess((value) => {
  if (typeof value !== 'string' || value.trim() === '') return undefined
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}, z.array(z.string().url()).optional())

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  CLIENT_URLS: optionalUrlList,

  MONGO_URI: z.string().min(1).default('mongodb://127.0.0.1:27017/event_booking_platform'),

  JWT_SECRET: z.string().min(16).default('replace_with_a_long_random_secret'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  COOKIE_EXPIRES_DAYS: z.coerce.number().int().positive().default(7),
  SEED_ADMIN_NAME: z.string().default('Admin User'),
  SEED_ADMIN_EMAIL: optionalString,
  SEED_ADMIN_PASSWORD: optionalString,

  REDIS_URL: z.string().min(1).default('redis://127.0.0.1:6379'),
  SEAT_LOCK_TTL_SECONDS: z.coerce.number().int().positive().default(600),
  CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(300),

  CLOUDINARY_CLOUD_NAME: optionalString,
  CLOUDINARY_API_KEY: optionalString,
  CLOUDINARY_API_SECRET: optionalString,
  CLOUDINARY_FOLDER: z.string().default('event-booking-platform'),

  EMAIL_HOST: optionalString,
  EMAIL_PORT: z.coerce.number().int().positive().default(587),
  EMAIL_USER: optionalString,
  EMAIL_PASS: optionalString,
  EMAIL_FROM: z.string().default('Ticketo <no-reply@example.com>'),
  SUPPORT_EMAIL: z.string().email().default('support@ticketo.events'),

  RAZORPAY_KEY_ID: optionalString,
  RAZORPAY_KEY_SECRET: optionalString,
  RAZORPAY_CURRENCY: z.string().length(3).default('INR'),
  RAZORPAY_BUSINESS_NAME: z.string().default('Ticketo'),

  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  BOOKING_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60 * 1000),
  BOOKING_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(5),

  MULTER_FILE_SIZE_MB: z.coerce.number().int().positive().default(5),
  QR_CODE_BASE_URL: z.string().url().default('http://localhost:5173/tickets'),
})

const parsedEnv = envSchema.safeParse(process.env)

if (!parsedEnv.success) {
  const errors = parsedEnv.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('\n')
  throw new Error(`Invalid environment variables:\n${errors}`)
}

const env = parsedEnv.data

if (env.NODE_ENV === 'production' && env.JWT_SECRET === 'replace_with_a_long_random_secret') {
  throw new Error('JWT_SECRET must be changed in production')
}

if (env.NODE_ENV === 'production' && (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET)) {
  throw new Error('Razorpay credentials must be configured in production')
}

const localServicePattern = /localhost|127\.0\.0\.1/

if (env.NODE_ENV === 'production' && localServicePattern.test(env.MONGO_URI)) {
  throw new Error('MONGO_URI must point to a production database')
}

if (env.NODE_ENV === 'production' && localServicePattern.test(env.REDIS_URL)) {
  throw new Error('REDIS_URL must point to a production Redis instance')
}

if (env.NODE_ENV === 'production' && localServicePattern.test(env.CLIENT_URL)) {
  throw new Error('CLIENT_URL must point to the deployed frontend URL')
}

if (env.NODE_ENV === 'production' && localServicePattern.test(env.QR_CODE_BASE_URL)) {
  throw new Error('QR_CODE_BASE_URL must point to the deployed frontend ticket URL')
}

module.exports = env
