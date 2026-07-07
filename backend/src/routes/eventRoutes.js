const express = require('express')
const {
  cancelEvent,
  createEvent,
  createOrganizerEvent,
  deleteOrganizerEvent,
  deleteEvent,
  getAdminEvents,
  getAdminReviewEvents,
  getEvent,
  getEventSeats,
  getOrganizerEvents,
  getPublishedEvents,
  publishEvent,
  reviewOrganizerEvent,
  submitOrganizerEvent,
  uploadEventPoster,
  updateEvent,
  updateOrganizerEvent,
} = require('../controllers/eventController')
const { protect } = require('../middlewares/authMiddleware')
const { restrictTo } = require('../middlewares/roleMiddleware')
const upload = require('../middlewares/uploadMiddleware')
const validateRequest = require('../middlewares/validateRequest')
const { createEventSchema, reviewEventSchema, updateEventSchema } = require('../validators/eventValidator')

const router = express.Router()

router.get('/', getPublishedEvents)
router.get('/admin/manage', protect, restrictTo('admin'), getAdminEvents)
router.get('/admin/review', protect, restrictTo('admin'), getAdminReviewEvents)
router.get('/organizer/manage', protect, restrictTo('organizer'), getOrganizerEvents)
router.post('/poster', protect, restrictTo('admin', 'organizer'), upload.single('poster'), uploadEventPoster)
router.post('/organizer', protect, restrictTo('organizer'), validateRequest(createEventSchema), createOrganizerEvent)
router.post('/', protect, restrictTo('admin'), validateRequest(createEventSchema), createEvent)
router.get('/:eventId/seats', getEventSeats)
router.get('/:eventId', getEvent)
router.patch('/organizer/:eventId/submit', protect, restrictTo('organizer'), submitOrganizerEvent)
router.patch('/organizer/:eventId', protect, restrictTo('organizer'), validateRequest(updateEventSchema), updateOrganizerEvent)
router.patch('/:eventId/review', protect, restrictTo('admin'), validateRequest(reviewEventSchema), reviewOrganizerEvent)
router.patch('/:eventId', protect, restrictTo('admin'), validateRequest(updateEventSchema), updateEvent)
router.patch('/:eventId/publish', protect, restrictTo('admin'), publishEvent)
router.patch('/:eventId/cancel', protect, restrictTo('admin'), cancelEvent)
router.delete('/organizer/:eventId', protect, restrictTo('organizer'), deleteOrganizerEvent)
router.delete('/:eventId', protect, restrictTo('admin'), deleteEvent)

module.exports = router
