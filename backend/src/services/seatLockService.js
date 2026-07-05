const { redisClient } = require('../config/redis')
const env = require('../config/env')

function seatLockKey(eventId, seatNumber) {
  return `seat-lock:${eventId}:${seatNumber}`
}

async function lockSeat({ eventId, seatNumber, userId, ttlSeconds = env.SEAT_LOCK_TTL_SECONDS }) {
  const key = seatLockKey(eventId, seatNumber)
  const result = await redisClient.set(key, String(userId), {
    NX: true,
    EX: ttlSeconds,
  })

  return result === 'OK'
}

async function releaseSeat({ eventId, seatNumber }) {
  await redisClient.del(seatLockKey(eventId, seatNumber))
}

async function getSeatLockOwner({ eventId, seatNumber }) {
  return redisClient.get(seatLockKey(eventId, seatNumber))
}

module.exports = {
  lockSeat,
  releaseSeat,
  getSeatLockOwner,
}
