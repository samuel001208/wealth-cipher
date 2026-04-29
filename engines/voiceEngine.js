const textToSpeech = require('@google-cloud/text-to-speech');
const fs = require('fs').promises;
const path = require('path');

const client = new textToSpeech.TextToSpeechClient({
  credentials: JSON.parse(process.env.GOOGLE_TTS_CREDENTIALS)
});

async function generateVoice(text, outputPath) {
  try {
    const request = {
      input: { text },
      voice: {
        languageCode: 'en-US',
        name: 'en-US-Neural2-D', // Male voice
        ssmlGender: 'MALE'
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: 0.90,
        pitch: -2.0
      }
    };

    const [response] = await client.synthesizeSpeech(request);
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, response.audioContent, 'binary');
    
    console.log(`✓ Voice saved to: ${outputPath}`);
    return outputPath;

  } catch (error) {
    console.error('Error generating voice:', error.message);
    throw error;
  }
}

module.exports = { generateVoice };
