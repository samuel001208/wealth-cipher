const axios = require('axios');
require('dotenv').config();

const GROQ_API_KEY = process.env.GROQ_API_KEY;

const TOPICS = [
  'The dark psychology of power that schools never teach',
  'Why most people will always stay broke',
  'The manipulation tactic every powerful person uses',
  'How to make people respect you without saying a word',
  'The silent rule of wealth the rich never talk about',
  'Why your circle is keeping you poor',
  'The one mindset shift separating winners from losers',
  'How the elite stay in control without you knowing',
  'The dark truth about success nobody wants to admit',
  'Why being nice is the fastest way to lose in life'
];

async function generateScript() {
  const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
  const prompt = `Write a 60-second YouTube Shorts script about: ${topic}.\n\nFormat:\nSEGMENT 1: [hook]\nSEGMENT 2: [text]\nSEGMENT 3: [text]\nSEGMENT 4: [text]\nSEGMENT 5: [call to action]\n\nBe bold and direct.`;
  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      { model: 'llama-3.3-70b-versatile', messages: [{ role: 'system', content: 'You write viral YouTube Shorts scripts about wealth and mindset.' }, { role: 'user', content: prompt }], temperature: 0.8, max_tokens: 800 },
      { headers: { 'Authorization': 'Bearer ' + GROQ_API_KEY, 'Content-Type': 'application/json' }, timeout: 60000 }
    );
    return { script: response.data.choices[0].message.content.trim(), topic };
  } catch (err) {
    throw { step: 'SCRIPT_ENGINE', message: err.message || String(err), details: { code: err.code || null, status: (err.response && err.response.status) || null } };
  }
}

module.exports = { generateScript };