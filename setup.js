const fs = require('fs');
const path = require('path');

function write(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
  console.log('Created:', filePath);
}

// vocabulary.json
write('vocabulary.json', JSON.stringify({
  openers: [
    'How {adjective} it was when {philosopher} {verb}',
    'One cannot help but marvel at how {adjective} {philosopher} was when he {verb}',
    'Consider the magnitude of what {philosopher} {verb}',
    'It is worth pausing to reflect on what {philosopher} {verb}',
    'Few words have endured like those {philosopher} {verb}',
    'There is a reason the world still remembers what {philosopher} {verb}',
    'Centuries have passed, yet what {philosopher} {verb} still echoes through time',
    'Among the most {adjective} things ever spoken were the words {philosopher} {verb}',
    'The mind of {philosopher} was rare and nowhere clearer than when he {verb}',
    'Long before the modern world understood this, {philosopher} had already {verb}',
    'To truly understand life, one must sit with what {philosopher} {verb}',
    'What {philosopher} {verb} was not merely words, it was a mirror held up to humanity',
    'In a world full of noise, what {philosopher} {verb} cuts through everything',
    'History remembers many names, but few spoke as {adjective}ly as {philosopher} when he {verb}',
    'If you have never stopped to consider what {philosopher} {verb}, now is the time'
  ],
  adjectives: [
    'sagacious','astute','profound','erudite',
    'perspicacious','prescient','illuminating','timeless',
    'incisive','transcendent','penetrating','unflinching',
    'contemplative','visionary','sobering','magnificent'
  ],
  verbs: [
    'asserted','postulated','declared','proclaimed',
    'opined','articulated','once observed','famously stated',
    'quietly noted','boldly proclaimed','solemnly declared',
    'inscribed into history','left for the ages',
    'whispered to eternity','carved into the conscience of mankind',
    'offered to those willing to listen'
  ],
  titleTemplates: [
    '{philosopher} Said This And It Still Haunts Me',
    'The Most {adjective} Thing {philosopher} Ever Said',
    '{philosopher} Knew Something We Have Forgotten',
    'Words From {philosopher} That Cut Through Everything',
    'Why {philosopher} Said This Thousands of Years Ago',
    '{philosopher} Most {adjective} Thought',
    'This Quote From {philosopher} Will Stay With You',
    'Few Words Have Aged Like This From {philosopher}',
    'What {philosopher} Understood That Most Never Will',
    '{philosopher} Left This For Those Willing To Listen'
  ]
}, null, 2));

// .gitignore
write('.gitignore', `node_modules/
.env
storage/temp/
*.mp4
*.mp3
*.wav
`);

// storage/used.json
write('storage/used.json', JSON.stringify({ images: [], philosophers: [] }, null, 2));

console.log('\nAll base files created. Now creating engines...');

// engines/quoteEngine.js
write('engines/quoteEngine.js', `
const Groq = require('groq-sdk');
const fs = require('fs');
require('dotenv').config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function getQuote() {
  const vocab = JSON.parse(fs.readFileSync('vocabulary.json', 'utf8'));
  const used = JSON.parse(fs.readFileSync('storage/used.json', 'utf8'));

  const openers = vocab.openers;
  const adjectives = vocab.adjectives;
  const verbs = vocab.verbs;
  const titleTemplates = vocab.titleTemplates;

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{
      role: 'user',
      content: \`You are a philosophy expert. Find a real, verified, well-known short quote from a famous philosopher. The quote must be historically documented and genuinely attributed to the philosopher. The quote must be no longer than 40 words. Do not invent quotes.

Return ONLY a JSON object in this exact format:
{
  "quote": "the exact quote here",
  "philosopher": "First and Last Name",
  "topic": "one word topic e.g. wisdom, courage, justice"
}

Do not repeat these recently used philosophers: \${used.philosophers.slice(-5).join(', ')}
Return only the JSON, nothing else.\`
    }],
    temperature: 0.7,
    max_tokens: 200
  });

  const raw = response.choices[0].message.content.trim();
  const data = JSON.parse(raw);

  // Pick best opener using Groq
  const openerResponse = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{
      role: 'user',
      content: \`You are a video scriptwriter. Given this philosopher quote and a list of sentence opener templates, pick the SINGLE best opener template that fits the tone and subject of the quote, fill in the adjective and verb placeholders with the best word from the provided lists, and return the completed sentence.

Quote: \${data.quote}
Philosopher: \${data.philosopher}

Opener templates: \${JSON.stringify(openers)}
Adjectives to use: \${JSON.stringify(adjectives)}
Verbs to use: \${JSON.stringify(verbs)}

Return ONLY the completed opener sentence. Replace {philosopher} with the actual name. Replace {adjective} and {verb} with your chosen words. Return nothing else.\`
    }],
    temperature: 0.8,
    max_tokens: 150
  });

  const opener = openerResponse.choices[0].message.content.trim();

  // Pick best title using Groq
  const titleResponse = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{
      role: 'user',
      content: \`Pick the best YouTube Shorts title from these templates for this quote. Fill in all placeholders.

Quote: \${data.quote}
Philosopher: \${data.philosopher}
Templates: \${JSON.stringify(titleTemplates)}
Adjectives: \${JSON.stringify(adjectives)}

Return ONLY the completed title. Nothing else.\`
    }],
    temperature: 0.7,
    max_tokens: 80
  });

  const title = titleResponse.choices[0].message.content.trim();

  // Generate description
  const description = \`A timeless reflection on \${data.topic} by \${data.philosopher}. #philosophy #wisdom #\${data.topic} #quotes #shorts\`;

  // Track used philosopher
  used.philosophers.push(data.philosopher);
  if (used.philosophers.length > 30) used.philosophers.shift();
  fs.writeFileSync('storage/used.json', JSON.stringify(used, null, 2));

  return {
    quote: data.quote,
    philosopher: data.philosopher,
    topic: data.topic,
    opener,
    title,
    description,
    narration: \${"\`"}\ \${opener}... \${data.quote}\ \${"\`"}
  };
}

module.exports = { getQuote };
`);

// engines/voiceEngine.js
write('engines/voiceEngine.js', `
const textToSpeech = require('@google-cloud/text-to-speech');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function generateVoice(text, outputPath) {
  const credentials = JSON.parse(process.env.GOOGLE_TTS_CREDENTIALS);
  const client = new textToSpeech.TextToSpeechClient({ credentials });

  const request = {
    input: { text },
    voice: {
      languageCode: 'en-US',
      name: 'en-US-Neural2-D',
      ssmlGender: 'MALE'
    },
    audioConfig: {
      audioEncoding: 'MP3',
      speakingRate: 0.90,
      pitch: -2.0
    }
  };

  const [response] = await client.synthesizeSpeech(request);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, response.audioContent, 'binary');
  console.log('Voice saved to:', outputPath);
  return outputPath;
}

module.exports = { generateVoice };
`);

console.log('Setup complete! Now create videoEngine.js, uploadEngine.js, index.js, and workflow manually or run this again after adding their content to this script.');