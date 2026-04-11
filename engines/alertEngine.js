const axios = require('axios');
require('dotenv').config();

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

function sendSuccess({ title, videoUrl }) {
  const msg =
    `✅ *Wealth Cipher — Upload Success!*\n\n` +
    `*Title:* ${title}\n` +
    `*URL:* ${videoUrl}\n` +
    `*Time:* ${new Date().toISOString()}`;
  return sendAlert(msg);
}

function sendFailure({ step, message, details }) {
  let extra = '';
  if (details) {
    if (details.code) extra += `\n*Code:* ${details.code}`;
    if (details.status) extra += `\n*Status:* ${details.status}`;
    if (details.type) extra += `\n*Type:* ${details.type}`;
  }

  const msg =
    `❌ *Wealth Cipher — FAILED*\n\n` +
    `*Step:* ${step}\n` +
    `*Error:* ${message}` +
    extra +
    `\n*Time:* ${new Date().toISOString()}`;
  return sendAlert(msg);
}

module.exports = { sendSuccess, sendFailure };