const axios = require('axios');
require('dotenv').config();

const GROQ_API_KEY = process.env.GROQ_API_KEY;

const TOPICS = [
  'The dark psychology of power that schools never teach',
  'Why most people will always stay broke - the hidden truth',
  'The manipulation tactic every powerful person uses',
  'How to make people respect you without saying a word',
  'The silent rule of wealth the rich never talk about',
  'Why your circle is keeping you poor and how to escape',
  'The one mindset shift that separates winners from losers',
  'How the elite stay in control without you knowing',
  'The dark truth about success nobody wants to admit',
  'Why being nice is the fastest way to lose in life'
];

async function generateScript() {
  const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];

  const prompt = `Write a 60-second YouTube Shorts script about: "${topic}".

Format it exactly like this:
SEGMENT 1: [hook - 1 shocking sentence]
SEGMENT 2: [text]
SEGMENT 3: [text]
SEGMENT 4: [text]
SEGMENT 5: [call to action]

Keep each segment under 2 sentences. Be bold, direct, and thought-provoking.`;

  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'You write short, viral YouTube Shorts scripts about wealth, mindset and power.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.8,
        max_tokens: 800
      },
      {
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000
      }
    );

    const content = response.data.choices[0].message.content.trim();
    return { script: content, topic };
  } catch (err) {
    throw {
      step: 'SCRIPT_ENGINE',
      message: err.message || String(err),
      details: {
        code: err.code || null,
        status: (err.response && err.response.status) || null
      }
    };
  }
}

module.exports = { generateScript };
