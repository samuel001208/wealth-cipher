const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const TOPICS = [
  'The dark psychology of power that schools never teach',
  'Why most people will always stay broke - the mindset trap',
  'The manipulation tactic every powerful person uses',
  'How to make people respect you without saying a word',
  'The silent rule of wealth the rich never talk about',
  'Why your circle is keeping you poor and powerless',
  'The one mindset shift that separates winners from losers',
  'How the elite stay in control without you knowing',
  'The dark truth about success nobody wants to admit',
  'Why being nice is the fastest way to lose power',
  'The law of power most people break every day',
  'How to read people instantly using dark psychology',
  'Why emotional people never build real wealth',
  'The strategy billionaires use to stay untouchable',
  'How to detach from outcomes and dominate life',
];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function generateWithRetry(model, prompt, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (err) {
      const isQuota = err.message && (err.message.includes('429') || err.message.includes('quota') || err.message.includes('RESOURCE_EXHAUSTED'));
      if (isQuota && i < retries - 1) {
        const delay = 60000 * (i + 1); // 1min, 2min, 3min
        console.log(`Rate limited. Waiting ${delay/1000}s before retry ${i+2}/${retries}...`);
        await sleep(delay);
        continue;
      }
      throw err;
    }
  }
}

async function generateScript() {
  try {
  const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
  console.log('Selected topic:', topic);

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const scriptPrompt = `Write a powerful, engaging YouTube Shorts script about: "${topic}"

Rules:
- Total duration: 30-35 seconds when spoken
- Split into exactly 6-8 short punchy segments (1 sentence each)
- Each segment syncs with a visual/video clip
- Dark, psychological, wealth/power niche tone
- Hook the viewer in the first 3 words
- No hashtags, no emojis in script
- Format EXACTLY like this (no extra text):
SEGMENT_1: [sentence]
SEGMENT_2: [sentence]
SEGMENT_3: [sentence]
SEGMENT_4: [sentence]
SEGMENT_5: [sentence]
SEGMENT_6: [sentence]`;

  const titlePrompt = `Generate a short, viral YouTube Shorts title (max 60 chars) for this topic: "${topic}". Reply with ONLY the title, nothing else.`;

  const descPrompt = `Write a 2-sentence YouTube Shorts description for: "${topic}". Include a call to action. Reply with ONLY the description.`;

  const tagsPrompt = `List 8 YouTube tags (comma separated, no #) for a Shorts about: "${topic}". Reply with ONLY the tags.`;

  console.log('Generating script segments...');
  const scriptRaw = await generateWithRetry(model, scriptPrompt);

  const segments = [];
  const lines = scriptRaw.split('\n');
  for (const line of lines) {
    const match = line.match(/SEGMENT_\d+:\s*(.+)/);
    if (match) segments.push(match[1].trim());
  }

  if (segments.length < 4) {
    throw new Error(`Not enough segments generated. Got: ${segments.length}. Raw: ${scriptRaw}`);
  }

  console.log('Generating title, description, tags...');
  const [title, description, tagsRaw] = await Promise.all([
    generateWithRetry(model, titlePrompt),
    generateWithRetry(model, descPrompt),
    generateWithRetry(model, tagsPrompt),
  ]);

  const tags = tagsRaw.split(',').map(t => t.trim()).filter(Boolean);
  const fullScript = segments.join(' ');

  const scriptDir = path.join(__dirname, '..', 'scripts');
  if (!fs.existsSync(scriptDir)) fs.mkdirSync(scriptDir, { recursive: true });

  const timestamp = Date.now();
  const scriptPath = path.join(scriptDir, `script_${timestamp}.txt`);
  fs.writeFileSync(scriptPath, fullScript);
  console.log('Script saved to:', scriptPath);

  return { topic, segments, fullScript, title: title.trim(), description: description.trim(), tags, scriptPath };
}

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
