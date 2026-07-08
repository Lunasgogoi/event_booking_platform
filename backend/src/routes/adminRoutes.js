const express = require('express')
const {
  getContactMessages,
  getDashboardStats,
  getOrganizerRequests,
  getUsers,
  removeOrganizerAccess,
  reviewOrganizerRequest,
  updateContactMessageStatus,
  updateUserRole,
  updateUserStatus,
} = require('../controllers/adminController')
const { protect } = require('../middlewares/authMiddleware')
const { restrictTo } = require('../middlewares/roleMiddleware')
const validateRequest = require('../middlewares/validateRequest')
const {
  removeOrganizerAccessSchema,
  reviewOrganizerRequestSchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
} = require('../validators/adminValidator')
const { updateContactMessageStatusSchema } = require('../validators/contactValidator')

const router = express.Router()

router.get('/dashboard', protect, restrictTo('admin'), getDashboardStats)
router.get('/organizer-requests', protect, restrictTo('admin'), getOrganizerRequests)
router.patch(
  '/organizer-requests/:userId/status',
  protect,
  restrictTo('admin'),
  validateRequest(reviewOrganizerRequestSchema),
  reviewOrganizerRequest,
)
router.get('/contact-messages', protect, restrictTo('admin'), getContactMessages)
router.patch(
  '/contact-messages/:messageId/status',
  protect,
  restrictTo('admin'),
  validateRequest(updateContactMessageStatusSchema),
  updateContactMessageStatus,
)
router.get('/users', protect, restrictTo('admin'), getUsers)
router.patch(
  '/users/:userId/remove-organizer',
  protect,
  restrictTo('admin'),
  validateRequest(removeOrganizerAccessSchema),
  removeOrganizerAccess,
)
router.patch('/users/:userId/role', protect, restrictTo('admin'), validateRequest(updateUserRoleSchema), updateUserRole)
router.patch('/users/:userId/status', protect, restrictTo('admin'), validateRequest(updateUserStatusSchema), updateUserStatus)

module.exports = router
