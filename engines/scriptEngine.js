const axios = require('axios');
require('dotenv').config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const TOPICS = [
  'The dark psychology of power that schools never teach',
  'Why most people will always stay broke - the real reason',
  'The manipulation tactic every powerful person uses daily',
  'How to make people respect you without saying a word',
  'The silent rule of wealth the rich never talk about',
  'Why your circle is keeping you poor and how to fix it',
  'The one mindset shift that separates winners from losers',
  'How the elite stay in control without you knowing',
  'The dark truth about success nobody wants to admit',
  'Why being nice is the fastest way to lose in life',
  'The law of power most people break every single day',
  'How to read people instantly using dark psychology',
  'Why emotional people never build real wealth',
  'The strategy billionaires use to stay untouchable',
  'How to turn silence into your most powerful weapon',
  'The brutal truth about why most people never win',
  'Why the system is designed to keep you dependent',
  'How to build leverage so nobody can control you',
  'The wealth secret hidden in plain sight every day',
  'Why discipline beats talent every single time',
];

async function generateWithRetry(fn, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries - 1) throw err;
      console.log(`Retry ${i + 1}/${retries}...`);
      await new Promise(r => setTimeout(r, 2000 * (i + 1)));
    }
  }
}

async function generateScript() {
  try {
    const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
    console.log('Selected topic:', topic);
    console.log('Generating script segments...');

    const prompt = `You are writing a short-form video script for a YouTube Shorts channel called Wealth Cipher.

Topic: "${topic}"

Write a powerful, punchy script with exactly 5 short segments.
Each segment should be 1-2 sentences max.
Make it sound bold, confident and intriguing — like something that stops someone from scrolling.
No emojis. No hashtags. No intro like "Hey guys". Just the raw script.

Format your response EXACTLY like this:
SEGMENT 1: [text]
SEGMENT 2: [text]
SEGMENT 3: [text]
SEGMENT 4: [text]
SEGMENT 5: [text]`;

    const response = await generateWithRetry(() =>
      axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: 'meta-llama/llama-3.3-70b-instruct:free',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 400,
        },
        {
          headers: {
            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://github.com/samuel001208/wealth-cipher',
            'X-Title': 'Wealth Cipher Automation',
          },
        }
      )
    );

    const raw = response.data.choices[0].message.content.trim();

    // Parse segments
    const segments = [];
    const lines = raw.split('\n');
    for (const line of lines) {
      const match = line.match(/^SEGMENT\s*\d+:\s*(.+)$/i);
      if (match) segments.push(match[1].trim());
    }

    if (segments.length < 3) {
      throw new Error(`Not enough segments parsed. Got: ${segments.length}. Raw: ${raw.slice(0, 200)}`);
    }

    const fullScript = segments.join(' ');
    const title = `${topic} #shorts #wealth #mindset`;
    const description = `${topic}\n\nWelcome to Wealth Cipher — daily insights on money, power and mindset.\n\n#WealthCipher #Shorts #Mindset #Money #Success`;
    const tags = ['wealth', 'money', 'mindset', 'success', 'shorts', 'motivation', 'power', 'finance'];

    console.log('Script generated successfully.');
    console.log('Full script:', fullScript.slice(0, 100) + '...');

    return { topic, segments, fullScript, title, description, tags };
  } catch (err) {
    throw {
      step: 'SCRIPT_ENGINE',
      message: err.message || String(err),
      details: {
        code: err.code || null,
        status: (err.response && err.response.status) || null,
      },
    };
  }
}

module.exports = { generateScript };