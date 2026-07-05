const mongoose = require('mongoose')
const Event = require('../models/Event')
const ApiError = require('../utils/ApiError')
const { deleteCache } = require('../services/cacheService')
const { deleteAsset, uploadBuffer } = require('../services/cloudinaryService')
const { getSeatLocks } = require('../services/seatLockService')

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
}

async function createUniqueSlug(title, eventId) {
  const baseSlug = slugify(title)
  let slug = baseSlug
  let suffix = 1

  while (await Event.exists({ slug, _id: { $ne: eventId } })) {
    slug = `${baseSlug}-${suffix}`
    suffix += 1
  }

  return slug
}

function buildSeats(totalSeats, priceFrom) {
  return Array.from({ length: totalSeats }, (_, index) => ({
    number: `G${index + 1}`,
    section: 'General',
    price: priceFrom,
    status: 'available',
  }))
}

function ensureObjectId(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid event id')
  }
}

async function clearEventCaches() {
  await deleteCache('events:published').catch(() => null)
}

async function createEvent(req, res, next) {
  try {
    const payload = req.body
    const seats = payload.seats?.length ? payload.seats : buildSeats(payload.totalSeats, payload.priceFrom)

    const event = await Event.create({
      ...payload,
      slug: await createUniqueSlug(payload.title),
      seats,
      totalSeats: seats.length,
      availableSeats: seats.filter((seat) => seat.status === 'available').length,
      createdBy: req.user._id,
    })

    await clearEventCaches()

    res.status(201).json({
      success: true,
      event,
    })
  } catch (error) {
    next(error)
  }
}

async function uploadEventPoster(req, res, next) {
  try {
    if (!req.file) {
      throw new ApiError(400, 'Poster image is required')
    }

    const result = await uploadBuffer(req.file.buffer, {
      transformation: [
        { width: 1200, height: 675, crop: 'fill', gravity: 'auto' },
        { quality: 'auto', fetch_format: 'auto' },
      ],
    })

    res.status(201).json({
      success: true,
      poster: {
        url: result.secure_url,
        publicId: result.public_id,
      },
    })
  } catch (error) {
    next(error)
  }
}

async function getPublishedEvents(req, res, next) {
  try {
    const { search, city, category, page = 1, limit = 12 } = req.query
    const query = { status: 'published', startsAt: { $gte: new Date() } }

    if (category) query.category = category
    if (city) query['venue.city'] = new RegExp(city, 'i')
    if (search) query.$text = { $search: search }

    const pageNumber = Math.max(Number(page), 1)
    const pageSize = Math.min(Math.max(Number(limit), 1), 50)

    const [events, total] = await Promise.all([
      Event.find(query)
        .sort({ startsAt: 1 })
        .skip((pageNumber - 1) * pageSize)
        .limit(pageSize)
        .populate('createdBy', 'name email'),
      Event.countDocuments(query),
    ])

    res.status(200).json({
      success: true,
      events,
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

async function getAdminEvents(req, res, next) {
  try {
    const events = await Event.find().sort({ createdAt: -1 }).populate('createdBy', 'name email')

    res.status(200).json({
      success: true,
      events,
    })
  } catch (error) {
    next(error)
  }
}

async function getEvent(req, res, next) {
  try {
    const { eventId } = req.params
    const query = mongoose.Types.ObjectId.isValid(eventId) ? { _id: eventId } : { slug: eventId }
    const event = await Event.findOne(query).populate('createdBy', 'name email')

    if (!event) {
      throw new ApiError(404, 'Event not found')
    }

    res.status(200).json({
      success: true,
      event,
    })
  } catch (error) {
    next(error)
  }
}

async function getEventSeats(req, res, next) {
  try {
    const { eventId } = req.params
    ensureObjectId(eventId)

    const event = await Event.findById(eventId).select('seats status')
    if (!event) {
      throw new ApiError(404, 'Event not found')
    }

    const locks = await getSeatLocks(
      event._id,
      event.seats.map((seat) => seat.number),
    )
    const lockedSeatNumbers = new Set(locks.map((lock) => lock.seatNumber))

    res.status(200).json({
      success: true,
      seats: event.seats.map((seat) => ({
        number: seat.number,
        section: seat.section,
        price: seat.price,
        status: lockedSeatNumbers.has(seat.number) && seat.status === 'available' ? 'locked' : seat.status,
      })),
    })
  } catch (error) {
    next(error)
  }
}

async function updateEvent(req, res, next) {
  try {
    const { eventId } = req.params
    ensureObjectId(eventId)

    const event = await Event.findById(eventId)
    if (!event) {
      throw new ApiError(404, 'Event not found')
    }

    Object.assign(event, req.body)

    if (req.body.title) {
      event.slug = await createUniqueSlug(req.body.title, event._id)
    }

    if (req.body.seats?.length) {
      event.totalSeats = req.body.seats.length
      event.availableSeats = req.body.seats.filter((seat) => seat.status === 'available').length
    } else if (req.body.totalSeats && event.seats.length === 0) {
      event.seats = buildSeats(req.body.totalSeats, req.body.priceFrom || event.priceFrom)
      event.availableSeats = event.seats.length
    }

    await event.save()
    await clearEventCaches()

    res.status(200).json({
      success: true,
      event,
    })
  } catch (error) {
    next(error)
  }
}

async function publishEvent(req, res, next) {
  try {
    const { eventId } = req.params
    ensureObjectId(eventId)

    const event = await Event.findByIdAndUpdate(eventId, { status: 'published' }, { new: true, runValidators: true })
    if (!event) {
      throw new ApiError(404, 'Event not found')
    }

    await clearEventCaches()

    res.status(200).json({
      success: true,
      event,
    })
  } catch (error) {
    next(error)
  }
}

async function cancelEvent(req, res, next) {
  try {
    const { eventId } = req.params
    ensureObjectId(eventId)

    const event = await Event.findByIdAndUpdate(eventId, { status: 'cancelled' }, { new: true, runValidators: true })
    if (!event) {
      throw new ApiError(404, 'Event not found')
    }

    await clearEventCaches()

    res.status(200).json({
      success: true,
      event,
    })
  } catch (error) {
    next(error)
  }
}

async function deleteEvent(req, res, next) {
  try {
    const { eventId } = req.params
    ensureObjectId(eventId)

    const event = await Event.findByIdAndDelete(eventId)
    if (!event) {
      throw new ApiError(404, 'Event not found')
    }

    await deleteAsset(event.poster?.publicId)
    await clearEventCaches()

    res.status(200).json({
      success: true,
      message: 'Event deleted successfully',
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  createEvent,
  uploadEventPoster,
  getPublishedEvents,
  getAdminEvents,
  getEvent,
  getEventSeats,
  updateEvent,
  publishEvent,
  cancelEvent,
  deleteEvent,
}
