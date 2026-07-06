const path = require('path')
const dotenv = require('dotenv')
const { z } = require('zod')

dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const optionalString = z.preprocess((value) => (value === '' ? undefined : value), z.string().optional())

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),

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

module.exports = env
