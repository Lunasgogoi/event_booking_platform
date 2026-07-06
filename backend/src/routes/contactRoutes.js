const express = require('express')
const { createContactMessage } = require('../controllers/contactController')
const validateRequest = require('../middlewares/validateRequest')
const { createContactMessageSchema } = require('../validators/contactValidator')

const router = express.Router()

router.post('/', validateRequest(createContactMessageSchema), createContactMessage)

module.exports = router
