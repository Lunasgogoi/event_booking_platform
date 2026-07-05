const { Readable } = require('stream')
const { cloudinary, hasCloudinaryConfig } = require('../config/cloudinary')
const env = require('../config/env')
const ApiError = require('../utils/ApiError')

function uploadBuffer(buffer, options = {}) {
  if (!hasCloudinaryConfig) {
    throw new ApiError(500, 'Cloudinary is not configured')
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: env.CLOUDINARY_FOLDER,
        resource_type: 'image',
        ...options,
      },
      (error, result) => {
        if (error) {
          return reject(error)
        }

        resolve(result)
      },
    )

    Readable.from(buffer).pipe(uploadStream)
  })
}

async function deleteAsset(publicId) {
  if (!hasCloudinaryConfig || !publicId) {
    return null
  }

  return cloudinary.uploader.destroy(publicId)
}

module.exports = {
  uploadBuffer,
  deleteAsset,
}
