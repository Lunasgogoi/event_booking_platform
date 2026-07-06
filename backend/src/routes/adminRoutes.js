const express = require('express')
const {
  getContactMessages,
  getDashboardStats,
  getUsers,
  updateContactMessageStatus,
  updateUserRole,
  updateUserStatus,
} = require('../controllers/adminController')
const { protect } = require('../middlewares/authMiddleware')
const { restrictTo } = require('../middlewares/roleMiddleware')
const validateRequest = require('../middlewares/validateRequest')
const { updateUserRoleSchema, updateUserStatusSchema } = require('../validators/adminValidator')
const { updateContactMessageStatusSchema } = require('../validators/contactValidator')

const router = express.Router()

router.get('/dashboard', protect, restrictTo('admin'), getDashboardStats)
router.get('/contact-messages', protect, restrictTo('admin'), getContactMessages)
router.patch(
  '/contact-messages/:messageId/status',
  protect,
  restrictTo('admin'),
  validateRequest(updateContactMessageStatusSchema),
  updateContactMessageStatus,
)
router.get('/users', protect, restrictTo('admin'), getUsers)
router.patch('/users/:userId/role', protect, restrictTo('admin'), validateRequest(updateUserRoleSchema), updateUserRole)
router.patch('/users/:userId/status', protect, restrictTo('admin'), validateRequest(updateUserStatusSchema), updateUserStatus)

module.exports = router
