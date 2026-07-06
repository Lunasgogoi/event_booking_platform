const ContactMessage = require('../models/ContactMessage')
const env = require('../config/env')
const { sendEmail } = require('../services/emailService')

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function contactEmailText(message) {
  return [
    `New Ticketo support message: ${message.subject}`,
    '',
    `Name: ${message.name}`,
    `Email: ${message.email}`,
    `Category: ${message.category}`,
    '',
    message.message,
  ].join('\n')
}

function contactEmailHtml(message) {
  const safeSubject = escapeHtml(message.subject)
  const safeName = escapeHtml(message.name)
  const safeEmail = escapeHtml(message.email)
  const safeCategory = escapeHtml(message.category)
  const safeMessage = escapeHtml(message.message).replace(/\n/g, '<br>')

  return `
    <h2>New Ticketo support message</h2>
    <p><strong>Subject:</strong> ${safeSubject}</p>
    <p><strong>Name:</strong> ${safeName}</p>
    <p><strong>Email:</strong> ${safeEmail}</p>
    <p><strong>Category:</strong> ${safeCategory}</p>
    <p>${safeMessage}</p>
  `
}

async function createContactMessage(req, res, next) {
  try {
    const message = await ContactMessage.create(req.body)

    try {
      const emailResult = await sendEmail({
        to: env.SUPPORT_EMAIL,
        subject: `[Ticketo support] ${message.subject}`,
        text: contactEmailText(message),
        html: contactEmailHtml(message),
      })

      if (emailResult) {
        message.notificationSent = true
        await message.save({ validateBeforeSave: false })
      }
    } catch (error) {
      console.warn(`Support email failed: ${error.message}`)
    }

    res.status(201).json({
      success: true,
      message: 'Support request sent successfully',
      contactMessage: message,
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  createContactMessage,
}
