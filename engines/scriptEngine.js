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
  const prompt = `You are a YouTube Shorts script writer. Write a script for a 60-second video about: ${topic}

Return ONLY a valid JSON object with these exact fields:
{
  "segments": ["segment1 text", "segment2 text", "segment3 text", "segment4 text", "segment5 text"],
  "fullScript": "the full script as one paragraph",
  "title": "YouTube video title under 100 chars",
  "description": "YouTube description under 500 chars",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}
Do not include any text outside the JSON object.`;
  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      { model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }], temperature: 0.8, max_tokens: 1000 },
      { headers: { 'Authorization': 'Bearer ' + GROQ_API_KEY, 'Content-Type': 'application/json' }, timeout: 60000 }
    );
    const raw = response.data.choices[0].message.content.trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in Groq response');
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      segments: parsed.segments,
      fullScript: parsed.fullScript,
      title: parsed.title,
      description: parsed.description,
      tags: parsed.tags
    };
  } catch (err) {
    throw { step: 'SCRIPT_ENGINE', message: err.message || String(err), details: { code: err.code || null, status: (err.response && err.response.status) || null } };
  }
}

module.exports = { generateScript };