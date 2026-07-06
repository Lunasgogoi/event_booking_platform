const ApiError = require('./ApiError')

function isUpcomingEvent(event, now = new Date()) {
  return event.startsAt && new Date(event.startsAt) > now
}

function ensureEventCanBePublished(event) {
  if (event.status === 'cancelled') {
    throw new ApiError(400, 'Cancelled events cannot be published')
  }

  if (event.status === 'completed') {
    throw new ApiError(400, 'Completed events cannot be published')
  }

  if (!isUpcomingEvent(event)) {
    throw new ApiError(400, 'Past events cannot be published')
  }

  if (!event.seats?.length || event.totalSeats < 1) {
    throw new ApiError(400, 'Event must have at least one seat before publishing')
  }
}

function ensureEventIsPublic(event) {
  if (event.status !== 'published' || !isUpcomingEvent(event)) {
    throw new ApiError(404, 'Event not found')
  }
}

function ensureEventIsBookable(event) {
  if (event.status !== 'published') {
    throw new ApiError(400, 'Event is not open for booking')
  }

  if (!isUpcomingEvent(event)) {
    throw new ApiError(400, 'Event has already started')
  }
}

module.exports = {
  ensureEventCanBePublished,
  ensureEventIsBookable,
  ensureEventIsPublic,
  isUpcomingEvent,
}
