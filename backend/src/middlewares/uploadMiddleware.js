const multer = require('multer')
const ApiError = require('../utils/ApiError')
const env = require('../config/env')

const storage = multer.memoryStorage()

const imageMimeTypes = ['image/jpeg', 'image/png', 'image/webp']

const upload = multer({
  storage,
  limits: {
    fileSize: env.MULTER_FILE_SIZE_MB * 1024 * 1024,
  },
  fileFilter(req, file, cb) {
    if (!imageMimeTypes.includes(file.mimetype)) {
      return cb(new ApiError(400, 'Only JPEG, PNG, and WEBP images are allowed'))
    }

    cb(null, true)
  },
})

module.exports = upload
