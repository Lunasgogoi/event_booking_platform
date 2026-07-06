const User = require('../models/User')
const ApiError = require('../utils/ApiError')
const generateToken = require('../utils/generateToken')
const env = require('../config/env')

function cookieOptions() {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: env.COOKIE_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
  }
}

function sendAuthResponse(res, statusCode, user) {
  const token = generateToken(user._id)

  res.cookie('token', token, cookieOptions())

  res.status(statusCode).json({
    success: true,
    message: statusCode === 201 ? 'Registered successfully' : 'Logged in successfully',
    token,
    user,
  })
}

async function register(req, res, next) {
  try {
    const { name, email, password } = req.body

    const existingUser = await User.findOne({ email })
    if (existingUser) {
      throw new ApiError(409, 'Email is already registered')
    }

    const user = await User.create({ name, email, password })
    sendAuthResponse(res, 201, user)
  } catch (error) {
    next(error)
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body

    const user = await User.findOne({ email }).select('+password')
    if (!user || !(await user.comparePassword(password))) {
      throw new ApiError(401, 'Invalid email or password')
    }

    if (!user.isActive) {
      throw new ApiError(403, 'Your account is inactive')
    }

    user.lastLoginAt = new Date()
    await user.save({ validateBeforeSave: false })

    sendAuthResponse(res, 200, user)
  } catch (error) {
    next(error)
  }
}

function logout(req, res) {
  res.clearCookie('token', cookieOptions())
  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  })
}

function getMe(req, res) {
  res.status(200).json({
    success: true,
    message: 'Current user fetched successfully',
    user: req.user,
  })
}

module.exports = {
  register,
  login,
  logout,
  getMe,
}
