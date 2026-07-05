const QRCode = require('qrcode')

async function generateQR(payload) {
  const text = typeof payload === 'string' ? payload : JSON.stringify(payload)
  const dataUrl = await QRCode.toDataURL(text, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 240,
  })

  return {
    payload: text,
    dataUrl,
  }
}

module.exports = generateQR
