const mongoose = require('mongoose')

const seatSchema = new mongoose.Schema(
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
    sectionCode: {
      type: String,
      default: 'GEN',
      trim: true,
      uppercase: true,
    },
    row: {
      type: String,
      default: 'A',
      trim: true,
      uppercase: true,
    },
    position: {
      type: Number,
      min: 1,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['available', 'booked', 'blocked'],
      default: 'available',
    },
  },
  { _id: false },
)

const eventSectionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 8,
    },
    selectionMode: {
      type: String,
      enum: ['choose_seat', 'auto_assign'],
      default: 'choose_seat',
    },
    rows: {
      type: Number,
      required: true,
      min: 1,
      max: 100,
    },
    seatsPerRow: {
      type: Number,
      required: true,
      min: 1,
      max: 200,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false },
)

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Event title is required'],
      trim: true,
      maxlength: 140,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Event description is required'],
      trim: true,
      maxlength: 5000,
    },
    category: {
      type: String,
      enum: ['Music', 'Comedy', 'Business', 'Sports', 'Food', 'Arts', 'Technology', 'Other'],
      required: true,
    },
    venue: {
      name: {
        type: String,
        required: true,
        trim: true,
      },
      address: {
        type: String,
        required: true,
        trim: true,
      },
      city: {
        type: String,
        required: true,
        trim: true,
        index: true,
      },
    },
    startsAt: {
      type: Date,
      required: true,
      index: true,
    },
    endsAt: Date,
    poster: {
      url: String,
      publicId: String,
    },
    priceFrom: {
      type: Number,
      required: true,
      min: 0,
    },
    totalSeats: {
      type: Number,
      required: true,
      min: 1,
    },
    availableSeats: {
      type: Number,
      required: true,
      min: 0,
    },
    seats: [seatSchema],
    seatingMode: {
      type: String,
      enum: ['single', 'sections'],
      default: 'single',
    },
    sections: {
      type: [eventSectionSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'under_review', 'changes_requested', 'approved', 'rejected', 'published', 'cancelled', 'completed'],
      default: 'draft',
      index: true,
    },
    previewEnabled: {
      type: Boolean,
      default: false,
    },
    review: {
      submittedAt: Date,
      reviewedAt: Date,
      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      note: {
        type: String,
        trim: true,
        maxlength: 1000,
      },
    },
    publishing: {
      feeAmount: {
        type: Number,
        default: 0,
        min: 0,
      },
      currency: {
        type: String,
        default: 'INR',
        trim: true,
        uppercase: true,
      },
      paymentStatus: {
        type: String,
        enum: ['not_required', 'pending', 'paid'],
        default: 'not_required',
      },
      calculatedAt: Date,
      publishedAt: Date,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  },
)

eventSchema.index({ title: 'text', description: 'text', 'venue.city': 'text' })
eventSchema.index({ status: 1, startsAt: 1 })
eventSchema.index({ status: 1, previewEnabled: 1, startsAt: 1 })
eventSchema.index({ category: 1, startsAt: 1 })

module.exports = mongoose.model('Event', eventSchema)
