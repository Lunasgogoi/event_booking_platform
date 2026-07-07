const User = require('../models/User')
const ApiError = require('../utils/ApiError')
const generateToken = require('../utils/generateToken')
const env = require('../config/env')
const { deleteAsset, uploadBuffer } = require('../services/cloudinaryService')
const { sendEmail } = require('../services/emailService')

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

async function requestOrganizerAccess(req, res, next) {
  try {
    const { organizationName, contactEmail, phone, city, website, eventTypes, message } = req.body
    const status = req.user.organizerProfile?.status || 'none'

    if (req.user.role === 'admin') {
      throw new ApiError(400, 'Admin accounts do not need organizer access')
    }

    if (status === 'pending') {
      throw new ApiError(409, 'Organizer access request is already pending')
    }

    if (status === 'approved') {
      throw new ApiError(409, 'Organizer access is already approved')
    }

    if (status === 'suspended') {
      throw new ApiError(403, 'Organizer access is suspended')
    }

    req.user.organizerProfile = {
      ...req.user.organizerProfile,
      status: 'pending',
      organizationName,
      contactEmail: contactEmail || req.user.email,
      phone,
      city,
      website,
      eventTypes,
      message,
      requestedAt: new Date(),
      reviewedAt: undefined,
      reviewedBy: undefined,
      reviewNote: '',
    }
    await req.user.save({ validateBeforeSave: false })

    await Promise.all([
      sendEmail({
        to: req.user.email,
        subject: 'Organizer request received',
        text: `Hi ${req.user.name}, your organizer access request for ${organizationName} has been received and is pending admin review.`,
        html: `<p>Hi ${req.user.name},</p><p>Your organizer access request for <strong>${organizationName}</strong> has been received and is pending admin review.</p>`,
      }),
      sendEmail({
        to: env.SUPPORT_EMAIL,
        subject: 'New organizer request',
        text: `${req.user.name} (${req.user.email}) requested organizer access for ${organizationName}.`,
        html: `<p><strong>${req.user.name}</strong> (${req.user.email}) requested organizer access for <strong>${organizationName}</strong>.</p>`,
      }),
    ])

    res.status(200).json({
      success: true,
      message: 'Organizer access request submitted successfully',
      user: req.user,
    })
  } catch (error) {
    next(error)
  }
}

async function updateMe(req, res, next) {
  try {
    const { name, email } = req.body

    if (email !== req.user.email) {
      const existingUser = await User.findOne({ email })
      if (existingUser && String(existingUser._id) !== String(req.user._id)) {
        throw new ApiError(409, 'Email is already registered')
      }
    }

    req.user.name = name
    req.user.email = email
    await req.user.save()

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: req.user,
    })
  } catch (error) {
    next(error)
  }
}

async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body
    const user = await User.findById(req.user._id).select('+password')

    if (!user || !(await user.comparePassword(currentPassword))) {
      throw new ApiError(401, 'Current password is incorrect')
    }

    user.password = newPassword
    await user.save()

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    })
  } catch (error) {
    next(error)
  }
}

async function updateAvatar(req, res, next) {
  try {
    if (!req.file) {
      throw new ApiError(400, 'Avatar image is required')
    }

    const result = await uploadBuffer(req.file.buffer, {
      transformation: [
        { width: 320, height: 320, crop: 'fill', gravity: 'auto' },
        { quality: 'auto', fetch_format: 'auto' },
      ],
    })
    const previousAvatarPublicId = req.user.avatar?.publicId

    req.user.avatar = {
      url: result.secure_url,
      publicId: result.public_id,
    }
    await req.user.save({ validateBeforeSave: false })
    await deleteAsset(previousAvatarPublicId)

    res.status(200).json({
      success: true,
      message: 'Avatar updated successfully',
      user: req.user,
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  changePassword,
  register,
  login,
  logout,
  getMe,
  requestOrganizerAccess,
  updateAvatar,
  updateMe,
}
