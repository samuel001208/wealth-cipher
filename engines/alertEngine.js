require('dotenv').config();
const axios = require('axios');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function sendAlert(message) {
  try {
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: CHAT_ID,
      text: message,
      parse_mode: 'Markdown',
    });
    console.log('Telegram alert sent.');
  } catch (err) {
    console.error('alertEngine error:', err.message);
  }
}

async function sendSuccess({ title, videoUrl }) {
  const msg = `✅ *New Short Uploaded!*\n\n*Title:* ${title}\n*URL:* ${videoUrl}\n\n_Wealth Cipher is growing_ 🚀`;
  await sendAlert(msg);
}

async function sendFailure({ engine, error }) {
  const msg = `❌ *Upload Failed!*\n\n*Engine:* ${engine}\n*Error:* ${error}\n\n_Will retry tomorrow automatically._`;
  await sendAlert(msg);
}

module.exports = { sendSuccess, sendFailure };