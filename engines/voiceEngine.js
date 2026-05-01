const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

async function generateVoice(text, outputPath) {
  try {
    const response = await axios({
      method: 'POST',
      url: `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}`,
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY
      },
      data: {
        text: text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      },
      responseType: 'arraybuffer'
    });

    await fs.writeFile(outputPath, Buffer.from(response.data));
    console.log(`✅ Voice generated: ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error('Error generating voice:', error.message);
    throw error;
  }
}

module.exports = { generateVoice };