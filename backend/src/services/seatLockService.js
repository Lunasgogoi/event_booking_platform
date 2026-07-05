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

async function releaseSeatForUser({ eventId, seatNumber, userId }) {
  const key = seatLockKey(eventId, seatNumber)
  const owner = await redisClient.get(key)

  if (owner !== String(userId)) {
    return false
  }

  await redisClient.del(key)
  return true
}

async function getSeatLockOwner({ eventId, seatNumber }) {
  return redisClient.get(seatLockKey(eventId, seatNumber))
}

async function releaseSeatsForUser({ eventId, seatNumbers, userId }) {
  await Promise.all(
    seatNumbers.map(async (seatNumber) => {
      await releaseSeatForUser({ eventId, seatNumber, userId })
    }),
  )
}

async function getSeatLocks(eventId, seatNumbers) {
  const locks = await Promise.all(
    seatNumbers.map(async (seatNumber) => ({
      seatNumber,
      owner: await redisClient.get(seatLockKey(eventId, seatNumber)),
    })),
  )

  return locks.filter((lock) => lock.owner)
}

module.exports = {
  lockSeat,
  releaseSeat,
  releaseSeatForUser,
  releaseSeatsForUser,
  getSeatLockOwner,
  getSeatLocks,
}
