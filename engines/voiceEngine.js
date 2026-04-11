require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID;
const AUDIO_DIR = path.join(__dirname, '../storage/audio');

async function generateVoice(scriptText) {
  try {
  try {
    console.log('Generating voiceover with ElevenLabs...');

    const response = await axios({
      method: 'POST',
      url: `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      data: {
        text: scriptText,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.75,
          similarity_boost: 0.85,
          style: 0.4,
          use_speaker_boost: true,
        },
      },
      responseType: 'stream',
    });

    const voicePath = path.join(AUDIO_DIR, 'voice.mp3');
    const writer = fs.createWriteStream(voicePath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        console.log('Voiceover saved to:', voicePath);
        resolve(voicePath);
      });
      writer.on('error', reject);
    });
  } catch (err) {
    console.error('voiceEngine error:', err.message);
    throw err;
  }
}

  } catch (err) {
    throw {
      step: 'VOICE_ENGINE',
      message: err.message || String(err),
      details: {
        code: err.code || null,
        status: (err.response && err.response.status) || null,
      },
    };
  }
}

module.exports = { generateVoice };