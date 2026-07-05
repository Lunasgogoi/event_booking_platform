const Booking = require('../models/Booking')
const Event = require('../models/Event')
const User = require('../models/User')

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

module.exports = {
  getDashboardStats,
}
