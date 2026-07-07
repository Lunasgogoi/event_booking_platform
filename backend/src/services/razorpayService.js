const crypto = require('crypto')
const Razorpay = require('razorpay')
const env = require('../config/env')
const ApiError = require('../utils/ApiError')

const hasRazorpayConfig = Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET)

const razorpay = hasRazorpayConfig
  ? new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
    })
  : null

function requireRazorpay() {
  if (!razorpay) {
    throw new ApiError(503, 'Payment gateway is not configured')
  }

  return razorpay
}

function verifyPaymentSignature({ orderId, paymentId, signature }) {
  if (!env.RAZORPAY_KEY_SECRET) {
    throw new ApiError(503, 'Payment gateway is not configured')
  }

  const expectedSignature = crypto
    .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex')

  const expectedBuffer = Buffer.from(expectedSignature, 'hex')
  const receivedBuffer = Buffer.from(signature, 'hex')

  return expectedBuffer.length === receivedBuffer.length && crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
}

function toRazorpayAmount(amount) {
  return Math.round(Number(amount || 0) * 100)
}

module.exports = {
  hasRazorpayConfig,
  razorpay,
  requireRazorpay,
  toRazorpayAmount,
  verifyPaymentSignature,
}
