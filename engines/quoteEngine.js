
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
      content: `You are a philosophy expert. Find a real, verified, well-known short quote from a famous philosopher. The quote must be historically documented and genuinely attributed to the philosopher. The quote must be no longer than 40 words. Do not invent quotes.

Return ONLY a JSON object in this exact format:
{
  "quote": "the exact quote here",
  "philosopher": "First and Last Name",
  "topic": "one word topic e.g. wisdom, courage, justice"
}

Do not repeat these recently used philosophers: ${used.philosophers.slice(-5).join(', ')}
Return only the JSON, nothing else.`
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
      content: `You are a video scriptwriter. Given this philosopher quote and a list of sentence opener templates, pick the SINGLE best opener template that fits the tone and subject of the quote, fill in the adjective and verb placeholders with the best word from the provided lists, and return the completed sentence.

Quote: ${data.quote}
Philosopher: ${data.philosopher}

Opener templates: ${JSON.stringify(openers)}
Adjectives to use: ${JSON.stringify(adjectives)}
Verbs to use: ${JSON.stringify(verbs)}

Return ONLY the completed opener sentence. Replace {philosopher} with the actual name. Replace {adjective} and {verb} with your chosen words. Return nothing else.`
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
      content: `Pick the best YouTube Shorts title from these templates for this quote. Fill in all placeholders.

Quote: ${data.quote}
Philosopher: ${data.philosopher}
Templates: ${JSON.stringify(titleTemplates)}
Adjectives: ${JSON.stringify(adjectives)}

Return ONLY the completed title. Nothing else.`
    }],
    temperature: 0.7,
    max_tokens: 80
  });

  const title = titleResponse.choices[0].message.content.trim();

  // Generate description
  const description = `A timeless reflection on ${data.topic} by ${data.philosopher}. #philosophy #wisdom #${data.topic} #quotes #shorts`;

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
    narration: ${"`"} ${opener}... ${data.quote} ${"`"}
  };
}

module.exports = { getQuote };
