const env = require('../config/env')

function notFound(req, res, next) {
  const error = new Error(`Route not found: ${req.originalUrl}`)
  error.statusCode = 404
  next(error)
}

function errorHandler(error, req, res, next) {
  let statusCode = error.statusCode || 500
  let message = error.message || 'Internal server error'
  let errors = error.errors

  if (error.name === 'CastError') {
    statusCode = 400
    message = 'Invalid resource id'
  }

  if (error.code === 11000) {
    statusCode = 409
    const field = Object.keys(error.keyValue || {})[0] || 'field'
    message = `${field} already exists`
  }

  if (error.name === 'ValidationError') {
    statusCode = 400
    errors = Object.values(error.errors).map((item) => ({
      field: item.path,
      message: item.message,
    }))
    message = 'Validation failed'
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors: errors || [],
    stack: env.NODE_ENV === 'production' ? undefined : error.stack,
  })
}

module.exports = {
  notFound,
  errorHandler,
}
