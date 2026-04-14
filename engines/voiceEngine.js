const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function generateVoice(segments) {
  const audioDir = path.join(__dirname, '..', 'storage', 'audio');
  fs.mkdirSync(audioDir, { recursive: true });

  const segmentPaths = [];

  for (let i = 0; i < segments.length; i++) {
    const text = segments[i].text;
    const segPath = path.join(audioDir, `seg_${i}.mp3`);
    const tmpText = path.join(audioDir, `seg_${i}.txt`);
    const tmpPy = path.join(audioDir, `tts_${i}.py`);

    fs.writeFileSync(tmpText, text, 'utf8');

    const pythonScript = `
import sys
from gtts import gTTS
text = open('${tmpText}', 'r').read()
tts = gTTS(text=text, lang='en', slow=False)
tts.save('${segPath}')
print('Segment ${i} voice saved')
`;

    fs.writeFileSync(tmpPy, pythonScript, 'utf8');
    execSync(`pip install gtts -q && python3 "${tmpPy}"`, { stdio: 'inherit' });

    try { fs.unlinkSync(tmpText); } catch(e) {}
    try { fs.unlinkSync(tmpPy); } catch(e) {}

    // Probe duration
    let duration = 4;
    try {
      const probe = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${segPath}"`, { encoding: 'utf8' });
      duration = parseFloat(probe.trim()) || 4;
    } catch(e) {}

    segments[i].audioDuration = duration;
    segmentPaths.push(segPath);
    console.log(`Segment ${i} voice: ${duration.toFixed(2)}s`);
  }

  // Merge all segment audios into one voice.mp3
  const voicePath = path.join(audioDir, 'voice.mp3');
  const concatTxt = path.join(audioDir, 'audio_concat.txt');
  const lines = segmentPaths.map(p => `file '${p}'`).join('\n');
  fs.writeFileSync(concatTxt, lines, 'utf8');
  execSync(`ffmpeg -y -f concat -safe 0 -i "${concatTxt}" -c copy "${voicePath}"`, { stdio: 'inherit' });

  try { fs.unlinkSync(concatTxt); } catch(e) {}

  console.log('All segments merged into voice.mp3');
  return { voicePath, segments };
}

module.exports = { generateVoice };
