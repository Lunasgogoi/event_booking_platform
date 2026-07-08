const mongoose = require('mongoose')

const bookingSeatSchema = new mongoose.Schema(
  {
    number: {
      type: String,
      required: true,
      trim: true,
    },
    section: {
      type: String,
      default: 'General',
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false },
)

const bookingSchema = new mongoose.Schema(
  {
    bookingCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true,
    },
    seats: {
      type: [bookingSeatSchema],
      validate: {
        validator: (seats) => seats.length > 0,
        message: 'At least one seat is required',
      },
    },
    amount: {
      subtotal: {
        type: Number,
        required: true,
        min: 0,
      },
      fees: {
        type: Number,
        default: 0,
        min: 0,
      },
      total: {
        type: Number,
        required: true,
        min: 0,
      },
      currency: {
        type: String,
        default: 'INR',
      },
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'expired'],
      default: 'pending',
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['not_required', 'pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    payment: {
      provider: {
        type: String,
        enum: ['razorpay'],
      },
      razorpayOrderId: {
        type: String,
        trim: true,
      },
      razorpayPaymentId: {
        type: String,
        trim: true,
      },
      razorpaySignature: {
        type: String,
        trim: true,
      },
      paidAt: Date,
    },
    qrCode: {
      dataUrl: String,
      payload: String,
    },
    confirmedAt: Date,
    cancelledAt: Date,
    expiresAt: Date,
    hiddenFromUserAt: Date,
  },
  {
    timestamps: true,
  },
)

bookingSchema.index({ user: 1, createdAt: -1 })
bookingSchema.index({ event: 1, status: 1 })
bookingSchema.index({ 'payment.razorpayPaymentId': 1 }, { unique: true, sparse: true })

module.exports = mongoose.model('Booking', bookingSchema)
