const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function generateVoice(text) {
  const audioDir = path.join(__dirname, '..', 'storage', 'audio');
  fs.mkdirSync(audioDir, { recursive: true });
  const voicePath = path.join(audioDir, 'voice.mp3');

  console.log('Generating voiceover with gTTS (free)...');

  // Write text to a temp file to avoid shell escaping issues
  const tmpText = path.join(audioDir, 'script.txt');
  fs.writeFileSync(tmpText, text, 'utf8');

  // Use Python gTTS to generate the voice
  const pythonScript = `
import sys
from gtts import gTTS
text = open('${tmpText}', 'r').read()
tts = gTTS(text=text, lang='en', slow=False)
tts.save('${voicePath}')
print('Voice saved to: ${voicePath}')
`;

  const tmpPy = path.join(audioDir, 'tts.py');
  fs.writeFileSync(tmpPy, pythonScript, 'utf8');

  execSync(`pip install gtts -q && python3 "${tmpPy}"`, { stdio: 'inherit' });

  // Cleanup temp files
  try { fs.unlinkSync(tmpText); } catch(e) {}
  try { fs.unlinkSync(tmpPy); } catch(e) {}

  console.log('Voiceover saved to:', voicePath);
  return voicePath;
}

module.exports = { generateVoice };