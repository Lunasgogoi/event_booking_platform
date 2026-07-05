const express = require('express')
const {
  cancelEvent,
  createEvent,
  deleteEvent,
  getAdminEvents,
  getEvent,
  getEventSeats,
  getPublishedEvents,
  publishEvent,
  uploadEventPoster,
  updateEvent,
} = require('../controllers/eventController')
const { protect } = require('../middlewares/authMiddleware')
const { restrictTo } = require('../middlewares/roleMiddleware')
const upload = require('../middlewares/uploadMiddleware')
const validateRequest = require('../middlewares/validateRequest')
const { createEventSchema, updateEventSchema } = require('../validators/eventValidator')

const router = express.Router()

router.get('/', getPublishedEvents)
router.get('/admin/manage', protect, restrictTo('admin'), getAdminEvents)
router.post('/poster', protect, restrictTo('admin'), upload.single('poster'), uploadEventPoster)
router.post('/', protect, restrictTo('admin'), validateRequest(createEventSchema), createEvent)
router.get('/:eventId/seats', getEventSeats)
router.get('/:eventId', getEvent)
router.patch('/:eventId', protect, restrictTo('admin'), validateRequest(updateEventSchema), updateEvent)
router.patch('/:eventId/publish', protect, restrictTo('admin'), publishEvent)
router.patch('/:eventId/cancel', protect, restrictTo('admin'), cancelEvent)
router.delete('/:eventId', protect, restrictTo('admin'), deleteEvent)

module.exports = router
