const jwt = require('jsonwebtoken')
const User = require('../models/User')
const ApiError = require('../utils/ApiError')
const env = require('../config/env')

async function protect(req, res, next) {
  try {
    let token = req.cookies?.token

    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1]
    }

    if (!token) {
      throw new ApiError(401, 'Authentication required')
    }

    const decoded = jwt.verify(token, env.JWT_SECRET)
    const user = await User.findById(decoded.id)

    if (!user || !user.isActive) {
      throw new ApiError(401, 'User no longer exists or is inactive')
    }

    req.user = user
    next()
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return next(new ApiError(401, 'Invalid or expired token'))
    }

    next(error)
  }
}

module.exports = {
  protect,
}
