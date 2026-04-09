require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const TOPICS = [
  'The silent power of a man who needs nothing',
  'Why rich people never explain themselves',
  'The psychology behind staying calm under pressure',
  'How wealthy people use silence as a weapon',
  'The dark truth about how power is really gained',
  'Why most people stay broke their entire lives',
  'The mindset shift that separates winners from losers',
  'How to become untouchable in any room you enter',
  'The secret laws of money the rich never share',
  'Why discipline is the ultimate form of self-respect',
];

async function generateScript() {
  try {
    // Pick a random topic
    const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
    console.log('Topic selected:', topic);

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `You are a scriptwriter for a dark psychology and wealth YouTube Shorts channel called "Wealth Cipher".

Write a powerful, deep, and persuasive YouTube Short script on this topic: "${topic}"

Rules:
- The script must be spoken in 30-35 seconds (about 80-100 words)
- Use a dark, calm, authoritative tone
- No fluff. Every word must hit hard.
- Write ONLY the spoken words (no stage directions, no labels)
- Split the script into 4-5 SHORT segments separated by | (pipe character)
- Each segment matches one video clip

After the script, on a new line write:
TITLE: [a powerful YouTube title under 60 characters]
DESCRIPTION: [2-3 sentence YouTube description with keywords]
TAGS: [10 comma-separated tags]`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Parse script segments
    const lines = text.split('\n').filter(l => l.trim());
    let scriptRaw = '';
    let title = '';
    let description = '';
    let tags = '';

    for (const line of lines) {
      if (line.startsWith('TITLE:')) title = line.replace('TITLE:', '').trim();
      else if (line.startsWith('DESCRIPTION:')) description = line.replace('DESCRIPTION:', '').trim();
      else if (line.startsWith('TAGS:')) tags = line.replace('TAGS:', '').trim();
      else scriptRaw += line + ' ';
    }

    const segments = scriptRaw.split('|').map(s => s.trim()).filter(Boolean);

    // Save full script to file
    const scriptPath = path.join(__dirname, '../storage/scripts/script.txt');
    const fullScript = segments.join(' ');
    fs.writeFileSync(scriptPath, fullScript);
    console.log('Script saved to:', scriptPath);

    return { topic, segments, fullScript, title, description, tags, scriptPath };
  } catch (err) {
    console.error('scriptEngine error:', err.message);
    throw err;
  }
}

module.exports = { generateScript };