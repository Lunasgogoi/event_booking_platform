const nodemailer = require('nodemailer')
const env = require('../config/env')

function hasEmailConfig() {
  return Boolean(env.EMAIL_HOST && env.EMAIL_USER && env.EMAIL_PASS)
}

function createTransporter() {
  if (!hasEmailConfig()) {
    return null
  }

  return nodemailer.createTransport({
    host: env.EMAIL_HOST,
    port: env.EMAIL_PORT,
    secure: env.EMAIL_PORT === 465,
    auth: {
      user: env.EMAIL_USER,
      pass: env.EMAIL_PASS,
    },
  })
}

async function sendEmail({ to, subject, html, text }) {
  const transporter = createTransporter()

  if (!transporter) {
    console.warn('Email not sent because SMTP environment variables are missing')
    return null
  }

  return transporter.sendMail({
    from: env.EMAIL_FROM,
    to,
    subject,
    html,
    text,
  })
}

module.exports = {
  hasEmailConfig,
  sendEmail,
}
