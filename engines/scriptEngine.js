const Groq = require('groq-sdk');

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

const POWER_WORDS = ['power','discipline','silence','wealth','ancient','mind','strength','wisdom','control','rich','money','success','focus','stoic','philosopher','empire','legacy','patience','clarity','purpose'];

async function generateScript() {
  const topicExamples = [
    'The Ancient Philosophy of Discipline',
    'The Simple Taste of Power',
    'What Stoics Knew About Silence',
    'The Weight of a Calm Mind',
    'Why the Powerful Never Explain Themselves',
    'The Philosophy of Earning Without Begging',
    'What Ancient Empires Understood About Wealth',
    'The Quiet Language of True Power'
  ];
  const randomExample = topicExamples[Math.floor(Math.random() * topicExamples.length)];

  const prompt = `You are a philosophical narrator for a dark, cinematic YouTube Shorts channel called Wealth Cipher. Your style is poetic, calm, and ancient — like a stoic philosopher speaking about wealth and power.

Generate a 45-second YouTube Short script on a philosophical wealth topic. The title must be poetic and unique, like: "${randomExample}".

Rules:
- Topic must be rooted in wealth, power, or discipline — told philosophically
- Write in a calm, deep, poetic voice — not like a hustle influencer
- 5 segments, each 1-2 sentences max
- The LAST segment must be a commanding subscribe call-to-action, like: "Don't watch and scroll. If wealth and power speak to you — join Wealth Cipher. You know what to do. Subscribe."
- Each segment needs a short Pexels video search keyword (3-5 words max, something visually ancient/dark/cinematic)

Respond ONLY with valid JSON in this exact format:
{
  "title": "string",
  "description": "string (one powerful quote from the script, then: #WealthCipher #AncientWisdom #Philosophy #DarkPhilosophy #Wealth #Stoic)",
  "tags": ["wealth", "philosophy", "ancient wisdom", "dark philosophy", "stoic", "power", "discipline", "wealth cipher"],
  "segments": [
    { "text": "narration text", "keyword": "pexels search keyword" },
    { "text": "narration text", "keyword": "pexels search keyword" },
    { "text": "narration text", "keyword": "pexels search keyword" },
    { "text": "narration text", "keyword": "pexels search keyword" },
    { "text": "Don't watch and scroll. If wealth and power speak to you — join Wealth Cipher. You know what to do. Subscribe.", "keyword": "ancient greek statue dark" }
  ]
}`;

  const response = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.9,
    max_tokens: 1000
  });

  const raw = response.choices[0].message.content.trim();
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON found in Groq response');

  const script = JSON.parse(jsonMatch[0]);
  script.powerWords = POWER_WORDS;
  console.log('Script generated:', script.title);
  return script;
}

module.exports = { generateScript };
