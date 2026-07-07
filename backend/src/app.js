const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const helmet = require('helmet')
const morgan = require('morgan')
const env = require('./config/env')
const adminRoutes = require('./routes/adminRoutes')
const authRoutes = require('./routes/authRoutes')
const bookingRoutes = require('./routes/bookingRoutes')
const contactRoutes = require('./routes/contactRoutes')
const eventRoutes = require('./routes/eventRoutes')
const { errorHandler, notFound } = require('./middlewares/errorMiddleware')

const app = express()
const allowedOrigins = new Set([env.CLIENT_URL, ...(env.CLIENT_URLS || [])])

if (env.NODE_ENV === 'production') {
  app.set('trust proxy', 1)
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true)
      }

      const error = new Error('Not allowed by CORS')
      error.statusCode = 403
      return callback(error)
    },
    credentials: true,
  }),
)
app.use(helmet())
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

if (env.NODE_ENV === 'development') {
  app.use(morgan('dev'))
}

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is running',
    environment: env.NODE_ENV,
  })
})

app.use('/api/auth', authRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/events', eventRoutes)
app.use('/api/bookings', bookingRoutes)
app.use('/api/contact', contactRoutes)

app.use(notFound)
app.use(errorHandler)

module.exports = app
