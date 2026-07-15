const mongoose = require('mongoose')
const Event = require('../models/Event')
const ApiError = require('../utils/ApiError')
const env = require('../config/env')
const { deleteCachePattern, getCache, setCache } = require('../services/cacheService')
const { deleteAsset, uploadBuffer } = require('../services/cloudinaryService')
const { sendEmail } = require('../services/emailService')
const { getSeatLocks } = require('../services/seatLockService')
const { ensureEventCanBePublished, ensureEventIsPublic } = require('../utils/eventLifecycle')
const {
  buildSeatsFromSections,
  getEventSections,
  getRowLabel,
  getSection,
  getSeatsForSection,
} = require('../utils/eventSeating')

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
  return Array.from({ length: totalSeats }, (_, index) => {
    const rowIndex = Math.floor(index / 10)

    return {
      number: `G${index + 1}`,
      section: 'General',
      sectionCode: 'GEN',
      row: getRowLabel(rowIndex),
      position: (index % 10) + 1,
      price: priceFrom,
      status: 'available',
    }
  })
}

function buildEventInventory(payload) {
  if (payload.seatingMode === 'sections') {
    const sections = payload.sections || []
    const seats = buildSeatsFromSections(sections)

    return {
      seatingMode: 'sections',
      sections,
      seats,
      totalSeats: seats.length,
      availableSeats: seats.length,
      priceFrom: Math.min(...sections.map((section) => section.price)),
    }
  }

  const seats = payload.seats?.length
    ? payload.seats
    : buildSeats(payload.totalSeats, payload.priceFrom)

  return {
    seatingMode: 'single',
    sections: [],
    seats,
    totalSeats: seats.length,
    availableSeats: seats.filter((seat) => seat.status === 'available').length,
    priceFrom: payload.priceFrom,
  }
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

function ensureEventOwner(req, event) {
  const ownerId = event.createdBy?._id || event.createdBy
  if (String(ownerId) !== String(req.user._id)) {
    throw new ApiError(403, 'You do not have permission to manage this event')
  }
}

function ensureOrganizerEditableEvent(event) {
  if (!['draft', 'changes_requested', 'rejected'].includes(event.status)) {
    throw new ApiError(400, 'Only draft events or events needing changes can be changed by organizers')
  }
}

function ensureOrganizerSubmittableEvent(event) {
  if (!['draft', 'changes_requested', 'rejected'].includes(event.status)) {
    throw new ApiError(400, 'Only draft events or events needing changes can be submitted')
  }

  ensureEventCanBePublished(event)
}

function calculatePublishingFee() {
  return {
    feeAmount: 0,
    currency: env.RAZORPAY_CURRENCY || 'INR',
    paymentStatus: 'not_required',
    calculatedAt: new Date(),
  }
}

async function applyEventUpdates(event, payload) {
  const previousPosterPublicId = event.poster?.publicId
  const seatingConfigurationChanged = payload.seatingMode !== undefined || payload.sections !== undefined

  if (payload.status && payload.status !== event.status) {
    throw new ApiError(400, 'Use the dedicated workflow endpoint to change event status')
  }

  if (seatingConfigurationChanged) {
    if (!['draft', 'changes_requested', 'rejected'].includes(event.status)) {
      throw new ApiError(400, 'Seating can only be changed before an event is approved or published')
    }

    if (event.seats.some((seat) => seat.status === 'booked')) {
      throw new ApiError(409, 'Seating cannot be changed after seats have been booked')
    }
  }

  Object.assign(event, payload)

  if (payload.title) {
    event.slug = await createUniqueSlug(payload.title, event._id)
  }

  if (seatingConfigurationChanged) {
    const inventory = buildEventInventory({
      ...payload,
      priceFrom: payload.priceFrom ?? event.priceFrom,
      totalSeats: payload.totalSeats ?? event.totalSeats,
      sections: payload.sections ?? event.sections,
      seatingMode: payload.seatingMode ?? event.seatingMode,
    })
    event.set(inventory)
  } else if (payload.seats?.length) {
    event.totalSeats = payload.seats.length
    event.availableSeats = payload.seats.filter((seat) => seat.status === 'available').length
  } else if (payload.totalSeats && event.status === 'draft') {
    event.seats = buildSeats(payload.totalSeats, payload.priceFrom || event.priceFrom)
    event.totalSeats = event.seats.length
    event.availableSeats = event.seats.length
  } else if (payload.totalSeats && event.seats.length === 0) {
    event.seats = buildSeats(payload.totalSeats, payload.priceFrom || event.priceFrom)
    event.availableSeats = event.seats.length
  }

  if (event.status === 'published') {
    ensureEventCanBePublished(event)
  }

  await event.save()
  if (payload.poster?.publicId && previousPosterPublicId !== payload.poster.publicId) {
    await deleteAsset(previousPosterPublicId)
  }

  return event
}

async function createEvent(req, res, next) {
  try {
    const payload = req.body
    const inventory = buildEventInventory(payload)

    const event = await Event.create({
      ...payload,
      ...inventory,
      status: 'draft',
      slug: await createUniqueSlug(payload.title),
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

async function getOrganizerEvents(req, res, next) {
  try {
    const { page = 1, limit = 50 } = req.query
    const pageNumber = Math.max(Number(page), 1)
    const pageSize = Math.min(Math.max(Number(limit), 1), 100)
    const query = { createdBy: req.user._id }
    const [events, total] = await Promise.all([
      Event.find(query)
        .sort({ createdAt: -1 })
        .skip((pageNumber - 1) * pageSize)
        .limit(pageSize)
        .populate('createdBy', 'name email'),
      Event.countDocuments(query),
    ])

    res.status(200).json({
      success: true,
      message: 'Organizer events fetched successfully',
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

async function createOrganizerEvent(req, res, next) {
  try {
    const payload = req.body
    const inventory = buildEventInventory(payload)

    const event = await Event.create({
      ...payload,
      ...inventory,
      status: 'draft',
      slug: await createUniqueSlug(payload.title),
      createdBy: req.user._id,
    })

    res.status(201).json({
      success: true,
      message: 'Draft event created successfully',
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
        .select('-seats')
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

async function getComingSoonEvents(req, res, next) {
  try {
    const { limit = 4 } = req.query
    const pageSize = Math.min(Math.max(Number(limit) || 4, 1), 12)
    const cacheKey = buildCacheKey('events:public:coming-soon', { limit: pageSize })
    const cachedResponse = await getCache(cacheKey).catch(() => null)

    if (cachedResponse) {
      return res.status(200).json(cachedResponse)
    }

    const events = await Event.find({
      status: 'approved',
      previewEnabled: true,
      startsAt: { $gte: new Date() },
    })
      .select('title category venue.name venue.city startsAt poster.url')
      .sort({ startsAt: 1 })
      .limit(pageSize)
      .lean()

    const responseBody = {
      success: true,
      message: 'Coming soon events fetched successfully',
      events,
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
        .populate('createdBy', 'name email role'),
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

async function getAdminReviewEvents(req, res, next) {
  try {
    const { status = 'submitted', page = 1, limit = 50 } = req.query
    const reviewStatuses = ['submitted', 'under_review', 'changes_requested', 'approved', 'rejected']
    const query = {}

    if (status === 'all') {
      query.status = { $in: reviewStatuses }
    } else if (reviewStatuses.includes(status)) {
      query.status = status
    } else {
      throw new ApiError(400, 'Invalid review status')
    }

    const pageNumber = Math.max(Number(page), 1)
    const pageSize = Math.min(Math.max(Number(limit), 1), 100)
    const [events, total] = await Promise.all([
      Event.find(query)
        .sort({ 'review.submittedAt': -1, createdAt: -1 })
        .skip((pageNumber - 1) * pageSize)
        .limit(pageSize)
        .populate('createdBy', 'name email role')
        .populate('review.reviewedBy', 'name email'),
      Event.countDocuments(query),
    ])

    res.status(200).json({
      success: true,
      message: 'Review events fetched successfully',
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
    const event = await Event.findOne(query).populate('createdBy', 'name')

    if (!event) {
      throw new ApiError(404, 'Event not found')
    }
    ensureEventIsPublic(event)

    const secondsUntilStart = Math.floor((new Date(event.startsAt).getTime() - Date.now()) / 1000)
    const cacheTtlSeconds = Number.isFinite(secondsUntilStart)
      ? Math.max(1, Math.min(PUBLIC_EVENT_CACHE_TTL_SECONDS, secondsUntilStart))
      : PUBLIC_EVENT_CACHE_TTL_SECONDS
    const publicEvent = event.toObject()
    publicEvent.sections = getEventSections(event)
    delete publicEvent.seats

    const responseBody = {
      success: true,
      message: 'Event fetched successfully',
      event: publicEvent,
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
    const { section: requestedSectionCode } = req.query
    ensureObjectId(eventId)

    const event = await Event.findById(eventId).select(
      'seats sections seatingMode totalSeats availableSeats priceFrom status startsAt',
    )
    if (!event) {
      throw new ApiError(404, 'Event not found')
    }
    ensureEventIsPublic(event)

    const section = requestedSectionCode ? getSection(event, requestedSectionCode) : null
    if (requestedSectionCode && !section) {
      throw new ApiError(404, 'Section not found')
    }

    const sectionSeats = section ? getSeatsForSection(event, section.code) : event.seats
    const normalizedSeats = sectionSeats.map((seat, index) => ({
      number: seat.number,
      section: seat.section,
      sectionCode: seat.sectionCode,
      row: event.seatingMode === 'sections' ? seat.row : getRowLabel(Math.floor(index / 10)),
      position: event.seatingMode === 'sections' ? seat.position : (index % 10) + 1,
      price: seat.price,
      status: seat.status,
    }))
    let visibleSeats = normalizedSeats
    let rowPagination = null

    if (section) {
      const pageNumber = Math.max(Number(req.query.page) || 1, 1)
      const pageSize = Math.min(Math.max(Number(req.query.rows) || 8, 1), 20)
      const rowNames = [...new Set(normalizedSeats.map((seat) => seat.row))]
      const visibleRows = new Set(rowNames.slice((pageNumber - 1) * pageSize, pageNumber * pageSize))
      visibleSeats = normalizedSeats.filter((seat) => visibleRows.has(seat.row))
      rowPagination = {
        page: pageNumber,
        limit: pageSize,
        rows: rowNames.length,
        pages: Math.ceil(rowNames.length / pageSize),
      }
    }

    const locks = await getSeatLocks(
      event._id,
      visibleSeats.map((seat) => seat.number),
    )
    const lockedSeatNumbers = new Set(locks.map((lock) => lock.seatNumber))

    res.status(200).json({
      success: true,
      message: 'Event seats fetched successfully',
      section,
      pagination: rowPagination,
      seats: visibleSeats.map((seat) => ({
        ...seat,
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

    await applyEventUpdates(event, req.body)
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

async function updateOrganizerEvent(req, res, next) {
  try {
    const { eventId } = req.params
    ensureObjectId(eventId)

    const event = await Event.findById(eventId)
    if (!event) {
      throw new ApiError(404, 'Event not found')
    }

    ensureEventOwner(req, event)
    ensureOrganizerEditableEvent(event)
    await applyEventUpdates(event, req.body)

    res.status(200).json({
      success: true,
      message: 'Draft event updated successfully',
      event,
    })
  } catch (error) {
    next(error)
  }
}

async function updateOrganizerEventPreview(req, res, next) {
  try {
    const { eventId } = req.params
    const { enabled } = req.body
    ensureObjectId(eventId)

    const event = await Event.findById(eventId)
    if (!event) {
      throw new ApiError(404, 'Event not found')
    }

    ensureEventOwner(req, event)

    if (event.status !== 'approved') {
      throw new ApiError(400, 'Only approved events can be shown as coming soon')
    }

    if (enabled) {
      ensureEventCanBePublished(event)
    }

    event.previewEnabled = enabled
    await event.save()
    await clearEventCaches()

    res.status(200).json({
      success: true,
      message: enabled ? 'Event preview enabled successfully' : 'Event preview disabled successfully',
      event,
    })
  } catch (error) {
    next(error)
  }
}

async function submitOrganizerEvent(req, res, next) {
  try {
    const { eventId } = req.params
    ensureObjectId(eventId)

    const event = await Event.findById(eventId).populate('createdBy', 'name email')
    if (!event) {
      throw new ApiError(404, 'Event not found')
    }

    ensureEventOwner(req, event)
    ensureOrganizerSubmittableEvent(event)

    event.status = 'submitted'
    event.review = {
      ...event.review,
      submittedAt: new Date(),
      reviewedAt: undefined,
      reviewedBy: undefined,
      note: '',
    }
    await event.save()

    await Promise.all([
      sendEmail({
        to: req.user.email,
        subject: 'Event submitted for review',
        text: `Your event "${event.title}" has been submitted for admin review.`,
        html: `<p>Your event <strong>${event.title}</strong> has been submitted for admin review.</p>`,
      }),
      sendEmail({
        to: env.SUPPORT_EMAIL,
        subject: 'Event review requested',
        text: `${req.user.name} (${req.user.email}) submitted "${event.title}" for review.`,
        html: `<p><strong>${req.user.name}</strong> (${req.user.email}) submitted <strong>${event.title}</strong> for review.</p>`,
      }),
    ])

    res.status(200).json({
      success: true,
      message: 'Event submitted for review successfully',
      event,
    })
  } catch (error) {
    next(error)
  }
}

async function reviewOrganizerEvent(req, res, next) {
  try {
    const { eventId } = req.params
    const { status, reviewNote } = req.body
    ensureObjectId(eventId)

    const event = await Event.findById(eventId).populate('createdBy', 'name email role')
    if (!event) {
      throw new ApiError(404, 'Event not found')
    }

    if (!['submitted', 'under_review', 'changes_requested', 'approved', 'rejected'].includes(event.status)) {
      throw new ApiError(400, 'Event is not in the review workflow')
    }

    if (status === 'under_review' && event.status !== 'submitted') {
      throw new ApiError(400, 'Only submitted events can be marked under review')
    }

    if (['approved', 'rejected', 'changes_requested'].includes(status) && !['submitted', 'under_review'].includes(event.status)) {
      throw new ApiError(400, 'Only submitted or under review events can receive a review decision')
    }

    if (status === 'approved') {
      ensureEventCanBePublished(event)
      event.publishing = {
        ...event.publishing,
        ...calculatePublishingFee(),
      }
    }

    event.status = status
    event.review = {
      ...event.review,
      reviewedAt: new Date(),
      reviewedBy: req.user._id,
      note: reviewNote,
    }
    await event.save()

    const statusLabels = {
      under_review: 'under review',
      approved: 'approved',
      rejected: 'rejected',
      changes_requested: 'changes requested',
    }
    await sendEmail({
      to: event.createdBy.email,
      subject: `Event review update: ${statusLabels[status]}`,
      text: `Your event "${event.title}" is now ${statusLabels[status]}.${reviewNote ? ` Note: ${reviewNote}` : ''}`,
      html: `<p>Your event <strong>${event.title}</strong> is now <strong>${statusLabels[status]}</strong>.</p>${reviewNote ? `<p>${reviewNote}</p>` : ''}`,
    })

    res.status(200).json({
      success: true,
      message: 'Event review updated successfully',
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

    if (event.status !== 'draft') {
      throw new ApiError(400, 'Only draft events can be published directly')
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

async function publishOrganizerEvent(req, res, next) {
  try {
    const { eventId } = req.params
    ensureObjectId(eventId)

    const event = await Event.findById(eventId)
    if (!event) {
      throw new ApiError(404, 'Event not found')
    }

    ensureEventOwner(req, event)

    if (event.status !== 'approved') {
      throw new ApiError(400, 'Only approved organizer events can be published')
    }

    if (event.publishing?.paymentStatus === 'pending') {
      throw new ApiError(402, 'Publishing payment is pending')
    }

    ensureEventCanBePublished(event)
    event.status = 'published'
    event.publishing = {
      ...event.publishing,
      publishedAt: new Date(),
    }
    await event.save()
    await clearEventCaches()

    await sendEmail({
      to: req.user.email,
      subject: 'Event published',
      text: `Your event "${event.title}" is now published.`,
      html: `<p>Your event <strong>${event.title}</strong> is now published.</p>`,
    })

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

async function deleteOrganizerEvent(req, res, next) {
  try {
    const { eventId } = req.params
    ensureObjectId(eventId)

    const event = await Event.findById(eventId)
    if (!event) {
      throw new ApiError(404, 'Event not found')
    }

    ensureEventOwner(req, event)
    ensureOrganizerEditableEvent(event)
    await event.deleteOne()
    await deleteAsset(event.poster?.publicId)

    res.status(200).json({
      success: true,
      message: 'Draft event deleted successfully',
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  createEvent,
  createOrganizerEvent,
  deleteOrganizerEvent,
  uploadEventPoster,
  getAdminReviewEvents,
  getComingSoonEvents,
  getPublishedEvents,
  getAdminEvents,
  getOrganizerEvents,
  getEvent,
  getEventSeats,
  updateEvent,
  updateOrganizerEvent,
  updateOrganizerEventPreview,
  reviewOrganizerEvent,
  submitOrganizerEvent,
  publishEvent,
  publishOrganizerEvent,
  cancelEvent,
  deleteEvent,
}
