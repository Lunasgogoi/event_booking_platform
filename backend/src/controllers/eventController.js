const mongoose = require('mongoose')
const Event = require('../models/Event')
const ApiError = require('../utils/ApiError')
const { deleteCachePattern, getCache, setCache } = require('../services/cacheService')
const { deleteAsset, uploadBuffer } = require('../services/cloudinaryService')
const { getSeatLocks } = require('../services/seatLockService')
const { ensureEventCanBePublished, ensureEventIsPublic } = require('../utils/eventLifecycle')

const PUBLIC_EVENT_CACHE_TTL_SECONDS = 60

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
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

function buildCacheKey(prefix, values) {
  const params = new URLSearchParams()

  Object.entries(values)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([left], [right]) => left.localeCompare(right))
    .forEach(([key, value]) => {
      params.set(key, String(value).trim().toLowerCase())
    })

  const suffix = params.toString()
  return suffix ? `${prefix}:${suffix}` : prefix
}

async function clearEventCaches() {
  await deleteCachePattern('events:public:*').catch(() => null)
}

async function createEvent(req, res, next) {
  try {
    const payload = req.body
    const seats = payload.seats?.length ? payload.seats : buildSeats(payload.totalSeats, payload.priceFrom)

    const event = await Event.create({
      ...payload,
      status: 'draft',
      slug: await createUniqueSlug(payload.title),
      seats,
      totalSeats: seats.length,
      availableSeats: seats.filter((seat) => seat.status === 'available').length,
      createdBy: req.user._id,
    })

    await clearEventCaches()

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
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
      message: 'Poster uploaded successfully',
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
    const pageNumber = Math.max(Number(page), 1)
    const pageSize = Math.min(Math.max(Number(limit), 1), 50)
    const cacheKey = buildCacheKey('events:public:list', {
      category,
      city,
      limit: pageSize,
      page: pageNumber,
      search,
    })
    const cachedResponse = await getCache(cacheKey).catch(() => null)

    if (cachedResponse) {
      return res.status(200).json(cachedResponse)
    }

    const query = { status: 'published', startsAt: { $gte: new Date() } }

    if (category) query.category = category
    if (city) query['venue.city'] = new RegExp(escapeRegex(city), 'i')
    if (search?.trim()) {
      const searchRegex = new RegExp(escapeRegex(search.trim()), 'i')
      query.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { category: searchRegex },
        { 'venue.name': searchRegex },
        { 'venue.address': searchRegex },
        { 'venue.city': searchRegex },
      ]
    }

    const [events, total] = await Promise.all([
      Event.find(query)
        .sort({ startsAt: 1 })
        .skip((pageNumber - 1) * pageSize)
        .limit(pageSize)
        .populate('createdBy', 'name email'),
      Event.countDocuments(query),
    ])

    const responseBody = {
      success: true,
      message: 'Events fetched successfully',
      events,
      pagination: {
        page: pageNumber,
        limit: pageSize,
        total,
        pages: Math.ceil(total / pageSize),
      },
    }

    await setCache(cacheKey, responseBody, PUBLIC_EVENT_CACHE_TTL_SECONDS).catch(() => null)

    res.status(200).json(responseBody)
  } catch (error) {
    next(error)
  }
}

async function getAdminEvents(req, res, next) {
  try {
    const { page = 1, limit = 50 } = req.query
    const pageNumber = Math.max(Number(page), 1)
    const pageSize = Math.min(Math.max(Number(limit), 1), 100)
    const [events, total] = await Promise.all([
      Event.find()
        .sort({ createdAt: -1 })
        .skip((pageNumber - 1) * pageSize)
        .limit(pageSize)
        .populate('createdBy', 'name email'),
      Event.countDocuments(),
    ])

    res.status(200).json({
      success: true,
      message: 'Events fetched successfully',
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

async function getEvent(req, res, next) {
  try {
    const { eventId } = req.params
    const cacheKey = buildCacheKey('events:public:detail', { eventId })
    const cachedResponse = await getCache(cacheKey).catch(() => null)

    if (cachedResponse) {
      return res.status(200).json(cachedResponse)
    }

    const query = mongoose.Types.ObjectId.isValid(eventId) ? { _id: eventId } : { slug: eventId }
    const event = await Event.findOne(query).populate('createdBy', 'name email')

    if (!event) {
      throw new ApiError(404, 'Event not found')
    }
    ensureEventIsPublic(event)

    const secondsUntilStart = Math.floor((new Date(event.startsAt).getTime() - Date.now()) / 1000)
    const cacheTtlSeconds = Number.isFinite(secondsUntilStart)
      ? Math.max(1, Math.min(PUBLIC_EVENT_CACHE_TTL_SECONDS, secondsUntilStart))
      : PUBLIC_EVENT_CACHE_TTL_SECONDS
    const responseBody = {
      success: true,
      message: 'Event fetched successfully',
      event,
    }

    await setCache(cacheKey, responseBody, cacheTtlSeconds).catch(() => null)

    res.status(200).json(responseBody)
  } catch (error) {
    next(error)
  }
}

async function getEventSeats(req, res, next) {
  try {
    const { eventId } = req.params
    ensureObjectId(eventId)

    const event = await Event.findById(eventId).select('seats status startsAt')
    if (!event) {
      throw new ApiError(404, 'Event not found')
    }
    ensureEventIsPublic(event)

    const locks = await getSeatLocks(
      event._id,
      event.seats.map((seat) => seat.number),
    )
    const lockedSeatNumbers = new Set(locks.map((lock) => lock.seatNumber))

    res.status(200).json({
      success: true,
      message: 'Event seats fetched successfully',
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
    const previousPosterPublicId = event.poster?.publicId

    if (req.body.status && req.body.status !== event.status) {
      throw new ApiError(400, 'Use the dedicated publish or cancel endpoint to change event status')
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

    if (event.status === 'published') {
      ensureEventCanBePublished(event)
    }

    await event.save()
    if (req.body.poster?.publicId && previousPosterPublicId !== req.body.poster.publicId) {
      await deleteAsset(previousPosterPublicId)
    }
    await clearEventCaches()

    res.status(200).json({
      success: true,
      message: 'Event updated successfully',
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

    const event = await Event.findById(eventId)
    if (!event) {
      throw new ApiError(404, 'Event not found')
    }

    ensureEventCanBePublished(event)
    event.status = 'published'
    await event.save()
    await clearEventCaches()

    res.status(200).json({
      success: true,
      message: 'Event published successfully',
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

    const event = await Event.findById(eventId)
    if (!event) {
      throw new ApiError(404, 'Event not found')
    }

    if (event.status === 'completed') {
      throw new ApiError(400, 'Completed events cannot be cancelled')
    }

    event.status = 'cancelled'
    await event.save()
    await clearEventCaches()

    res.status(200).json({
      success: true,
      message: 'Event cancelled successfully',
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
