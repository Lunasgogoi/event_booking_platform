const mongoose = require('mongoose')
const Booking = require('../models/Booking')
const ContactMessage = require('../models/ContactMessage')
const Event = require('../models/Event')
const User = require('../models/User')
const ApiError = require('../utils/ApiError')

function ensureObjectId(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid user id')
  }
}

function isSelf(req, userId) {
  return String(req.user._id) === String(userId)
}

async function getDashboardStats(req, res, next) {
  try {
    const [
      totalRevenueResult,
      bookingCount,
      activeUsers,
      eventCounts,
      fillRateResult,
      eventPerformance,
      recentBookings,
      newSupportMessages,
    ] = await Promise.all([
      Booking.aggregate([
        { $match: { status: 'confirmed' } },
        { $group: { _id: null, total: { $sum: '$amount.total' } } },
      ]),
      Booking.countDocuments({ status: 'confirmed' }),
      User.countDocuments({ isActive: true }),
      Event.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Event.aggregate([
        {
          $group: {
            _id: null,
            totalSeats: { $sum: '$totalSeats' },
            availableSeats: { $sum: '$availableSeats' },
          },
        },
      ]),
      Booking.aggregate([
        { $match: { status: 'confirmed' } },
        {
          $group: {
            _id: '$event',
            bookings: { $sum: 1 },
            revenue: { $sum: '$amount.total' },
            tickets: { $sum: { $size: '$seats' } },
          },
        },
        {
          $lookup: {
            from: 'events',
            localField: '_id',
            foreignField: '_id',
            as: 'event',
          },
        },
        { $unwind: '$event' },
        {
          $project: {
            title: '$event.title',
            category: '$event.category',
            city: '$event.venue.city',
            totalSeats: '$event.totalSeats',
            availableSeats: '$event.availableSeats',
            bookings: 1,
            revenue: 1,
            tickets: 1,
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 5 },
      ]),
      Booking.find({ status: 'confirmed' })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('user', 'name email')
        .populate('event', 'title'),
      ContactMessage.countDocuments({ status: 'new' }),
    ])

    const counts = eventCounts.reduce(
      (acc, item) => ({
        ...acc,
        [item._id]: item.count,
      }),
      {},
    )
    const fillTotals = fillRateResult[0] || { totalSeats: 0, availableSeats: 0 }
    const bookedSeats = fillTotals.totalSeats - fillTotals.availableSeats
    const fillRate = fillTotals.totalSeats ? Math.round((bookedSeats / fillTotals.totalSeats) * 100) : 0

    res.status(200).json({
      success: true,
      message: 'Dashboard stats fetched successfully',
      stats: {
        revenue: totalRevenueResult[0]?.total || 0,
        bookings: bookingCount,
        activeUsers,
        fillRate,
        events: {
          total: Object.values(counts).reduce((total, count) => total + count, 0),
          draft: counts.draft || 0,
          published: counts.published || 0,
          cancelled: counts.cancelled || 0,
          completed: counts.completed || 0,
        },
        supportMessages: {
          new: newSupportMessages,
        },
      },
      eventPerformance: eventPerformance.map((item) => ({
        id: item._id,
        title: item.title,
        category: item.category,
        city: item.city,
        bookings: item.bookings,
        tickets: item.tickets,
        revenue: item.revenue,
        sold: item.totalSeats ? Math.round(((item.totalSeats - item.availableSeats) / item.totalSeats) * 100) : 0,
      })),
      recentBookings: recentBookings.map((booking) => ({
        id: booking._id,
        bookingCode: booking.bookingCode,
        user: booking.user,
        event: booking.event,
        total: booking.amount.total,
        status: booking.status,
        createdAt: booking.createdAt,
      })),
    })
  } catch (error) {
    next(error)
  }
}

async function getContactMessages(req, res, next) {
  try {
    const { status, page = 1, limit = 20 } = req.query
    const query = {}

    if (status) query.status = status

    const pageNumber = Math.max(Number(page), 1)
    const pageSize = Math.min(Math.max(Number(limit), 1), 100)

    const [messages, total] = await Promise.all([
      ContactMessage.find(query)
        .sort({ createdAt: -1 })
        .skip((pageNumber - 1) * pageSize)
        .limit(pageSize),
      ContactMessage.countDocuments(query),
    ])

    res.status(200).json({
      success: true,
      message: 'Contact messages fetched successfully',
      contactMessages: messages,
      pagination: {
        page: pageNumber,
        limit: pageSize,
        total,
        pages: Math.ceil(total / pageSize),
      },
    })
  } catch (error) {
    next(error)
  }
}

async function updateContactMessageStatus(req, res, next) {
  try {
    const { messageId } = req.params
    const { status } = req.body

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      throw new ApiError(400, 'Invalid contact message id')
    }

    const contactMessage = await ContactMessage.findByIdAndUpdate(
      messageId,
      { status },
      { returnDocument: 'after', runValidators: true },
    )

    if (!contactMessage) {
      throw new ApiError(404, 'Contact message not found')
    }

    res.status(200).json({
      success: true,
      message: 'Contact message updated successfully',
      contactMessage,
    })
  } catch (error) {
    next(error)
  }
}

async function getUsers(req, res, next) {
  try {
    const { search, role, status, page = 1, limit = 20 } = req.query
    const query = {}

    if (role) query.role = role
    if (status === 'active') query.isActive = true
    if (status === 'inactive') query.isActive = false
    if (search?.trim()) {
      const escapedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const searchRegex = new RegExp(escapedSearch, 'i')
      query.$or = [{ name: searchRegex }, { email: searchRegex }]
    }

    const pageNumber = Math.max(Number(page), 1)
    const pageSize = Math.min(Math.max(Number(limit), 1), 100)

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip((pageNumber - 1) * pageSize)
        .limit(pageSize),
      User.countDocuments(query),
    ])

    res.status(200).json({
      success: true,
      message: 'Users fetched successfully',
      users,
      pagination: {
        page: pageNumber,
        limit: pageSize,
        total,
        pages: Math.ceil(total / pageSize),
      },
    })
  } catch (error) {
    next(error)
  }
}

async function updateUserRole(req, res, next) {
  try {
    const { userId } = req.params
    const { role } = req.body
    ensureObjectId(userId)

    if (isSelf(req, userId) && role !== 'admin') {
      throw new ApiError(400, 'You cannot remove your own admin role')
    }

    const user = await User.findByIdAndUpdate(userId, { role }, { returnDocument: 'after', runValidators: true }).select('-password')
    if (!user) {
      throw new ApiError(404, 'User not found')
    }

    res.status(200).json({
      success: true,
      message: 'User role updated successfully',
      user,
    })
  } catch (error) {
    next(error)
  }
}

async function updateUserStatus(req, res, next) {
  try {
    const { userId } = req.params
    const { isActive } = req.body
    ensureObjectId(userId)

    if (isSelf(req, userId) && !isActive) {
      throw new ApiError(400, 'You cannot deactivate your own account')
    }

    const user = await User.findByIdAndUpdate(userId, { isActive }, { returnDocument: 'after', runValidators: true }).select('-password')
    if (!user) {
      throw new ApiError(404, 'User not found')
    }

    res.status(200).json({
      success: true,
      message: 'User status updated successfully',
      user,
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  getContactMessages,
  getDashboardStats,
  getUsers,
  updateContactMessageStatus,
  updateUserRole,
  updateUserStatus,
}
