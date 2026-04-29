
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
