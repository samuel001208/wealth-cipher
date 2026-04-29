const Groq = require('groq-sdk');
const fs = require('fs').promises;
const path = require('path');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const vocabulary = require('../vocabulary.json');

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

async function generatePhilosopherQuote() {
  try {
    // Get random vocabulary for intro construction
    const opening = getRandomElement(vocabulary.openings);
    const descriptor = getRandomElement(vocabulary.descriptors);
    const verb = getRandomElement(vocabulary.verbs);

    const prompt = `You are a philosophy expert. Find a real, authentic short quote from a famous philosopher.

REQUIREMENTS:
- The quote must be REAL and authentic (not made up)
- Quote must be 10-25 words long
- Must be from a well-known philosopher (Socrates, Plato, Aristotle, Marcus Aurelius, Confucius, Seneca, Nietzsche, Epictetus, etc.)
- Must be profound and thought-provoking
- Must be suitable for a 10-20 second video

Respond ONLY in this exact JSON format (no markdown, no extra text):
{
  "quote": "the actual quote here",
  "philosopher": "Philosopher Name",
  "intro": "${opening} ${descriptor} it was when ${verb}"
}

Example response:
{
  "quote": "The only true wisdom is in knowing you know nothing",
  "philosopher": "Socrates",
  "intro": "${opening} ${descriptor} it was when Socrates ${verb}"
}`;

    const response = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.8,
      max_tokens: 200
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) throw new Error('Empty response from Groq');

    // Parse JSON response
    const quoteData = JSON.parse(content);

    // Validate required fields
    if (!quoteData.quote || !quoteData.philosopher) {
      throw new Error('Invalid quote data structure');
    }

    // Build complete narration script
    const fullNarration = `${quoteData.intro}, "${quoteData.quote}"`;

    console.log('\n✓ Generated quote:');
    console.log(`  Philosopher: ${quoteData.philosopher}`);
    console.log(`  Quote: ${quoteData.quote}`);
    console.log(`  Full narration: ${fullNarration}`);

    return {
      quote: quoteData.quote,
      philosopher: quoteData.philosopher,
      intro: quoteData.intro,
      fullNarration: fullNarration,
      description: `${quoteData.philosopher} on wisdom and philosophy`
    };

  } catch (error) {
    console.error('Error generating quote:', error.message);
    throw error;
  }
}

module.exports = { generatePhilosopherQuote };
